import type { ComponentProps } from "react";
import { FlowDiagram } from "@/components/ui/FlowDiagram";
import { Metrics } from "@/components/ui/Metrics";
import { DeviceFrame } from "@/components/ui/DeviceFrame";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, "i")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) return textOf((node as React.ReactElement<{ children?: React.ReactNode }>).props.children);
  return "";
}

function A({ href = "", children, ...rest }: ComponentProps<"a">) {
  const external = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      className="text-accent underline underline-offset-4"
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      {...rest}
    >
      {children}
    </a>
  );
}

function H2({ children, ...rest }: ComponentProps<"h2">) {
  return (
    <h2 id={slugify(textOf(children))} className="mt-12 mb-4 font-display text-2xl md:text-3xl" {...rest}>
      {children}
    </h2>
  );
}

export const mdxComponents = {
  FlowDiagram,
  Metrics,
  DeviceFrame,
  a: A,
  h2: H2,
} as unknown as Record<string, React.ComponentType>;
