import type { ReactNode } from "react";
import { Sidebar } from "./_components/Sidebar";
import { Topbar } from "./_components/Topbar";

/** Cabinet chrome shared by Dashboard, Order List and Order Detail (CLAUDE.md architecture:
 * "sidebar + topbar + breadcrumbs"). Breadcrumbs are per-page, composed inside `children`. */
export default function CabinetLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col bg-surface">
        <Topbar userName="User 1" userInitials="U1" />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
