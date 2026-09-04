import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

/** Segment-level boundary for `notFound()` on an order number that does not exist. */
export default function OrderNotFound() {
  return (
    <EmptyState
      icon="🔍"
      title="Order not found"
      description="No order with this number exists. It may have been removed, or the number is mistyped."
      action={
        <Link href="/orders" className="rounded-md bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-blue">
          Back to orders
        </Link>
      }
    />
  );
}
