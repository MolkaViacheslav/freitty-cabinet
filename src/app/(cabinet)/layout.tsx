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
      <div className="flex flex-1 flex-col bg-surface">
        <Topbar userName={user?.name ?? null} userInitials={user?.initials ?? null} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
