"use client";

import { useEffect, useState } from "react";
import { Bell, Menu, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

interface HeaderProps {
  userName: string;
  roleLabel: string;
  onOpenMobileNav: () => void;
}

export function Header({ userName, roleLabel, onOpenMobileNav }: HeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((json) => {
        const items: { read_at?: string }[] = json.data ?? [];
        setUnreadCount(items.filter((n) => !n.read_at).length);
      })
      .catch(() => {});
  }, []);

  return (
    <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 md:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 md:hidden"
        aria-label="Buka menu"
      >
        <Menu size={20} />
      </button>

      <div className="hidden md:block" />

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="relative rounded-md p-2 text-neutral-600 hover:bg-neutral-100"
          aria-label="Notifikasi"
        >
          <Bell size={19} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-turmeric-600 px-1 text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2.5 border-l border-neutral-200 pl-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-100 text-sm font-medium text-forest-700">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden text-sm leading-tight sm:block">
            <p className="font-medium text-neutral-900">{userName}</p>
            <p className="text-xs text-neutral-500">{roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Keluar"
            title="Keluar"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
