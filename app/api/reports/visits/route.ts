import { NextRequest, NextResponse } from "next/server";
import { SheetsRepository } from "@/lib/google-sheets/sheets-repository";
import { VISIT_TABLE, ASSIGNMENT_TABLE, ORDER_TABLE, SALES_TABLE, WARUNG_TABLE } from "@/lib/google-sheets/tables";
import { handleApiError } from "@/lib/utils/api-response";
import { requireAdmin } from "@/lib/auth/session";
import type { Visit, Assignment, Order, Sales, Warung } from "@/types/entities";

const visitRepo = new SheetsRepository<Visit>(VISIT_TABLE);
const assignmentRepo = new SheetsRepository<Assignment>(ASSIGNMENT_TABLE);
const orderRepo = new SheetsRepository<Order>(ORDER_TABLE);
const salesRepo = new SheetsRepository<Sales>(SALES_TABLE);
const warungRepo = new SheetsRepository<Warung>(WARUNG_TABLE);

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") ?? "0000-01-01";
    const to = searchParams.get("to") ?? "9999-12-31";
    const salesId = searchParams.get("salesId") ?? undefined;

    const [visits, assignments, orders, salesList, warungs] = await Promise.all([
      visitRepo.findAll(),
      assignmentRepo.findAll(),
      orderRepo.findAll(),
      salesRepo.findAll(),
      warungRepo.findAll(),
    ]);

    const assignmentMap = new Map(assignments.map((a) => [a.id, a]));
    const orderMap = new Map(orders.map((o) => [o.id, o]));
    const salesMap = new Map(salesList.map((s) => [s.id, s]));
    const warungMap = new Map(warungs.map((w) => [w.id, w]));

    const rows = visits
      .filter((v) => {
        if (!v.checked_in_at) return false;
        const dateStr = v.checked_in_at.slice(0, 10);
        if (dateStr < from || dateStr > to) return false;
        if (salesId && v.sales_id !== salesId) return false;
        return true;
      })
      .map((v) => {
        const assignment = assignmentMap.get(v.assignment_id);
        const order = assignment ? orderMap.get(assignment.order_id) : undefined;
        return {
          visitId: v.id,
          orderNumber: order?.order_number ?? "-",
          salesName: salesMap.get(v.sales_id)?.name ?? v.sales_id,
          warungName: warungMap.get(v.warung_id)?.name ?? "-",
          checkedInAt: v.checked_in_at,
          checkedOutAt: v.checked_out_at,
          status: assignment?.status ?? "-",
        };
      })
      .sort((a, b) => ((a.checkedInAt ?? "") < (b.checkedInAt ?? "") ? 1 : -1));

    return NextResponse.json({ data: rows });
  } catch (error) {
    return handleApiError(error);
  }
}
