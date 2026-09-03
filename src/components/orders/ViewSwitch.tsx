import { buildQueryString } from "@/lib/query";

export type OrdersView = "cards" | "table";

type ViewSwitchProps = {
  current: OrdersView;
  searchParams: URLSearchParams;
};

const ORDERS_PATH = "/orders";

const OPTIONS: { value: OrdersView | null; label: string }[] = [
  { value: "cards", label: "⊞ Cards" },
  { value: "table", label: "☰ Table" },
  // Pipeline is a 7-column kanban with role-gated drag-and-drop in the mockup — explicitly out of
  // scope (CLAUDE.md), so it renders disabled instead of switching to an empty board.
  { value: null, label: "⎔ Pipeline" },
];

const BASE = "rounded px-2.5 py-1 text-xs";

/**
 * Plain `<a>` links, for the same reason as OrdersTabs (see the note there): a client navigation
 * that only changes the query string does not commit on this Next build. The view is part of the
 * address (`?view=table`), so a link to a filtered table view reproduces exactly that and F5 does
 * not drop back to cards.
 *
 * Unlike a tab, changing the view must NOT reset `page`: it is the same result set, drawn
 * differently. "Cards" clears the param instead of writing `view=cards`, so the default view has
 * one canonical URL rather than two.
 */
export function ViewSwitch({ current, searchParams }: ViewSwitchProps) {
  return (
    <div className="flex gap-1 rounded-md bg-page p-[3px]">
      {OPTIONS.map((option) =>
        option.value === null ? (
          <button
            key={option.label}
            type="button"
            disabled
            title="Out of scope"
            className={`${BASE} cursor-not-allowed text-[#B6BCC6]`}
          >
            {option.label}
          </button>
        ) : (
          <a
            key={option.label}
            href={`${ORDERS_PATH}${buildQueryString(searchParams, { view: option.value === "cards" ? null : option.value })}`}
            aria-current={current === option.value ? "true" : undefined}
            className={`${BASE} ${
              current === option.value ? "bg-white font-semibold text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {option.label}
          </a>
        ),
      )}
    </div>
  );
}
