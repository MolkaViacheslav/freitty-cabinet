import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

/** Rendered by `notFound()` (an order number that doesn't exist) and by any unmatched cabinet URL. */
export default function CabinetNotFound() {
  return (
    <EmptyState
      icon="🔍"
      title="Not found"
      description="This order or page does not exist. It may have been removed, or the number is mistyped."
      action={
        <Link href="/" className="rounded-md bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-blue">
          Back to dashboard
        </Link>
      }
    />
  );
}
