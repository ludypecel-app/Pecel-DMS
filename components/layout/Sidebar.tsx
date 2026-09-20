"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { clsx } from "clsx";
import { Sprout, LogOut } from "lucide-react";
import { navigation, type UserRole } from "@/config/navigation";

interface SidebarProps {
  role: UserRole;
  userName: string;
  className?: string;
}

// Sidebar desktop (lg+) — tema terang mengikuti sistem desain "Pulsar":
// permukaan putih, aksen ungu pada item aktif, label seksi huruf kapital tipis.
export function Sidebar({ role, userName, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={clsx(
        "flex h-full flex-col justify-between border-r border-border bg-surface-raised py-6",
        className
      )}
    >
      <div className="flex flex-col gap-5 overflow-y-auto px-4">
        <div className="flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-white">
            <Sprout size={18} />
          </div>
          <span className="h3">Pecel DMS</span>
        </div>

        {navigation.map((section) => {
          const items = section.items.filter((item) => item.roles.includes(role));
          if (items.length === 0) return null;

          return (
            <div key={section.title ?? "main"}>
              {section.title && (
                <p className="label px-3 pb-2 uppercase tracking-wide text-ink-muted">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                        active
                          ? "bg-accent text-white"
                          : "text-ink-muted hover:bg-surface-page hover:text-ink"
                      )}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2.5 border-t border-border px-4 pt-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-100 text-sm font-medium text-accent">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 truncate text-sm leading-tight">
          <p className="truncate font-medium text-ink">{userName}</p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-full p-1.5 text-ink-muted hover:bg-surface-page"
          aria-label="Keluar"
          title="Keluar"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
