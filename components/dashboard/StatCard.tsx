import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger";
}

export function StatCard({ label, value, icon: Icon, tone = "default" }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <p className="body-sm text-ink-muted">{label}</p>
        <div
          className={clsx(
            "flex h-7 w-7 items-center justify-center rounded-md",
            tone === "danger" && "bg-danger/10 text-danger",
            tone === "warning" && "bg-warning/15 text-warning",
            tone === "default" && "bg-accent/10 text-accent"
          )}
        >
          <Icon size={15} />
        </div>
      </div>
      <p
        className={clsx(
          "mt-2 text-[22px] font-semibold leading-7",
          tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-ink"
        )}
      >
        {value}
      </p>
    </div>
  );
}
