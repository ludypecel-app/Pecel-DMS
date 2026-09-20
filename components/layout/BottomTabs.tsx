"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { navigation, type UserRole } from "@/config/navigation";

interface BottomTabsProps {
  role: UserRole;
  className?: string;
}

// Bottom tab bar mobile — akses langsung ke menu utama (Dashboard, Pesanan,
// Penugasan, Laporan untuk admin; Dashboard, Penugasan saja untuk sales).
// Menu selebihnya (Master Data, Pengaturan) dibuka lewat hamburger di topbar.
export function BottomTabs({ role, className }: BottomTabsProps) {
  const pathname = usePathname();
  const items = navigation
    .flatMap((section) => section.items)
    .filter((item) => item.roles.includes(role))
    .slice(0, 4);

  return (
    <nav
      className={clsx(
        "fixed inset-x-0 bottom-0 z-30 flex h-16 items-center border-t border-border bg-surface-raised px-2",
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
            className={clsx(
              "flex flex-1 flex-col items-center gap-0.5",
              active ? "text-accent" : "text-ink-muted"
            )}
          >
            <Icon size={20} />
            <span className="caption text-[11px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
