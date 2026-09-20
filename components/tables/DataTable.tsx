"use client";

import { clsx } from "clsx";

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  /** Sembunyikan kolom ini di tampilan mobile (card) agar tidak sesak. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (item: T) => string;
  emptyMessage?: string;
  isLoading?: boolean;
  /**
   * Opsional — kalau diisi, seluruh baris/card bisa diklik untuk membuka
   * detail (mis. modal detail pesanan/penugasan), tanpa mengganggu tombol
   * atau link aksi di dalam kolom (klik pada elemen interaktif tidak akan
   * ikut memicu onRowClick, lihat isInteractiveTarget di bawah).
   */
  onRowClick?: (item: T) => void;
}

/** Cek apakah target klik (atau leluhurnya) elemen interaktif seperti
 * tombol/link/input — dipakai supaya klik tombol aksi di dalam baris tidak
 * ikut membuka modal detail lewat onRowClick. */
function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest("button, a, input, select, textarea, label");
}

/**
 * Tabel di layar md+ ; di mobile bertransformasi jadi tumpukan card
 * (menghindari tabel lebar dengan horizontal scroll yang tidak nyaman
 * di layar kecil, sesuai catatan Mobile UX di brief).
 */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  emptyMessage = "Belum ada data.",
  isLoading,
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-surface-raised p-8 text-center text-sm text-ink-muted">
        Memuat data...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white p-8 text-center text-sm text-ink-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Tampilan tabel — desktop/tablet */}
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface-raised md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-page text-ink-muted">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-2.5 font-medium">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item) => (
              <tr
                key={getRowId(item)}
                onClick={
                  onRowClick
                    ? (e) => {
                        if (isInteractiveTarget(e.target)) return;
                        onRowClick(item);
                      }
                    : undefined
                }
                className={clsx("hover:bg-surface-page", onRowClick && "cursor-pointer")}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2.5">
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tampilan card — mobile */}
      <div className="space-y-2 md:hidden">
        {data.map((item) => (
          <div
            key={getRowId(item)}
            onClick={
              onRowClick
                ? (e) => {
                    if (isInteractiveTarget(e.target)) return;
                    onRowClick(item);
                  }
                : undefined
            }
            className={clsx(
              "rounded-lg border border-border bg-surface-raised p-3.5",
              onRowClick && "cursor-pointer active:bg-surface-page"
            )}
          >
            {columns
              .filter((c) => !c.hideOnMobile)
              .map((col, idx) => (
                <div
                  key={col.key}
                  className={clsx(
                    "flex items-center justify-between gap-3 py-1 text-sm",
                    idx === 0 && "text-[15px] font-medium text-ink"
                  )}
                >
                  {idx !== 0 && <span className="text-ink-muted">{col.header}</span>}
                  <span className={idx !== 0 ? "text-right" : ""}>{col.render(item)}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}
