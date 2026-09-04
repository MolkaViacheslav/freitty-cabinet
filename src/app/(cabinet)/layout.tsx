import type { ReactNode } from "react";
import { getCabinetUser } from "@/server/services/users.service";
import { Sidebar } from "./_components/Sidebar";
import { Topbar } from "./_components/Topbar";

export const dynamic = "force-dynamic";

/** Cabinet chrome shared by Dashboard, Order List and Order Detail (CLAUDE.md architecture:
 * "sidebar + topbar + breadcrumbs"). Breadcrumbs are per-page, composed inside `children`.
 * The top bar's user comes from the database, not a literal — see users.service.ts. */
export default async function CabinetLayout({ children }: { children: ReactNode }) {
  const user = await getCabinetUser();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* min-w-0 on both flex items below: without it, a flex item's automatic min-width is its
          content's min-content size, so a wide table (DataTable's own overflow-x-auto wrapper)
          would grow this whole column instead of scrolling internally — the page would gain a
          horizontal scrollbar rather than just the table. */}
      <div className="flex min-w-0 flex-1 flex-col bg-surface">
        <Topbar userName={user?.name ?? null} userInitials={user?.initials ?? null} />
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
