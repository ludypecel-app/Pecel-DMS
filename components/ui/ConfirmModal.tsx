"use client";

import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal konfirmasi umum, dipakai untuk aksi yang butuh persetujuan pengguna
 * sebelum dijalankan (mis. hapus permanen). Menggantikan window.confirm()/
 * window.alert() yang tampilannya tidak konsisten dan tidak bisa
 * menampilkan pesan error dari server dengan rapi.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Ya, Lanjutkan",
  cancelLabel = "Batal",
  danger = false,
  loading = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={loading ? undefined : onCancel}
        aria-hidden
      />
      <div className="relative w-full max-w-sm rounded-t-xl bg-white p-5 shadow-xl md:rounded-xl">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
              danger ? "bg-danger/15" : "bg-warning/15"
            }`}
          >
            <AlertTriangle size={20} className={danger ? "text-danger" : "text-warning"} />
          </div>
          <div className="flex-1 pt-1">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-sm text-ink-muted">{message}</p>
            {error && (
              <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-page disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              danger ? "bg-danger hover:bg-danger/90" : "bg-forest-700 hover:bg-forest-600"
            }`}
          >
            {loading ? "Memproses..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
