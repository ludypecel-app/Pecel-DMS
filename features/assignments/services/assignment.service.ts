import "server-only";
import { SheetsRepository } from "@/lib/google-sheets/sheets-repository";
import {
  ASSIGNMENT_TABLE,
  ORDER_TABLE,
  ORDER_DETAIL_TABLE,
  SALES_TABLE,
  STOCK_TRANSACTION_TABLE,
  VISIT_TABLE,
} from "@/lib/google-sheets/tables";
import {
  createAssignmentSchema,
  rejectAssignmentSchema,
  confirmPickingSchema,
  cancelAssignmentSchema,
  checkInSchema,
  type CreateAssignmentInput,
} from "../validations/assignment.schema";
import { notificationService } from "@/features/notifications/services/notification.service";
import { auditLog } from "@/lib/audit-log/audit-log.service";
import type { Assignment, Order, OrderDetail, Sales, StockTransaction, Visit } from "@/types/entities";
import type { AssignmentWithOrder } from "../types/assignment.types";

const repository = new SheetsRepository<Assignment>(ASSIGNMENT_TABLE);
const orderRepo = new SheetsRepository<Order>(ORDER_TABLE);
const orderDetailRepo = new SheetsRepository<OrderDetail>(ORDER_DETAIL_TABLE);
const salesRepo = new SheetsRepository<Sales>(SALES_TABLE);
const stockTxRepo = new SheetsRepository<StockTransaction>(STOCK_TRANSACTION_TABLE);
const visitRepo = new SheetsRepository<Visit>(VISIT_TABLE);

// Status di mana pembatalan tugas masih diizinkan tanpa proses retur khusus.
const FREELY_CANCELLABLE = ["assigned", "ready_to_picking", "ready_to_delivery"];
// Status di mana pembatalan sama sekali tidak diizinkan (Bagian 13 brief).
const NEVER_CANCELLABLE = ["arrived", "visited", "completed", "cancelled"];

async function attachOrder(assignment: Assignment): Promise<AssignmentWithOrder> {
  const order = await orderRepo.findById(assignment.order_id);
  if (!order) return { ...assignment, order: null };
  const details = await orderDetailRepo.findAll({ order_id: order.id } as Partial<OrderDetail>);
  return {
    ...assignment,
    order: { ...order, details, total: details.reduce((s, d) => s + d.subtotal, 0) },
  };
}

export const assignmentService = {
  async list(params?: { salesId?: string; status?: string }): Promise<AssignmentWithOrder[]> {
    let items = await repository.findAll();
    if (params?.salesId) items = items.filter((a) => a.sales_id === params.salesId);
    if (params?.status) items = items.filter((a) => a.status === params.status);
    items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return Promise.all(items.map(attachOrder));
  },

  async getById(id: string): Promise<AssignmentWithOrder | null> {
    const item = await repository.findById(id);
    if (!item) return null;
    return attachOrder(item);
  },

  /**
   * Menugaskan sales ke pesanan berstatus "scheduling". Detail pesanan
   * (produk, jumlah) diambil otomatis dari Order — tidak diketik ulang.
   * Bisa dipanggil lagi untuk pesanan yang kembali ke "scheduling" setelah
   * ditolak sales sebelumnya (penugasan ulang).
   */
  async create(input: unknown, assignedBy: string): Promise<AssignmentWithOrder> {
    const data: CreateAssignmentInput = createAssignmentSchema.parse(input);

    const order = await orderRepo.findById(data.order_id);
    if (!order) throw new Error("Pesanan tidak ditemukan");
    if (order.status !== "scheduling") {
      throw new Error(
        `Pesanan berstatus "${order.status}" — hanya pesanan Scheduling yang dapat ditugaskan.`
      );
    }

    const sales = await salesRepo.findById(data.sales_id);
    if (!sales || sales.status !== "active") {
      throw new Error("Sales yang dipilih tidak valid atau tidak aktif");
    }

    const assignment = await repository.create({
      order_id: data.order_id,
      sales_id: data.sales_id,
      picking_date: data.picking_date,
      picking_time: data.picking_time,
      delivery_date: data.delivery_date,
      status: "assigned",
      assigned_by: assignedBy,
      assigned_at: new Date().toISOString(),
    } as Omit<Assignment, "id" | "created_at" | "updated_at">);

    await orderRepo.update(order.id, { status: "assigned" } as Partial<Order>);

    await auditLog.record({
      entityType: "Assignment",
      entityId: assignment.id,
      action: "create",
      actorId: assignedBy,
      after: { order_id: order.id, sales_id: sales.id, status: "assigned" },
    });

    await notificationService.send({
      userId: sales.id,
      type: "assignment_created",
      message: `Anda mendapat penugasan baru untuk pesanan ${order.order_number}.`,
      link: `/assignments/${assignment.id}`,
    });

    return attachOrder(assignment);
  },

  /** Sales menerima penugasan → status Ready To Picking. */
  async accept(id: string, salesId: string): Promise<AssignmentWithOrder> {
    const assignment = await repository.findById(id);
    if (!assignment) throw new Error("Penugasan tidak ditemukan");
    if (assignment.sales_id !== salesId) {
      throw new Error("Anda tidak berwenang atas penugasan ini");
    }
    if (assignment.status !== "assigned") {
      throw new Error(`Penugasan berstatus "${assignment.status}" tidak dapat diterima`);
    }

    const updated = await repository.update(id, {
      status: "ready_to_picking",
      accepted_at: new Date().toISOString(),
    } as Partial<Assignment>);

    await orderRepo.update(assignment.order_id, {
      status: "ready_to_picking",
    } as Partial<Order>);

    await auditLog.record({
      entityType: "Assignment",
      entityId: id,
      action: "accept",
      actorId: salesId,
      before: { status: assignment.status },
      after: { status: "ready_to_picking" },
    });

    await notificationService.send({
      // "admin" (bukan assignment.assigned_by, yang berisi UUID admin
      // pembuat tugas) — inbox notifikasi admin memakai user_id literal
      // "admin" bersama (lihat notification.service.ts / types/entities.ts),
      // jadi mengirim UUID di sini membuat notifikasi ini tidak pernah
      // muncul untuk admin manapun.
      userId: "admin",
      type: "assignment_accepted",
      message: `Penugasan untuk pesanan telah diterima sales.`,
      link: `/assignments/${id}`,
    });

    return attachOrder(updated);
  },

  /**
   * Sales menolak penugasan → wajib alasan. Pesanan dikembalikan ke
   * status "scheduling" agar admin bisa menugaskan ulang ke sales lain;
   * riwayat penolakan tetap tersimpan di record Assignment ini (tidak dihapus).
   */
  async reject(id: string, input: unknown, salesId: string): Promise<AssignmentWithOrder> {
    const assignment = await repository.findById(id);
    if (!assignment) throw new Error("Penugasan tidak ditemukan");
    if (assignment.sales_id !== salesId) {
      throw new Error("Anda tidak berwenang atas penugasan ini");
    }
    if (assignment.status !== "assigned") {
      throw new Error(`Penugasan berstatus "${assignment.status}" tidak dapat ditolak`);
    }

    const { reason } = rejectAssignmentSchema.parse(input);

    const updated = await repository.update(id, {
      status: "cancelled", // status Assignment ini sendiri ditutup sebagai "cancelled"
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    } as Partial<Assignment>);

    // Pesanan kembali ke Scheduling — bukan status Rejected permanen,
    // sesuai keputusan Tahap 0 bahwa Rejected adalah hasil aksi, bukan
    // kolom Kanban tersendiri.
    await orderRepo.update(assignment.order_id, { status: "scheduling" } as Partial<Order>);

    await auditLog.record({
      entityType: "Assignment",
      entityId: id,
      action: "reject",
      actorId: salesId,
      before: { status: assignment.status },
      after: { status: "cancelled", rejection_reason: reason },
    });

    await notificationService.send({
      userId: "admin", // lihat catatan di notifikasi "assignment_accepted" di atas
      type: "assignment_rejected",
      message: `Sales menolak penugasan. Alasan: ${reason}`,
      link: `/assignments/${id}`,
    });

    return attachOrder(updated);
  },

  /**
   * Admin mengonfirmasi picking selesai. Menerima jumlah AKTUAL yang
   * diserahkan per produk (bisa berbeda dari jumlah pesanan — partial
   * fulfillment diizinkan, sesuai keputusan Tahap 0). Setiap produk
   * dicatat sebagai StockTransaction bertipe "picking_out" untuk jejak
   * audit stok. Order detail ASLI tidak diubah.
   */
  async confirmPicking(id: string, input: unknown, actorId: string): Promise<AssignmentWithOrder> {
    const assignment = await repository.findById(id);
    if (!assignment) throw new Error("Penugasan tidak ditemukan");
    if (assignment.status !== "ready_to_picking") {
      throw new Error(`Penugasan berstatus "${assignment.status}" belum bisa dikonfirmasi picking`);
    }

    const { items } = confirmPickingSchema.parse(input);

    // Validasi setiap product_id benar-benar bagian dari pesanan ini —
    // tanpa ini, id produk yang salah ketik/basi akan lolos dan tercatat
    // sebagai StockTransaction picking_out untuk produk yang sama sekali
    // tidak dipesan, mencemari data stok lapangan & dashboard tanpa error
    // apa pun (sama seperti validasi yang sudah ada di visitService.checkOut).
    const orderDetails = await orderDetailRepo.findAll({ order_id: assignment.order_id } as Partial<OrderDetail>);
    for (const item of items) {
      const detail = orderDetails.find((d) => d.product_id === item.product_id);
      if (!detail) throw new Error(`Produk "${item.product_id}" bukan bagian dari pesanan ini`);
    }

    await Promise.all(
      items.map((item) =>
        stockTxRepo.create({
          assignment_id: id,
          product_id: item.product_id,
          type: "picking_out",
          quantity: item.actual_quantity,
        } as Omit<StockTransaction, "id" | "created_at" | "updated_at">)
      )
    );

    const updated = await repository.update(id, {
      status: "ready_to_delivery",
      picking_confirmed_by: actorId,
      picking_confirmed_at: new Date().toISOString(),
    } as Partial<Assignment>);

    await orderRepo.update(assignment.order_id, { status: "ready_to_delivery" } as Partial<Order>);

    await auditLog.record({
      entityType: "Assignment",
      entityId: id,
      action: "confirm_picking",
      actorId,
      after: { status: "ready_to_delivery", items },
    });

    await notificationService.send({
      userId: assignment.sales_id,
      type: "picking_done",
      message: "Picking selesai — pesanan siap dikirim.",
      link: `/assignments/${id}`,
    });

    return attachOrder(updated);
  },

  /** Sales memulai pengiriman → status On Delivery. */
  async startDelivery(id: string, salesId: string): Promise<AssignmentWithOrder> {
    const assignment = await repository.findById(id);
    if (!assignment) throw new Error("Penugasan tidak ditemukan");
    if (assignment.sales_id !== salesId) throw new Error("Anda tidak berwenang atas penugasan ini");
    if (assignment.status !== "ready_to_delivery") {
      throw new Error(`Penugasan berstatus "${assignment.status}" belum siap dikirim`);
    }

    const updated = await repository.update(id, { status: "on_delivery" } as Partial<Assignment>);
    await orderRepo.update(assignment.order_id, { status: "on_delivery" } as Partial<Order>);

    await auditLog.record({
      entityType: "Assignment",
      entityId: id,
      action: "start_delivery",
      actorId: salesId,
      after: { status: "on_delivery" },
    });

    return attachOrder(updated);
  },

  /**
   * Sales check-in setibanya di warung → status Arrived. Membuat record
   * Visit (dipakai lagi di Tahap 6 untuk pendataan stok/pembayaran).
   * Izin lokasi ditolak/GPS tidak tersedia tetap diperbolehkan check-in
   * tanpa koordinat — sesuai catatan Tahap 6 brief bahwa GPS tidak selalu ada.
   */
  async checkIn(id: string, salesId: string, input: unknown): Promise<AssignmentWithOrder> {
    const assignment = await repository.findById(id);
    if (!assignment) throw new Error("Penugasan tidak ditemukan");
    if (assignment.sales_id !== salesId) throw new Error("Anda tidak berwenang atas penugasan ini");
    if (assignment.status !== "on_delivery") {
      throw new Error(`Penugasan berstatus "${assignment.status}" belum bisa check-in`);
    }

    const { latitude, longitude } = checkInSchema.parse(input);
    const order = await orderRepo.findById(assignment.order_id);
    if (!order) throw new Error("Pesanan terkait tidak ditemukan");

    await visitRepo.create({
      assignment_id: id,
      sales_id: salesId,
      warung_id: order.warung_id,
      checked_in_at: new Date().toISOString(),
      checked_in_lat: latitude,
      checked_in_lng: longitude,
    } as Omit<Visit, "id" | "created_at" | "updated_at">);

    const updated = await repository.update(id, { status: "arrived" } as Partial<Assignment>);
    await orderRepo.update(assignment.order_id, { status: "arrived" } as Partial<Order>);

    await auditLog.record({
      entityType: "Assignment",
      entityId: id,
      action: "check_in",
      actorId: salesId,
      after: { status: "arrived", latitude, longitude },
    });

    await notificationService.send({
      userId: "admin", // lihat catatan di notifikasi "assignment_accepted" di atas
      type: "sales_arrived",
      message: "Sales telah sampai di lokasi warung.",
      link: `/assignments/${id}`,
    });

    return attachOrder(updated);
  },

  /**
   * Pembatalan tugas oleh admin. Diizinkan sampai sebelum "Arrived"
   * (Bagian 13 brief). Khusus status "on_delivery", barang sudah dibawa
   * sales — WAJIB membuat StockTransaction bertipe "retur_pembatalan"
   * untuk setiap produk yang sudah di-picking, agar stok tercatat kembali.
   */
  async cancel(id: string, input: unknown, actorId: string): Promise<AssignmentWithOrder> {
    const assignment = await repository.findById(id);
    if (!assignment) throw new Error("Penugasan tidak ditemukan");

    if (NEVER_CANCELLABLE.includes(assignment.status)) {
      throw new Error(`Penugasan berstatus "${assignment.status}" tidak dapat dibatalkan.`);
    }

    const { reason } = cancelAssignmentSchema.parse(input);

    if (assignment.status === "on_delivery") {
      const pickedItems = await stockTxRepo.findAll({
        assignment_id: id,
        type: "picking_out",
      } as Partial<StockTransaction>);

      await Promise.all(
        pickedItems.map((item) =>
          stockTxRepo.create({
            assignment_id: id,
            product_id: item.product_id,
            type: "retur_pembatalan",
            quantity: item.quantity,
          } as Omit<StockTransaction, "id" | "created_at" | "updated_at">)
        )
      );
    } else if (!FREELY_CANCELLABLE.includes(assignment.status)) {
      throw new Error(`Penugasan berstatus "${assignment.status}" tidak dapat dibatalkan.`);
    }

    const updated = await repository.update(id, {
      status: "cancelled",
      cancelled_by: actorId,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
    } as Partial<Assignment>);

    await orderRepo.update(assignment.order_id, { status: "cancelled" } as Partial<Order>);

    await auditLog.record({
      entityType: "Assignment",
      entityId: id,
      action: "cancel",
      actorId,
      before: { status: assignment.status },
      after: { status: "cancelled", reason },
    });

    await notificationService.send({
      userId: assignment.sales_id,
      type: "assignment_cancelled",
      message: `Penugasan Anda dibatalkan admin. Alasan: ${reason}`,
      link: `/assignments/${id}`,
    });

    return attachOrder(updated);
  },

  /**
   * Admin mengonfirmasi kunjungan selesai setelah memeriksa data stok &
   * pembayaran (Tahap 7). Hanya bisa dilakukan pada status "visited".
   * Setelah Completed, data tidak boleh diedit sembarangan — koreksi
   * harus lewat reopen() di bawah agar tetap tercatat di Audit Log.
   */
  async confirmCompletion(id: string, actorId: string): Promise<AssignmentWithOrder> {
    const assignment = await repository.findById(id);
    if (!assignment) throw new Error("Penugasan tidak ditemukan");
    if (assignment.status !== "visited") {
      throw new Error(`Penugasan berstatus "${assignment.status}" belum bisa dikonfirmasi selesai.`);
    }

    const updated = await repository.update(id, {
      status: "completed",
      completed_by: actorId,
      completed_at: new Date().toISOString(),
    } as Partial<Assignment>);

    await orderRepo.update(assignment.order_id, { status: "completed" } as Partial<Order>);

    await auditLog.record({
      entityType: "Assignment",
      entityId: id,
      action: "confirm_completion",
      actorId,
      before: { status: "visited" },
      after: { status: "completed" },
    });

    await notificationService.send({
      userId: assignment.sales_id,
      type: "assignment_completed",
      message: "Admin telah mengonfirmasi kunjungan Anda selesai.",
      link: `/assignments/${id}`,
    });

    return attachOrder(updated);
  },

  /**
   * Membuka kembali penugasan yang sudah Completed untuk koreksi data
   * (Bagian 12 brief: "buat mekanisme revisi atau pembukaan kembali
   * dengan audit log"). Mengembalikan status ke "visited" — DATA
   * kunjungan/stok/pembayaran lama TIDAK dihapus; koreksi dilakukan
   * dengan mengisi ulang Check-Out (mencatat StockTransaction/Payment
   * baru di atas yang lama, bukan menimpa).
   */
  async reopen(id: string, input: unknown, actorId: string): Promise<AssignmentWithOrder> {
    const assignment = await repository.findById(id);
    if (!assignment) throw new Error("Penugasan tidak ditemukan");
    if (assignment.status !== "completed") {
      throw new Error("Hanya penugasan berstatus Completed yang bisa dibuka kembali.");
    }

    const { reason } = cancelAssignmentSchema.parse(input); // skema reason generik dipakai ulang

    const updated = await repository.update(id, {
      status: "visited",
      reopened_by: actorId,
      reopened_at: new Date().toISOString(),
      reopen_reason: reason,
    } as Partial<Assignment>);

    await orderRepo.update(assignment.order_id, { status: "visited" } as Partial<Order>);

    await auditLog.record({
      entityType: "Assignment",
      entityId: id,
      action: "reopen",
      actorId,
      before: { status: "completed" },
      after: { status: "visited", reason },
    });

    await notificationService.send({
      userId: assignment.sales_id,
      type: "assignment_reopened",
      message: `Admin membuka kembali kunjungan untuk koreksi. Alasan: ${reason}`,
      link: `/assignments/${id}`,
    });

    return attachOrder(updated);
  },
};
