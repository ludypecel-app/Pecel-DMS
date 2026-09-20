"use client";

import Link from "next/link";
import { clsx } from "clsx";

/**
 * Sistem tombol terpadu — dipakai di seluruh aplikasi supaya hierarki visual
 * konsisten: PRIMER untuk aksi utama/konfirmasi di setiap halaman/modal
 * (mis. Simpan, Tugaskan, Terima, Konfirmasi Picking Selesai), TERSIER
 * untuk aksi pendukung/berdampak lebih kecil (mis. Batal, Edit, link baris
 * tabel, navigasi tab).
 *
 * - `variant="primary"` → latar terisi penuh (warna solid + teks putih).
 * - `variant="tertiary"` → tanpa latar solid (teks berwarna saja, atau
 *   versi "ghost" dengan padding & hover halus lewat `inline={false}`).
 * - `tone` menentukan warna: "brand" (ungu, aksi normal), "danger" (merah,
 *   aksi merusak/menolak/membatalkan), "neutral" (abu-abu, aksi netral
 *   seperti Batal/Tutup).
 * - `inline` (khusus tertiary): true = tampil sebagai teks bergaris bawah
 *   saat hover, tanpa padding — dipakai untuk aksi di dalam baris
 *   tabel/card. false (bawaan) = tampil sebagai tombol "ghost" berpadding
 *   dengan hover bg halus — dipakai untuk tombol mandiri (mis. Batal,
 *   Export CSV, navigasi tab).
 */

export type ButtonVariant = "primary" | "tertiary";
export type ButtonTone = "brand" | "danger" | "neutral";
export type ButtonSize = "sm" | "md";

interface ButtonStyleProps {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  inline?: boolean;
  size?: ButtonSize;
}

export function buttonClasses({
  variant = "primary",
  tone = "brand",
  inline = false,
  size = "md",
}: ButtonStyleProps = {}): string {
  const base = "inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

  if (variant === "primary") {
    const sizeCls = size === "sm" ? "rounded-md px-3 py-1.5 text-xs" : "rounded-md px-4 py-2 text-sm";
    const toneCls = tone === "danger" ? "bg-danger text-white hover:bg-danger/90" : "bg-forest-700 text-white hover:bg-forest-600";
    return clsx(base, sizeCls, toneCls);
  }

  // Tertiary — teks inline (dipakai di dalam baris tabel/card)
  if (inline) {
    const toneCls =
      tone === "danger" ? "text-danger" : tone === "neutral" ? "text-ink-muted" : "text-forest-700";
    return clsx(base, "text-sm", toneCls, "hover:underline");
  }

  // Tertiary — "ghost" berpadding (dipakai sebagai tombol mandiri)
  const sizeCls = size === "sm" ? "rounded-md px-3 py-1.5 text-xs" : "rounded-md px-4 py-2 text-sm";
  const toneCls =
    tone === "danger"
      ? "text-danger hover:bg-danger/10"
      : tone === "neutral"
        ? "text-ink-muted hover:bg-surface-page"
        : "text-forest-700 hover:bg-forest-50";
  return clsx(base, sizeCls, toneCls);
}

interface ButtonProps extends ButtonStyleProps, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size"> {}

/** Tombol native `<button>` — dipakai untuk aksi (submit form, onClick). */
export function Button({ variant, tone, inline, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={clsx(buttonClasses({ variant, tone, inline, size }), className)} {...props} />;
}

interface ButtonLinkProps extends ButtonStyleProps, React.ComponentProps<typeof Link> {}

/** Tombol berbasis `<Link>` — dipakai untuk aksi yang berpindah halaman
 * (mis. "Isi Data Kunjungan", "Lihat Review") tapi tetap perlu tampil
 * sebagai tombol primer/tersier, bukan link biasa. */
export function ButtonLink({ variant, tone, inline, size, className, ...props }: ButtonLinkProps) {
  return <Link className={clsx(buttonClasses({ variant, tone, inline, size }), className)} {...props} />;
}
