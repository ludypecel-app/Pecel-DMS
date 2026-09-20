import { NextRequest, NextResponse } from "next/server";
import { SheetsRepository } from "@/lib/google-sheets/sheets-repository";
import {
  SALES_TABLE,
  REGION_TABLE,
  WARUNG_TABLE,
  ORDER_TABLE,
  ORDER_DETAIL_TABLE,
  ASSIGNMENT_TABLE,
  VISIT_TABLE,
} from "@/lib/google-sheets/tables";
import { handleApiError } from "@/lib/utils/api-response";
import { requireAdmin } from "@/lib/auth/session";
import type { Sales, Region, Warung, Order, OrderDetail, Assignment, Visit } from "@/types/entities";

const salesRepo = new SheetsRepository<Sales>(SALES_TABLE);
const regionRepo = new SheetsRepository<Region>(REGION_TABLE);
const warungRepo = new SheetsRepository<Warung>(WARUNG_TABLE);
const orderRepo = new SheetsRepository<Order>(ORDER_TABLE);
const orderDetailRepo = new SheetsRepository<OrderDetail>(ORDER_DETAIL_TABLE);
const assignmentRepo = new SheetsRepository<Assignment>(ASSIGNMENT_TABLE);
const visitRepo = new SheetsRepository<Visit>(VISIT_TABLE);

const NOT_DONE = new Set(["completed", "cancelled"]);

/**
 * Laporan Per Sales: ringkasan kinerja SELURUH sales (bukan cuma top 5
 * seperti kartu "Performa Sales" di Dashboard), dan detail tiap sales
 * (?salesId=...) berisi breakdown kinerja per warung yang ia tangani.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const salesId = searchParams.get("salesId");

    const [salesList, regions, warungs, orders, orderDetails, assignments, visits] = await Promise.all([
      salesRepo.findAll(),
      regionRepo.findAll(),
      warungRepo.findAll(),
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
    const regionMap = new Map(regions.map((r) => [r.id, r]));
    const warungMap = new Map(warungs.map((w) => [w.id, w]));

    function buildSummary(sales: Sales) {
      const salesAssignments = assignments.filter((a) => a.sales_id === sales.id);
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
        salesId: sales.id,
        salesName: sales.name,
        regionId: sales.assigned_region_id,
        regionName: regionMap.get(sales.assigned_region_id)?.name ?? "-",
        status: sales.status,
        totalAssignments: salesAssignments.length,
        completedAssignments,
        cancelledAssignments,
        activeAssignments,
        completionRate: salesAssignments.length > 0 ? Math.round((completedAssignments / salesAssignments.length) * 100) : 0,
        totalVisits,
        totalOmzet,
      };
    }

    // --- Tanpa salesId: ringkasan seluruh sales ---
    if (!salesId) {
      const summaries = salesList.map(buildSummary).sort((a, b) => b.totalOmzet - a.totalOmzet);
      return NextResponse.json({ data: { summaries } });
    }

    // --- Detail satu sales: breakdown kinerja per warung yang ditangani ---
    const sales = salesList.find((s) => s.id === salesId);
    if (!sales) throw new Error("Sales tidak ditemukan");

    const summary = buildSummary(sales);
    const salesAssignments = assignments.filter((a) => a.sales_id === salesId);

    const byWarung = new Map<string, { totalOrders: number; totalOmzet: number }>();
    salesAssignments.forEach((a) => {
      const order = orderMap.get(a.order_id);
      if (!order) return;
      const entry = byWarung.get(order.warung_id) ?? { totalOrders: 0, totalOmzet: 0 };
      entry.totalOrders += 1;
      entry.totalOmzet += orderTotal.get(order.id) ?? 0;
      byWarung.set(order.warung_id, entry);
    });

    const warungBreakdown = Array.from(byWarung.entries())
      .map(([warungId, v]) => ({
        warungId,
        warungName: warungMap.get(warungId)?.name ?? warungId,
        totalOrders: v.totalOrders,
        totalOmzet: v.totalOmzet,
      }))
      .sort((a, b) => b.totalOmzet - a.totalOmzet);

    return NextResponse.json({
      data: {
        ...summary,
        phone: sales.phone,
        warungBreakdown,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
