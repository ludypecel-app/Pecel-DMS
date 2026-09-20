"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { navigation } from "@/config/navigation";

// Judul halaman untuk rute yang tidak ada langsung di menu navigasi
// (detail/aksi turunan dari menu utama).
const EXTRA_TITLES: { match: RegExp; title: string }[] = [
  { match: /^\/orders\/new/, title: "Pesanan Baru" },
  { match: /^\/orders\/[^/]+$/, title: "Detail Pesanan" },
  { match: /^\/assignments\/kanban/, title: "Kanban Penugasan" },
  { match: /^\/assignments\/[^/]+\/review/, title: "Review Kunjungan" },
  { match: /^\/assignments\/[^/]+\/visit/, title: "Kunjungan" },
];

function useTitle(pathname: string) {
  const navMatch = navigation
    .flatMap((s) => s.items)
    .find((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
  if (navMatch) return navMatch.label;
  const extra = EXTRA_TITLES.find((e) => e.match.test(pathname));
  return extra?.title ?? "Pecel DMS";
}

// Topbar Pulsar — judul halaman (diturunkan dari rute), pencarian global
// (mulai lg/desktop saja), dan notifikasi. Sama persis dipakai di ketiga
// mode; avatar & tombol keluar ada di Sidebar (desktop) / sheet "Lainnya"
// (mobile & tablet lewat rail), jadi topbar ini tidak perlu berubah bentuk.
export function Header() {
  const pathname = usePathname();
  const title = useTitle(pathname);
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
        <button
          type="button"
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
      </div>
    </header>
  );
}
