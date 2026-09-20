"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Lebar dialog di desktop — "md" (bawaan, form pendek) s/d "xl" (form
   * panjang seperti Buat Pesanan yang punya beberapa baris produk). */
  size?: "md" | "lg" | "xl";
}

const SIZE_CLASS: Record<NonNullable<ModalProps["size"]>, string> = {
  md: "md:max-w-md",
  lg: "md:max-w-lg",
  xl: "md:max-w-2xl",
};

export function Modal({ title, open, onClose, children, size = "md" }: ModalProps) {
  // Modal di-render lewat portal langsung ke document.body. Sebelumnya modal
  // ikut ter-nest di dalam <main> yang punya overflow-y-auto (lihat
  // AppShell) — di sejumlah browser mobile, elemen "fixed" yang berada di
  // dalam container yang sedang discroll tidak konsisten menutupi seluruh
  // viewport (area topbar/header ikut terlihat terang, tidak ikut digelapkan
  // oleh backdrop). Merender lewat portal ke <body> membuat backdrop selalu
  // dihitung relatif ke viewport sungguhan, jadi menutupi seluruh halaman.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Kunci scroll halaman di belakang modal supaya konten yang tampak lewat
  // celah tidak ikut bisa discroll selagi modal terbuka.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className={`relative max-h-[90vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 shadow-xl md:rounded-xl ${SIZE_CLASS[size]}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-ink-muted hover:bg-surface-page"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
