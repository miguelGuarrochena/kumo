export const EXPENSES_PAGE_SIZE = 25;
export const ADMIN_PAGE_SIZE = 30;

export const clampPage = (page: number, totalCount: number, pageSize: number): number => {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  return Math.min(Math.max(1, page), totalPages);
};

export const pageRange = (page: number, pageSize: number): { from: number; to: number } => {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
};

export const totalPages = (totalCount: number, pageSize: number): number =>
  Math.max(1, Math.ceil(totalCount / pageSize));

export const pageWindow = (current: number, total: number, max = 5): number[] => {
  if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);
  const half = Math.floor(max / 2);
  let start = Math.max(1, current - half);
  const end = Math.min(total, start + max - 1);
  start = Math.max(1, end - max + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};
