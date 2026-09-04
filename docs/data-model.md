# data-model.md — схема БД і специфікація seed

Це виконавча специфікація: `schema.prisma` і `seed.ts` пишуться **строго за цим
файлом**. Обґрунтування рішень — у `DECISIONS.md`, секція B.

---

## 1. Prisma schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // Supavisor transaction pooler, :6543
  directUrl = env("DIRECT_URL")     // session pooler, :5432 (міграції)
}

enum Role {
  ADMIN
  DISPATCHER
  DRIVER
  FLOOR_LEAD
}

enum OrderType {
  CROSS_DOCK
  CONSOLIDATION
}

/// Pipeline-статуси з макета. Лейбл для UI — похідна функція, див. DECISIONS.md B4
enum OrderStatus {
  DRAFT
  READY
  IN_PROGRESS
  CONSOLIDATED
  IN_TRANSIT
  DECONSOLIDATED
  CLOSED
}

enum OperationType {
  UNLOADING
  DISPOSAL
  RESTACK
  LOADING
}

enum PalletUnit {
  STANDARD   // 48×40
  XL
}

model User {
  id       String  @id @default(cuid())
  name     String
  initials String
  role     Role

  createdOrders  Order[] @relation("OrderCreatedBy")
  assignedOrders Order[] @relation("OrderAssignedTo")

  @@map("users")
}

model Hub {
  id       String  @id @default(cuid())
  name     String  @unique   // "Markham", "Toronto"
  /// URL-safe значення для `?hub=` (api-contract.md). Окремо від `name`, бо матчинг
  /// по відображуваній назві ламається на будь-якому хабі з двох слів ("North York").
  /// Додано міграцією `20260903213500_hub_slug` (backfill із `name`).
  slug     String  @unique   // "markham", "toronto"
  province String              // "ON"

  orders Order[]

  @@map("hubs")
}

model Order {
  id     String      @id @default(cuid())
  number String      @unique          // "FR001676", "DRAFT-003"
  type   OrderType
  status OrderStatus

  // --- прапорці уваги (див. DECISIONS.md B3, B5) ---
  hasAlert             Boolean @default(false)
  alertMessage         String?
  awaitingClientAction Boolean @default(false)

  // --- основне ---
  refNumber   String?        // "REF-1004"; у консолідації refs живуть у sub-orders
  service     String?        // "Storage", "Pickup", "Transload", "Restock & Rework"
  customer    String?        // "R-way Transport"
  destination String?        // "Toronto, ON"

  hubId       String
  hub         Hub      @relation(fields: [hubId], references: [id])
  scheduledAt DateTime                 // дата з картки: "12 Apr, 09:00"
  closedAt    DateTime?                // ЛИШЕ для CLOSED. KPI Completed(30d) рахує по цьому полю

  // --- вантаж ---
  declaredQty Int
  actualQty   Int?                     // null поки не порахували на складі
  unit        PalletUnit @default(STANDARD)
  xlQty       Int        @default(0)   // для "15 × Std + 3 × XL"

  // --- перевізник / транспорт ---
  carrierName    String?
  driverName     String?
  carrierPhone   String?
  truckNumber    String?               // "TRK-4521"
  trailerNumber  String?               // "TRL-8830"
  trailerType    String?               // "Van · 53ft" — клас обладнання, не ID одиниці
  dock           String?               // "Dock 12 · Bay B"
  trailersCount  Int      @default(0)  // "2 consolidated"

  // --- склад ---
  warehouseNote String?
  photosCount   Int @default(0)
  photosLimit   Int @default(0)        // "0/5"
  commentsCount Int @default(0)

  // --- гроші ---
  amount Decimal? @db.Decimal(12, 2)

  nextActionLabel String?              // "Loading · 2h 14m", "Waiting for truck"

  createdById  String
  createdBy    User    @relation("OrderCreatedBy", fields: [createdById], references: [id])
  assignedToId String?
  assignedTo   User?   @relation("OrderAssignedTo", fields: [assignedToId], references: [id])

  subOrders  SubOrder[]
  operations Operation[]
  supplies   Supply[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([status])
  @@index([type])
  @@index([hubId])
  @@index([scheduledAt])
  @@index([closedAt])
  @@index([hasAlert])
  @@map("orders")
}

model SubOrder {
  id           String  @id @default(cuid())
  orderId      String
  order        Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  code         String  @unique        // "FR001676-1"
  refNumber    String                 // "REF-1001"
  pallets      Int
  hasAlert     Boolean @default(false)
  alertMessage String?
  position     Int                    // порядок відображення

  @@index([orderId])
  @@map("sub_orders")
}

model Operation {
  id            String        @id @default(cuid())
  orderId       String
  order         Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  type          OperationType
  trailerNumber String?
  qty           Int
  unit          PalletUnit    @default(STANDARD)
  appliedAt     DateTime
  commentsCount Int           @default(0)
  photosCount   Int           @default(0)
  isBillable    Boolean       @default(false)  // іконка "$" у макеті

  @@index([orderId])
  @@map("operations")
}

model Supply {
  id        String  @id @default(cuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  sku       String                              // "Straps 12"
  category  String                              // "Securement"
  qty       Int
  unitPrice Decimal @db.Decimal(10, 2)
  // lineTotal НЕ зберігається — обчислюється (DECISIONS.md B9)

  @@index([orderId])
  @@map("supplies")
}
```

### Чому саме так

1. **`hasAlert` окремо від `status`** — алерт це ортогональна властивість, а не
   стан у pipeline. Інакше ордер із алертом «забуває», на якому він етапі.
2. **`closedAt` окремо від `scheduledAt`** — KPI і список фільтруються по різних
   осях часу, і це дозволяє їм не суперечити одне одному.
3. **`lineTotal` не зберігається** — обчислювані поля в БД це два джерела правди
   і гарантований розсинхрон.

---

## 2. Специфікація seed

Seed **детермінований**: фіксований `seed value` рандомайзера, повторний запуск
дає ідентичні дані.

### 2.1 Довідники

**Hubs (2):** `Markham (ON)`, `Toronto (ON)`

**Users (6):**

| initials | name | role |
|---|---|---|
| U1 | User 1 | ADMIN |
| U2 | User 2 | DISPATCHER |
| U3 | User 3 | DISPATCHER |
| U4 | User 4 | DISPATCHER |
| U5 | User 5 | DRIVER |
| U6 | User 6 | FLOOR_LEAD |

**Каталог supplies (для генерації, 16 SKU).** Три обов'язкові з макета:

| SKU | category | unitPrice |
|---|---|---|
| Straps 12 | Securement | 4.50 |
| Corners 50 | Edge protect | 1.20 |
| Shrink wrap 120g | Wrap | 18.00 |

Решта 13 — довільні в категоріях `Securement`, `Edge protect`, `Wrap`, `Labeling`,
ціни $0.80 – $25.00.

### 2.2 Загальна структура: 72 ордери

Позначення: `T` = дата запуску seed.

| Група | Кількість | `scheduledAt` | Призначення |
|---|---|---|---|
| **A. Recent** | **27** | останні 30 днів | наповнює Order List (дефолтний фільтр `Last 30 days`) |
| **B. Older** | **45** | 31–70 днів тому | наповнює 10 тижнів графіків і KPI за попередній період |

### 2.3 Група A — рівно 27, розкладка по табах

Пріоритет табів (DECISIONS.md B1): Draft → Alert → тип.

| Сегмент | К-сть | Склад |
|---|---|---|
| Drafts | 1 | `DRAFT-003` (Consolidation, `status = DRAFT`) |
| Alerts | 2 | `FR001674` (з макета) + 1 згенерований Cross-Dock |
| Cross-Dock | 18 | `FR001681`, `FR001672`, `FR001383` (з макета) + 15 згенерованих |
| Consolidation | 6 | `FR001676`, `FR001668` (з макета) + 4 згенеровані |
| **Разом** | **27** | ✅ сходиться з `All 27` |

**Розподіл групи A за статусами:**

| Статус | К-сть |
|---|---|
| `DRAFT` | 1 |
| активні (`READY` / `IN_PROGRESS` / `CONSOLIDATED` / `IN_TRANSIT` / `DECONSOLIDATED`) | **7** |
| `CLOSED` (з `closedAt` в межах 30 днів) | 19 |

Обидва алерт-ордери — серед 7 активних.
Рівно **2** з 7 активних мають `createdAt` у поточному ISO-тижні → тренд `▲ 2 this week`.
Рівно **1** з 7 активних має `awaitingClientAction = true`.

### 2.4 Група B — 45 ордерів

| Підгрупа | К-сть | `closedAt` |
|---|---|---|
| закриті нещодавно | 5 | 1–28 днів тому |
| закриті в попередньому вікні | 20 | 32–59 днів тому |
| закриті давно | 20 | 62–69 днів тому |

Усі — `status = CLOSED`, `hasAlert = false`, `scheduledAt` на 31–70 днів раніше `T`.

> **Чому вікна не 0–29 / 31–60 / 61–70.** `cutoff30`/`cutoff60` у seed — це точні моменти
> (`T − N×24 год`), а дати генеруються як «календарний день N тому о фіксованій годині».
> Ордер, який випав рівно на 60-й день, опиняється по той чи інший бік `cutoff60` залежно
> від **години запуску seed** — assertion-и проходили ввечері й падали вранці. Вікна
> 32–59 і 62–69 лишають щонайменше добу запасу з обох боків за будь-якої години.
> Перевірено скриптом по всіх 24 годинах × 4 датах: 0 перетинів (старі вікна давали 2880).

> **`closedAt` завжди ≥ `scheduledAt`.** Раніше обидві дати тягнулись незалежно, і ордер міг
> бути «закритий» за 39 днів до того, як його запланували — видно очима на Order Detail.
> Тепер у групі A `closedAt = scheduledAt + 2…10 год`, а в групі B `scheduledAt` виводиться
> з `closedAt` (старіший на 1–10 днів, із затиском у вікно 31–70). Покрито assertion-ом.

### 2.5 Контрольні числа (seed завершується assertion-ами)

```ts
// prisma/seed.ts — в кінці, після вставки
assert(await countAll()                    === 72)
assert(await countTab('all'))              === 27)   // scheduledAt в межах 30 днів
assert(await countTab('cross-dock')        === 18)
assert(await countTab('consolidation')     === 6)
assert(await countTab('alerts')            === 2)
assert(await countTab('drafts')            === 1)
assert(await countActive()                 === 7)    // KPI Active Orders
assert(await countCompletedLast30d()       === 24)   // 19 з групи A + 5 з групи B
assert(await countCompletedPrev30d()       === 20)   // → тренд +20%
assert(await countNeedAttention()          === 3)    // hasAlert 2 + awaitingClientAction 1

// Інваріанти, яких жодне контрольне число не ловить — саме їх помічають очима на Order Detail
assert(await countClosedBeforeScheduled()  === 0)
assert(await countClosedInFuture()         === 0)
assert(await countClosedWithoutDate()      === 0)
```

> `countNeedAttention` навмисно повторює `dashboard.service.ts::getNeedAttentionKpi` буквально —
> уся база без 30-денного вікна (DECISIONS.md B5), але **без чернеток**, як і таб `Alerts`.
> Якщо запит у сервісі зміниться, а тут ні — assertion перестане щось гарантувати.

> **Усі дати в seed — UTC** (`Date.UTC`, не `setHours`). Читає їх усе теж у UTC: `lib/week.ts`
> бакетить по UTC-тижнях, `lib/filters.ts` рахує межі періодів через `Date.UTC`, `lib/format.ts`
> рендерить через `getUTC*`, `date_trunc` працює по колонці `timestamp` без таймзони. З
> `setHours()` seed, запущений із UTC+3, клав би «12 Apr, 09:00» як `06:00Z` — і всі три екрани
> показували б час на три години раніше за макет.

> Ці assertion-и — не формальність. Вони перетворюють «здається, цифри збіглись»
> на «seed падає, якщо не збіглись». І це готова відповідь на питання про тестування.

### 2.6 Гроші та графіки

- `amount` для Cross-Dock: $180 – $900; для Consolidation: $400 – $2 400.
- Суми розподілити так, щоб **W7 був піковим за spend** (інсайт `Best week: W7`).
  Практично: ордерам, які закрились у W7, дати суми з верхньої третини діапазону.
  > **Факт із реалізації (Етап 2):** seed гарантує лише суми W7 (≥5 ордерів з
  > верхньої третини діапазону), але не кількість ордерів по тижнях — W1 випадково
  > зібрав більше закритих ордерів і переважив за сумарним spend. `bestWeek` у
  > `/api/dashboard/summary` рахується з реальних даних (той самий принцип, що
  > DECISIONS.md B8: обчислюється, не хардкодиться) і на поточному сіді повертає
  > **W1**, не W7. Це не баг сервісу — цифри з бази саме такі.
- `Spend last 30d` = сума `amount` по `CLOSED` із `closedAt` за 30 днів.
- `avg $/order` = `Spend last 30d / Completed (30d)`.

### 2.7 Дані з макета — точні значення

**FR001676** — Consolidation, `IN_PROGRESS`, Markham, 12 Apr 09:00, 15 Std + 3 XL,
driver User 5, Toronto ON, 2 trailers, `nextActionLabel: "Loading · 2h 14m"`,
createdBy U1. Sub-orders: `FR001676-1 / REF-1001 / 9`, `FR001676-2 / REF-1003 / 6`,
`FR001676-3 / REF-1002 / 12`.

**FR001681** — Cross-Dock, `READY`, service `Storage`, `REF-1004`, Toronto,
15 Apr 14:00, 23 Standard, carrier `Schneider`, `Detroit, MI`,
`nextActionLabel: "Waiting for truck"`, createdBy U2.

**FR001674** — Consolidation, `IN_PROGRESS`, `hasAlert: true`,
`alertMessage: "photo missing"`, Markham, 13 Apr 11:00, declared 20 / actual 18,
carrier `TForce`, `Calgary, AB`, 1 trailer, `nextActionLabel: "Upload photo"`,
createdBy U3. Sub-orders: `FR001674-1 / REF-1005 / 11`,
`FR001674-2 / REF-1006 / 7` (`hasAlert: true`, `alertMessage: "missing photo"`).

**FR001672** — Cross-Dock, `CLOSED`, service `Pickup`, `REF-1007`, Markham,
14 Apr 17:30, 10 XL, carrier `Self pickup`, `Brampton, ON`, createdBy U1.

**FR001668** — Consolidation, `CLOSED`, Markham→Toronto, 11 Apr, 28 Standard,
carrier `TForce`, createdBy U4. Sub-orders: `FR001668-1 / REF-1008 / 15`,
`FR001668-2 / REF-1009 / 8`, `FR001668-3 / REF-1010 / 20`,
`FR001668-4 / REF-1011 / 12`.

**DRAFT-003** — Consolidation, `DRAFT`, Markham, 16 Apr, без qty і carrier.

**FR001383** — Cross-Dock, `IN_PROGRESS` (лейбл `On Stock`), сторінка деталей:
- customer `R-way Transport`, hub `Markham (ON)`, services `Transload, Restock & Rework`
- `REF-1012`, createdBy U2, assignedTo U6
- declared 10 Standard (48×40), actual 12 (Δ +2) → показуємо alert `Actual ≠ Expected`
- `trailerType: "Van · 53ft"` (окреме поле, не плутати з `trailerNumber`), carrier
  `R-way Transport Inc.`, phone `+1 647 555 0199`
- truck `TRK-4521` / trailer `TRL-8830`, dock `Dock 12 · Bay B`
- `photosCount: 0`, `photosLimit: 5`, `commentsCount: 0`
- warehouseNote: про 12 палет замість 10 у BOL і одну пошкоджену, відправлену в Disposal

Operations для FR001383:

| type | trailer | qty | appliedAt | comments | photos | billable |
|---|---|---|---|---|---|---|
| `UNLOADING` | TRL-8830 | 12 | 08:55 | 0 | 4 | так |
| `DISPOSAL` | — | 1 | 09:10 | 1 | 2 | ні |
| `RESTACK` | — | 11 | 09:25 | 0 | 1 | ні |
| `LOADING` | TRL-8830 | 11 | 10:40 | 0 | 0 | так |

Supplies для FR001383: `Straps 12 × 4`, `Corners 50 × 16`, `Shrink wrap 120g × 2`.
Subtotal = 4×4.50 + 16×1.20 + 2×18.00 = **$73.20** (обчислюється, не зберігається).

> Дати з макета (`12 Apr` тощо) — відносні: у seed вони перераховуються від `T`,
> щоб застосунок не «протух» через місяць. Зберігаємо відносний зсув, не абсолютну дату.
