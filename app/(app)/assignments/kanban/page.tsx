"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useActiveRegions } from "@/features/regions/hooks/useActiveRegions";
import { useActiveSales } from "@/features/sales/hooks/useActiveSales";
import { useActiveWarungs } from "@/features/warungs/hooks/useActiveWarungs";
import { useActiveProducts } from "@/features/products/hooks/useActiveProducts";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/features/orders/constants";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/forms/fields";
import type { OrderStatus } from "@/types/entities";
import type { OrderWithDetails } from "@/features/orders/types/order.types";
import type { AssignmentWithOrder } from "@/features/assignments/types/assignment.types";

// Kolom Kanban sesuai Bagian 14 brief. "on_delivery" & "arrived" tetap
// ditampilkan meski perubahannya adalah aksi sales sendiri (bukan drag admin).
const KANBAN_COLUMNS: OrderStatus[] = [
  "scheduling",
  "assigned",
  "ready_to_picking",
  "ready_to_delivery",
  "on_delivery",
  "arrived",
  "visited",
  "completed",
  "cancelled",
];

interface CardData {
  order: OrderWithDetails;
  assignment: AssignmentWithOrder | null;
}

export default function AssignmentsKanbanPage() {
  const regions = useActiveRegions();
  const salesList = useActiveSales();
  const warungs = useActiveWarungs();
  const products = useActiveProducts();

  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [salesFilter, setSalesFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [dragCard, setDragCard] = useState<CardData | null>(null);
  const [banner, setBanner] = useState("");

  const [pickingModal, setPickingModal] = useState<CardData | null>(null);
  const [pickingQty, setPickingQty] = useState<Record<string, string>>({});
  const [cancelModal, setCancelModal] = useState<CardData | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setIsLoading(true);
    const [ordersRes, assignmentsRes] = await Promise.all([
      fetch("/api/orders"),
      fetch("/api/assignments"),
    ]);
    const ordersJson = await ordersRes.json();
    const assignmentsJson = await assignmentsRes.json();
    setOrders(ordersJson.data ?? []);
    setAssignments(assignmentsJson.data ?? []);
    if (!opts?.silent) setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Kartu Kanban ikut bergeser kolom otomatis saat status berubah lewat
  // aksi sales (terima/mulai kirim/check-in/dst.) atau admin lain, tanpa
  // perlu refresh manual. Dijeda otomatis saat sedang drag kartu supaya
  // tidak mengganggu interaksi yang berjalan.
  useAutoRefresh(() => {
    if (!dragCard) fetchData({ silent: true });
  }, 8000);

  const cards: CardData[] = useMemo(() => {
    return orders
      .filter((o) => {
        if (regionFilter && o.region_id !== regionFilter) return false;
        if (dateFilter && o.delivery_date !== dateFilter) return false;
        const warung = warungs.find((w) => w.id === o.warung_id);
        if (search) {
          const q = search.toLowerCase();
          const matches =
            o.order_number.toLowerCase().includes(q) || (warung?.name.toLowerCase().includes(q) ?? false);
          if (!matches) return false;
        }
        return true;
      })
      .map((order) => {
        const assignment = assignments.find((a) => a.order_id === order.id) ?? null;
        return { order, assignment };
      })
      .filter((c) => !salesFilter || c.assignment?.sales_id === salesFilter);
  }, [orders, assignments, regionFilter, dateFilter, search, salesFilter, warungs]);

  const columns = useMemo(() => {
    const map = new Map<OrderStatus, CardData[]>();
    KANBAN_COLUMNS.forEach((s) => map.set(s, []));
    cards.forEach((c) => {
      const list = map.get(c.order.status);
      if (list) list.push(c);
    });
    return map;
  }, [cards]);

  function warungName(id: string) {
    return warungs.find((w) => w.id === id)?.name ?? "-";
  }
  function regionName(id: string) {
    return regions.find((r) => r.id === id)?.name ?? "-";
  }
  function salesName(id?: string) {
    return salesList.find((s) => s.id === id)?.name ?? "-";
  }
  function isLate(order: OrderWithDetails) {
    const doneStatuses: OrderStatus[] = ["completed", "cancelled"];
    return !doneStatuses.includes(order.status) && order.delivery_date < new Date().toISOString().slice(0, 10);
  }
  const formatPrice = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  function showBanner(msg: string) {
    setBanner(msg);
    setTimeout(() => setBanner(""), 4000);
  }

  function handleDrop(targetStatus: OrderStatus) {
    if (!dragCard) return;
    const { order, assignment } = dragCard;
    setDragCard(null);

    if (order.status === targetStatus) return;

    // Hanya 2 transisi yang boleh dipicu drag oleh admin dari Kanban:
    // (1) Ready To Picking -> Ready To Delivery (konfirmasi picking)
    // (2) status apa pun yang masih bisa dibatalkan -> Cancelled
    if (order.status === "ready_to_picking" && targetStatus === "ready_to_delivery") {
      if (!assignment) return;
      const initialQty: Record<string, string> = {};
      order.details.forEach((d) => (initialQty[d.product_id] = String(d.quantity)));
      setPickingQty(initialQty);
      setPickingModal(dragCard);
      return;
    }

    if (targetStatus === "cancelled") {
      const neverCancellable: OrderStatus[] = ["arrived", "visited", "completed", "cancelled"];
      if (neverCancellable.includes(order.status)) {
        showBanner(`Pesanan berstatus "${ORDER_STATUS_LABEL[order.status]}" tidak dapat dibatalkan.`);
        return;
      }
      setCancelReason("");
      setCancelModal(dragCard);
      return;
    }

    showBanner(
      "Perubahan status ini hanya dapat dilakukan lewat aksi sales (terima/tolak/mulai kirim/check-in), bukan drag & drop admin."
    );
  }

  async function submitPickingConfirm() {
    if (!pickingModal?.assignment) return;
    setSubmitting(true);
    const items = Object.entries(pickingQty).map(([product_id, qty]) => ({
      product_id,
      actual_quantity: Number(qty) || 0,
    }));
    const res = await fetch(`/api/assignments/${pickingModal.assignment.id}/picking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      showBanner(json.error ?? "Gagal konfirmasi picking");
      return;
    }
    setPickingModal(null);
    fetchData();
  }

  async function submitCancel() {
    if (!cancelModal) return;
    setSubmitting(true);
    const { order, assignment } = cancelModal;

    const res = assignment
      ? await fetch(`/api/assignments/${assignment.id}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: cancelReason }),
        })
      : await fetch(`/api/orders/${order.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: cancelReason }),
        });

    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      showBanner(json.error ?? "Gagal membatalkan");
      return;
    }
    setCancelModal(null);
    fetchData();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="h1 !text-[20px]">Kanban Penugasan</h1>
          <p className="text-sm text-ink-muted">
            Seret kartu untuk konfirmasi picking atau membatalkan — transisi lain dilakukan sales dari{" "}
            <Link href="/assignments" className="underline">halaman Penugasan</Link>.
          </p>
        </div>
      </div>

      {banner && (
        <div className="flex items-center gap-2 rounded-md bg-turmeric-50 px-3 py-2 text-sm text-ink">
          <AlertTriangle size={15} className="shrink-0 text-turmeric-600" />
          {banner}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari no. pesanan / nama warung..."
          className="w-56 rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
        />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
        />
        <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="rounded-md border border-border bg-white px-3 py-2 text-sm">
          <option value="">Semua Wilayah</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select value={salesFilter} onChange={(e) => setSalesFilter(e.target.value)} className="rounded-md border border-border bg-white px-3 py-2 text-sm">
          <option value="">Semua Sales</option>
          {salesList.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Memuat...</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {KANBAN_COLUMNS.map((status) => {
            const items = columns.get(status) ?? [];
            return (
              <div
                key={status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(status)}
                className="flex w-64 shrink-0 flex-col rounded-lg bg-surface-page"
              >
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    {ORDER_STATUS_LABEL[status]}
                  </span>
                  <span className="text-xs text-ink-muted">{items.length}</span>
                </div>
                <div className="flex-1 space-y-2 px-2 pb-2">
                  {items.map((card) => (
                    <div
                      key={card.order.id}
                      draggable
                      onDragStart={() => setDragCard(card)}
                      className="cursor-grab space-y-1.5 rounded-md border border-border bg-surface-raised p-2.5 text-xs shadow-sm active:cursor-grabbing"
                    >
                      <div className="flex items-center justify-between">
                        <Link href={`/orders/${card.order.id}`} className="font-semibold text-forest-700 hover:underline">
                          {card.order.order_number}
                        </Link>
                        {isLate(card.order) && (
                          <span className="flex items-center gap-0.5 rounded-full bg-danger/15 px-1.5 py-0.5 text-[10px] font-medium text-danger">
                            <AlertTriangle size={10} /> Telat
                          </span>
                        )}
                      </div>
                      <p className="text-ink-muted">{warungName(card.order.warung_id)}</p>
                      <p className="text-ink-muted">{regionName(card.order.region_id)}</p>
                      {card.assignment && <p className="text-ink-muted">Sales: {salesName(card.assignment.sales_id)}</p>}
                      <p className="text-ink-muted">Kirim: {card.order.delivery_date}</p>
                      {card.assignment && (
                        <p className="text-ink-muted">
                          Picking: {card.assignment.picking_date} {card.assignment.picking_time}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-ink-muted">{card.order.details.length} produk</span>
                        <span className="font-medium text-ink">{formatPrice(card.order.total)}</span>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="px-1 py-3 text-center text-[11px] text-ink-muted">Tidak ada</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal title={`Konfirmasi Picking — ${pickingModal?.order.order_number ?? ""}`} open={!!pickingModal} onClose={() => setPickingModal(null)}>
        <div className="space-y-3">
          <p className="text-xs text-ink-muted">
            Periksa jumlah aktual yang diserahkan ke sales. Selisih dari jumlah pesanan diperbolehkan (partial fulfillment).
          </p>
          {pickingModal?.order.details.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2">
              <span className="text-sm text-ink">
                {products.find((p) => p.id === d.product_id)?.name ?? d.product_id} (pesan: {d.quantity})
              </span>
              <input
                type="number"
                min={0}
                required
                value={pickingQty[d.product_id] ?? ""}
                onChange={(e) => setPickingQty((prev) => ({ ...prev, [d.product_id]: e.target.value }))}
                className="w-24 rounded-md border border-border px-2 py-1 text-sm"
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setPickingModal(null)} className="rounded-md px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-page">
              Batal
            </button>
            <button type="button" onClick={submitPickingConfirm} disabled={submitting} className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600 disabled:opacity-50">
              {submitting ? "Menyimpan..." : "Konfirmasi Picking Selesai"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal title="Batalkan" open={!!cancelModal} onClose={() => setCancelModal(null)}>
        <div className="space-y-3">
          <TextField label="Alasan Pembatalan" value={cancelReason} onChange={setCancelReason} required />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCancelModal(null)} className="rounded-md px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-page">
              Batal
            </button>
            <button
              type="button"
              onClick={submitCancel}
              disabled={submitting || !cancelReason.trim()}
              className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-50"
            >
              {submitting ? "Memproses..." : "Ya, Batalkan"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
