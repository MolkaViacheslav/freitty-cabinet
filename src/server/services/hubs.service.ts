import "server-only";
import { prisma } from "@/server/db/prisma";

/**
 * Options for the Order List's Hub filter. `slug` is the value that goes into `?hub=`
 * (api-contract.md), `name` is what the user sees — so the dropdown is built from the database
 * rather than a literal list in the component (CLAUDE.md: nothing on the frontend is hardcoded).
 */
export async function getHubOptions() {
  return prisma.hub.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
  });
}

export type HubOption = Awaited<ReturnType<typeof getHubOptions>>[number];
