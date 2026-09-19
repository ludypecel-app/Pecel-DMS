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
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500">{label}</p>
        <Icon
          size={16}
          className={clsx(
            tone === "danger" && "text-red-500",
            tone === "warning" && "text-turmeric-600",
            tone === "default" && "text-forest-600"
          )}
        />
      </div>
      <p
        className={clsx(
          "mt-1 text-2xl font-semibold",
          tone === "danger" ? "text-red-600" : tone === "warning" ? "text-turmeric-700" : "text-neutral-900"
        )}
      >
        {value}
      </p>
    </div>
  );
}
