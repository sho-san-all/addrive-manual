#!/usr/bin/env python3
"""faq_entries.jsonl -> manual リポジトリの content/qa/log.mdx 生成バッチ（単体実行可能）。

このファイルは ad_expert_ai リポジトリの tools/manual-promotion/qa_export.py の複製（CI実行用）。
正本は ad_expert_ai リポジトリ側。ロジック変更時はそちらを正本として手動で同期すること。

使い方:
  python scripts/qa_export.py --jsonl backend/data/faq_entries.jsonl --output content/qa/log.mdx
  python scripts/qa_export.py --api-url https://<backend>/api/slack/faq_export --token $FAQ_EXPORT_TOKEN --output content/qa/log.mdx
  （--dry-run で書き込みせず標準出力に確認できる。
    --force で「生成0件/既存より大幅減少」ガードを無視して上書きできる）

設計原典: docs/2026-08-04_WebツールチャットボットQ&Aセクション_構造設計.md（3-3節・6章・7章②）
- botランタイム（Railway）には組み込まない。あくまで独立スクリプト（GitHub Actions等から実行）。
- [2026-08-05 無効化] 当初はG2相当チェック（顧客名・Slackメンション・社外URL・金額・
  電話番号・ファイル名）に該当するエントリを非掲載にする設計だったが、心さんの方針
  （顧客名・金額・電話番号を含め全部公開してよい情報という明言）と矛盾すると判断し、
  無効化した。現在は取得した全エントリをそのまま掲載する（`filter_entries` は除外を
  行わず、全件を通過扱いにする）。`check_g2` 本体・関連の正規表現は将来また使う可能性
  への配慮で残してあるが、呼び出し側では使用していない。
- 通過したエントリのみで qa/log.mdx を毎回「全文置換」で生成する（追記ではない）。
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import re
import sys
import tempfile
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable, Optional

# manual リポジトリ（ad_expert_ai とは別の git リポジトリ）配下の相対パス。
# --output が省略された場合のみ、環境変数 QA_EXPORT_MANUAL_REPO で指し示された
# リポジトリ直下からこの相対パスを解決する（決め打ちの相対パス推測はしない）。
_MANUAL_REPO_RELATIVE_OUTPUT = pathlib.Path("content") / "qa" / "log.mdx"


class OutputPathError(RuntimeError):
    """--output 未指定時に安全な既定出力先を決定できなかった場合に送出する。"""


def _resolve_default_output() -> pathlib.Path:
    """--output 省略時の既定出力先を、安全性を検証した上で解決する。

    ad_expert_ai リポジトリには manual/ サブディレクトリは存在しない
    （manual は完全に別の git リポジトリ）。誤って存在しない/意図しない場所に
    書いて「正常終了」してしまう事故を防ぐため、以下を必須にする:
      - 環境変数 QA_EXPORT_MANUAL_REPO で manual リポジトリの絶対パスが明示されていること
      - そのパスが実在するディレクトリであること
      - そのパス直下が git 管理下（.git が存在する）であること
      - 出力先の親ディレクトリ（content/qa/）が既に存在すること
    いずれかを満たさない場合は OutputPathError を送出し、CLI 側でエラー終了させる。
    """
    repo_env = os.getenv("QA_EXPORT_MANUAL_REPO", "")
    if not repo_env:
        raise OutputPathError(
            "--output が未指定です。manual リポジトリへの絶対パスを "
            "環境変数 QA_EXPORT_MANUAL_REPO で指定するか、--output で出力先を明示してください。"
        )
    repo_path = pathlib.Path(repo_env).expanduser().resolve()
    if not repo_path.is_dir():
        raise OutputPathError(
            f"QA_EXPORT_MANUAL_REPO が指すディレクトリが存在しません: {repo_path}"
        )
    if not (repo_path / ".git").exists():
        raise OutputPathError(
            f"QA_EXPORT_MANUAL_REPO が git 管理下のリポジトリではありません: {repo_path}"
        )
    output_path = repo_path / _MANUAL_REPO_RELATIVE_OUTPUT
    if not output_path.parent.is_dir():
        raise OutputPathError(
            f"出力先の親ディレクトリが存在しません: {output_path.parent}"
            "（manual リポジトリの構成が想定と異なる可能性があります）"
        )
    return output_path

# ────────────────────────────────────────────────────────────
# G2相当チェック（設計書6章・[2026-08-05] 無効化済み）
#
# 以下の check_g2 と関連の正規表現定義は、当初「1つでもヒットしたら掲載しない」
# 判定に使う想定だったが、心さんの方針（顧客名・金額・電話番号を含め全部公開して
# よい情報という明言）により無効化した。`filter_entries` からは呼び出しておらず、
# 現状は未使用の単体関数として温存しているのみ（将来また使う可能性への配慮）。
# ────────────────────────────────────────────────────────────
_SLACK_MENTION_RE = re.compile(
    r"<@[UW][A-Z0-9]+>"
    r"|<!subteam\^[A-Z0-9]+(?:\|[^>]*)?>"
    r"|<!(?:here|channel|everyone)>"
)
_EXTERNAL_URL_RE = re.compile(r"https?://[^\s>\)]+")
# ここに一致するドメインの URL は「社外URL」としては数えない
# （Slack permalink・マニュアルサイト自体・自社ドメインは出典として許容する）。
_ALLOWED_URL_DOMAINS = (
    "sho-san.slack.com",
    "addrive-manual.vercel.app",
    "sho-san.co.jp",
)
# 円・万円・億円に加えて $ 建て金額も拾う。
_MONEY_RE = re.compile(
    r"[¥￥]\s?\d[\d,]*(?:\.\d+)?"
    r"|\$\s?\d[\d,]*(?:\.\d+)?"
    r"|\d[\d,]*(?:\.\d+)?\s?(?:円|万円|億円)"
)
# ハイフン区切りに加えて「03(1234)5678」形式の括弧区切り、
# 「+81 3 1234 5678」形式の国番号つき（スペース/ハイフン混在）も拾う。
_PHONE_RE = re.compile(
    r"0\d{1,4}-\d{1,4}-\d{4}"
    r"|0\d{1,4}\(\d{1,4}\)\d{4}"
    r"|\+?81[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{4}"
    r"|(?<!\d)0\d{9,10}(?!\d)"
)
# 末尾を \b にすると、拡張子の直後に日本語の助詞（Unicode 上は \w 扱い）が
# 続く場合に単語境界が成立せず検知漏れになる（例: 「一覧.xlsxを確認」）。
# そのため終端は「英数字が続かないこと」を見る lookahead に変更する。
_FILENAME_RE = re.compile(
    r"[\w\-一-龠ぁ-んァ-ヶー]+\.(xlsx?|csv|txt|pdf|pptx?|docx?|png|jpe?g|zip)(?![A-Za-z0-9])",
    re.IGNORECASE,
)
# 顧客名クラスタ検出。専用の顧客名マスタが無い前提のため、機械的な
# 正規表現ヒューリスティックのみで判定する（法人格・敬称が付いた固有名詞らしき塊）。
# 将来 backend/mcp-server 側に顧客名マスタが用意されたら、--client-names で
# 読み込ませてこのヒューリスティックより優先させる想定。
_CLIENT_NAME_HINT_RE = re.compile(
    r"(株式会社|有限会社|合同会社)[^\s、。,.!?！？]{1,20}"
    r"|[^\s、。,.!?！？]{1,20}(様|さま)(?=[\s、。,.!?！？]|$)"
)


def _is_allowed_host(hostname: str) -> bool:
    """hostname が許可ドメインそのもの、またはそのサブドメインかを判定する。

    部分文字列一致ではなく `.` 区切りの完全一致で見るため、
    `sho-san.co.jp.evil.example` のような偽装ホストは弾く。
    """
    host = (hostname or "").lower().rstrip(".")
    if not host:
        return False
    for domain in _ALLOWED_URL_DOMAINS:
        domain = domain.lower()
        if host == domain or host.endswith("." + domain):
            return True
    return False


def _external_url_hit(text: str) -> bool:
    for m in _EXTERNAL_URL_RE.finditer(text or ""):
        url = m.group(0)
        try:
            parsed = urllib.parse.urlparse(url)
        except ValueError:
            return True
        # userinfo（user:pass@host）を含む URL は host 判定を欺くためのなりすまし
        # 手口として使われうるため、userinfo が付いている時点で社外扱いにする。
        if "@" in (parsed.netloc or ""):
            return True
        if not _is_allowed_host(parsed.hostname or ""):
            return True
    return False


@dataclass
class MaskCheckResult:
    passed: bool
    reasons: list[str]


def check_g2(
    question: str, answer: str, client_names: Optional[Iterable[str]] = None
) -> MaskCheckResult:
    """G2相当チェック（純関数）。載せてから直すのではなく、載せない判定を返す。"""
    text = f"{question}\n{answer}"
    reasons: list[str] = []

    if _SLACK_MENTION_RE.search(text):
        reasons.append("slack_mention")
    if _external_url_hit(text):
        reasons.append("external_url")
    if _MONEY_RE.search(text):
        reasons.append("money_amount")
    if _PHONE_RE.search(text):
        reasons.append("phone_number")
    if _FILENAME_RE.search(text):
        reasons.append("filename")

    # マスタとヒューリスティックは OR 判定（どちらかがヒットすれば掲載しない）。
    # マスタを渡したからといってヒューリスティックを無効化すると、マスタに
    # 載っていない顧客名が fail-open で通過してしまうため、常に両方見る。
    names = [n for n in (client_names or []) if n]
    if names and any(name in text for name in names):
        reasons.append("client_name")
    if _CLIENT_NAME_HINT_RE.search(text):
        reasons.append("client_name_heuristic")

    return MaskCheckResult(passed=not reasons, reasons=reasons)


# ────────────────────────────────────────────────────────────
# データソース読み込み（ローカルJSONL / エクスポートAPI 両対応）
# ────────────────────────────────────────────────────────────
def load_entries_from_jsonl(path: pathlib.Path) -> list[dict]:
    """faq_store.py と同じ tombstone 解釈で JSONL を読む（削除済みは返さない）。"""
    entries: list[dict] = []
    tombstoned: set[str] = set()
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            if isinstance(obj, dict) and obj.get("_deleted"):
                tombstoned.add(str(obj.get("_deleted")))
                continue
            entries.append(obj)
    if tombstoned:
        entries = [e for e in entries if str(e.get("entry_id")) not in tombstoned]
    return entries


def load_entries_from_api(api_url: str, token: str) -> list[dict]:
    """読み取り専用エクスポートAPI（GET /api/slack/faq_export）から取得する。

    tombstone除外はAPI側（faq_store.all_entries()）で既に済んでいる前提。
    """
    req = urllib.request.Request(
        api_url, headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:  # noqa: S310 - 社内APIのみ想定
        body = json.loads(resp.read().decode("utf-8"))
    return list(body.get("entries") or [])


# ────────────────────────────────────────────────────────────
# フィルタリング + mdx 生成
# ────────────────────────────────────────────────────────────
def filter_entries(
    entries: list[dict], client_names: Optional[Iterable[str]] = None
) -> tuple[list[dict], list[dict]]:
    """全エントリを掲載対象として返す（G2チェックは無効化済み）。

    [2026-08-05] G2チェック（顧客名・金額・電話番号等の検出による非掲載）は
    心さんの方針（該当情報を含め全部公開してよい）と矛盾するため無効化した。
    シグネチャ・戻り値の形（passed, rejected のタプル）は呼び出し元への影響を
    最小にするためそのまま残しているが、rejected は常に空リストになる。
    `client_names` 引数もG2判定に使われないため実質無効（後方互換のためのみ残置）。
    """
    passed = list(entries)
    rejected: list[dict] = []
    return passed, rejected


def _format_date(created_at: str) -> str:
    if not created_at:
        return ""
    try:
        dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return created_at


_MDX_ESCAPE_CHARS = "{}<>"


def _escape_mdx_text(text: str) -> str:
    """Slack 本文をそのまま MDX に挿入すると `{...}`（式）や `<...>`（JSX タグ）
    として解釈されてしまう（MDX インジェクション）。表示上はそのままの文字に
    見えるよう、MDX/JSX として意味を持ちうる記号だけをバックスラッシュ
    エスケープしてテキスト扱いに固定する。
    """
    if not text:
        return text
    return "".join(f"\\{ch}" if ch in _MDX_ESCAPE_CHARS else ch for ch in text)


def _format_entry(entry: dict, index: int) -> str:
    question = _escape_mdx_text((entry.get("question") or "").strip())
    answer = _escape_mdx_text((entry.get("answer") or "").strip())
    permalink = entry.get("permalink") or ""
    date_str = _format_date(entry.get("created_at") or "")

    lines = [f"### Q{index}. {question}", "", answer, ""]
    source_bits = []
    if permalink:
        source_bits.append(f"[Slackで見る]({permalink})")
    if date_str:
        source_bits.append(date_str)
    if source_bits:
        lines.append(f"> 出典: {' ・ '.join(source_bits)}")
        lines.append("")
    return "\n".join(lines)


_EMPTY_BODY = """
## まだデータがありません

このページには、Slack上でのやり取りから集まった質問と回答が今後自動的に表示される予定です。

現時点ではまだ蓄積されたデータがありません。困りごとがある場合は、まず以下のページを確認してください。

- [困ったとき・小ワザ](/docs/help/index)
- [数値が出ない・合わない](/docs/help/data-issues)
"""


def render_mdx(entries: list[dict], generated_at: Optional[datetime] = None) -> str:
    """通過済みエントリから qa/log.mdx の全文を組み立てる（全文置換前提）。"""
    generated_at = generated_at or datetime.now(timezone.utc)
    updated = generated_at.strftime("%Y-%m-%d")
    # 掲載エントリが0件（プレースホルダ状態）のときは draft: true にする。
    # manual リポジトリ側のサイドバー・トップページ・検索は draft: true を除外する
    # フィルタと対になっているため、キー名は "draft" で固定する。
    draft = not entries

    frontmatter = f"""---
title: みんなの質問ログ
category: みんなの質問ログ
description: Slackで交わされた質問と回答をそのまま蓄積するページ（自動生成・全文置換）。
updated: {updated}
draft: {"true" if draft else "false"}
aliases: ["質問ログ", "Q&A", "みんなの質問", "Slackログ"]
---

{{/*
  このページは scripts/qa_export.py（正本は ad_expert_ai リポジトリの
  tools/manual-promotion/qa_export.py）が faq_entries.jsonl を元に
  全文置換で生成しています。
  人手で本文を書き足さないでください（次回生成時に上書きされます）。
*/}}
"""
    if not entries:
        return frontmatter + _EMPTY_BODY

    parts = [
        "\n## みんなの質問ログ\n",
        f"Slack上でのやり取りから集まった質問と回答です（{len(entries)}件・{updated}時点）。\n",
    ]
    for i, e in enumerate(entries, start=1):
        parts.append(_format_entry(e, i))
    return frontmatter + "\n".join(parts)


def generate(
    entries: list[dict],
    client_names: Optional[Iterable[str]] = None,
    generated_at: Optional[datetime] = None,
) -> tuple[str, list[dict], list[dict]]:
    """(mdx全文, 掲載したエントリ, 除外したエントリ) を返す。"""
    passed, rejected = filter_entries(entries, client_names)
    # 新しい順（created_at 降順）に並べる。created_at 欠落は末尾に回す。
    passed_sorted = sorted(passed, key=lambda e: e.get("created_at") or "", reverse=True)
    mdx = render_mdx(passed_sorted, generated_at=generated_at)
    return mdx, passed_sorted, rejected


_ENTRY_HEADING_RE = re.compile(r"^### Q\d+\.", re.MULTILINE)


def count_entries_in_mdx(mdx_text: str) -> int:
    """既存の qa/log.mdx 全文から掲載件数を推定する（`### Qn.` 見出しの数）。

    frontmatter の書式変更などに対して厳密である必要はない。
    「空で上書きされたことに気づけるか」だけが目的。
    """
    return len(_ENTRY_HEADING_RE.findall(mdx_text or ""))


class UnsafeOverwriteError(RuntimeError):
    """生成結果が既存の掲載内容を大きく失わせる可能性があり、書き込みを中止した場合。"""


def write_output(mdx: str, output_path: pathlib.Path) -> None:
    """一時ファイルに書いてから os.replace でアトミックに置き換える。

    書き込み途中でプロセスが落ちても、既存ファイルが空/破損状態になることを防ぐ。
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(
        dir=str(output_path.parent), prefix=f".{output_path.name}.", suffix=".tmp"
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(mdx)
        os.replace(tmp_name, output_path)
    except BaseException:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise


def guard_against_wipeout(
    new_count: int, output_path: pathlib.Path, force: bool = False
) -> Optional[str]:
    """空/大幅減少での上書きを防ぐガード。

    - 生成結果が0件で、既存ファイルに1件以上掲載されている場合
    - 既存の掲載件数から50%以上減っている場合
    のいずれかに該当し、force が立っていなければ、書き込みを中止すべき理由の
    文字列を返す（問題無ければ None）。
    """
    if force:
        return None
    if not output_path.exists():
        return None
    try:
        existing_count = count_entries_in_mdx(output_path.read_text(encoding="utf-8"))
    except OSError:
        return None
    if existing_count <= 0:
        return None
    if new_count == 0:
        return (
            f"生成結果が0件です（既存ファイルには{existing_count}件掲載済み）。"
            "空で上書きすると事故になるため中止しました。--force で上書きを強制できます。"
        )
    if new_count <= existing_count * 0.5:
        return (
            f"掲載件数が既存{existing_count}件から{new_count}件へ50%以上減少しています。"
            "取得失敗の可能性があるため中止しました。--force で上書きを強制できます。"
        )
    return None


# ────────────────────────────────────────────────────────────
# CLI
# ────────────────────────────────────────────────────────────
class ClientNamesError(RuntimeError):
    """--client-names に指定されたパスが不正（未存在/空）な場合に送出する。"""


def _load_client_names(path: Optional[str]) -> list[str]:
    """顧客名マスタを読み込む。

    --client-names が指定されたのに読み込めない/空という状態は、
    「マスタを見ているつもりでヒューリスティックだけで判定していた」という
    事故に直結するため、無言で空マスタに縮退させず必ずエラーにする。
    """
    if not path:
        return []
    p = pathlib.Path(path)
    if not p.exists():
        raise ClientNamesError(f"--client-names に指定されたファイルが存在しません: {p}")
    names = [line.strip() for line in p.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not names:
        raise ClientNamesError(f"--client-names に指定されたファイルが空です: {p}")
    return names


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = parser.add_mutually_exclusive_group(required=True)
    src.add_argument("--jsonl", help="faq_entries.jsonl のローカルパス")
    src.add_argument(
        "--api-url",
        help="読み取り専用エクスポートAPIのURL（例: https://<backend>/api/slack/faq_export）",
    )
    parser.add_argument(
        "--token",
        default=None,
        help="--api-url 使用時の Bearer トークン。未指定時は環境変数 FAQ_EXPORT_TOKEN を使う",
    )
    parser.add_argument(
        "--client-names",
        default=None,
        help=(
            "顧客名マスタ（1行1名のテキストファイル、任意）。"
            "[2026-08-05] G2チェック自体を無効化したため、このオプションは実質使われない"
            "（読み込み検証は行うが、掲載可否には影響しない）"
        ),
    )
    parser.add_argument(
        "--output",
        default=None,
        help=(
            "出力先 mdx パス。未指定時は環境変数 QA_EXPORT_MANUAL_REPO "
            "（manual リポジトリへの絶対パス）から解決する。"
            "manual は ad_expert_ai とは別リポジトリのため、どちらも未指定だとエラーになる"
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="ファイルに書かず、生成結果を標準出力に表示するだけに留める",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="生成結果が0件/既存より大幅減少していても、確認ガードを無視して上書きする",
    )
    args = parser.parse_args(argv)

    if args.jsonl:
        entries = load_entries_from_jsonl(pathlib.Path(args.jsonl))
    else:
        token = args.token or os.getenv("FAQ_EXPORT_TOKEN", "")
        if not token:
            print(
                "エラー: --api-url 使用時は --token または環境変数 FAQ_EXPORT_TOKEN が必要です",
                file=sys.stderr,
            )
            return 2
        entries = load_entries_from_api(args.api_url, token)

    try:
        client_names = _load_client_names(args.client_names)
    except ClientNamesError as exc:
        print(f"エラー: {exc}", file=sys.stderr)
        return 2

    mdx, passed, rejected = generate(entries, client_names)

    if rejected:
        print(f"[qa_export] G2チェックで除外: {len(rejected)}件", file=sys.stderr)
        for r in rejected:
            print(f"  - entry_id={r.get('entry_id')} reasons={r.get('_g2_reasons')}", file=sys.stderr)

    if args.dry_run:
        print(mdx)
        print(f"[qa_export] (dry-run) 掲載対象 {len(passed)}件 / 除外 {len(rejected)}件", file=sys.stderr)
        return 0

    if args.output:
        output_path = pathlib.Path(args.output)
    else:
        try:
            output_path = _resolve_default_output()
        except OutputPathError as exc:
            print(f"エラー: {exc}", file=sys.stderr)
            return 2

    reason = guard_against_wipeout(len(passed), output_path, force=args.force)
    if reason:
        print(f"エラー: {reason}", file=sys.stderr)
        return 3

    write_output(mdx, output_path)
    print(f"[qa_export] 出力: {output_path}（掲載 {len(passed)}件 / 除外 {len(rejected)}件）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
