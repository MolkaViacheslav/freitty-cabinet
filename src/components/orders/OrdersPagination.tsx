import { buildQueryString } from "@/lib/query";

type OrdersPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** The page's current query string, so paging keeps every active filter. */
  searchParams: URLSearchParams;
};

const ORDERS_PATH = "/orders";
const BTN = "rounded-md border border-blue bg-white px-2.5 py-1 text-xs font-semibold text-navy hover:bg-page";
const BTN_DISABLED = "cursor-not-allowed rounded-md border border-border bg-white px-2.5 py-1 text-xs text-[#B6BCC6]";

/**
 * Prev/Next only change `page` in the URL (DECISIONS.md A5), so a given page of a given filter set
 * is a shareable address and survives F5. Plain `<a>` for the same reason as OrdersTabs — a
 * client-side navigation that changes only the query string does not commit on this Next build.
 */
export function OrdersPagination({ page, pageSize, total, totalPages, searchParams }: OrdersPaginationProps) {
  // "Showing 6 of 27" from the mockup — the number of rows actually on this page, not the page
  // size, so the last page reads "Showing 3 of 27" instead of overstating it.
  const shown = Math.max(0, Math.min(pageSize, total - (page - 1) * pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="mt-5 flex items-center justify-between text-xs text-muted">
      <div>
        Showing {shown} of {total}
      </div>
      <div className="flex gap-1">
        {hasPrev ? (
          <a
            href={`${ORDERS_PATH}${buildQueryString(searchParams, { page: page - 1 === 1 ? null : page - 1 })}`}
            className={BTN}
          >
            ← Prev
          </a>
        ) : (
          <span className={BTN_DISABLED}>← Prev</span>
        )}
        {hasNext ? (
          <a href={`${ORDERS_PATH}${buildQueryString(searchParams, { page: page + 1 })}`} className={BTN}>
            Next →
          </a>
        ) : (
          <span className={BTN_DISABLED}>Next →</span>
        )}
      </div>
    </div>
  );
}
