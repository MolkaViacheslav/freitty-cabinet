type TopbarProps = {
  /** null when the user lookup failed — the chrome degrades instead of taking the layout down. */
  userName: string | null;
  userInitials: string | null;
};

/**
 * Global search, balance and notifications have no backing feature (search is scoped to Order
 * List's number/refNumber only — DECISIONS.md C; billing/notifications are out of scope per
 * CLAUDE.md) — they render disabled/decorative rather than faking behavior. `userName`/
 * `userInitials` come from the layout, which reads the account owner out of the database — Auth
 * is out of scope, so this is "whose cabinet this is", not real signed-in session state.
 *
 * `pl-14` below `md` reserves room for Sidebar's fixed burger button, which floats over this bar's
 * left edge on narrow screens. The search box is decorative and the widest item here, so it's the
 * one that drops below `sm` rather than being squeezed into wrapped text.
 */
export function Topbar({ userName, userInitials }: TopbarProps) {
  return (
    <div className="flex items-center gap-4 border-b border-border bg-white py-3 pr-6 pl-14 md:pl-6">
      <div
        className="hidden max-w-[420px] flex-1 cursor-not-allowed items-center gap-2 rounded-lg bg-page px-3.5 py-2 text-[13px] text-muted sm:flex"
        title="Out of scope"
      >
        🔍 Search orders, invoices, documents…
      </div>
      <div className="flex-1" />
      <div
        className="flex cursor-not-allowed items-center gap-1.5 rounded-full border border-[#FECACA] bg-[#FEF2F2] px-3 py-1.5 text-xs font-bold text-[#B8142A]"
        title="Out of scope"
      >
        💳 Balance
      </div>
      <button
        type="button"
        disabled
        title="Out of scope"
        className="relative flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg bg-page text-sm"
      >
        🔔
        <span className="absolute top-1.5 right-2 h-2 w-2 rounded-full border-2 border-white bg-red" />
      </button>
      <div className="flex items-center gap-2.5 rounded-full bg-page py-1 pr-3 pl-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
          {userInitials ?? "—"}
        </div>
        <div className="text-[13px] font-semibold">{userName ?? "Unknown user"}</div>
      </div>
    </div>
  );
}
