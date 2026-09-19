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
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
        Memuat data...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Tampilan tabel — desktop/tablet */}
      <div className="hidden overflow-x-auto rounded-lg border border-neutral-200 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-2.5 font-medium">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.map((item) => (
              <tr key={getRowId(item)} className="hover:bg-neutral-50">
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
            className="rounded-lg border border-neutral-200 bg-white p-3.5"
          >
            {columns
              .filter((c) => !c.hideOnMobile)
              .map((col, idx) => (
                <div
                  key={col.key}
                  className={clsx(
                    "flex items-center justify-between gap-3 py-1 text-sm",
                    idx === 0 && "text-[15px] font-medium text-neutral-900"
                  )}
                >
                  {idx !== 0 && <span className="text-neutral-500">{col.header}</span>}
                  <span className={idx !== 0 ? "text-right" : ""}>{col.render(item)}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}
