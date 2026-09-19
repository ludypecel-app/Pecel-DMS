import type { Assignment, Order, OrderDetail } from "@/types/entities";

export interface AssignmentWithOrder extends Assignment {
  order: (Order & { details: OrderDetail[]; total: number }) | null;
}
