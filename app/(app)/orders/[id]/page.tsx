"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useActiveRegions } from "@/features/regions/hooks/useActiveRegions";
import { useActiveWarungs } from "@/features/warungs/hooks/useActiveWarungs";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/features/orders/constants";
import { Modal } from "@/components/ui/Modal";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import type { OrderWithDetails } from "@/features/orders/types/order.types";

const NOT_CANCELLABLE = ["arrived", "visited", "completed", "cancelled"];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const regions = useActiveRegions();
  const warungs = useActiveWarungs();

  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  if (isLoading) return <p className="text-sm text-ink-muted">Memuat...</p>;
  if (!order) return <p className="text-sm text-ink-muted">Pesanan tidak ditemukan.</p>;

  const canCancel = !NOT_CANCELLABLE.includes(order.status) && order.status !== "on_delivery";
  const canEdit = order.status === "scheduling";

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

      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <p className="text-xs text-ink-muted">
            Pesanan masih bisa diedit selama berstatus Scheduling (fitur edit detail akan tersedia di form terpisah pada iterasi berikutnya bila diperlukan).
          </p>
        )}
        {canCancel && (
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="rounded-md border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
          >
            Batalkan Pesanan
          </button>
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
              className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCancelOpen(false)} className="rounded-md px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-page">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-50">
              {submitting ? "Memproses..." : "Ya, Batalkan Pesanan"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
