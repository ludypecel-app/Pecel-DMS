import "server-only";
import { SheetsRepository } from "@/lib/google-sheets/sheets-repository";
import {
  ASSIGNMENT_TABLE,
  ORDER_TABLE,
  ORDER_DETAIL_TABLE,
  WARUNG_TABLE,
  PRODUCT_TABLE,
  SALES_TABLE,
  VISIT_TABLE,
  STOCK_TRANSACTION_TABLE,
  PAYMENT_TABLE,
} from "@/lib/google-sheets/tables";
import { checkOutSchema, type CheckOutInput } from "../validations/visit.schema";
import { notificationService } from "@/features/notifications/services/notification.service";
import { auditLog } from "@/lib/audit-log/audit-log.service";
import type {
  Assignment,
  Order,
  OrderDetail,
  Warung,
  Product,
  Sales,
  Visit,
  StockTransaction,
  Payment,
} from "@/types/entities";
import type { VisitFormData, VisitReviewData } from "../types/visit.types";

const assignmentRepo = new SheetsRepository<Assignment>(ASSIGNMENT_TABLE);
const orderRepo = new SheetsRepository<Order>(ORDER_TABLE);
const orderDetailRepo = new SheetsRepository<OrderDetail>(ORDER_DETAIL_TABLE);
const warungRepo = new SheetsRepository<Warung>(WARUNG_TABLE);
const productRepo = new SheetsRepository<Product>(PRODUCT_TABLE);
const visitRepo = new SheetsRepository<Visit>(VISIT_TABLE);
const stockTxRepo = new SheetsRepository<StockTransaction>(STOCK_TRANSACTION_TABLE);
const paymentRepo = new SheetsRepository<Payment>(PAYMENT_TABLE);
const salesRepo = new SheetsRepository<Sales>(SALES_TABLE);

async function sumStockByType(assignmentId: string, type: StockTransaction["type"]) {
  const rows = await stockTxRepo.findAll({
    assignment_id: assignmentId,
    type,
  } as Partial<StockTransaction>);
  const byProduct = new Map<string, number>();
  rows.forEach((r) => byProduct.set(r.product_id, (byProduct.get(r.product_id) ?? 0) + r.quantity));
  return byProduct;
}

export const visitService = {
  /**
   * Data untuk halaman pendataan kunjungan sales: jumlah pengiriman
   * diambil dari StockTransaction "picking_out" (Tahap 5) — sales TIDAK
   * bisa mengubahnya, sesuai aturan Bagian 9 brief.
   */
  async getFormData(assignmentId: string): Promise<VisitFormData> {
    const assignment = await assignmentRepo.findById(assignmentId);
    if (!assignment) throw new Error("Penugasan tidak ditemukan");

    const order = await orderRepo.findById(assignment.order_id);
    if (!order) throw new Error("Pesanan terkait tidak ditemukan");

    const [details, warung, shippedMap, visits] = await Promise.all([
      orderDetailRepo.findAll({ order_id: order.id } as Partial<OrderDetail>),
      warungRepo.findById(order.warung_id),
      sumStockByType(assignmentId, "picking_out"),
      visitRepo.findAll({ assignment_id: assignmentId } as Partial<Visit>),
    ]);

    const rows = await Promise.all(
      details.map(async (d) => {
        const product = await productRepo.findById(d.product_id);
        return {
          product_id: d.product_id,
          product_name: product?.name ?? d.product_id,
          unit_price: d.unit_price, // harga dibekukan dari pesanan, bukan harga master terbaru
          shipped_quantity: shippedMap.get(d.product_id) ?? d.quantity,
        };
      })
    );

    const activeVisit = visits.find((v) => !v.checked_out_at);

    return {
      assignmentId,
      orderNumber: order.order_number,
      warungName: warung?.name ?? "-",
      rows,
      alreadyCheckedOut: !activeVisit && visits.some((v) => v.checked_out_at),
    };
  },

  /**
   * Check-Out: validasi stok/penjualan, hitung total tagihan dari harga
   * yang dibekukan di pesanan (bukan harga master terbaru), simpan
   * Payment, tandai Visit selesai, dan pindahkan status ke "visited".
   */
  async checkOut(assignmentId: string, input: unknown, salesId: string): Promise<void> {
    const assignment = await assignmentRepo.findById(assignmentId);
    if (!assignment) throw new Error("Penugasan tidak ditemukan");
    if (assignment.sales_id !== salesId) throw new Error("Anda tidak berwenang atas penugasan ini");
    if (assignment.status !== "arrived") {
      throw new Error(`Penugasan berstatus "${assignment.status}" belum bisa melakukan Check-Out.`);
    }

    const data: CheckOutInput = checkOutSchema.parse(input);

    const order = await orderRepo.findById(assignment.order_id);
    if (!order) throw new Error("Pesanan terkait tidak ditemukan");
    const details = await orderDetailRepo.findAll({ order_id: order.id } as Partial<OrderDetail>);
    const shippedMap = await sumStockByType(assignmentId, "picking_out");

    // Validasi server-side: Penjualan tidak boleh melebihi Jumlah Pengiriman,
    // dan Produk Ditarik tidak boleh melebihi Sisa Stok (Jumlah Pengiriman - Penjualan).
    let totalTagihan = 0;
    for (const item of data.items) {
      const detail = details.find((d) => d.product_id === item.product_id);
      if (!detail) throw new Error(`Produk "${item.product_id}" bukan bagian dari pesanan ini`);

      const shipped = shippedMap.get(item.product_id) ?? 0;
      if (item.sold_quantity > shipped) {
        throw new Error(
          `Jumlah penjualan produk "${detail.product_id}" (${item.sold_quantity}) melebihi jumlah pengiriman (${shipped})`
        );
      }
      const sisaStok = shipped - item.sold_quantity;
      if (item.returned_quantity > sisaStok) {
        throw new Error(
          `Jumlah produk ditarik untuk "${detail.product_id}" (${item.returned_quantity}) melebihi sisa stok (${sisaStok})`
        );
      }
      totalTagihan += item.sold_quantity * detail.unit_price;
    }

    // Ambil (atau buat, untuk jaga-jaga) record Visit yang dibuat saat check-in.
    const visits = await visitRepo.findAll({ assignment_id: assignmentId } as Partial<Visit>);
    let visit = visits.find((v) => !v.checked_out_at);
    if (!visit) {
      visit = await visitRepo.create({
        assignment_id: assignmentId,
        sales_id: salesId,
        warung_id: order.warung_id,
      } as Omit<Visit, "id" | "created_at" | "updated_at">);
    }

    await Promise.all(
      data.items.flatMap((item) => [
        stockTxRepo.create({
          visit_id: visit!.id,
          assignment_id: assignmentId,
          product_id: item.product_id,
          type: "sales_out",
          quantity: item.sold_quantity,
        } as Omit<StockTransaction, "id" | "created_at" | "updated_at">),
        ...(item.returned_quantity > 0
          ? [
              stockTxRepo.create({
                visit_id: visit!.id,
                assignment_id: assignmentId,
                product_id: item.product_id,
                type: "returned",
                quantity: item.returned_quantity,
              } as Omit<StockTransaction, "id" | "created_at" | "updated_at">),
            ]
          : []),
      ])
    );

    await paymentRepo.create({
      visit_id: visit.id,
      amount: totalTagihan,
      status: data.payment.status,
      method: data.payment.method,
      // CATATAN: penyimpanan file asli (Google Drive API) belum terpasang
      // di lingkungan ini — proof_attachment_id sementara menyimpan URL
      // yang ditempel manual. Ganti dengan upload sungguhan begitu
      // integrasi Drive tersedia (lihat docs/architecture.md).
      proof_attachment_id: data.payment.proof_url,
    } as Omit<Payment, "id" | "created_at" | "updated_at">);

    await visitRepo.update(visit.id, {
      checked_out_at: new Date().toISOString(),
      notes: data.notes,
    } as Partial<Visit>);

    await assignmentRepo.update(assignmentId, { status: "visited" } as Partial<Assignment>);
    await orderRepo.update(order.id, { status: "visited" } as Partial<Order>);

    await auditLog.record({
      entityType: "Visit",
      entityId: visit.id,
      action: "check_out",
      actorId: salesId,
      after: { items: data.items, payment: data.payment, total: totalTagihan },
    });

    await notificationService.send({
      // "admin" (bukan assignment.assigned_by / UUID admin pembuat tugas) —
      // inbox notifikasi admin memakai user_id literal "admin" bersama.
      userId: "admin",
      type: "visit_checked_out",
      message: `Sales menyelesaikan kunjungan untuk pesanan ${order.order_number}. Menunggu konfirmasi Anda.`,
      link: `/assignments/${assignmentId}`,
    });
  },

  /**
   * Data lengkap untuk halaman review admin (Tahap 7): breakdown stok per
   * produk (pengiriman/penjualan/ditarik/sisa), pembayaran, dan info
   * kunjungan — dipakai admin sebelum menekan "Konfirmasi Selesai".
   */
  async getReviewData(assignmentId: string): Promise<VisitReviewData> {
    const assignment = await assignmentRepo.findById(assignmentId);
    if (!assignment) throw new Error("Penugasan tidak ditemukan");

    const order = await orderRepo.findById(assignment.order_id);
    if (!order) throw new Error("Pesanan terkait tidak ditemukan");

    const [details, warung, sales, visits, pickingMap, salesOutMap, returnedMap] = await Promise.all([
      orderDetailRepo.findAll({ order_id: order.id } as Partial<OrderDetail>),
      warungRepo.findById(order.warung_id),
      salesRepo.findById(assignment.sales_id),
      visitRepo.findAll({ assignment_id: assignmentId } as Partial<Visit>),
      sumStockByType(assignmentId, "picking_out"),
      sumStockByType(assignmentId, "sales_out"),
      sumStockByType(assignmentId, "returned"),
    ]);

    const visit = visits.find((v) => v.checked_out_at) ?? visits[0];
    const payments = visit ? await paymentRepo.findAll({ visit_id: visit.id } as Partial<Payment>) : [];
    const payment = payments[0] ?? null;

    const rows = await Promise.all(
      details.map(async (d) => {
        const product = await productRepo.findById(d.product_id);
        const shipped = pickingMap.get(d.product_id) ?? 0;
        const sold = salesOutMap.get(d.product_id) ?? 0;
        const returned = returnedMap.get(d.product_id) ?? 0;
        return {
          product_id: d.product_id,
          product_name: product?.name ?? d.product_id,
          unit_price: d.unit_price,
          shipped_quantity: shipped,
          sold_quantity: sold,
          returned_quantity: returned,
          current_stock: shipped - sold - returned,
        };
      })
    );

    const totalTagihan = rows.reduce((sum, r) => sum + r.sold_quantity * r.unit_price, 0);

    return {
      assignmentId,
      orderNumber: order.order_number,
      warungName: warung?.name ?? "-",
      salesName: sales?.name ?? assignment.sales_id,
      status: assignment.status,
      checkedInAt: visit?.checked_in_at,
      checkedOutAt: visit?.checked_out_at,
      checkedInOutOfRange: visit?.checked_in_out_of_range,
      checkedInDistanceM: visit?.checked_in_distance_m,
      visitNotes: visit?.notes,
      rows,
      totalTagihan,
      payment: payment
        ? { status: payment.status, method: payment.method, proofUrl: payment.proof_attachment_id }
        : null,
      confirmedBy: assignment.completed_by,
      confirmedAt: assignment.completed_at,
    };
  },
};
