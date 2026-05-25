import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  variant?: "default" | "cyan" | "violet" | "success" | "warning" | "error" | "ghost";
  size?: "sm" | "md";
  className?: string;
}

export default function Badge({ children, variant = "default", size = "sm", className }: Props) {
  const variants = {
    default: "bg-white/[0.06] text-gray-300 border-white/[0.08]",
    cyan: "bg-signal-cyan/15 text-signal-cyan border-signal-cyan/30",
    violet: "bg-signal-violet/15 text-signal-violet border-signal-violet/30",
    success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    error: "bg-red-500/15 text-red-400 border-red-500/30",
    ghost: "bg-transparent text-gray-400 border-white/[0.08]",
  };

  const sizes = {
    sm: "text-[11px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium leading-none",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}

export function ScoreBadge({ score, size = "md" }: { score?: number | null; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-xs px-2 py-0.5", md: "text-sm px-2.5 py-1", lg: "text-base px-3 py-1.5" };

  const getStyle = () => {
    if (score == null) return "bg-white/[0.06] text-gray-400 border-white/[0.08]";
    if (score >= 80) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    if (score >= 50) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    return "bg-red-500/15 text-red-400 border-red-500/30";
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border font-mono font-bold tracking-tight score-badge",
        getStyle(),
        sizes[size]
      )}
    >
      {score != null ? `${score}` : "—"}
      <span className="ml-0.5 font-sans text-[10px] opacity-70">%</span>
    </span>
  );
}
