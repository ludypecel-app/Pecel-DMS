"use client";

import { useEffect, useState } from "react";
import type { Warung } from "@/types/entities";

export function useActiveWarungs(regionId?: string) {
  const [warungs, setWarungs] = useState<Warung[]>([]);

  useEffect(() => {
    const params = new URLSearchParams({ status: "active" });
    if (regionId) params.set("regionId", regionId);
    fetch(`/api/master-data/warungs?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => setWarungs(json.data ?? []));
  }, [regionId]);

  return warungs;
}
