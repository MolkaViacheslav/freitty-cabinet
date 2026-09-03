type GranularitySwitchProps = {
  /** Currently applied granularity, as parsed from the URL by the page. */
  current: "week" | "month";
};

// DECISIONS.md B10: CW (week) and Month are implemented; Day and Quarter are out of scope and
// render disabled rather than faking a switch that does nothing.
const OPTIONS = [
  { label: "Day", granularity: null },
  { label: "CW", granularity: "week" as const },
  { label: "Month", granularity: "month" as const },
  { label: "Quarter", granularity: null },
];

const BASE = "rounded-full border px-3 py-[5px] text-[11px] font-semibold transition";
const ACTIVE = "border-[1.5px] border-red bg-red font-bold text-white";
const IDLE = "border-[#E2E8F0] bg-white text-[#64748B] hover:border-blue hover:text-blue";
const DISABLED = "cursor-not-allowed border-[#E2E8F0] bg-white text-[#CBD5E1]";

/**
 * A Server Component on purpose: the granularity lives in the URL, not in React state
 * (DECISIONS.md A5), so switching is a plain link. That keeps the whole page a Server Component
 * — the new granularity is applied by re-rendering on the server with a fresh service call, not
 * by a client-side fetch.
 *
 * `<a>` rather than `<Link>`: on this Next build a client-side navigation that changes only the
 * query string of the current route fetches the new RSC payload but never commits it, so the
 * chart would silently keep showing the old granularity. Full navigation costs the same here —
 * the page is `force-dynamic`. Same reasoning and evidence as OrdersTabs.
 */
export function GranularitySwitch({ current }: GranularitySwitchProps) {
  return (
    <div className="flex gap-1.5">
      {OPTIONS.map((option) =>
        option.granularity === null ? (
          <button key={option.label} type="button" disabled title="Out of scope" className={`${BASE} ${DISABLED}`}>
            {option.label}
          </button>
        ) : (
          <a
            key={option.label}
            href={`/?granularity=${option.granularity}`}
            aria-current={current === option.granularity ? "true" : undefined}
            className={`${BASE} ${current === option.granularity ? ACTIVE : IDLE}`}
          >
            {option.label}
          </a>
        ),
      )}
    </div>
  );
}
