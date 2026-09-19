import "server-only";
import { SheetsRepository } from "@/lib/google-sheets/sheets-repository";
import {
  ORDER_TABLE,
  ORDER_DETAIL_TABLE,
  ASSIGNMENT_TABLE,
  PAYMENT_TABLE,
  STOCK_TRANSACTION_TABLE,
  VISIT_TABLE,
  PRODUCT_TABLE,
  SALES_TABLE,
} from "@/lib/google-sheets/tables";
import type {
  Order,
  OrderDetail,
  Assignment,
  Payment,
  StockTransaction,
  Visit,
  Product,
  Sales,
  OrderStatus,
} from "@/types/entities";
import type { AdminDashboardData, SalesDashboardData } from "../types/dashboard.types";

const orderRepo = new SheetsRepository<Order>(ORDER_TABLE);
const orderDetailRepo = new SheetsRepository<OrderDetail>(ORDER_DETAIL_TABLE);
const assignmentRepo = new SheetsRepository<Assignment>(ASSIGNMENT_TABLE);
const paymentRepo = new SheetsRepository<Payment>(PAYMENT_TABLE);
const stockTxRepo = new SheetsRepository<StockTransaction>(STOCK_TRANSACTION_TABLE);
const visitRepo = new SheetsRepository<Visit>(VISIT_TABLE);
const productRepo = new SheetsRepository<Product>(PRODUCT_TABLE);
const salesRepo = new SheetsRepository<Sales>(SALES_TABLE);

function today() {
  return new Date().toISOString().slice(0, 10);
}
function isDateStr(iso: string | undefined, dateStr: string) {
  return !!iso && iso.slice(0, 10) === dateStr;
}
function startOfWeek() {
  const now = new Date();
  const day = now.getDay() === 0 ? 7 : now.getDay(); // Senin = 1
  now.setDate(now.getDate() - (day - 1));
  return now.toISOString().slice(0, 10);
}

const NOT_DONE: OrderStatus[] = ["completed", "cancelled"];

export const dashboardService = {
  async getAdminDashboard(): Promise<AdminDashboardData> {
    const [orders, assignments, payments, stockTx, visits, products] = await Promise.all([
      orderRepo.findAll(),
      assignmentRepo.findAll(),
      paymentRepo.findAll(),
      stockTxRepo.findAll(),
      visitRepo.findAll(),
      productRepo.findAll(),
    ]);

    const todayStr = today();

    const totalOrdersToday = orders.filter((o) => o.order_date === todayStr).length;
    const ordersScheduling = orders.filter((o) => o.status === "scheduling").length;
    const ordersAssigned = orders.filter((o) => o.status === "assigned").length;
    const ordersInDelivery = orders.filter((o) => ["ready_to_delivery", "on_delivery"].includes(o.status)).length;
    const lateOrders = orders.filter((o) => !NOT_DONE.includes(o.status) && o.delivery_date < todayStr).length;

    const activeSalesToday = new Set(
      assignments
        .filter((a) => !NOT_DONE.includes(a.status) && (a.picking_date === todayStr || a.delivery_date === todayStr))
        .map((a) => a.sales_id)
    ).size;

    const visitsToday = visits.filter((v) => isDateStr(v.checked_in_at, todayStr)).length;

    const unpaidPayments = payments.filter((p) => p.status === "belum_bayar" || p.status === "sebagian").length;

    const salesSummaryToday = payments
      .filter((p) => isDateStr(p.created_at, todayStr))
      .reduce((sum, p) => sum + p.amount, 0);

    // Stok yang masih "di tangan" sales: picking_out - sales_out - returned,
    // hanya untuk assignment yang belum completed/cancelled.
    const activeAssignmentIds = new Set(
      assignments.filter((a) => !NOT_DONE.includes(a.status)).map((a) => a.id)
    );
    const outstandingByProduct = new Map<string, number>();
    stockTx
      .filter((tx) => activeAssignmentIds.has(tx.assignment_id))
      .forEach((tx) => {
        const sign = tx.type === "picking_out" ? 1 : tx.type === "sales_out" || tx.type === "returned" ? -1 : 0;
        if (sign === 0) return;
        outstandingByProduct.set(tx.product_id, (outstandingByProduct.get(tx.product_id) ?? 0) + sign * tx.quantity);
      });

    const stockSummary = Array.from(outstandingByProduct.entries())
      .filter(([, qty]) => qty > 0)
      .map(([productId, qty]) => ({
        productId,
        productName: products.find((p) => p.id === productId)?.name ?? productId,
        outstanding: qty,
      }))
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 10);

    return {
      totalOrdersToday,
      ordersScheduling,
      ordersAssigned,
      ordersInDelivery,
      activeSalesToday,
      visitsToday,
      unpaidPayments,
      lateOrders,
      salesSummaryToday,
      stockSummary,
    };
  },

  async getSalesDashboard(salesId: string): Promise<SalesDashboardData> {
    const [assignments, stockTx, orders, orderDetails] = await Promise.all([
      assignmentRepo.findAll({ sales_id: salesId } as Partial<Assignment>),
      stockTxRepo.findAll(),
      orderRepo.findAll(),
      orderDetailRepo.findAll(),
    ]);

    const todayStr = today();
    const weekStart = startOfWeek();

    const orderMap = new Map(orders.map((o) => [o.id, o]));

    const tasksToday = assignments.filter(
      (a) => a.picking_date === todayStr || a.delivery_date === todayStr
    ).length;
    const tasksToAccept = assignments.filter((a) => a.status === "assigned").length;

    const pickingSchedule = assignments
      .filter((a) => a.status === "ready_to_picking")
      .map((a) => ({
        assignmentId: a.id,
        orderNumber: orderMap.get(a.order_id)?.order_number ?? "-",
        pickingDate: a.picking_date,
        pickingTime: a.picking_time,
      }))
      .sort((a, b) => a.pickingDate.localeCompare(b.pickingDate));

    const deliverySchedule = assignments
      .filter((a) => a.status === "ready_to_delivery")
      .map((a) => ({
        assignmentId: a.id,
        orderNumber: orderMap.get(a.order_id)?.order_number ?? "-",
        deliveryDate: a.delivery_date,
      }))
      .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));

    const inDelivery = assignments.filter((a) => a.status === "on_delivery").length;
    const unfinishedVisits = assignments.filter((a) => a.status === "arrived").length;

    const recentVisits = assignments
      .filter((a) => a.status === "visited" || a.status === "completed")
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      .slice(0, 10)
      .map((a) => ({
        assignmentId: a.id,
        orderNumber: orderMap.get(a.order_id)?.order_number ?? "-",
        status: a.status,
        date: a.updated_at,
      }));

    const myAssignmentIds = new Set(assignments.map((a) => a.id));
    const priceByOrderProduct = new Map(
      orderDetails.map((d) => [`${d.order_id}:${d.product_id}`, d.unit_price])
    );
    const salesSummaryThisWeek = stockTx
      .filter(
        (tx) =>
          tx.type === "sales_out" &&
          myAssignmentIds.has(tx.assignment_id) &&
          tx.created_at.slice(0, 10) >= weekStart
      )
      .reduce((sum, tx) => {
        const assignment = assignments.find((a) => a.id === tx.assignment_id);
        const price = assignment ? priceByOrderProduct.get(`${assignment.order_id}:${tx.product_id}`) ?? 0 : 0;
        return sum + tx.quantity * price;
      }, 0);

    return {
      tasksToday,
      tasksToAccept,
      pickingSchedule,
      deliverySchedule,
      inDelivery,
      unfinishedVisits,
      recentVisits,
      salesSummaryThisWeek,
    };
  },
};
