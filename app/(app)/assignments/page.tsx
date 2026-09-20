"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/forms/fields";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useActiveSales } from "@/features/sales/hooks/useActiveSales";
import { useActiveProducts } from "@/features/products/hooks/useActiveProducts";
import { useActiveRegions } from "@/features/regions/hooks/useActiveRegions";
import { useActiveWarungs } from "@/features/warungs/hooks/useActiveWarungs";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/features/orders/constants";
import type { OrderWithDetails } from "@/features/orders/types/order.types";
import type { AssignmentWithOrder } from "@/features/assignments/types/assignment.types";

export default function AssignmentsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const salesList = useActiveSales();
  const products = useActiveProducts();
  const regions = useActiveRegions();
  const warungs = useActiveWarungs();
  const [schedulingOrders, setSchedulingOrders] = useState<OrderWithDetails[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Klik baris/card (di luar tombol aksi) membuka modal detail — berlaku
  // untuk semua status, bukan cuma yang sedang ada aksinya.
  const [detailOrder, setDetailOrder] = useState<OrderWithDetails | null>(null);
  const [detailAssignment, setDetailAssignment] = useState<AssignmentWithOrder | null>(null);

  const [assignModalOrder, setAssignModalOrder] = useState<OrderWithDetails | null>(null);
  const [form, setForm] = useState({ sales_id: "", picking_date: "", picking_time: "", delivery_date: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState("");

  const [pickingModal, setPickingModal] = useState<AssignmentWithOrder | null>(null);
  const [pickingQty, setPickingQty] = useState<Record<string, string>>({});
  const [pickingSubmitting, setPickingSubmitting] = useState(false);

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setIsLoading(true);
    const [ordersRes, assignmentsRes] = await Promise.all([
      fetch("/api/orders?status=scheduling"),
      fetch("/api/assignments"),
    ]);
    const ordersJson = await ordersRes.json();
    const assignmentsJson = await assignmentsRes.json();
    setSchedulingOrders(ordersJson.data ?? []);
    setAssignments(assignmentsJson.data ?? []);
    if (!opts?.silent) setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Supaya status penugasan (diterima/ditolak/check-in/dst. oleh sales, atau
  // penugasan baru oleh admin) langsung terlihat oleh user lain tanpa
  // refresh manual.
  useAutoRefresh(() => fetchData({ silent: true }), 8000);

  function openAssignModal(order: OrderWithDetails) {
    setAssignModalOrder(order);
    setForm({ sales_id: "", picking_date: "", picking_time: "", delivery_date: order.delivery_date });
    setErrors({});
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignModalOrder) return;
    setSubmitting(true);
    setErrors({});

    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: assignModalOrder.id, ...form }),
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
        setErrors({ _form: json.error ?? "Gagal menugaskan sales" });
      }
      setSubmitting(false);
      return;
    }

    setAssignModalOrder(null);
    setSubmitting(false);
    fetchData();
  }

  async function handleAccept(id: string) {
    setActionError("");
    const res = await fetch(`/api/assignments/${id}/accept`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setActionError(json.error ?? "Gagal menerima penugasan");
      return;
    }
    fetchData();
  }

  async function handleStartDelivery(id: string) {
    setActionError("");
    const res = await fetch(`/api/assignments/${id}/start-delivery`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setActionError(json.error ?? "Gagal memulai pengiriman");
      return;
    }
    fetchData();
  }

  /**
   * Ambil lokasi GPS perangkat sales sebelum check-in. Koordinat bersifat
   * WAJIB — validasi radius di server sekarang keras (hard block, tanpa
   * toleransi), jadi kalau izin lokasi ditolak, GPS tidak tersedia, timeout,
   * atau browser tidak mendukung geolocation, check-in TIDAK dilanjutkan
   * (tidak memanggil API sama sekali) dan sales langsung diberi tahu.
   */
  function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        reject(new Error("Perangkat/browser ini tidak mendukung lokasi GPS. Check-in tidak bisa dilakukan."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => reject(new Error("Lokasi GPS wajib diaktifkan untuk check-in — mohon izinkan akses lokasi lalu coba lagi.")),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  async function handleCheckIn(id: string) {
    setActionError("");
    let latitude: number, longitude: number;
    try {
      ({ latitude, longitude } = await getCurrentPosition());
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Gagal mengambil lokasi GPS");
      return;
    }
    const res = await fetch(`/api/assignments/${id}/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude, longitude }),
    });
    const json = await res.json();
    if (!res.ok) {
      setActionError(json.error ?? "Gagal check-in");
      return;
    }
    fetchData();
  }

  function openPickingModal(a: AssignmentWithOrder) {
    setActionError("");
    const initialQty: Record<string, string> = {};
    a.order?.details.forEach((d) => (initialQty[d.product_id] = String(d.quantity)));
    setPickingQty(initialQty);
    setPickingModal(a);
  }

  async function submitPickingConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!pickingModal) return;
    setPickingSubmitting(true);
    const items = Object.entries(pickingQty).map(([product_id, qty]) => ({
      product_id,
      actual_quantity: Number(qty) || 0,
    }));
    const res = await fetch(`/api/assignments/${pickingModal.id}/picking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const json = await res.json();
    setPickingSubmitting(false);
    if (!res.ok) {
      setActionError(json.error ?? "Gagal konfirmasi picking");
      return;
    }
    setPickingModal(null);
    fetchData();
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectModalId) return;
    setActionError("");
    const res = await fetch(`/api/assignments/${rejectModalId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    const json = await res.json();
    if (!res.ok) {
      setActionError(json.error ?? "Gagal menolak penugasan");
      return;
    }
    setRejectModalId(null);
    setRejectReason("");
    fetchData();
  }

  function warungName(id: string) {
    return warungs.find((w) => w.id === id)?.name ?? id;
  }
  function regionName(id: string) {
    return regions.find((r) => r.id === id)?.name ?? id;
  }
  const formatPrice = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  /** Tombol aksi untuk penugasan sesuai status — dipakai baik di kolom
   * tabel maupun di modal detail (klik baris), supaya perilakunya konsisten
   * di semua tempat. Di modal (`fullWidth`), tombol dibuat mengisi lebar
   * container dan sedikit lebih besar (size "md") supaya lebih mudah
   * disentuh; di kolom tabel tetap kompak (size "sm"). */
  function renderAssignmentActions(a: AssignmentWithOrder, opts?: { fullWidth?: boolean }) {
    // Aksi sales (terima/tolak/mulai kirim/check-in) hanya tampil untuk
    // akun sales yang login — identitas diambil dari session di server,
    // bukan dipilih manual lagi.
    const isSales = role === "sales";
    const fullWidth = opts?.fullWidth ?? false;
    const size = fullWidth ? "md" : "sm";
    const widthCls = fullWidth ? "w-full" : "";

    if (a.status === "assigned") {
      return isSales ? (
        <div className="flex gap-2">
          <Button variant="primary" size={size} className={fullWidth ? "flex-1" : ""} onClick={() => handleAccept(a.id)}>
            Terima
          </Button>
          <Button variant="tertiary" tone="danger" size={size} className={fullWidth ? "flex-1" : ""} onClick={() => setRejectModalId(a.id)}>
            Tolak
          </Button>
        </div>
      ) : (
        <span className="text-xs text-ink-muted">Menunggu sales</span>
      );
    }
    if (a.status === "ready_to_picking") {
      return !isSales ? (
        <Button variant="primary" size={size} className={widthCls} onClick={() => openPickingModal(a)}>
          Konfirmasi Picking
        </Button>
      ) : (
        <span className="text-xs text-ink-muted">Menunggu admin</span>
      );
    }
    if (a.status === "ready_to_delivery") {
      return isSales ? (
        <Button variant="primary" size={size} className={widthCls} onClick={() => handleStartDelivery(a.id)}>
          Mulai Kirim
        </Button>
      ) : (
        <span className="text-xs text-ink-muted">Menunggu sales</span>
      );
    }
    if (a.status === "on_delivery") {
      return isSales ? (
        <Button variant="primary" size={size} className={widthCls} onClick={() => handleCheckIn(a.id)}>
          Check In (Sampai)
        </Button>
      ) : (
        <span className="text-xs text-ink-muted">Menunggu sales</span>
      );
    }
    if (a.status === "arrived") {
      return isSales ? (
        <ButtonLink variant="primary" size={size} className={widthCls} href={`/assignments/${a.id}/visit`}>
          Isi Data Kunjungan
        </ButtonLink>
      ) : (
        <span className="text-xs text-ink-muted">Menunggu sales</span>
      );
    }
    if (a.status === "visited" || a.status === "completed") {
      return !isSales ? (
        <ButtonLink variant="tertiary" tone="brand" inline href={`/assignments/${a.id}/review`}>
          {a.status === "visited" ? "Review & Konfirmasi" : "Lihat Review"}
        </ButtonLink>
      ) : (
        <span className="text-xs text-ink-muted">Menunggu admin</span>
      );
    }
    return <span className="text-xs text-ink-muted">—</span>;
  }

  const schedulingColumns: Column<OrderWithDetails>[] = [
    { key: "order_number", header: "No. Pesanan", render: (o) => o.order_number },
    { key: "delivery_date", header: "Tgl Kirim", render: (o) => o.delivery_date },
    {
      key: "actions",
      header: "Aksi",
      render: (o) => (
        <Button variant="primary" size="sm" onClick={() => openAssignModal(o)}>
          Tugaskan Sales
        </Button>
      ),
    },
  ];

  const assignmentColumns: Column<AssignmentWithOrder>[] = [
    { key: "order_number", header: "No. Pesanan", render: (a) => a.order?.order_number ?? "-" },
    { key: "sales", header: "Sales", render: (a) => salesList.find((s) => s.id === a.sales_id)?.name ?? a.sales_id },
    { key: "picking", header: "Picking", render: (a) => `${a.picking_date} ${a.picking_time}`, hideOnMobile: true },
    {
      key: "status",
      header: "Status",
      render: (a) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_COLOR[a.status]}`}>
          {ORDER_STATUS_LABEL[a.status] ?? a.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      render: (a) => renderAssignmentActions(a),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="h1 !text-[20px]">Penugasan</h1>
          <p className="text-sm text-ink-muted">
            {role === "sales" ? "Penugasan yang diberikan kepada Anda" : "Tugaskan sales ke pesanan, dan pantau status penerimaan tugas"}
          </p>
        </div>
      </div>

      {role === "admin" && (
        <div className="flex gap-1 border-b border-border">
          <span className="shrink-0 border-b-2 border-forest-700 px-3 py-2 text-sm font-medium text-forest-700">
            List
          </span>
          <Link
            href="/assignments/kanban"
            className="flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink"
          >
            <LayoutGrid size={14} /> Kanban
          </Link>
        </div>
      )}

      {actionError && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{actionError}</p>}

      {role === "admin" && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-ink">Pesanan Menunggu Penugasan (Scheduling)</h2>
          <DataTable
            columns={schedulingColumns}
            data={schedulingOrders}
            getRowId={(o) => o.id}
            isLoading={isLoading}
            emptyMessage="Tidak ada pesanan yang menunggu penugasan."
            onRowClick={(o) => setDetailOrder(o)}
          />
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink">{role === "sales" ? "Tugas Saya" : "Semua Penugasan"}</h2>
        <DataTable
          columns={assignmentColumns}
          data={assignments}
          getRowId={(a) => a.id}
          isLoading={isLoading}
          emptyMessage="Belum ada penugasan."
          onRowClick={(a) => setDetailAssignment(a)}
        />
      </section>

      <Modal title={`Detail Pesanan — ${detailOrder?.order_number ?? ""}`} open={!!detailOrder} onClose={() => setDetailOrder(null)} size="lg">
        {detailOrder && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">{warungName(detailOrder.warung_id)}</p>
                <p className="text-xs text-ink-muted">{regionName(detailOrder.region_id)}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${ORDER_STATUS_COLOR[detailOrder.status]}`}>
                {ORDER_STATUS_LABEL[detailOrder.status]}
              </span>
            </div>

            <div className="rounded-lg border border-border p-3">
              <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
                <dt className="text-ink-muted">Tanggal Pesanan</dt>
                <dd className="text-right">{detailOrder.order_date}</dd>
                <dt className="text-ink-muted">Tanggal Pengiriman</dt>
                <dd className="text-right">{detailOrder.delivery_date}</dd>
              </dl>
            </div>

            <div className="rounded-lg border border-border p-3">
              <h3 className="mb-2 text-sm font-medium text-ink">Detail Produk</h3>
              <div className="divide-y divide-border">
                {detailOrder.details.map((d) => (
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
                <span>{formatPrice(detailOrder.total)}</span>
              </div>
            </div>

            {role === "admin" && (
              <div className="pt-1" onClick={() => setDetailOrder(null)}>
                <Button variant="primary" className="w-full" onClick={() => openAssignModal(detailOrder)}>
                  Tugaskan Sales
                </Button>
              </div>
            )}

            <div className="flex justify-between border-t border-border pt-3">
              <ButtonLink variant="tertiary" tone="brand" inline href={`/orders/${detailOrder.id}`}>
                Buka Halaman Detail Pesanan →
              </ButtonLink>
              <Button variant="tertiary" tone="neutral" onClick={() => setDetailOrder(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal title={`Detail Penugasan — ${detailAssignment?.order?.order_number ?? ""}`} open={!!detailAssignment} onClose={() => setDetailAssignment(null)} size="lg">
        {detailAssignment?.order && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">{warungName(detailAssignment.order.warung_id)}</p>
                <p className="text-xs text-ink-muted">{regionName(detailAssignment.order.region_id)}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${ORDER_STATUS_COLOR[detailAssignment.status]}`}>
                {ORDER_STATUS_LABEL[detailAssignment.status]}
              </span>
            </div>

            {detailAssignment.status === "cancelled" && detailAssignment.order.cancellation_reason && (
              <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                Dibatalkan: {detailAssignment.order.cancellation_reason}
              </div>
            )}

            <div className="rounded-lg border border-border p-3">
              <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
                <dt className="text-ink-muted">Tanggal Pesanan</dt>
                <dd className="text-right">{detailAssignment.order.order_date}</dd>
                <dt className="text-ink-muted">Tanggal Pengiriman</dt>
                <dd className="text-right">{detailAssignment.order.delivery_date}</dd>
                <dt className="text-ink-muted">Sales</dt>
                <dd className="text-right">{salesList.find((s) => s.id === detailAssignment.sales_id)?.name ?? detailAssignment.sales_id}</dd>
                <dt className="text-ink-muted">Jadwal Picking</dt>
                <dd className="text-right">
                  {detailAssignment.picking_date} {detailAssignment.picking_time}
                </dd>
              </dl>
            </div>

            <div className="rounded-lg border border-border p-3">
              <h3 className="mb-2 text-sm font-medium text-ink">Detail Produk</h3>
              <div className="divide-y divide-border">
                {detailAssignment.order.details.map((d) => (
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
                <span>{formatPrice(detailAssignment.order.total)}</span>
              </div>
            </div>

            <div className="pt-1" onClick={() => setDetailAssignment(null)}>
              {renderAssignmentActions(detailAssignment, { fullWidth: true })}
            </div>

            <div className="flex justify-between border-t border-border pt-3">
              <ButtonLink variant="tertiary" tone="brand" inline href={`/orders/${detailAssignment.order.id}`}>
                Buka Halaman Detail Pesanan →
              </ButtonLink>
              <Button variant="tertiary" tone="neutral" onClick={() => setDetailAssignment(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal title={`Tugaskan Sales — ${assignModalOrder?.order_number ?? ""}`} open={!!assignModalOrder} onClose={() => setAssignModalOrder(null)}>
        <form onSubmit={handleAssign} className="space-y-3">
          {errors._form && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{errors._form}</p>}
          <SelectField
            label="Sales"
            value={form.sales_id}
            onChange={(v) => setForm((f) => ({ ...f, sales_id: v }))}
            error={errors.sales_id}
            required
            options={salesList.map((s) => ({ value: s.id, label: s.name }))}
          />
          <TextField label="Tanggal Picking" type="date" value={form.picking_date} onChange={(v) => setForm((f) => ({ ...f, picking_date: v }))} error={errors.picking_date} required />
          <TextField label="Waktu Picking" type="time" value={form.picking_time} onChange={(v) => setForm((f) => ({ ...f, picking_time: v }))} error={errors.picking_time} required />
          <TextField label="Tanggal Pengiriman" type="date" value={form.delivery_date} onChange={(v) => setForm((f) => ({ ...f, delivery_date: v }))} error={errors.delivery_date} required />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="tertiary" tone="neutral" onClick={() => setAssignModalOrder(null)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "Menugaskan..." : "Tugaskan"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal title="Tolak Penugasan" open={!!rejectModalId} onClose={() => setRejectModalId(null)}>
        <form onSubmit={handleReject} className="space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-ink">Alasan Penolakan</span>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              required
              placeholder="mis. Wilayah di luar jangkauan hari ini"
              className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="tertiary" tone="neutral" onClick={() => setRejectModalId(null)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" tone="danger">
              Tolak Penugasan
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        title={`Konfirmasi Picking — ${pickingModal?.order?.order_number ?? ""}`}
        open={!!pickingModal}
        onClose={() => setPickingModal(null)}
      >
        <form onSubmit={submitPickingConfirm} className="space-y-3">
          <p className="text-xs text-ink-muted">
            Periksa jumlah aktual yang diserahkan ke sales. Selisih dari jumlah pesanan diperbolehkan (partial fulfillment).
          </p>
          {pickingModal?.order?.details.map((d) => (
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
          {actionError && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{actionError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="tertiary" tone="neutral" onClick={() => setPickingModal(null)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={pickingSubmitting}>
              {pickingSubmitting ? "Menyimpan..." : "Konfirmasi Picking Selesai"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
