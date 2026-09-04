import { Card } from "@/components/ui/Card";

type DockCardProps = {
  dock: string | null;
  trailerNumber: string | null;
};

/** "Your assigned dock" panel — text summary, not the mockup's graphical schematic
 * (CLAUDE.md: layout close to mockup, pixel-perfect not required). */
export function DockCard({ dock, trailerNumber }: DockCardProps) {
  return (
    <Card>
      <div className="mb-2.5 text-[11px] font-bold tracking-wide text-muted uppercase">Your assigned dock</div>
      {dock ? (
        <>
          <div className="text-[13px] font-bold text-red">{dock}</div>
          {trailerNumber && <div className="mt-1 text-xs text-muted">🚚 {trailerNumber}</div>}
        </>
      ) : (
        <div className="text-xs text-muted">No dock assigned yet</div>
      )}
    </Card>
  );
}
