"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Plus } from "lucide-react";
import { navigation, type UserRole } from "@/config/navigation";

interface BottomTabsProps {
  role: UserRole;
  className?: string;
}

function TabLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ElementType; active: boolean }) {
  return (
    <Link href={href} className="flex flex-1 flex-col items-center gap-1">
      <span
        className={clsx(
          "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
          active ? "bg-accent/15 text-accent" : "text-ink-muted"
        )}
      >
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
      </span>
      <span className={clsx("caption text-[11px]", active ? "font-semibold text-accent" : "text-ink-muted")}>
        {label}
      </span>
    </Link>
  );
}

// Bottom tab bar mobile — akses langsung ke menu utama (Dashboard, Pesanan,
// Penugasan, Laporan untuk admin; Dashboard, Penugasan saja untuk sales),
// plus tombol cepat "Buat Pesanan" mengambang di tengah (admin saja — hanya
// admin yang boleh membuat pesanan). Menu selebihnya (Master Data,
// Pengaturan) dibuka lewat hamburger di topbar.
export function BottomTabs({ role, className }: BottomTabsProps) {
  const pathname = usePathname();
  const items = navigation
    .flatMap((section) => section.items)
    .filter((item) => item.roles.includes(role))
    .slice(0, 4);

  const showQuickAdd = role === "admin";
  const half = Math.ceil(items.length / 2);
  const leftItems = showQuickAdd ? items.slice(0, half) : items;
  const rightItems = showQuickAdd ? items.slice(half) : [];

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav
      className={clsx(
        "fixed inset-x-0 bottom-0 z-30 flex h-16 items-center border-t border-border bg-surface-raised px-2",
        className
      )}
    >
      {leftItems.map((item) => (
        <TabLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={isActive(item.href)} />
      ))}

      {showQuickAdd && (
        <div className="relative flex w-14 flex-none justify-center">
          <Link
            href="/orders/new"
            aria-label="Buat Pesanan"
            className="absolute -top-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-md ring-4 ring-surface-raised transition-transform active:scale-95"
          >
            <Plus size={26} />
          </Link>
        </div>
      )}

      {rightItems.map((item) => (
        <TabLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={isActive(item.href)} />
      ))}
    </nav>
  );
}
