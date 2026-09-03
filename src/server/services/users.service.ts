import "server-only";
import { cache } from "react";
import { prisma } from "@/server/db/prisma";

/**
 * Who the cabinet chrome renders in the top bar.
 *
 * Auth is explicitly out of scope (CLAUDE.md), so there is no signed-in user to read. Rather than
 * hardcoding a name in the layout — which would break the "nothing on the frontend is hardcoded"
 * rule — the cabinet renders the account owner: the ADMIN user from the database.
 *
 * Returns null instead of throwing: the top bar is chrome on every page, and a database blip
 * should degrade the avatar, not take down the whole layout (a throw in a layout escapes the
 * segment's error.tsx and hits global-error).
 *
 * Wrapped in React `cache` because both the layout (top bar) and the Dashboard page ("Welcome,
 * …") need it — one query per request, not one per caller.
 */
export const getCabinetUser = cache(async () => {
  try {
    return await prisma.user.findFirst({
      where: { role: "ADMIN" },
      orderBy: { initials: "asc" },
      select: { name: true, initials: true, role: true },
    });
  } catch (error) {
    console.error("[users.service] getCabinetUser failed", error);
    return null;
  }
});
