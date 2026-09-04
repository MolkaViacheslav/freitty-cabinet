import type { OrderDetailDTO } from "@/server/dto/orders.dto";

type OrderAlertBannerProps = {
  alertMessage: string | null;
  subOrders: OrderDetailDTO["subOrders"];
};

/**
 * Why the order is flagged.
 *
 * `hasAlert` replaces the status badge (DECISIONS.md B3), so without this banner the detail page
 * showed a red "Alert" and no reason anywhere — `alertMessage` was in the DTO but never rendered.
 * Sub-orders carry their own alert flags, and on a consolidation those are usually the real cause,
 * so they are listed here too rather than being buried in the sub-orders table.
 */
export function OrderAlertBanner({ alertMessage, subOrders }: OrderAlertBannerProps) {
  const flagged = subOrders.filter((so) => so.hasAlert);

  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-l-[3px] border-danger-border border-l-red bg-danger-bg px-3.5 py-2.5 text-xs text-danger-ink">
      <span className="text-base leading-none">⚠</span>
      <div className="flex flex-col gap-1">
        <span>
          <strong>Alert:</strong> {alertMessage ?? "this order needs attention."}
        </span>
        {flagged.map((so) => (
          <span key={so.code} className="text-[11px]">
            <strong>{so.code}</strong> · {so.alertMessage ?? "flagged"}
          </span>
        ))}
      </div>
    </div>
  );
}
