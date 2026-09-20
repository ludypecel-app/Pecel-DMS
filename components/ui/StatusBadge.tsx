import { clsx } from "clsx";
import type { ActiveStatus } from "@/types/entities";

export function StatusBadge({ status }: { status: ActiveStatus }) {
  const active = status === "active";
  return (
    <span
      className={clsx(
        "caption inline-flex items-center rounded-full px-2 py-0.5",
        active ? "bg-success/15 text-success" : "bg-ink-muted/10 text-ink-muted"
      )}
    >
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}
