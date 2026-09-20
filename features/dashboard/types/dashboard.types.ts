export interface AdminDashboardData {
  totalOrdersToday: number;
  ordersScheduling: number;
  ordersAssigned: number;
  ordersInDelivery: number; // ready_to_delivery + on_delivery
  activeSalesToday: number; // sales dengan assignment aktif (belum completed/cancelled) hari ini
  visitsToday: number;
  unpaidPayments: number; // status belum_bayar / sebagian
  lateOrders: number;
  salesSummaryToday: number; // total Rp dari Payment hari ini
  stockSummary: { productId: string; productName: string; outstanding: number }[]; // stok yang masih di tangan sales (belum completed)
  regionPerformance: { regionId: string; regionName: string; totalOrders: number; totalOmzet: number }[]; // top 5 wilayah by nilai pesanan
  warungPerformance: { warungId: string; warungName: string; totalOrders: number; totalOmzet: number }[]; // top 5 warung by nilai pesanan
  salesPerformance: {
    salesId: string;
    salesName: string;
    totalAssignments: number;
    completedAssignments: number;
    completionRate: number;
    totalOmzet: number;
  }[]; // top 5 sales by nilai pesanan yang ditangani
}

export interface SalesDashboardData {
  tasksToday: number; // picking_date atau delivery_date == hari ini
  tasksToAccept: number; // status assigned
  pickingSchedule: { assignmentId: string; orderNumber: string; pickingDate: string; pickingTime: string }[];
  deliverySchedule: { assignmentId: string; orderNumber: string; deliveryDate: string }[];
  inDelivery: number;
  unfinishedVisits: number; // status arrived
  recentVisits: { assignmentId: string; orderNumber: string; status: string; date: string }[];
  salesSummaryThisWeek: number; // total Rp penjualan minggu berjalan
}
