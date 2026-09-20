"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { navigation, type UserRole } from "@/config/navigation";

interface RailProps {
  role: UserRole;
  className?: string;
}

// Rail ikon untuk mode tablet (md–lg) — versi ringkas dari Sidebar, hanya
// ikon dengan tooltip nama menu lewat atribut title.
export function Rail({ role, className }: RailProps) {
  const pathname = usePathname();
  const items = navigation.flatMap((section) => section.items).filter((item) => item.roles.includes(role));

  return (
    <aside
      className={clsx(
        "flex h-full w-[72px] flex-col items-center gap-2 border-r border-border bg-surface-raised py-5",
        className
      )}
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            className={clsx(
              "flex h-11 w-11 items-center justify-center rounded-md transition-colors",
              active ? "bg-accent text-white" : "text-ink-muted hover:bg-surface-page hover:text-ink"
            )}
          >
            <Icon size={19} />
          </Link>
        );
      })}
    </aside>
  );
}
