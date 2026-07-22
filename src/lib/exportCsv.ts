export function exportToCsv<T extends Record<string, unknown>>(
  filename: string,
  data: T[],
  columns?: { key: keyof T; label: string }[]
) {
  if (!data.length) return;

  const cols = columns ?? Object.keys(data[0]).map((k) => ({ key: k as keyof T, label: k as string }));
  const header = cols.map((c) => `"${c.label}"`).join(",");
  const rows = data.map((row) =>
    cols.map((c) => {
      const v = row[c.key];
      return `"${String(v ?? "").replace(/"/g, '""')}"`;
    }).join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
