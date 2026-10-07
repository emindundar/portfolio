import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

type Props = {
  href: string;
  variant?: "primary" | "ghost";
  className?: string;
  children: React.ReactNode;
};

export function Button({ href, variant = "primary", className, children }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 border px-5 font-mono text-sm uppercase tracking-wide transition-colors duration-200",
        variant === "primary" && "border-accent bg-accent text-bg hover:bg-transparent hover:text-accent",
        variant === "ghost" && "border-line text-fg hover:border-fg",
        className,
      )}
    >
      {children}
    </Link>
  );
}
