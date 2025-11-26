"use client";

import { useMemo, useEffect } from "react";

export default function PaginationControls({
  currentPage,
  onPageChange,
  totalItems,
  pageSize = 20,
  label = "records",
  className = "",
}) {
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalItems / pageSize || 1)), [totalItems, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      onPageChange(totalPages);
    }
  }, [currentPage, totalPages, onPageChange]);

  if (!totalItems || totalItems <= pageSize) {
    return null;
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(totalItems, currentPage * pageSize);

  const goTo = (page) => {
    const next = Math.min(totalPages, Math.max(1, page));
    if (next !== currentPage) {
      onPageChange(next);
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border rounded-2xl bg-white shadow-sm text-sm text-[var(--color-text-muted)] ${className}`}>
      <span>
        Showing{" "}
        <span className="font-semibold text-[var(--color-text)]">{start}</span>{" "}
        to{" "}
        <span className="font-semibold text-[var(--color-text)]">{end}</span>{" "}
        of{" "}
        <span className="font-semibold text-[var(--color-text)]">{totalItems}</span>{" "}
        {label}
      </span>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1.5 rounded-full border ${
            currentPage === 1 ? "text-gray-400 border-gray-200 cursor-not-allowed" : "text-[var(--color-text)] hover:border-[var(--color-secondary)]"
          }`}
        >
          Prev
        </button>
        <span className="text-[var(--color-text)] font-medium">{currentPage} / {totalPages}</span>
        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1.5 rounded-full border ${
            currentPage === totalPages ? "text-gray-400 border-gray-200 cursor-not-allowed" : "text-[var(--color-text)] hover:border-[var(--color-secondary)]"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}

