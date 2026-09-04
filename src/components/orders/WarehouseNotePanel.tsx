import { Card } from "@/components/ui/Card";

type WarehouseNotePanelProps = {
  note: string | null;
  photosCount: number;
  photosLimit: number;
};

/** The mockup shows a couple of slots and folds the rest into a "+N" chip, so a large limit does
 * not turn the card into a wall of squares. */
const VISIBLE_SLOTS = 4;

/**
 * Free-text warehouse note plus the photo slots. Uploads are out of scope, so nothing here is
 * clickable — the slots only visualise `photosCount` of `photosLimit`.
 *
 * Filled and empty slots are drawn differently on purpose: the earlier version put a 📷 glyph in
 * every slot, so an order with 0 of 5 photos looked like it had five.
 */
export function WarehouseNotePanel({ note, photosCount, photosLimit }: WarehouseNotePanelProps) {
  const slots = Math.min(photosLimit, VISIBLE_SLOTS);
  const hidden = photosLimit - slots;

  return (
    <Card>
      <div className="mb-1.5 text-[10px] font-bold tracking-wide text-muted uppercase">Warehouse note</div>
      <div className="text-xs leading-relaxed text-ink">
        {note ? `"${note}"` : <span className="text-muted">No note yet</span>}
      </div>
      {photosLimit > 0 && (
        <div className="mt-2.5">
          <div className="flex gap-1">
            {Array.from({ length: slots }, (_, i) =>
              i < photosCount ? (
                <div key={i} className="flex h-[34px] w-[34px] items-center justify-center rounded bg-chip text-sm">
                  📷
                </div>
              ) : (
                <div key={i} className="h-[34px] w-[34px] rounded border border-dashed border-border bg-white" />
              ),
            )}
            {hidden > 0 && (
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded bg-chip text-[11px] text-muted">
                +{hidden}
              </div>
            )}
          </div>
          <div className="mt-1 text-[11px] text-muted">
            {photosCount}/{photosLimit} photos
          </div>
        </div>
      )}
    </Card>
  );
}
