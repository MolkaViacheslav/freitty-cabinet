import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Root-level not-found boundary: what an unmatched URL gets. No sidebar/topbar chrome, because it
 * sits outside the `(cabinet)` route group's layout.
 *
 * It does *not* control the status code of `notFound()` calls from nested routes — that turned out
 * to depend on whether a `loading.tsx` sits above the page (a Suspense boundary lets the shell
 * flush with 200 first). The cabinet's skeletons are scoped to route groups for that reason; see
 * `components/ui/PageSkeleton.tsx`.
 *
 * Known Next.js limit, measured rather than assumed: a `notFound()` thrown from a dynamic Server
 * Component answers 404 but sends an error document whose body is only in the streamed payload, so
 * the UI appears on hydration. An unmatched URL like this one renders its body in the HTML itself.
 */
export default function RootNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-6">
      <EmptyState
        icon="🔍"
        title="Not found"
        description="This page does not exist. It may have been removed, or the address is mistyped."
        action={
          <Link href="/" className="rounded-md bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-blue">
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}
