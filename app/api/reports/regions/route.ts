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
  STOCK_TRANSACTION_TABLE,
  PRODUCT_TABLE,
  PAYMENT_TABLE,
} from "@/lib/google-sheets/tables";
import { handleApiError } from "@/lib/utils/api-response";
import { requireAdmin } from "@/lib/auth/session";
import type { Region, Warung, Sales, Order, OrderDetail, Assignment, Visit, StockTransaction, Product, Payment } from "@/types/entities";

const regionRepo = new SheetsRepository<Region>(REGION_TABLE);
const warungRepo = new SheetsRepository<Warung>(WARUNG_TABLE);
const salesRepo = new SheetsRepository<Sales>(SALES_TABLE);
const orderRepo = new SheetsRepository<Order>(ORDER_TABLE);
const orderDetailRepo = new SheetsRepository<OrderDetail>(ORDER_DETAIL_TABLE);
const assignmentRepo = new SheetsRepository<Assignment>(ASSIGNMENT_TABLE);
const visitRepo = new SheetsRepository<Visit>(VISIT_TABLE);
const stockTxRepo = new SheetsRepository<StockTransaction>(STOCK_TRANSACTION_TABLE);
const paymentRepo = new SheetsRepository<Payment>(PAYMENT_TABLE);
const productRepo = new SheetsRepository<Product>(PRODUCT_TABLE);

const NOT_DONE = new Set(["completed", "cancelled"]);

/**
 * Laporan per Wilayah: daftar warung di suatu wilayah beserta nilai
 * pesanannya (?regionId=...), dan detail tiap warung (?warungId=...) berisi
 * kinerja sales yang menangani pesanan warung tersebut secara spesifik —
 * kinerja sales sengaja tidak lagi ditampilkan di level wilayah, melainkan
 * per warung, karena satu wilayah bisa ditangani banyak sales sekaligus dan
 * angkanya lebih actionable saat dilihat per warung.
 * Tanpa param: hanya daftar ringkasan seluruh wilayah yang dikembalikan
 * (untuk tabel pemilihan awal).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get("regionId");
    const warungId = searchParams.get("warungId");

    const [regions, warungs, salesList, orders, orderDetails, assignments, visits, stockTx, products, payments] = await Promise.all([
      regionRepo.findAll(),
      warungRepo.findAll(),
      salesRepo.findAll(),
      orderRepo.findAll(),
      orderDetailRepo.findAll(),
      assignmentRepo.findAll(),
      visitRepo.findAll(),
      stockTxRepo.findAll(),
      productRepo.findAll(),
      paymentRepo.findAll(),
    ]);
    const paymentByVisit = new Map(payments.map((p) => [p.visit_id, p]));

    const orderTotal = new Map<string, number>();
    orderDetails.forEach((d) => {
      orderTotal.set(d.order_id, (orderTotal.get(d.order_id) ?? 0) + d.subtotal);
    });
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    // Aktif = belum completed/cancelled — stok yang sudah "selesai" (visit
    // sudah dikonfirmasi/dibatalkan) tidak lagi dihitung sebagai stok yang
    // masih ada di warung. Sama persis dengan logika "Ringkasan Stok di
    // Lapangan" di dashboard, hanya diagregasi per warung di sini.
    const activeAssignmentIds = new Set(assignments.filter((a) => !NOT_DONE.has(a.status)).map((a) => a.id));

    /**
     * Total stok yang saat ini berada di suatu warung: dari seluruh
     * Assignment (yang masih aktif) atas pesanan-pesanan warung tersebut,
     * dihitung dari StockTransaction: picking_out (+) dikurangi sales_out
     * dan returned (-). Dikembalikan totalnya (semua produk digabung) dan
     * rincian per produk.
     */
    function buildStockForOrders(orderIds: Set<string>) {
      const relevantAssignmentIds = new Set(
        assignments.filter((a) => orderIds.has(a.order_id) && activeAssignmentIds.has(a.id)).map((a) => a.id)
      );
      const byProduct = new Map<string, number>();
      stockTx
        .filter((tx) => relevantAssignmentIds.has(tx.assignment_id))
        .forEach((tx) => {
          const sign = tx.type === "picking_out" ? 1 : tx.type === "sales_out" || tx.type === "returned" ? -1 : 0;
          if (sign === 0) return;
          byProduct.set(tx.product_id, (byProduct.get(tx.product_id) ?? 0) + sign * tx.quantity);
        });
      const stockByProduct = Array.from(byProduct.entries())
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => ({
          productId,
          productName: products.find((p) => p.id === productId)?.name ?? productId,
          quantity: qty,
        }))
        .sort((a, b) => b.quantity - a.quantity);
      const totalStock = stockByProduct.reduce((sum, p) => sum + p.quantity, 0);
      return { totalStock, stockByProduct };
    }

    function buildRegionSummary(region: Region) {
      const regionOrders = orders.filter((o) => o.region_id === region.id);
      const totalOmzet = regionOrders.reduce((sum, o) => sum + (orderTotal.get(o.id) ?? 0), 0);
      const { totalStock } = buildStockForOrders(new Set(regionOrders.map((o) => o.id)));
      return {
        regionId: region.id,
        regionName: region.name,
        warungCount: warungs.filter((w) => w.region_id === region.id).length,
        salesCount: salesList.filter((s) => s.assigned_region_id === region.id).length,
        totalOrders: regionOrders.length,
        totalOmzet,
        totalStock,
      };
    }

    /**
     * Kinerja sales untuk sekumpulan pesanan tertentu (dipakai untuk detail
     * warung — dihitung dari Assignment yang order-nya termasuk pesanan
     * warung tersebut, bukan seluruh penugasan sales di wilayah/warung lain).
     */
    function buildSalesPerformanceForOrders(orderIds: Set<string>) {
      const relevantAssignments = assignments.filter((a) => orderIds.has(a.order_id));
      const salesIdsInvolved = new Set(relevantAssignments.map((a) => a.sales_id));

      return Array.from(salesIdsInvolved)
        .map((salesId) => {
          const sales = salesList.find((s) => s.id === salesId);
          const salesAssignments = relevantAssignments.filter((a) => a.sales_id === salesId);
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
            salesId,
            salesName: sales?.name ?? salesId,
            status: sales?.status ?? "inactive",
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
    }

    /**
     * Riwayat kunjungan (check-in/check-out) untuk satu warung — semua
     * kunjungan sepanjang waktu, bukan hanya yang aktif, diurutkan terbaru
     * dulu, supaya admin bisa lihat histori sales yang datang ke warung ini.
     */
    function buildVisitHistoryForWarung(id: string) {
      return visits
        .filter((v) => v.warung_id === id && v.checked_in_at)
        .map((v) => {
          const assignment = assignments.find((a) => a.id === v.assignment_id);
          const order = assignment ? orderMap.get(assignment.order_id) : undefined;
          const payment = paymentByVisit.get(v.id);
          return {
            visitId: v.id,
            orderNumber: order?.order_number ?? "-",
            salesName: salesList.find((s) => s.id === v.sales_id)?.name ?? v.sales_id,
            checkedInAt: v.checked_in_at,
            checkedOutAt: v.checked_out_at,
            status: assignment?.status ?? "-",
            paymentStatus: payment?.status,
            paymentAmount: payment?.amount,
            notes: v.notes,
          };
        })
        .sort((a, b) => ((a.checkedInAt ?? "") < (b.checkedInAt ?? "") ? 1 : -1));
    }

    // --- Detail satu warung (paling spesifik, dicek duluan) ---
    if (warungId) {
      const warung = warungs.find((w) => w.id === warungId);
      if (!warung) throw new Error("Warung tidak ditemukan");
      const region = regions.find((r) => r.id === warung.region_id);

      const warungOrders = orders.filter((o) => o.warung_id === warungId);
      const warungOrderIds = new Set(warungOrders.map((o) => o.id));
      const totalOmzet = warungOrders.reduce((sum, o) => sum + (orderTotal.get(o.id) ?? 0), 0);
      const lastOrderDate = warungOrders.reduce<string | undefined>(
        (latest, o) => (!latest || o.order_date > latest ? o.order_date : latest),
        undefined
      );
      const { totalStock, stockByProduct } = buildStockForOrders(warungOrderIds);

      return NextResponse.json({
        data: {
          warungId: warung.id,
          warungName: warung.name,
          address: warung.address,
          phone: warung.phone,
          status: warung.status,
          paymentTerm: warung.payment_term ?? "cash_on_delivery",
          regionId: warung.region_id,
          regionName: region?.name ?? "-",
          totalOrders: warungOrders.length,
          totalOmzet,
          lastOrderDate,
          totalStock,
          stockByProduct,
          salesPerformance: buildSalesPerformanceForOrders(warungOrderIds),
          visitHistory: buildVisitHistoryForWarung(warungId),
        },
      });
    }

    // --- Tanpa regionId: ringkasan seluruh wilayah saja ---
    if (!regionId) {
      const summaries = regions.map(buildRegionSummary).sort((a, b) => b.totalOmzet - a.totalOmzet);
      return NextResponse.json({ data: { summaries } });
    }

    // --- Detail satu wilayah: daftar warung (kinerja sales dilihat lewat detail tiap warung) ---
    const region = regions.find((r) => r.id === regionId);
    if (!region) throw new Error("Wilayah tidak ditemukan");

    const regionWarungs = warungs.filter((w) => w.region_id === regionId);
    const regionOrders = orders.filter((o) => o.region_id === regionId);
    const regionSales = salesList.filter((s) => s.assigned_region_id === regionId);

    const warungRows = regionWarungs
      .map((w) => {
        const wOrders = regionOrders.filter((o) => o.warung_id === w.id);
        const totalOmzet = wOrders.reduce((sum, o) => sum + (orderTotal.get(o.id) ?? 0), 0);
        const lastOrderDate = wOrders.reduce<string | undefined>(
          (latest, o) => (!latest || o.order_date > latest ? o.order_date : latest),
          undefined
        );
        const { totalStock } = buildStockForOrders(new Set(wOrders.map((o) => o.id)));
        return {
          warungId: w.id,
          warungName: w.name,
          address: w.address,
          status: w.status,
          totalOrders: wOrders.length,
          totalOmzet,
          lastOrderDate,
          totalStock,
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
        totalStock: warungRows.reduce((sum, w) => sum + w.totalStock, 0),
        warungs: warungRows,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
