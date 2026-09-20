"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AlertTriangle } from "lucide-react";
import { useActiveRegions } from "@/features/regions/hooks/useActiveRegions";
import { useActiveSales } from "@/features/sales/hooks/useActiveSales";
import { useActiveWarungs } from "@/features/warungs/hooks/useActiveWarungs";
import { useActiveProducts } from "@/features/products/hooks/useActiveProducts";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/features/orders/constants";
import { Modal } from "@/components/ui/Modal";
import { TextField, SelectField } from "@/components/forms/fields";
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
  const { data: session } = useSession();
  const role = session?.user?.role;
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

  // Klik kartu (di luar tombol aksi) membuka modal detail pesanan + penugasan.
  const [detailCard, setDetailCard] = useState<CardData | null>(null);

  // Modal "Tugaskan Sales" — dipicu dari tombol aksi di kartu kolom Scheduling.
  const [assignModalOrder, setAssignModalOrder] = useState<OrderWithDetails | null>(null);
  const [assignForm, setAssignForm] = useState({ sales_id: "", picking_date: "", picking_time: "", delivery_date: "" });
  const [assignErrors, setAssignErrors] = useState<Record<string, string>>({});
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Modal "Tolak Penugasan" — aksi sales dari kartu kolom Assigned.
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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

  function openAssignModal(order: OrderWithDetails) {
    setAssignModalOrder(order);
    setAssignForm({ sales_id: "", picking_date: "", picking_time: "", delivery_date: order.delivery_date });
    setAssignErrors({});
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignModalOrder) return;
    setAssignSubmitting(true);
    setAssignErrors({});

    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: assignModalOrder.id, ...assignForm }),
    });
    const json = await res.json();

    if (!res.ok) {
      if (json.details) {
        const flat: Record<string, string> = {};
        Object.entries(json.details).forEach(([key, val]) => {
          flat[key] = Array.isArray(val) ? (val[0] as string) : String(val);
        });
        setAssignErrors(flat);
      } else {
        setAssignErrors({ _form: json.error ?? "Gagal menugaskan sales" });
      }
      setAssignSubmitting(false);
      return;
    }

    setAssignModalOrder(null);
    setAssignSubmitting(false);
    fetchData();
  }

  function openRejectModal(id: string) {
    setRejectModalId(id);
    setRejectReason("");
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectModalId) return;
    const res = await fetch(`/api/assignments/${rejectModalId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    const json = await res.json();
    if (!res.ok) {
      showBanner(json.error ?? "Gagal menolak penugasan");
      return;
    }
    setRejectModalId(null);
    setRejectReason("");
    fetchData();
  }

  async function handleAccept(id: string) {
    const res = await fetch(`/api/assignments/${id}/accept`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      showBanner(json.error ?? "Gagal menerima penugasan");
      return;
    }
    fetchData();
  }

  async function handleStartDelivery(id: string) {
    const res = await fetch(`/api/assignments/${id}/start-delivery`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      showBanner(json.error ?? "Gagal memulai pengiriman");
      return;
    }
    fetchData();
  }

  /** Lihat catatan di assignments/page.tsx — sama persis: koordinat bersifat opsional (soft), tidak memblokir check-in. */
  function getCurrentPosition(): Promise<{ latitude?: number; longitude?: number }> {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve({});
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  async function handleCheckIn(id: string) {
    const { latitude, longitude } = await getCurrentPosition();
    const res = await fetch(`/api/assignments/${id}/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude, longitude }),
    });
    const json = await res.json();
    if (!res.ok) {
      showBanner(json.error ?? "Gagal check-in");
      return;
    }
    fetchData();
  }

  /**
   * Tombol aksi yang tampil di kartu Kanban — mengikuti aturan yang sama
   * dengan kolom "Aksi" di halaman Penugasan (list view), supaya kartu
   * Kanban tidak lagi cuma bisa di-drag tapi juga bisa langsung dieksekusi
   * begitu ada aksi yang tersedia untuk status kartu tersebut.
   */
  function renderCardActions(card: CardData) {
    const { order, assignment } = card;
    const isSales = role === "sales";

    if (!assignment) {
      if (order.status === "scheduling" && !isSales) {
        return (
          <button
            type="button"
            onClick={() => openAssignModal(order)}
            className="w-full rounded-md bg-forest-700 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-forest-600"
          >
            Tugaskan Sales
          </button>
        );
      }
      return null;
    }

    if (assignment.status === "assigned") {
      return isSales ? (
        <div className="flex gap-2">
          <button type="button" onClick={() => handleAccept(assignment.id)} className="flex-1 rounded-md bg-forest-700 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-forest-600">
            Terima
          </button>
          <button type="button" onClick={() => openRejectModal(assignment.id)} className="flex-1 rounded-md border border-danger/40 px-2 py-1.5 text-[11px] font-medium text-danger hover:bg-danger/10">
            Tolak
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-ink-muted">Menunggu sales</p>
      );
    }
    if (assignment.status === "ready_to_picking") {
      return !isSales ? (
        <button type="button" onClick={() => openPickingModal(card)} className="w-full rounded-md bg-forest-700 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-forest-600">
          Konfirmasi Picking
        </button>
      ) : (
        <p className="text-[11px] text-ink-muted">Menunggu admin</p>
      );
    }
    if (assignment.status === "ready_to_delivery") {
      return isSales ? (
        <button type="button" onClick={() => handleStartDelivery(assignment.id)} className="w-full rounded-md bg-forest-700 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-forest-600">
          Mulai Kirim
        </button>
      ) : (
        <p className="text-[11px] text-ink-muted">Menunggu sales</p>
      );
    }
    if (assignment.status === "on_delivery") {
      return isSales ? (
        <button type="button" onClick={() => handleCheckIn(assignment.id)} className="w-full rounded-md bg-forest-700 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-forest-600">
          Check In (Sampai)
        </button>
      ) : (
        <p className="text-[11px] text-ink-muted">Menunggu sales</p>
      );
    }
    if (assignment.status === "arrived") {
      return isSales ? (
        <Link
          href={`/assignments/${assignment.id}/visit`}
          className="block w-full rounded-md bg-forest-700 px-2 py-1.5 text-center text-[11px] font-medium text-white hover:bg-forest-600"
        >
          Isi Data Kunjungan
        </Link>
      ) : (
        <p className="text-[11px] text-ink-muted">Menunggu sales</p>
      );
    }
    if (assignment.status === "visited" || assignment.status === "completed") {
      return !isSales ? (
        <Link
          href={`/assignments/${assignment.id}/review`}
          className="block w-full rounded-md border border-border px-2 py-1.5 text-center text-[11px] font-medium text-ink hover:bg-surface-page"
        >
          {assignment.status === "visited" ? "Review & Konfirmasi" : "Lihat Review"}
        </Link>
      ) : (
        <p className="text-[11px] text-ink-muted">Menunggu admin</p>
      );
    }
    return null;
  }

  function openPickingModal(card: CardData) {
    const initialQty: Record<string, string> = {};
    card.order.details.forEach((d) => (initialQty[d.product_id] = String(d.quantity)));
    setPickingQty(initialQty);
    setPickingModal(card);
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
      openPickingModal(dragCard);
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

  async function submitPickingConfirm(e: React.FormEvent) {
    e.preventDefault();
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

  async function submitCancel(e: React.FormEvent) {
    e.preventDefault();
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
            Klik kartu untuk lihat detail, gunakan tombol aksi di kartu bila tersedia, atau seret kartu untuk
            konfirmasi picking/membatalkan.
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
                  {items.map((card) => {
                    const actions = renderCardActions(card);
                    return (
                      <div
                        key={card.order.id}
                        draggable
                        onDragStart={() => setDragCard(card)}
                        onClick={() => setDetailCard(card)}
                        className="cursor-pointer space-y-1.5 rounded-md border border-border bg-surface-raised p-2.5 text-xs shadow-sm hover:border-forest-300 active:cursor-grabbing"
                      >
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/orders/${card.order.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-forest-700 hover:underline"
                          >
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
                        {actions && (
                          <div className="pt-1.5" onClick={(e) => e.stopPropagation()} onDragStart={(e) => e.stopPropagation()}>
                            {actions}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
        <form onSubmit={submitPickingConfirm} className="space-y-3">
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
                placeholder="0"
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
            <button type="submit" disabled={submitting} className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600 disabled:opacity-50">
              {submitting ? "Menyimpan..." : "Konfirmasi Picking Selesai"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal title="Batalkan" open={!!cancelModal} onClose={() => setCancelModal(null)}>
        <form onSubmit={submitCancel} className="space-y-3">
          <TextField label="Alasan Pembatalan" value={cancelReason} onChange={setCancelReason} required placeholder="mis. Warung tutup permanen" />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCancelModal(null)} className="rounded-md px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-page">
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-50"
            >
              {submitting ? "Memproses..." : "Ya, Batalkan"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal title={`Tugaskan Sales — ${assignModalOrder?.order_number ?? ""}`} open={!!assignModalOrder} onClose={() => setAssignModalOrder(null)}>
        <form onSubmit={handleAssign} className="space-y-3">
          {assignErrors._form && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{assignErrors._form}</p>}
          <SelectField
            label="Sales"
            value={assignForm.sales_id}
            onChange={(v) => setAssignForm((f) => ({ ...f, sales_id: v }))}
            error={assignErrors.sales_id}
            required
            options={salesList.map((s) => ({ value: s.id, label: s.name }))}
          />
          <TextField label="Tanggal Picking" type="date" value={assignForm.picking_date} onChange={(v) => setAssignForm((f) => ({ ...f, picking_date: v }))} error={assignErrors.picking_date} required />
          <TextField label="Waktu Picking" type="time" value={assignForm.picking_time} onChange={(v) => setAssignForm((f) => ({ ...f, picking_time: v }))} error={assignErrors.picking_time} required />
          <TextField label="Tanggal Pengiriman" type="date" value={assignForm.delivery_date} onChange={(v) => setAssignForm((f) => ({ ...f, delivery_date: v }))} error={assignErrors.delivery_date} required />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAssignModalOrder(null)} className="rounded-md px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-page">
              Batal
            </button>
            <button type="submit" disabled={assignSubmitting} className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600 disabled:opacity-50">
              {assignSubmitting ? "Menugaskan..." : "Tugaskan"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal title="Tolak Penugasan" open={!!rejectModalId} onClose={() => setRejectModalId(null)}>
        <form onSubmit={handleReject} className="space-y-3">
          <TextField label="Alasan Penolakan" value={rejectReason} onChange={setRejectReason} placeholder="mis. Wilayah di luar jangkauan hari ini" required />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setRejectModalId(null)} className="rounded-md px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-page">
              Batal
            </button>
            <button type="submit" className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90">
              Tolak Penugasan
            </button>
          </div>
        </form>
      </Modal>

      <Modal title={`Detail — ${detailCard?.order.order_number ?? ""}`} open={!!detailCard} onClose={() => setDetailCard(null)} size="lg">
        {detailCard && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">{warungName(detailCard.order.warung_id)}</p>
                <p className="text-xs text-ink-muted">{regionName(detailCard.order.region_id)}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${ORDER_STATUS_COLOR[detailCard.order.status]}`}>
                {ORDER_STATUS_LABEL[detailCard.order.status]}
              </span>
            </div>

            {detailCard.order.status === "cancelled" && detailCard.order.cancellation_reason && (
              <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                Dibatalkan: {detailCard.order.cancellation_reason}
              </div>
            )}

            <div className="rounded-lg border border-border p-3">
              <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
                <dt className="text-ink-muted">Tanggal Pesanan</dt>
                <dd className="text-right">{detailCard.order.order_date}</dd>
                <dt className="text-ink-muted">Tanggal Pengiriman</dt>
                <dd className="text-right">{detailCard.order.delivery_date}</dd>
                {detailCard.assignment && (
                  <>
                    <dt className="text-ink-muted">Sales</dt>
                    <dd className="text-right">{salesName(detailCard.assignment.sales_id)}</dd>
                    <dt className="text-ink-muted">Jadwal Picking</dt>
                    <dd className="text-right">
                      {detailCard.assignment.picking_date} {detailCard.assignment.picking_time}
                    </dd>
                  </>
                )}
              </dl>
            </div>

            <div className="rounded-lg border border-border p-3">
              <h3 className="mb-2 text-sm font-medium text-ink">Detail Produk</h3>
              <div className="divide-y divide-border">
                {detailCard.order.details.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-1.5 text-sm">
                    <span>
                      {products.find((p) => p.id === d.product_id)?.name ?? d.product_id} — {d.quantity} × {formatPrice(d.unit_price)}
                    </span>
                    <span className="font-medium">{formatPrice(d.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-semibold">
                <span>Total</span>
                <span>{formatPrice(detailCard.order.total)}</span>
              </div>
            </div>

            {renderCardActions(detailCard) && (
              <div className="pt-1" onClick={() => setDetailCard(null)}>
                {renderCardActions(detailCard)}
              </div>
            )}

            <div className="flex justify-between border-t border-border pt-3">
              <Link href={`/orders/${detailCard.order.id}`} className="text-sm font-medium text-forest-700 hover:underline">
                Buka Halaman Detail Pesanan →
              </Link>
              <button type="button" onClick={() => setDetailCard(null)} className="rounded-md px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-page">
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
