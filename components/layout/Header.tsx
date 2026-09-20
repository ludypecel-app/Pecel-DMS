"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Bell, Search, Menu, X, LogOut } from "lucide-react";
import { navigation, type UserRole } from "@/config/navigation";

interface NotificationItem {
  id: string;
  message: string;
  link?: string;
  read_at?: string;
  created_at: string;
}

interface HeaderProps {
  role: UserRole;
  userName: string;
}

// Notifikasi lama (dibuat sebelum perbaikan) masih tersimpan dengan link
// "/assignments/{id}" — halaman detail per-assignment itu tidak pernah ada
// di app ini (cuma ada /assignments/{id}/review & /visit), jadi selalu 404.
// Diarahkan balik ke daftar Penugasan yang memang ada.
function resolveLink(link?: string): string | undefined {
  if (link && /^\/assignments\/[^/]+$/.test(link)) return "/assignments";
  return link;
}

// Judul halaman untuk rute yang tidak ada langsung di menu navigasi
// (detail/aksi turunan dari menu utama). Dicek LEBIH DULU daripada menu
// navigasi supaya rute turunan seperti /assignments/kanban tidak ikut
// tertangkap oleh pencocokan awalan menu "Penugasan" (/assignments).
const EXTRA_TITLES: { match: RegExp; title: string }[] = [
  { match: /^\/orders\/new/, title: "Pesanan Baru" },
  { match: /^\/orders\/[^/]+$/, title: "Detail Pesanan" },
  { match: /^\/assignments\/kanban/, title: "Kanban Penugasan" },
  { match: /^\/assignments\/[^/]+\/review/, title: "Review Kunjungan" },
  { match: /^\/assignments\/[^/]+\/visit/, title: "Kunjungan" },
];

function useTitle(pathname: string) {
  const extra = EXTRA_TITLES.find((e) => e.match.test(pathname));
  if (extra) return extra.title;
  const navMatch = navigation
    .flatMap((s) => s.items)
    .find((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
  return navMatch?.label ?? "Pecel DMS";
}

// Topbar Pulsar — hamburger (mobile saja, membuka menu selebihnya di luar 4
// tab utama), judul halaman, pencarian (desktop), notifikasi, dan avatar
// profil/keluar (tablet & mobile — di desktop sudah ada di footer Sidebar).
export function Header({ role, userName }: HeaderProps) {
  const pathname = usePathname();
  const title = useTitle(pathname);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const unreadCount = items.filter((n) => !n.read_at).length;

  // Menu sekunder untuk sheet hamburger mobile: bagian selain 4 tab utama
  // (Dashboard/Pesanan/Penugasan/Laporan) yang sudah ada di bottom tab bar.
  const secondarySections = navigation
    .filter((s) => s.title)
    .map((s) => ({ ...s, items: s.items.filter((item) => item.roles.includes(role)) }))
    .filter((s) => s.items.length > 0);

  const fetchNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((json) => setItems(json.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Tutup panel notifikasi/profil saat klik di luar areanya.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileOpen && profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen, profileOpen]);

  function markAsRead(item: NotificationItem) {
    setNotifOpen(false);
    if (item.read_at) return;
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)));
    fetch(`/api/notifications/${item.id}/read`, { method: "POST" }).catch(() => {});
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface-raised px-4 md:h-16 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {secondarySections.length > 0 && (
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="-ml-1.5 rounded-md p-1.5 text-ink hover:bg-surface-page md:hidden"
            aria-label="Buka menu lainnya"
          >
            <Menu size={20} />
          </button>
        )}
        <span className="h3 truncate">{title}</span>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <div className="relative hidden lg:block">
          <Search size={15} className="pointer-events-none absolute inset-y-0 left-3 my-auto text-ink-muted" />
          <input
            type="text"
            placeholder="Cari..."
            className="w-64 rounded-md border border-border bg-surface-page py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen((v) => !v);
              if (!notifOpen) fetchNotifications();
            }}
            className="relative rounded-full p-2 text-ink-muted hover:bg-surface-page"
            aria-label="Notifikasi"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="fixed inset-x-4 top-16 z-50 max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-surface-raised shadow-md sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="h3 !text-[15px]">Notifikasi</span>
                {unreadCount > 0 && <span className="caption text-ink-muted">{unreadCount} belum dibaca</span>}
              </div>
              {items.length === 0 ? (
                <p className="p-4 text-center text-sm text-ink-muted">Belum ada notifikasi.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((item) => {
                    const link = resolveLink(item.link);
                    const content = (
                      <div className="flex items-start gap-2 px-4 py-3">
                        {!item.read_at && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                        <div className={item.read_at ? "pl-3.5" : ""}>
                          <p className="text-sm text-ink">{item.message}</p>
                          <p className="body-sm mt-0.5 text-ink-muted">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: idLocale })}
                          </p>
                        </div>
                      </div>
                    );
                    return (
                      <li key={item.id}>
                        {link ? (
                          <Link href={link} onClick={() => markAsRead(item)} className="block hover:bg-surface-page">
                            {content}
                          </Link>
                        ) : (
                          <button type="button" onClick={() => markAsRead(item)} className="block w-full text-left hover:bg-surface-page">
                            {content}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Avatar profil/keluar — hanya tablet & mobile, di desktop sudah
            ada di footer Sidebar supaya tidak dobel. */}
        <div className="relative lg:hidden" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-100 text-sm font-medium text-accent"
            aria-label="Profil"
          >
            {userName.charAt(0).toUpperCase()}
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-border bg-surface-raised shadow-md">
              <div className="border-b border-border px-3 py-2.5">
                <p className="truncate text-sm font-medium text-ink">{userName}</p>
                <p className="caption text-ink-muted">{role === "admin" ? "Admin" : "Sales"}</p>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-danger hover:bg-surface-page"
              >
                <LogOut size={16} />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sheet menu lainnya — mobile saja */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 flex items-end md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} aria-hidden />
          <div className="relative max-h-[80vh] w-full overflow-y-auto rounded-t-xl bg-surface-raised p-4 pb-6 shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <span className="h3">Menu Lainnya</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-full p-1.5 text-ink-muted hover:bg-surface-page"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              {secondarySections.map((section) => (
                <div key={section.title}>
                  <p className="label px-1 pb-1.5 uppercase tracking-wide text-ink-muted">{section.title}</p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className="flex h-11 items-center gap-3 rounded-md px-3 text-sm text-ink hover:bg-surface-page"
                        >
                          <Icon size={18} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
