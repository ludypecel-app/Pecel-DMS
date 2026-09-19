import type { OrderStatus } from "@/types/entities";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  scheduling: "Scheduling",
  assigned: "Assigned",
  ready_to_picking: "Ready To Picking",
  picking_done: "Picking Done",
  ready_to_delivery: "Ready To Delivery",
  on_delivery: "On Delivery",
  arrived: "Arrived",
  visited: "Visited",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  scheduling: "bg-neutral-100 text-neutral-600",
  assigned: "bg-blue-100 text-blue-700",
  ready_to_picking: "bg-purple-100 text-purple-700",
  picking_done: "bg-purple-100 text-purple-700",
  ready_to_delivery: "bg-turmeric-50 text-turmeric-600",
  on_delivery: "bg-turmeric-50 text-turmeric-600",
  arrived: "bg-sky-100 text-sky-700",
  visited: "bg-teal-100 text-teal-700",
  completed: "bg-forest-100 text-forest-700",
  cancelled: "bg-red-100 text-red-700",
};
