"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { clsx } from "clsx";
import { MoreHorizontal, LogOut, X } from "lucide-react";
import { navigation, type UserRole } from "@/config/navigation";

interface BottomTabsProps {
  role: UserRole;
  className?: string;
}

// Bottom tab bar untuk mode mobile — 3 menu utama + "Lainnya" yang membuka
// bottom sheet berisi sisa menu (Master Data, Pengaturan, Keluar).
export function BottomTabs({ role, className }: BottomTabsProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const allItems = navigation.flatMap((section) => section.items).filter((item) => item.roles.includes(role));
  const primary = allItems.slice(0, 3);
  const rest = allItems.slice(3);

  return (
    <>
      <nav
        className={clsx(
          "fixed inset-x-0 bottom-0 z-30 flex h-16 items-center border-t border-border bg-surface-raised px-2",
          className
        )}
      >
        {primary.map((item) => {
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
        {rest.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 text-ink-muted"
          >
            <MoreHorizontal size={20} />
            <span className="caption text-[11px]">Lainnya</span>
          </button>
        )}
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 flex items-end md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} aria-hidden />
          <div className="relative w-full rounded-t-xl bg-surface-raised p-4 pb-6 shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <span className="h3">Menu Lainnya</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-full p-1.5 text-ink-muted hover:bg-surface-page"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-0.5">
              {rest.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex h-11 items-center gap-3 rounded-md px-3 text-sm text-ink hover:bg-surface-page"
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-danger hover:bg-surface-page"
              >
                <LogOut size={18} />
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
