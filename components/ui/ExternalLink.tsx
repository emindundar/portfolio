import { cn } from "@/lib/utils/cn";

type Props = {
  href: string;
  /** Common.newTab, e.g. "opens in a new tab": read after the label, never shown. */
  newTabLabel: string;
  className?: string;
  /** Adds a visible, aria-hidden "↗". */
  arrow?: boolean;
  /** Drops the default 44px flex target + underline (inline text, footer nav): only `className` applies. */
  unstyled?: boolean;
  children: React.ReactNode;
};

const BASE = "inline-flex min-h-11 items-center underline underline-offset-4";

/**
 * The only new-tab link on the site. Accessible name: "<children> (<newTabLabel>)".
 * No "use client" and no server-only imports, so client components (the contact form's alert) can use it too.
 */
export function ExternalLink({ href, newTabLabel, className, arrow = false, unstyled = false, children }: Props) {
  // Content and props are trusted but not blindly: javascript:, data: or plain http never reach a new-tab link.
  // Pages are prerendered, so a bad URL fails the build instead of shipping. mailto: stays a plain <a>.
  if (!/^https:\/\//.test(href)) throw new Error(`ExternalLink: only https URLs are allowed, got ${href}`);
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={unstyled ? className : cn(BASE, className)}>
      {/* One flex item, space in normal flow: whitespace at the start of the absolutely positioned sr-only box is dropped from the name. */}
      <span>
        {children}
        {arrow && <span aria-hidden="true">&nbsp;↗</span>}{" "}
        <span className="sr-only">({newTabLabel})</span>
      </span>
    </a>
  );
}
