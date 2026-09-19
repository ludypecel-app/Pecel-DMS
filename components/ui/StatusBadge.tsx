import { clsx } from "clsx";
import type { ActiveStatus } from "@/types/entities";

export function StatusBadge({ status }: { status: ActiveStatus }) {
  const active = status === "active";
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        active ? "bg-forest-100 text-forest-700" : "bg-neutral-100 text-neutral-500"
      )}
    >
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}
