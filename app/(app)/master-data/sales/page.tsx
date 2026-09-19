"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search } from "lucide-react";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { TextField, SelectField } from "@/components/forms/fields";
import { useActiveRegions } from "@/features/regions/hooks/useActiveRegions";
import type { Sales, Region } from "@/types/entities";

type StatusFilter = "" | "active" | "inactive";
type SalesWithRegion = Sales & { _region?: Region };

const emptyForm = { name: "", phone: "", assigned_region_id: "", user_id: "" };

export default function SalesPage() {
  const regions = useActiveRegions();
  const [items, setItems] = useState<Sales[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [regionFilter, setRegionFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Sales | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (regionFilter) params.set("regionId", regionFilter);
    const res = await fetch(`/api/master-data/sales?${params.toString()}`);
    const json = await res.json();
    setItems(json.data ?? []);
    setIsLoading(false);
  }, [search, statusFilter, regionFilter]);

  useEffect(() => {
    const timeout = setTimeout(fetchItems, 300);
    return () => clearTimeout(timeout);
  }, [fetchItems]);

  function regionName(id: string) {
    return regions.find((r) => r.id === id)?.name ?? "-";
  }

  function openCreateModal() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  }

  function openEditModal(sales: Sales) {
    setEditing(sales);
    setForm({
      name: sales.name,
      phone: sales.phone,
      assigned_region_id: sales.assigned_region_id,
      user_id: sales.user_id ?? "",
    });
    setErrors({});
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const url = editing ? `/api/master-data/sales/${editing.id}` : "/api/master-data/sales";
    const method = editing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
        setErrors({ _form: json.error ?? "Gagal menyimpan data" });
      }
      setSubmitting(false);
      return;
    }

    setModalOpen(false);
    setSubmitting(false);
    fetchItems();
  }

  async function handleToggleStatus(sales: Sales) {
    const nextStatus = sales.status === "active" ? "inactive" : "active";
    await fetch(`/api/master-data/sales/${sales.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    fetchItems();
  }

  const columns: Column<Sales>[] = [
    { key: "name", header: "Nama Sales", render: (s) => s.name },
    { key: "phone", header: "Telepon", render: (s) => s.phone, hideOnMobile: true },
    { key: "region", header: "Wilayah", render: (s) => regionName(s.assigned_region_id) },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
    {
      key: "actions",
      header: "Aksi",
      render: (s) => (
        <div className="flex gap-3">
          <button type="button" onClick={() => openEditModal(s)} className="text-sm font-medium text-forest-700 hover:underline">
            Edit
          </button>
          <button type="button" onClick={() => handleToggleStatus(s)} className="text-sm font-medium text-neutral-500 hover:underline">
            {s.status === "active" ? "Nonaktifkan" : "Aktifkan"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Sales</h1>
          <p className="text-sm text-neutral-500">Kelola data tenaga pemasaran</p>
        </div>
        <button type="button" onClick={openCreateModal} className="flex items-center justify-center gap-1.5 rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600">
          <Plus size={16} />
          Tambah Sales
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau telepon..."
            className="w-full rounded-md border border-neutral-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
          />
        </div>
        <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600">
          <option value="">Semua Wilayah</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600">
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      <DataTable columns={columns} data={items} getRowId={(s) => s.id} isLoading={isLoading} emptyMessage="Belum ada sales. Tambahkan sales pertama Anda." />

      <Modal title={editing ? "Edit Sales" : "Tambah Sales"} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {errors._form && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors._form}</p>}
          <TextField label="Nama Sales" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} error={errors.name} placeholder="mis. Budi Santoso" />
          <TextField label="Nomor Telepon" type="tel" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} error={errors.phone} placeholder="mis. 081234567890" />
          <SelectField
            label="Wilayah Kerja"
            value={form.assigned_region_id}
            onChange={(v) => setForm((f) => ({ ...f, assigned_region_id: v }))}
            error={errors.assigned_region_id}
            options={regions.map((r) => ({ value: r.id, label: r.name }))}
          />
          <TextField label="ID User (opsional, dihubungkan di Tahap 8)" value={form.user_id} onChange={(v) => setForm((f) => ({ ...f, user_id: v }))} error={errors.user_id} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-md px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600 disabled:opacity-50">
              {submitting ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
