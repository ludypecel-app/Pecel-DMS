import { NextRequest, NextResponse } from "next/server";
import { SheetsRepository } from "@/lib/google-sheets/sheets-repository";
import { PAYMENT_TABLE, VISIT_TABLE, ASSIGNMENT_TABLE, ORDER_TABLE, SALES_TABLE } from "@/lib/google-sheets/tables";
import { handleApiError } from "@/lib/utils/api-response";
import { requireAdmin } from "@/lib/auth/session";
import type { Payment, Visit, Assignment, Order, Sales } from "@/types/entities";

const paymentRepo = new SheetsRepository<Payment>(PAYMENT_TABLE);
const visitRepo = new SheetsRepository<Visit>(VISIT_TABLE);
const assignmentRepo = new SheetsRepository<Assignment>(ASSIGNMENT_TABLE);
const orderRepo = new SheetsRepository<Order>(ORDER_TABLE);
const salesRepo = new SheetsRepository<Sales>(SALES_TABLE);

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") ?? "0000-01-01";
    const to = searchParams.get("to") ?? "9999-12-31";

    const [payments, visits, assignments, orders, salesList] = await Promise.all([
      paymentRepo.findAll(),
      visitRepo.findAll(),
      assignmentRepo.findAll(),
      orderRepo.findAll(),
      salesRepo.findAll(),
    ]);

    const visitMap = new Map(visits.map((v) => [v.id, v]));
    const assignmentMap = new Map(assignments.map((a) => [a.id, a]));
    const orderMap = new Map(orders.map((o) => [o.id, o]));
    const salesMap = new Map(salesList.map((s) => [s.id, s]));

    const rows = payments
      .filter((p) => {
        const dateStr = p.created_at.slice(0, 10);
        return dateStr >= from && dateStr <= to;
      })
      .map((p) => {
        const visit = visitMap.get(p.visit_id);
        const assignment = visit ? assignmentMap.get(visit.assignment_id) : undefined;
        const order = assignment ? orderMap.get(assignment.order_id) : undefined;
        const sales = assignment ? salesMap.get(assignment.sales_id) : undefined;
        return {
          paymentId: p.id,
          date: p.created_at,
          orderNumber: order?.order_number ?? "-",
          salesName: sales?.name ?? "-",
          amount: p.amount,
          status: p.status,
          method: p.method,
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    return NextResponse.json({ data: rows });
  } catch (error) {
    return handleApiError(error);
  }
}
