import { PageSkeleton } from "@/components/ui/PageSkeleton";

/** Dashboard only. Scoped to this route group so the boundary does not reach Order Detail, where
 * it would swallow `notFound()`'s 404 — see PageSkeleton's note. */
export default function OverviewLoading() {
  return <PageSkeleton />;
}
