"use client";

import { useEffect, useState } from "react";
import type { Sales } from "@/types/entities";

export function useActiveSales(regionId?: string) {
  const [sales, setSales] = useState<Sales[]>([]);

  useEffect(() => {
    const params = new URLSearchParams({ status: "active" });
    if (regionId) params.set("regionId", regionId);
    fetch(`/api/master-data/sales?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => setSales(json.data ?? []));
  }, [regionId]);

  return sales;
}
