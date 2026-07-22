import { useState, useMemo } from "react";

type SortDir = "asc" | "desc";

export function useTableSort<T>(data: T[] | undefined, defaultKey?: keyof T) {
  const [sortKey, setSortKey] = useState<keyof T | undefined>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggle = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!data || !sortKey) return data ?? [];
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "string" ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, toggle };
}
