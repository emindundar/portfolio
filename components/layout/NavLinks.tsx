"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { isActive } from "./isActive";

export type NavItem = { href: string; label: string; hideOnMobile?: boolean };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <>
      {items.map(({ href, label, hideOnMobile }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`${hideOnMobile ? "hidden md:inline-flex" : "inline-flex"} min-h-11 shrink-0 items-center hover:text-fg ${active ? "text-fg" : "text-muted"}`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
