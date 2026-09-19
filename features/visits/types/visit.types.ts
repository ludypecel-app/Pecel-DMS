export interface VisitFormRow {
  product_id: string;
  product_name: string;
  unit_price: number;
  shipped_quantity: number; // Jumlah Pengiriman — dari StockTransaction picking_out, tidak bisa diubah sales
}

export interface VisitFormData {
  assignmentId: string;
  orderNumber: string;
  warungName: string;
  rows: VisitFormRow[];
  alreadyCheckedOut: boolean;
}

export interface VisitReviewRow {
  product_id: string;
  product_name: string;
  unit_price: number;
  shipped_quantity: number;
  sold_quantity: number;
  returned_quantity: number;
  current_stock: number; // shipped - sold - returned, sisa yang masih dipegang sales
}

export interface VisitReviewData {
  assignmentId: string;
  orderNumber: string;
  warungName: string;
  salesName: string;
  status: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  visitNotes?: string;
  rows: VisitReviewRow[];
  totalTagihan: number;
  payment: {
    status: string;
    method: string;
    proofUrl?: string;
  } | null;
  confirmedBy?: string;
  confirmedAt?: string;
}
