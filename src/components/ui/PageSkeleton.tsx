import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The streamed fallback for the cabinet's list screens. Every page is `force-dynamic` and hits
 * Postgres on each request, so a cold Supabase start is visible and worth covering.
 *
 * Shared by two `loading.tsx` files rather than living in one at the `(cabinet)` level: a Suspense
 * boundary above Order Detail lets the shell flush with HTTP 200 before the page can call
 * `notFound()`, which turned every missing order into a 200 with a frozen skeleton.
 */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-3 w-40" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-card" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-card" />
    </div>
  );
}
