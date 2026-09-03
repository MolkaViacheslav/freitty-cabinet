// `server-only` turns the CLAUDE.md rule "src/server/** is server-only, never import it into a
// "use client" component" from a convention into a build error: importing this module from a
// client component fails the build instead of silently bundling Prisma into the browser.
import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
