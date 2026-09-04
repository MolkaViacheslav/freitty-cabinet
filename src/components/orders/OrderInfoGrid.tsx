import type { OrderStatus } from "@prisma/client";
import type { OrderDetailDTO } from "@/server/dto/orders.dto";
import { Card } from "@/components/ui/Card";
import { getRoleLabel, getStatusLabel, ORDER_PIPELINE } from "@/lib/status";
import { formatDateWithYear, getRelativeDayLabel } from "@/lib/format";

type OrderInfoGridProps = {
  order: OrderDetailDTO;
  /** Injected so "today" is decided by the request, not by module load time. */
  now: Date;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div className="text-muted">{label}</div>
      <div className="text-ink">{children}</div>
    </>
  );
}

function Dash() {
  return <span className="text-muted">—</span>;
}

/** "Transload, Restock & Rework" → two badges — the field is a single comma-joined string in the DB. */
function ServiceBadges({ service }: { service: string | null }) {
  if (!service) return <Dash />;
  return (
    <span className="flex flex-wrap gap-1">
      {service.split(",").map((s) => (
        <span key={s} className="inline-block rounded-full bg-info-bg px-2 py-[3px] text-[10px] font-bold text-info-ink">
          {s.trim()}
        </span>
      ))}
    </span>
  );
}

/** Declared vs actual on one line — the delta pill only appears when `delta.hasDelta` is true. */
function QuantityRow({ order }: { order: OrderDetailDTO }) {
  const { delta } = order;
  return (
    <span className="flex flex-wrap items-baseline gap-1.5">
      <span className="font-semibold">{order.quantityLabel}</span>
      <span className="text-muted">·</span>
      {delta.actual === null ? (
        <span className="text-muted">actual: pending</span>
      ) : (
        <span className={`font-semibold ${delta.hasDelta ? "text-amber-ink" : ""}`}>
          actual: {delta.actual}
          {delta.hasDelta && (
            <span className="ml-1 rounded-full bg-delta px-[7px] py-px text-[10px] font-bold text-white">
              {delta.diff > 0 ? `+${delta.diff}` : delta.diff}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

/**
 * The whole pipeline rail (DECISIONS.md B4), with the steps this order actually went through
 * shown solid and the rest dimmed.
 *
 * `statusFlow` from the API is the traversed path, not the rail: for a closed Cross-Dock it is
 * ["DRAFT","READY","IN_PROGRESS","CLOSED"], which deliberately skips the consolidation-only
 * stages. Drawing only that path made the current step always the last one on screen, so the
 * highlight said nothing. Here the rail is fixed and the traversed set decides the styling.
 */
function StatusFlow({ order }: { order: OrderDetailDTO }) {
  const visited = new Set<OrderStatus>(order.statusFlow);

  return (
    <span className="flex flex-wrap items-center gap-1 text-[11px]">
      {ORDER_PIPELINE.map((step, i) => {
        const isCurrent = step === order.status;
        const style = isCurrent
          ? "font-bold text-blue"
          : visited.has(step)
            ? "text-ink-soft"
            : "text-muted-soft line-through decoration-1";
        return (
          <span key={step} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-muted-soft">→</span>}
            <span className={style}>{getStatusLabel(step, order.type)}</span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * Quantity is the only delta the schema can detect — there is no stored history for the other
 * fields — so the count is derived from `delta.hasDelta` rather than invented. The mockup's
 * "View all →" link has nothing to open yet and renders disabled.
 */
function DeltasDetected({ delta }: { delta: OrderDetailDTO["delta"] }) {
  if (!delta.hasDelta) return <span className="text-muted">None</span>;
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block rounded-full bg-amber-surface px-2 py-[3px] text-[10px] font-bold text-amber-ink">
        1 (q-ty)
      </span>
      <button type="button" disabled title="Out of scope" className="cursor-not-allowed text-[11px] font-bold text-muted">
        View all →
      </button>
    </span>
  );
}

/** Scheduled date, with today's orders picked out in red like the mockup. */
function ScheduledDate({ scheduledAt, now }: { scheduledAt: string; now: Date }) {
  const date = new Date(scheduledAt);
  const relative = getRelativeDayLabel(date, now);
  return (
    <span className={relative === "today" ? "font-semibold text-red" : undefined}>
      {formatDateWithYear(date)}
      {relative && <span className="text-muted"> · {relative}</span>}
    </span>
  );
}

/**
 * The Order Detail info grid — two six-to-eight row sub-grids side by side, as in
 * docs/mockup.html's Cross-Dock detail meta grid.
 *
 * Every field the DTO carries is rendered here or in a neighbouring panel: the earlier version
 * dropped `destination`, `driverName`, `trailersCount` and `nextActionLabel`, which meant the
 * detail page showed *less* than the card that links to it.
 */
export function OrderInfoGrid({ order, now }: OrderInfoGridProps) {
  return (
    <Card className="mb-4">
      <div className="grid grid-cols-1 gap-x-3.5 gap-y-3 text-[13px] md:grid-cols-2">
        <div className="grid grid-cols-[130px_1fr] items-center gap-x-3.5 gap-y-1.5">
          <Row label="Customer">{order.customer ?? <Dash />}</Row>
          <Row label="Hub">
            {order.hub.name} ({order.hub.province})
          </Row>
          <Row label="Services">
            <ServiceBadges service={order.service} />
          </Row>
          <Row label="Date">
            <ScheduledDate scheduledAt={order.scheduledAt} now={now} />
          </Row>
          <Row label="Declared / Actual qty">
            <QuantityRow order={order} />
          </Row>
          <Row label="Destination">{order.destination ?? <Dash />}</Row>
          <Row label="Trailer type">
            {order.trailerType ? (
              <span className="inline-block rounded-full bg-chip px-2 py-[3px] text-[11px] font-semibold text-ink-soft">
                {order.trailerType}
              </span>
            ) : (
              <Dash />
            )}
          </Row>
          <Row label="Next action">
            {order.nextActionLabel ? (
              <span className="font-semibold">{order.nextActionLabel}</span>
            ) : (
              <span className="text-muted">No pending action</span>
            )}
          </Row>
        </div>
        <div className="grid grid-cols-[130px_1fr] items-center gap-x-3.5 gap-y-1.5">
          <Row label="Carrier">{order.carrierName ?? <Dash />}</Row>
          <Row label="Phone">{order.carrierPhone ?? <Dash />}</Row>
          <Row label="Driver">{order.driverName ?? <Dash />}</Row>
          <Row label="Truck / trailer">
            <span className="flex flex-wrap items-center gap-1.5">
              <span>
                {order.truckNumber ?? "—"} / {order.trailerNumber ?? "—"}
              </span>
              {order.trailersCount > 0 && (
                <span className="rounded-full bg-chip px-2 py-[3px] text-[10px] font-bold text-ink-soft">
                  {order.trailersCount} consolidated
                </span>
              )}
            </span>
          </Row>
          <Row label="Dock">{order.dock ? <strong className="text-red">{order.dock}</strong> : <Dash />}</Row>
          <Row label="Assigned to">
            {order.assignedTo ? (
              <span className="font-semibold text-red">
                {order.assignedTo.name} ({getRoleLabel(order.assignedTo.role).toLowerCase()})
              </span>
            ) : (
              <span className="text-muted">Unassigned</span>
            )}
          </Row>
          <Row label="Status flow">
            <StatusFlow order={order} />
          </Row>
          <Row label="Deltas detected">
            <DeltasDetected delta={order.delta} />
          </Row>
        </div>
      </div>
    </Card>
  );
}
