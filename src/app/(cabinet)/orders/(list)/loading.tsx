import { PageSkeleton } from "@/components/ui/PageSkeleton";

/** Order List only. `/orders/[number]` is a sibling of this route group, not a child, so it keeps
 * no Suspense boundary above it and `notFound()` can still answer with a real 404. */
export default function OrdersListLoading() {
  return <PageSkeleton />;
}
