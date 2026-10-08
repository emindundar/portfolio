import type { ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { slugify } from "@/lib/slugify";
import { FlowDiagram } from "@/components/ui/FlowDiagram";
import { Metrics } from "@/components/ui/Metrics";
import { DeviceFrame } from "@/components/ui/DeviceFrame";

function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) return textOf((node as React.ReactElement<{ children?: React.ReactNode }>).props.children);
  return "";
}

function A({ href = "", children, ...rest }: ComponentProps<"a">) {
  const cls = "text-accent underline underline-offset-4";
  const t = useTranslations("Common");
  const external = /^(https?:)?\/\//.test(href);
  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noreferrer noopener" {...rest}>
        {children}
        <span className="sr-only"> ({t("newTab")})</span>
      </a>
    );
  }
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={cls} {...rest}>
      {children}
    </a>
  );
}

function H2({ children, ...rest }: ComponentProps<"h2">) {
  const id = slugify(textOf(children));
  return (
    <h2 id={id || undefined} className="mt-12 mb-4 font-display text-2xl md:text-3xl" {...rest}>
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
