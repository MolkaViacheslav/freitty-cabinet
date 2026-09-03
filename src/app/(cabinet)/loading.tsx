import { Skeleton } from "@/components/ui/Skeleton";

/** Every cabinet page is `force-dynamic` and hits Postgres on each request, so a cold Supabase
 * start is visible. This is the streamed fallback while the Server Component awaits its services. */
export default function CabinetLoading() {
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
