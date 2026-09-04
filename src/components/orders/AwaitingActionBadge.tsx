/**
 * `awaitingClientAction` is its own DB flag, independent of `hasAlert`/`status` (DECISIONS.md B5) —
 * an order can need the client to do something without being flagged as an alert. Renders wherever
 * the other flags (StatusBadge, the delta pill) show up, so the dashboard's "awaiting your action"
 * KPI bucket points at an actual order instead of being a number nobody can trace.
 *
 * Color matches the mockup's own "awaiting your action" chip on the Need Attention KPI
 * (`#FED7AA` / `#9A3412`), kept deliberately distinct from the alert badge's red and the delta
 * pill's amber so the three independent signals stay visually separable.
 */
export function AwaitingActionBadge() {
  return (
    <span className="inline-block rounded-lg bg-[#FED7AA] px-2 py-[3px] text-[10px] font-bold tracking-[0.3px] text-[#9A3412] uppercase">
      Awaiting action
    </span>
  );
}
