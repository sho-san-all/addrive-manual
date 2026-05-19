import type { MDXComponents } from "mdx/types";
import { Callout } from "@/components/Callout";
import { ZoomableImage } from "@/components/ZoomableImage";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Callout,
    img: (props) => (
      <ZoomableImage
        src={typeof props.src === "string" ? props.src : undefined}
        alt={props.alt}
      />
    ),
  };
}
