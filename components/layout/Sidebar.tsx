"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Sprout } from "lucide-react";
import { navigation, type UserRole } from "@/config/navigation";

interface SidebarProps {
  role: UserRole;
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ role, className, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className={clsx("flex h-full flex-col bg-forest-900 text-forest-50", className)}>
      <div className="flex items-center gap-2 px-5 py-5">
        <Sprout size={22} className="text-turmeric-400" />
        <span className="text-[15px] font-semibold tracking-tight">Pecel DMS</span>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {navigation.map((section) => {
          const items = section.items.filter((item) => item.roles.includes(role));
          if (items.length === 0) return null;

          return (
            <div key={section.title ?? "main"}>
              {section.title && (
                <p className="px-3 pb-2 text-xs font-medium text-forest-400">
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
                      onClick={onNavigate}
                      className={clsx(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-forest-700 text-white"
                          : "text-forest-100/80 hover:bg-forest-700/50 hover:text-white"
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
    </nav>
  );
}
