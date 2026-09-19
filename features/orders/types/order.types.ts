import type { Order, OrderDetail } from "@/types/entities";

export interface OrderWithDetails extends Order {
  details: OrderDetail[];
  total: number;
}
