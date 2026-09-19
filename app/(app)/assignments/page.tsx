"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Modal } from "@/components/ui/Modal";
import { SelectField, TextField } from "@/components/forms/fields";
import { useActiveSales } from "@/features/sales/hooks/useActiveSales";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/features/orders/constants";
import type { OrderWithDetails } from "@/features/orders/types/order.types";
import type { AssignmentWithOrder } from "@/features/assignments/types/assignment.types";

export default function AssignmentsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const salesList = useActiveSales();
  const [schedulingOrders, setSchedulingOrders] = useState<OrderWithDetails[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [assignModalOrder, setAssignModalOrder] = useState<OrderWithDetails | null>(null);
  const [form, setForm] = useState({ sales_id: "", picking_date: "", picking_time: "", delivery_date: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [ordersRes, assignmentsRes] = await Promise.all([
      fetch("/api/orders?status=scheduling"),
      fetch("/api/assignments"),
    ]);
    const ordersJson = await ordersRes.json();
    const assignmentsJson = await assignmentsRes.json();
    setSchedulingOrders(ordersJson.data ?? []);
    setAssignments(assignmentsJson.data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  async function handleCheckIn(id: string) {
    setActionError("");
    const res = await fetch(`/api/assignments/${id}/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (!res.ok) {
      setActionError(json.error ?? "Gagal check-in");
      return;
    }
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

  const schedulingColumns: Column<OrderWithDetails>[] = [
    { key: "order_number", header: "No. Pesanan", render: (o) => o.order_number },
    { key: "delivery_date", header: "Tgl Kirim", render: (o) => o.delivery_date },
    {
      key: "actions",
      header: "Aksi",
      render: (o) => (
        <button
          type="button"
          onClick={() => openAssignModal(o)}
          className="rounded-md bg-forest-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-forest-600"
        >
          Tugaskan Sales
        </button>
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
      render: (a) => {
        // Aksi sales (terima/tolak/mulai kirim/check-in) hanya tampil untuk
        // akun sales yang login — identitas diambil dari session di server,
        // bukan dipilih manual lagi.
        const isSales = role === "sales";

        if (a.status === "assigned") {
          return isSales ? (
            <div className="flex gap-3">
              <button type="button" onClick={() => handleAccept(a.id)} className="text-sm font-medium text-forest-700 hover:underline">
                Terima
              </button>
              <button type="button" onClick={() => setRejectModalId(a.id)} className="text-sm font-medium text-red-600 hover:underline">
                Tolak
              </button>
            </div>
          ) : (
            <span className="text-xs text-neutral-400">Menunggu sales</span>
          );
        }
        if (a.status === "ready_to_delivery") {
          return isSales ? (
            <button type="button" onClick={() => handleStartDelivery(a.id)} className="text-sm font-medium text-forest-700 hover:underline">
              Mulai Kirim
            </button>
          ) : (
            <span className="text-xs text-neutral-400">Menunggu sales</span>
          );
        }
        if (a.status === "on_delivery") {
          return isSales ? (
            <button type="button" onClick={() => handleCheckIn(a.id)} className="text-sm font-medium text-forest-700 hover:underline">
              Check In (Sampai)
            </button>
          ) : (
            <span className="text-xs text-neutral-400">Menunggu sales</span>
          );
        }
        if (a.status === "arrived") {
          return isSales ? (
            <Link href={`/assignments/${a.id}/visit`} className="text-sm font-medium text-forest-700 hover:underline">
              Isi Data Kunjungan
            </Link>
          ) : (
            <span className="text-xs text-neutral-400">Menunggu sales</span>
          );
        }
        if (a.status === "visited" || a.status === "completed") {
          return !isSales ? (
            <Link href={`/assignments/${a.id}/review`} className="text-sm font-medium text-forest-700 hover:underline">
              {a.status === "visited" ? "Review & Konfirmasi" : "Lihat Review"}
            </Link>
          ) : (
            <span className="text-xs text-neutral-400">Menunggu admin</span>
          );
        }
        return <span className="text-xs text-neutral-400">—</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Penugasan</h1>
          <p className="text-sm text-neutral-500">
            {role === "sales" ? "Penugasan yang diberikan kepada Anda" : "Tugaskan sales ke pesanan, dan pantau status penerimaan tugas"}
          </p>
        </div>
        {role === "admin" && (
          <Link
            href="/assignments/kanban"
            className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            <LayoutGrid size={15} /> Lihat Kanban
          </Link>
        )}
      </div>

      {actionError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>}

      {role === "admin" && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-neutral-700">Pesanan Menunggu Penugasan (Scheduling)</h2>
          <DataTable
            columns={schedulingColumns}
            data={schedulingOrders}
            getRowId={(o) => o.id}
            isLoading={isLoading}
            emptyMessage="Tidak ada pesanan yang menunggu penugasan."
          />
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-neutral-700">{role === "sales" ? "Tugas Saya" : "Semua Penugasan"}</h2>
        <DataTable
          columns={assignmentColumns}
          data={assignments}
          getRowId={(a) => a.id}
          isLoading={isLoading}
          emptyMessage="Belum ada penugasan."
        />
      </section>

      <Modal title={`Tugaskan Sales — ${assignModalOrder?.order_number ?? ""}`} open={!!assignModalOrder} onClose={() => setAssignModalOrder(null)}>
        <form onSubmit={handleAssign} className="space-y-3">
          {errors._form && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors._form}</p>}
          <SelectField
            label="Sales"
            value={form.sales_id}
            onChange={(v) => setForm((f) => ({ ...f, sales_id: v }))}
            error={errors.sales_id}
            options={salesList.map((s) => ({ value: s.id, label: s.name }))}
          />
          <TextField label="Tanggal Picking" type="date" value={form.picking_date} onChange={(v) => setForm((f) => ({ ...f, picking_date: v }))} error={errors.picking_date} />
          <TextField label="Waktu Picking" type="text" value={form.picking_time} onChange={(v) => setForm((f) => ({ ...f, picking_time: v }))} error={errors.picking_time} placeholder="mis. 08:00" />
          <TextField label="Tanggal Pengiriman" type="date" value={form.delivery_date} onChange={(v) => setForm((f) => ({ ...f, delivery_date: v }))} error={errors.delivery_date} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAssignModalOrder(null)} className="rounded-md px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600 disabled:opacity-50">
              {submitting ? "Menugaskan..." : "Tugaskan"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal title="Tolak Penugasan" open={!!rejectModalId} onClose={() => setRejectModalId(null)}>
        <form onSubmit={handleReject} className="space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-neutral-700">Alasan Penolakan</span>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setRejectModalId(null)} className="rounded-md px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
              Batal
            </button>
            <button type="submit" className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500">
              Tolak Penugasan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
