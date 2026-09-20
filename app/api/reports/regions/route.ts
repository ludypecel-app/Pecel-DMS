import { NextRequest, NextResponse } from "next/server";
import { SheetsRepository } from "@/lib/google-sheets/sheets-repository";
import {
  REGION_TABLE,
  WARUNG_TABLE,
  SALES_TABLE,
  ORDER_TABLE,
  ORDER_DETAIL_TABLE,
  ASSIGNMENT_TABLE,
  VISIT_TABLE,
} from "@/lib/google-sheets/tables";
import { handleApiError } from "@/lib/utils/api-response";
import { requireAdmin } from "@/lib/auth/session";
import type { Region, Warung, Sales, Order, OrderDetail, Assignment, Visit } from "@/types/entities";

const regionRepo = new SheetsRepository<Region>(REGION_TABLE);
const warungRepo = new SheetsRepository<Warung>(WARUNG_TABLE);
const salesRepo = new SheetsRepository<Sales>(SALES_TABLE);
const orderRepo = new SheetsRepository<Order>(ORDER_TABLE);
const orderDetailRepo = new SheetsRepository<OrderDetail>(ORDER_DETAIL_TABLE);
const assignmentRepo = new SheetsRepository<Assignment>(ASSIGNMENT_TABLE);
const visitRepo = new SheetsRepository<Visit>(VISIT_TABLE);

const NOT_DONE = new Set(["completed", "cancelled"]);

/**
 * Laporan per Wilayah: daftar warung di suatu wilayah beserta nilai
 * pesanannya, dan kinerja sales yang menangani penugasan di wilayah
 * tersebut (jumlah tugas, tingkat penyelesaian, kunjungan, nilai pesanan
 * yang ditangani). Diakses lewat ?regionId=... — tanpa param, hanya daftar
 * ringkasan seluruh wilayah yang dikembalikan (untuk tabel pemilihan awal).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get("regionId");

    const [regions, warungs, salesList, orders, orderDetails, assignments, visits] = await Promise.all([
      regionRepo.findAll(),
      warungRepo.findAll(),
      salesRepo.findAll(),
      orderRepo.findAll(),
      orderDetailRepo.findAll(),
      assignmentRepo.findAll(),
      visitRepo.findAll(),
    ]);

    const orderTotal = new Map<string, number>();
    orderDetails.forEach((d) => {
      orderTotal.set(d.order_id, (orderTotal.get(d.order_id) ?? 0) + d.subtotal);
    });
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    function buildRegionSummary(region: Region) {
      const regionOrders = orders.filter((o) => o.region_id === region.id);
      const totalOmzet = regionOrders.reduce((sum, o) => sum + (orderTotal.get(o.id) ?? 0), 0);
      return {
        regionId: region.id,
        regionName: region.name,
        warungCount: warungs.filter((w) => w.region_id === region.id).length,
        salesCount: salesList.filter((s) => s.assigned_region_id === region.id).length,
        totalOrders: regionOrders.length,
        totalOmzet,
      };
    }

    // Tanpa regionId: kembalikan ringkasan seluruh wilayah saja (untuk
    // tabel pemilihan / perbandingan cepat antar wilayah).
    if (!regionId) {
      const summaries = regions.map(buildRegionSummary).sort((a, b) => b.totalOmzet - a.totalOmzet);
      return NextResponse.json({ data: { summaries } });
    }

    const region = regions.find((r) => r.id === regionId);
    if (!region) throw new Error("Wilayah tidak ditemukan");

    const regionWarungs = warungs.filter((w) => w.region_id === regionId);
    const regionOrders = orders.filter((o) => o.region_id === regionId);
    const regionOrderIds = new Set(regionOrders.map((o) => o.id));

    const warungRows = regionWarungs
      .map((w) => {
        const wOrders = regionOrders.filter((o) => o.warung_id === w.id);
        const totalOmzet = wOrders.reduce((sum, o) => sum + (orderTotal.get(o.id) ?? 0), 0);
        const lastOrderDate = wOrders.reduce<string | undefined>(
          (latest, o) => (!latest || o.order_date > latest ? o.order_date : latest),
          undefined
        );
        return {
          warungId: w.id,
          warungName: w.name,
          address: w.address,
          status: w.status,
          totalOrders: wOrders.length,
          totalOmzet,
          lastOrderDate,
        };
      })
      .sort((a, b) => b.totalOmzet - a.totalOmzet);

    // Sales yang ditugaskan menangani wilayah ini (assigned_region_id),
    // kinerjanya dihitung dari penugasan (Assignment) yang pesanannya
    // termasuk wilayah ini — bukan seluruh penugasan sales di semua wilayah.
    const regionSales = salesList.filter((s) => s.assigned_region_id === regionId);
    const salesPerformance = regionSales
      .map((s) => {
        const salesAssignments = assignments.filter(
          (a) => a.sales_id === s.id && regionOrderIds.has(a.order_id)
        );
        const completedAssignments = salesAssignments.filter((a) => a.status === "completed").length;
        const cancelledAssignments = salesAssignments.filter((a) => a.status === "cancelled").length;
        const activeAssignments = salesAssignments.filter((a) => !NOT_DONE.has(a.status)).length;
        const assignmentIds = new Set(salesAssignments.map((a) => a.id));
        const totalVisits = visits.filter((v) => assignmentIds.has(v.assignment_id) && v.checked_in_at).length;
        const totalOmzet = salesAssignments.reduce((sum, a) => {
          const order = orderMap.get(a.order_id);
          return sum + (order ? orderTotal.get(order.id) ?? 0 : 0);
        }, 0);
        return {
          salesId: s.id,
          salesName: s.name,
          status: s.status,
          totalAssignments: salesAssignments.length,
          completedAssignments,
          cancelledAssignments,
          activeAssignments,
          completionRate: salesAssignments.length > 0 ? Math.round((completedAssignments / salesAssignments.length) * 100) : 0,
          totalVisits,
          totalOmzet,
        };
      })
      .sort((a, b) => b.totalOmzet - a.totalOmzet);

    return NextResponse.json({
      data: {
        regionId: region.id,
        regionName: region.name,
        warungCount: regionWarungs.length,
        salesCount: regionSales.length,
        totalOrders: regionOrders.length,
        totalOmzet: regionOrders.reduce((sum, o) => sum + (orderTotal.get(o.id) ?? 0), 0),
        warungs: warungRows,
        salesPerformance,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
