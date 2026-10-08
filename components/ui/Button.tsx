import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

type Props = {
  href: string;
  variant?: "primary" | "ghost";
  className?: string;
  children: React.ReactNode;
};

export function buttonClasses(variant: "primary" | "ghost" = "primary", className?: string) {
  return cn(
    "inline-flex min-h-11 items-center gap-2 border px-5 font-mono text-sm uppercase tracking-wide transition-colors duration-200",
    variant === "primary" && "border-accent bg-accent text-bg hover:bg-transparent hover:text-accent",
    variant === "ghost" && "border-line text-fg hover:border-fg",
    className,
  );
}

export function Button({ href, variant = "primary", className, children }: Props) {
  return (
    <Link href={href} className={buttonClasses(variant, className)}>
      {children}
    </Link>
  );
}

/** Plain anchor styled as a Button, for files (a locale-prefixed Link would break the URL). */
export function DownloadButton({ href, variant = "ghost", className, children }: Props) {
  return (
    <a href={href} download className={buttonClasses(variant, className)}>
      {children}
    </a>
  );
}
