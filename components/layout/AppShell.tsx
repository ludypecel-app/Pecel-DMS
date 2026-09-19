"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import type { UserRole } from "@/config/navigation";

interface AppShellProps {
  role: UserRole;
  userName: string;
  children: React.ReactNode;
}

// Layout responsif: sidebar tetap terlihat di desktop (md+),
// menjadi off-canvas drawer yang dibuka lewat tombol hamburger di mobile.
export function AppShell({ role, userName, children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} className="hidden w-64 shrink-0 md:flex" />

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-72">
            <Sidebar role={role} className="h-full" onNavigate={() => setMobileNavOpen(false)} />
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1.5 text-forest-100 hover:bg-forest-700"
              aria-label="Tutup menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          userName={userName}
          roleLabel={role === "admin" ? "Admin" : "Sales"}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
