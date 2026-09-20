"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Bell, Search } from "lucide-react";
import { navigation } from "@/config/navigation";

interface NotificationItem {
  id: string;
  message: string;
  link?: string;
  read_at?: string;
  created_at: string;
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

// Topbar Pulsar — judul halaman (diturunkan dari rute), pencarian global
// (mulai lg/desktop saja), dan notifikasi. Sama persis dipakai di ketiga
// mode; avatar & tombol keluar ada di Sidebar (desktop) / sheet "Lainnya"
// (mobile & tablet lewat rail), jadi topbar ini tidak perlu berubah bentuk.
export function Header() {
  const pathname = usePathname();
  const title = useTitle(pathname);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const unreadCount = items.filter((n) => !n.read_at).length;

  const fetchNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((json) => setItems(json.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Tutup panel saat klik di luar area panel/tombol lonceng.
  useEffect(() => {
    if (!panelOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelOpen]);

  function markAsRead(item: NotificationItem) {
    setPanelOpen(false);
    if (item.read_at) return;
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)));
    fetch(`/api/notifications/${item.id}/read`, { method: "POST" }).catch(() => {});
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface-raised px-4 md:h-16 md:px-6">
      <span className="h3 truncate">{title}</span>

      <div className="flex items-center gap-3 md:gap-4">
        <div className="relative hidden lg:block">
          <Search size={15} className="pointer-events-none absolute inset-y-0 left-3 my-auto text-ink-muted" />
          <input
            type="text"
            placeholder="Cari..."
            className="w-64 rounded-md border border-border bg-surface-page py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>

        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={() => {
              setPanelOpen((v) => !v);
              if (!panelOpen) fetchNotifications();
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

          {panelOpen && (
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
                        {item.link ? (
                          <Link href={item.link} onClick={() => markAsRead(item)} className="block hover:bg-surface-page">
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
      </div>
    </header>
  );
}
