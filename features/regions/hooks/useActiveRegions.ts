"use client";

import { useEffect, useState } from "react";
import type { Region } from "@/types/entities";

/** Daftar wilayah aktif untuk mengisi dropdown di form Sales & Warung. */
export function useActiveRegions() {
  const [regions, setRegions] = useState<Region[]>([]);

  useEffect(() => {
    fetch("/api/master-data/regions?status=active")
      .then((res) => res.json())
      .then((json) => setRegions(json.data ?? []));
  }, []);

  return regions;
}
