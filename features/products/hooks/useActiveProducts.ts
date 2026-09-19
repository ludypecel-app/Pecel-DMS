"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types/entities";

export function useActiveProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch("/api/master-data/products?status=active")
      .then((res) => res.json())
      .then((json) => setProducts(json.data ?? []));
  }, []);

  return products;
}
