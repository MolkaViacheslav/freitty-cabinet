-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DISPATCHER', 'DRIVER', 'FLOOR_LEAD');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('CROSS_DOCK', 'CONSOLIDATION');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'READY', 'IN_PROGRESS', 'CONSOLIDATED', 'IN_TRANSIT', 'DECONSOLIDATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('UNLOADING', 'DISPOSAL', 'RESTACK', 'LOADING');

-- CreateEnum
CREATE TYPE "PalletUnit" AS ENUM ('STANDARD', 'XL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,

    CONSTRAINT "hubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "hasAlert" BOOLEAN NOT NULL DEFAULT false,
    "alertMessage" TEXT,
    "awaitingClientAction" BOOLEAN NOT NULL DEFAULT false,
    "refNumber" TEXT,
    "service" TEXT,
    "customer" TEXT,
    "destination" TEXT,
    "hubId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "declaredQty" INTEGER NOT NULL,
    "actualQty" INTEGER,
    "unit" "PalletUnit" NOT NULL DEFAULT 'STANDARD',
    "xlQty" INTEGER NOT NULL DEFAULT 0,
    "carrierName" TEXT,
    "driverName" TEXT,
    "carrierPhone" TEXT,
    "truckNumber" TEXT,
    "trailerNumber" TEXT,
    "dock" TEXT,
    "trailersCount" INTEGER NOT NULL DEFAULT 0,
    "warehouseNote" TEXT,
    "photosCount" INTEGER NOT NULL DEFAULT 0,
    "photosLimit" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "amount" DECIMAL(12,2),
    "nextActionLabel" TEXT,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_orders" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "refNumber" TEXT NOT NULL,
    "pallets" INTEGER NOT NULL,
    "hasAlert" BOOLEAN NOT NULL DEFAULT false,
    "alertMessage" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "sub_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "OperationType" NOT NULL,
    "trailerNumber" TEXT,
    "qty" INTEGER NOT NULL,
    "unit" "PalletUnit" NOT NULL DEFAULT 'STANDARD',
    "appliedAt" TIMESTAMP(3) NOT NULL,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "photosCount" INTEGER NOT NULL DEFAULT 0,
    "isBillable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplies" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "supplies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hubs_name_key" ON "hubs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "orders_number_key" ON "orders"("number");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_type_idx" ON "orders"("type");

-- CreateIndex
CREATE INDEX "orders_hubId_idx" ON "orders"("hubId");

-- CreateIndex
CREATE INDEX "orders_scheduledAt_idx" ON "orders"("scheduledAt");

-- CreateIndex
CREATE INDEX "orders_closedAt_idx" ON "orders"("closedAt");

-- CreateIndex
CREATE INDEX "orders_hasAlert_idx" ON "orders"("hasAlert");

-- CreateIndex
CREATE UNIQUE INDEX "sub_orders_code_key" ON "sub_orders"("code");

-- CreateIndex
CREATE INDEX "sub_orders_orderId_idx" ON "sub_orders"("orderId");

-- CreateIndex
CREATE INDEX "operations_orderId_idx" ON "operations"("orderId");

-- CreateIndex
CREATE INDEX "supplies_orderId_idx" ON "supplies"("orderId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_orders" ADD CONSTRAINT "sub_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplies" ADD CONSTRAINT "supplies_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
