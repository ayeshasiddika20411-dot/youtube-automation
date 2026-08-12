import { cn } from "@/lib/utils/cn";

type Variant = "default" | "success" | "warning" | "destructive" | "muted";

const variants: Record<Variant, string> = {
  default:
    "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  destructive: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  muted: "bg-transparent text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
