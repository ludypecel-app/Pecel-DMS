"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Modal } from "@/components/ui/Modal";
import { SelectField, TextField } from "@/components/forms/fields";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useActiveRegions } from "@/features/regions/hooks/useActiveRegions";
import { useActiveWarungs } from "@/features/warungs/hooks/useActiveWarungs";
import { useActiveProducts } from "@/features/products/hooks/useActiveProducts";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/features/orders/constants";
import type { OrderStatus } from "@/types/entities";
import type { OrderWithDetails } from "@/features/orders/types/order.types";

interface ItemRow {
  product_id: string;
  quantity: string;
}

const EMPTY_ITEMS: ItemRow[] = [{ product_id: "", quantity: "1" }];

// useSearchParams (dipakai untuk membaca ?new=1 dari tombol "+" bottom tab
// bar) mewajibkan boundary Suspense di App Router, jadi komponen asli
// dibungkus terpisah dari default export.
export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersPageContent />
    </Suspense>
  );
}

function OrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const regions = useActiveRegions();
  const products = useActiveProducts();

  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [regionFilter, setRegionFilter] = useState("");

  // --- Modal "Buat Pesanan" — pola sama seperti Tambah Wilayah/Sales/dsb. ---
  const [modalOpen, setModalOpen] = useState(false);
  const [formRegionFilter, setFormRegionFilter] = useState(""); // filter bantu pilih warung, tidak dikirim ke server
  const warungs = useActiveWarungs(formRegionFilter || undefined);
  const [warungId, setWarungId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [items, setItems] = useState<ItemRow[]>(EMPTY_ITEMS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchOrders = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (regionFilter) params.set("regionId", regionFilter);
      const res = await fetch(`/api/orders?${params.toString()}`);
      const json = await res.json();
      setOrders(json.data ?? []);
      if (!opts?.silent) setIsLoading(false);
    },
    [search, statusFilter, regionFilter]
  );

  useEffect(() => {
    const timeout = setTimeout(() => fetchOrders(), 300);
    return () => clearTimeout(timeout);
  }, [fetchOrders]);

  // Supaya daftar pesanan ikut terupdate otomatis saat status berubah lewat
  // aksi user lain (mis. admin menugaskan sales di halaman Penugasan),
  // tanpa perlu refresh manual.
  useAutoRefresh(() => fetchOrders({ silent: true }), 8000);

  // Tombol "+" mengambang di bottom tab bar (mobile) navigasi ke
  // "/orders?new=1" karena ia komponen layout global, bukan bagian dari
  // state halaman ini — begitu query param terdeteksi, modal dibuka otomatis
  // lalu param dibuang dari URL supaya refresh/back tidak membuka ulang.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openCreateModal();
      router.replace("/orders");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function openCreateModal() {
    setFormRegionFilter("");
    setWarungId("");
    setDeliveryDate("");
    setItems(EMPTY_ITEMS);
    setErrors({});
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
  }

  function addItemRow() {
    setItems((prev) => [...prev, { product_id: "", quantity: "1" }]);
  }

  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItemRow(index: number, patch: Partial<ItemRow>) {
    setItems((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              product_id: patch.product_id ?? row.product_id,
              quantity: patch.quantity ?? row.quantity,
            }
          : row
      )
    );
  }

  const selectedWarung = warungs.find((w) => w.id === warungId);

  const rowsWithPrice = useMemo(
    () =>
      items.map((row) => {
        const product = products.find((p) => p.id === row.product_id);
        const qty = Number(row.quantity) || 0;
        const subtotal = product ? product.price * qty : 0;
        return { ...row, product, subtotal };
      }),
    [items, products]
  );

  const total = rowsWithPrice.reduce((sum, r) => sum + r.subtotal, 0);

  function regionName(id: string) {
    return regions.find((r) => r.id === id)?.name ?? "-";
  }

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError("");

    const payload = {
      warung_id: warungId,
      delivery_date: deliveryDate,
      items: items
        .filter((r) => r.product_id)
        .map((r) => ({ product_id: r.product_id, quantity: Number(r.quantity) || 0 })),
    };

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (!res.ok) {
      if (json.details) {
        const flat: Record<string, string> = {};
        Object.entries(json.details).forEach(([key, val]) => {
          flat[key] = Array.isArray(val) ? (val[0] as string) : String(val);
        });
        setErrors(flat);
      } else {
        setFormError(json.error ?? "Gagal membuat pesanan");
      }
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setModalOpen(false);
    router.push(`/orders/${json.data.id}`);
  }

  const columns: Column<OrderWithDetails>[] = [
    {
      key: "order_number",
      header: "No. Pesanan",
      render: (o) => (
        <Link href={`/orders/${o.id}`} className="font-medium text-forest-700 hover:underline">
          {o.order_number}
        </Link>
      ),
    },
    { key: "region", header: "Wilayah", render: (o) => regionName(o.region_id), hideOnMobile: true },
    { key: "delivery_date", header: "Tgl Kirim", render: (o) => o.delivery_date },
    { key: "total", header: "Total", render: (o) => formatPrice(o.total) },
    {
      key: "status",
      header: "Status",
      render: (o) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_COLOR[o.status]}`}>
          {ORDER_STATUS_LABEL[o.status]}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="h1 !text-[20px]">Pesanan</h1>
          <p className="text-sm text-ink-muted">Kelola pesanan dari warung</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-1.5 rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600"
        >
          <Plus size={16} />
          Buat Pesanan
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor pesanan..."
            className="w-full rounded-md border border-border py-2 pl-9 pr-3 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
          />
        </div>
        <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600">
          <option value="">Semua Wilayah</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "")} className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600">
          <option value="">Semua Status</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <DataTable columns={columns} data={orders} getRowId={(o) => o.id} isLoading={isLoading} emptyMessage="Belum ada pesanan." />

      <Modal title="Buat Pesanan" open={modalOpen} onClose={closeModal} size="xl">
        <p className="-mt-2 mb-3 text-xs text-ink-muted">
          Pesanan dibuat tanpa memilih sales terlebih dahulu — penugasan dilakukan setelahnya.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>}

          <SelectField
            label="Filter Wilayah (opsional, untuk mempersempit pilihan warung)"
            value={formRegionFilter}
            onChange={(v) => {
              setFormRegionFilter(v);
              setWarungId(""); // reset warung terpilih saat wilayah berubah
            }}
            options={regions.map((r) => ({ value: r.id, label: r.name }))}
          />

          <SelectField
            label="Warung"
            value={warungId}
            onChange={setWarungId}
            error={errors.warung_id}
            required
            options={warungs.map((w) => ({ value: w.id, label: w.name }))}
          />
          {selectedWarung && (
            <p className="-mt-2 text-xs text-ink-muted">
              Wilayah otomatis: <span className="font-medium">{regions.find((r) => r.id === selectedWarung.region_id)?.name ?? "-"}</span>
            </p>
          )}

          <TextField
            label="Tanggal Pengiriman"
            type="date"
            value={deliveryDate}
            onChange={setDeliveryDate}
            error={errors.delivery_date}
            required
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">Produk Pesanan</span>
              <button type="button" onClick={addItemRow} className="flex items-center gap-1 text-sm font-medium text-forest-700 hover:underline">
                <Plus size={14} /> Tambah Produk
              </button>
            </div>

            {rowsWithPrice.map((row, index) => (
              <div key={index} className="flex items-end gap-2 rounded-md border border-border p-2.5">
                <div className="flex-1">
                  <SelectField
                    label="Produk"
                    value={row.product_id}
                    onChange={(v) => updateItemRow(index, { product_id: v })}
                    required
                    options={products.map((p) => ({ value: p.id, label: `${p.name} — ${formatPrice(p.price)}` }))}
                  />
                </div>
                <div className="w-24">
                  <TextField label="Jumlah" type="number" value={row.quantity} onChange={(v) => updateItemRow(index, { quantity: v })} required />
                </div>
                <div className="w-28 pb-2 text-right text-sm text-ink-muted">{formatPrice(row.subtotal)}</div>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItemRow(index)} className="mb-2 text-ink-muted hover:text-danger" aria-label="Hapus produk">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {errors.items && <p className="text-xs text-danger">{errors.items}</p>}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-medium text-ink">Total Pesanan</span>
            <span className="text-base font-semibold text-ink">{formatPrice(total)}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeModal} className="rounded-md px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-page">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600 disabled:opacity-50">
              {submitting ? "Menyimpan..." : "Simpan Pesanan"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
