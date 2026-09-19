"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { useActiveRegions } from "@/features/regions/hooks/useActiveRegions";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/features/orders/constants";
import type { OrderStatus } from "@/types/entities";
import type { OrderWithDetails } from "@/features/orders/types/order.types";

export default function OrdersPage() {
  const regions = useActiveRegions();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [regionFilter, setRegionFilter] = useState("");

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (regionFilter) params.set("regionId", regionFilter);
    const res = await fetch(`/api/orders?${params.toString()}`);
    const json = await res.json();
    setOrders(json.data ?? []);
    setIsLoading(false);
  }, [search, statusFilter, regionFilter]);

  useEffect(() => {
    const timeout = setTimeout(fetchOrders, 300);
    return () => clearTimeout(timeout);
  }, [fetchOrders]);

  function regionName(id: string) {
    return regions.find((r) => r.id === id)?.name ?? "-";
  }

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

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
          <h1 className="text-lg font-semibold text-neutral-900">Pesanan</h1>
          <p className="text-sm text-neutral-500">Kelola pesanan dari warung</p>
        </div>
        <Link
          href="/orders/new"
          className="flex items-center justify-center gap-1.5 rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-600"
        >
          <Plus size={16} />
          Buat Pesanan
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor pesanan..."
            className="w-full rounded-md border border-neutral-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
          />
        </div>
        <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600">
          <option value="">Semua Wilayah</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "")} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600">
          <option value="">Semua Status</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <DataTable columns={columns} data={orders} getRowId={(o) => o.id} isLoading={isLoading} emptyMessage="Belum ada pesanan." />
    </div>
  );
}
