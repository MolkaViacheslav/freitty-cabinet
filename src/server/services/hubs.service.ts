import "server-only";
import { prisma } from "@/server/db/prisma";

/**
 * Hubs for the Order List's Hub filter. Returned as `{ slug, name }` — `slug` is what goes into
 * `?hub=` (api-contract.md), `name` is what the user sees. Nothing about the filter options is
 * hardcoded in the UI (CLAUDE.md data rules).
 */
export async function getHubOptions() {
  const hubs = await prisma.hub.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true, province: true },
  });
  return hubs;
}
