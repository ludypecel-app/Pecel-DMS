"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useActiveRegions } from "@/features/regions/hooks/useActiveRegions";
import { useActiveWarungs } from "@/features/warungs/hooks/useActiveWarungs";
import { useActiveProducts } from "@/features/products/hooks/useActiveProducts";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/features/orders/constants";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/forms/fields";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import type { OrderStatus } from "@/types/entities";
import type { OrderWithDetails } from "@/features/orders/types/order.types";

const NOT_CANCELLABLE = ["arrived", "visited", "completed", "cancelled"];

// Pesanan masih boleh diedit (tanggal kirim & daftar produk) selama belum
// ada stok yang bergerak secara fisik — yaitu sebelum picking dikonfirmasi
// admin. Harus sama persis dengan ORDER_EDITABLE_STATUSES di order.service.ts.
const EDITABLE_STATUSES: OrderStatus[] = ["scheduling", "assigned", "ready_to_picking"];

interface ItemRow {
  product_id: string;
  quantity: string;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const regions = useActiveRegions();
  const warungs = useActiveWarungs();
  const products = useActiveProducts();

  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // --- Modal "Edit Pesanan" — tanggal kirim & daftar produk. ---
  const [editOpen, setEditOpen] = useState(false);
  const [editDeliveryDate, setEditDeliveryDate] = useState("");
  const [editItems, setEditItems] = useState<ItemRow[]>([]);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editFormError, setEditFormError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const editRowsWithPrice = useMemo(
    () =>
      editItems.map((row) => {
        const product = products.find((p) => p.id === row.product_id);
        const qty = Number(row.quantity) || 0;
        const subtotal = product ? product.price * qty : 0;
        return { ...row, product, subtotal };
      }),
    [editItems, products]
  );
  const editTotal = editRowsWithPrice.reduce((sum, r) => sum + r.subtotal, 0);

  const fetchOrder = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setIsLoading(true);
      const res = await fetch(`/api/orders/${id}`);
      if (res.ok) {
        const json = await res.json();
        setOrder(json.data);
      }
      if (!opts?.silent) setIsLoading(false);
    },
    [id]
  );

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Status pesanan (mis. saat ditugaskan/dibatalkan/diproses sales) ikut
  // terupdate otomatis di halaman detail tanpa refresh manual.
  useAutoRefresh(() => fetchOrder({ silent: true }), 8000);

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  function regionName(rid: string) {
    return regions.find((r) => r.id === rid)?.name ?? "-";
  }
  function warungName(wid: string) {
    return warungs.find((w) => w.id === wid)?.name ?? "-";
  }

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const res = await fetch(`/api/orders/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Gagal membatalkan pesanan");
      setSubmitting(false);
      return;
    }

    setCancelOpen(false);
    setSubmitting(false);
    fetchOrder();
  }

  function openEditModal() {
    if (!order) return;
    setEditDeliveryDate(order.delivery_date);
    setEditItems(order.details.map((d) => ({ product_id: d.product_id, quantity: String(d.quantity) })));
    setEditErrors({});
    setEditFormError("");
    setEditOpen(true);
  }

  function addEditItemRow() {
    setEditItems((prev) => [...prev, { product_id: "", quantity: "1" }]);
  }

  function removeEditItemRow(index: number) {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateEditItemRow(index: number, patch: Partial<ItemRow>) {
    setEditItems((prev) =>
      prev.map((row, i) =>
        i === index
          ? { product_id: patch.product_id ?? row.product_id, quantity: patch.quantity ?? row.quantity }
          : row
      )
    );
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditSubmitting(true);
    setEditErrors({});
    setEditFormError("");

    const payload = {
      delivery_date: editDeliveryDate,
      items: editItems
        .filter((r) => r.product_id)
        .map((r) => ({ product_id: r.product_id, quantity: Number(r.quantity) || 0 })),
    };

    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
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
        setEditErrors(flat);
      } else {
        setEditFormError(json.error ?? "Gagal menyimpan perubahan pesanan");
      }
      setEditSubmitting(false);
      return;
    }

    setEditSubmitting(false);
    setEditOpen(false);
    fetchOrder();
  }

  if (isLoading) return <p className="text-sm text-ink-muted">Memuat...</p>;
  if (!order) return <p className="text-sm text-ink-muted">Pesanan tidak ditemukan.</p>;

  const canCancel = !NOT_CANCELLABLE.includes(order.status) && order.status !== "on_delivery";
  const canEdit = EDITABLE_STATUSES.includes(order.status);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/orders" className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={15} /> Kembali ke daftar Pesanan
      </Link>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-raised p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="h1 !text-[20px]">{order.order_number}</h1>
          <p className="text-sm text-ink-muted">
            {warungName(order.warung_id)} · {regionName(order.region_id)}
          </p>
        </div>
        <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${ORDER_STATUS_COLOR[order.status]}`}>
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>

      {order.status === "cancelled" && order.cancellation_reason && (
        <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          Dibatalkan: {order.cancellation_reason}
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface-raised p-4">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-ink-muted">Tanggal Pesanan</dt>
          <dd className="text-right">{order.order_date}</dd>
          <dt className="text-ink-muted">Tanggal Pengiriman</dt>
          <dd className="text-right">{order.delivery_date}</dd>
        </dl>
      </div>

      <div className="rounded-lg border border-border bg-surface-raised p-4">
        <h2 className="mb-2 text-sm font-medium text-ink">Detail Produk</h2>
        <div className="divide-y divide-border">
          {order.details.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {d.quantity} × {formatPrice(d.unit_price)}
              </span>
              <span className="font-medium">{formatPrice(d.subtotal)}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-semibold">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <Button variant="tertiary" tone="brand" onClick={openEditModal}>
            <Pencil size={14} /> Edit Pesanan
          </Button>
        )}
        {canCancel && (
          <Button variant="tertiary" tone="danger" onClick={() => setCancelOpen(true)}>
            Batalkan Pesanan
          </Button>
        )}
        {order.status === "on_delivery" && (
          <p className="text-xs text-ink-muted">
            Pesanan sedang On Delivery — pembatalan memerlukan proses retur khusus di menu Penugasan.
          </p>
        )}
      </div>

      <Modal title="Batalkan Pesanan" open={cancelOpen} onClose={() => setCancelOpen(false)}>
        <form onSubmit={handleCancel} className="space-y-3">
          {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-ink">Alasan Pembatalan</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              placeholder="mis. Warung membatalkan pesanan"
              className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="tertiary" tone="neutral" onClick={() => setCancelOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" tone="danger" disabled={submitting}>
              {submitting ? "Memproses..." : "Ya, Batalkan Pesanan"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal title="Edit Pesanan" open={editOpen} onClose={() => setEditOpen(false)} size="xl">
        <p className="-mt-2 mb-3 text-xs text-ink-muted">
          Warung tidak bisa diubah di sini — buat pesanan baru bila warung salah. Edit hanya tersedia sebelum picking
          dikonfirmasi admin.
        </p>

        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editFormError && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{editFormError}</p>}

          <TextField
            label="Tanggal Pengiriman"
            type="date"
            value={editDeliveryDate}
            onChange={setEditDeliveryDate}
            error={editErrors.delivery_date}
            required
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">Produk Pesanan</span>
              <Button variant="tertiary" tone="brand" inline onClick={addEditItemRow}>
                <Plus size={14} /> Tambah Produk
              </Button>
            </div>

            {editRowsWithPrice.map((row, index) => (
              <div key={index} className="flex items-end gap-2 rounded-md border border-border p-2.5">
                <div className="flex-1">
                  <SelectField
                    label="Produk"
                    value={row.product_id}
                    onChange={(v) => updateEditItemRow(index, { product_id: v })}
                    required
                    options={products.map((p) => ({ value: p.id, label: `${p.name} — ${formatPrice(p.price)}` }))}
                  />
                </div>
                <div className="w-24">
                  <TextField label="Jumlah" type="number" value={row.quantity} onChange={(v) => updateEditItemRow(index, { quantity: v })} placeholder="mis. 10" required />
                </div>
                <div className="w-28 pb-2 text-right text-sm text-ink-muted">{formatPrice(row.subtotal)}</div>
                {editItems.length > 1 && (
                  <button type="button" onClick={() => removeEditItemRow(index)} className="mb-2 text-ink-muted hover:text-danger" aria-label="Hapus produk">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {editErrors.items && <p className="text-xs text-danger">{editErrors.items}</p>}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-medium text-ink">Total Pesanan</span>
            <span className="text-base font-semibold text-ink">{formatPrice(editTotal)}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="tertiary" tone="neutral" onClick={() => setEditOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={editSubmitting}>
              {editSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
