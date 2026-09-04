# api-contract.md — контракт API

Контракт фіксується **до** написання UI, щоб фронт і бекенд не розходились.
Усі відповіді — plain JSON: `Decimal → number`, `Date → ISO-string`.

Формат помилки — єдиний для всіх ендпоінтів:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid query parameter: page" } }
```

Коди: `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `INTERNAL_ERROR` (500).

Усі роути: `export const dynamic = 'force-dynamic'`.

---

## GET /api/health

Перевірка живості БД. Використовується раннім деплоєм і cron-пінгом.

```json
{ "status": "ok", "db": "up", "timestamp": "2026-09-03T10:00:00.000Z" }
```

Реалізація: `await prisma.$queryRaw\`SELECT 1\``. Якщо кинуло — `503` з `"db": "down"`.

---

## GET /api/orders

Список ордерів із фільтрами й пагінацією. Це основний ендпоінт застосунку.

### Query-параметри (усі опційні, валідуються zod)

| Параметр | Тип | Дефолт | Значення |
|---|---|---|---|
| `tab` | enum | `all` | `all` \| `cross-dock` \| `consolidation` \| `alerts` \| `drafts` |
| `hub` | string | — | slug хабу (`markham`, `toronto`) — матчиться по `Hub.slug`, не по `name`, case-insensitive |
| `status` | enum | — | `new` \| `in-progress` (як у макеті — підмножина pipeline) |
| `period` | enum | `last-30-days` | `today` \| `this-week` \| `last-30-days` |
| `search` | string | — | по `number` і `refNumber`, case-insensitive |
| `page` | int ≥ 1 | `1` | |
| `pageSize` | int 1–50 | `6` | як у макеті `Showing 6 of 27` |

Правила комбінування — `DECISIONS.md` B2 (усе через `AND`; таб `drafts` ігнорує `status`).

### Відповідь `200`

```jsonc
{
  "items": [
    {
      "id": "clx...",
      "number": "FR001676",
      "type": "CONSOLIDATION",
      "status": "IN_PROGRESS",
      "statusLabel": "In progress",     // похідне, DECISIONS.md B4
      "hasAlert": false,
      "alertMessage": null,
      "awaitingClientAction": false,       // independent flag, DECISIONS.md B5 — not derived from hasAlert
      "refNumber": null,
      "service": null,
      "hub": { "slug": "markham", "name": "Markham", "province": "ON" },
      "scheduledAt": "2026-08-20T09:00:00.000Z",
      "destination": "Toronto, ON",
      "declaredQty": 15,
      "actualQty": null,
      "unit": "STANDARD",
      "xlQty": 3,
      "quantityLabel": "15 × Std + 3 × XL",   // похідне, форматується на бекенді
      "carrierName": null,
      "driverName": "User 5",
      "trailersCount": 2,
      "nextActionLabel": "Loading · 2h 14m",
      "amount": null,
      "commentsCount": 0,
      "photosCount": 0,
      "photosLimit": 0,
      "createdBy": { "initials": "U1", "name": "User 1", "role": "ADMIN" },
      "subOrders": [
        { "code": "FR001676-1", "refNumber": "REF-1001", "pallets": 9,
          "hasAlert": false, "alertMessage": null }
      ],
      "subOrdersCount": 3
    }
  ],
  "pagination": { "page": 1, "pageSize": 6, "total": 27, "totalPages": 5 },
  "counters": { "all": 27, "crossDock": 18, "consolidation": 6, "alerts": 2, "drafts": 1 }
}
```

**Важливо про `counters`:** рахуються з урахуванням `hub`, `period`, `search`,
але **без урахування** поточного `tab` — інакше перемикання табу обнуляло б решту.
Реалізація — один `groupBy`, не п'ять окремих `count`.

**Реалізація сервісу:** `Promise.all([findMany, count, groupBy])` — три запити
паралельно, не послідовно.

**Сортування:** `scheduledAt DESC, number DESC`. Другий ключ — не косметика: `scheduledAt`
не унікальний, і без тайбрейкера offset-пагінація може віддати той самий ордер на двох
сторінках (DECISIONS.md C).

`totalPages` — мінімум `1`, навіть коли `total = 0`, щоб UI не рендерив «Page 1 of 0».

---

## GET /api/orders/[number]

Деталі одного ордера. `number` — це `FR001383`, не `id`.

### Відповідь `200`

Усе те саме, що в `items[]`, плюс:

```jsonc
{
  "customer": "R-way Transport",
  "assignedTo": { "initials": "U6", "name": "User 6", "role": "FLOOR_LEAD" },
  "carrierPhone": "+1 647 555 0199",
  "truckNumber": "TRK-4521",
  "trailerNumber": "TRL-8830",
  "trailerType": "Van · 53ft",
  "dock": "Dock 12 · Bay B",
  "warehouseNote": "Counted 12 pallets on arrival...",
  "delta": { "expected": 10, "actual": 12, "diff": 2, "hasDelta": true },
  "statusFlow": ["DRAFT", "READY", "IN_PROGRESS", "CLOSED"],   // пройдений шлях
  "subOrdersPallets": 27,       // сума pallets по subOrders — рахується, не зберігається
  "operations": [
    { "id": "clx...", "type": "UNLOADING", "typeLabel": "Unloading",
      "trailerNumber": "TRL-8830", "qty": 12, "unit": "STANDARD",
      "unitLabel": "Standard (48×40)", "appliedAt": "2026-09-03T08:55:00.000Z",
      "commentsCount": 0, "photosCount": 4, "isBillable": true }
  ],
  "supplies": [
    { "id": "clx...", "sku": "Straps 12", "category": "Securement",
      "qty": 4, "unitPrice": 4.5, "lineTotal": 18 }
  ],
  "suppliesSubtotal": 73.2
}
```

`lineTotal` і `suppliesSubtotal` обчислюються в сервісі, не зберігаються в БД.

### `404`

Ордера з таким номером немає → `{ "error": { "code": "NOT_FOUND", ... } }`.
На сторінці — `notFound()`.

---

## GET /api/dashboard/summary

### Query

| Параметр | Дефолт | Значення |
|---|---|---|
| `granularity` | `week` | `week` \| `month` (`day` і `quarter` — out of scope) |

### Відповідь `200`

```jsonc
{
  "kpi": {
    "activeOrders": { "value": 7, "trend": { "direction": "up", "value": 2, "label": "this week" } },
    "completed30d": { "value": 24, "trend": { "direction": "up", "value": 20, "label": "vs last month" } },
    "needAttention": {
      "value": 3,
      "breakdown": [
        { "kind": "alert", "count": 2, "label": "alert", "detail": "photo missing · FR001674", "orderNumber": "FR001674" },
        { "kind": "awaiting-action", "count": 1, "label": "awaiting your action", "detail": "FR001676", "orderNumber": "FR001676" }
      ]
    }
  },
  "activity": {
    "granularity": "week",
    "buckets": [
      { "key": "W1", "startsAt": "2026-06-29T00:00:00.000Z", "completed": 5, "spend": 3240.50 }
    ]
  },
  "insights": {
    "completedChangePercent": 20,
    "totalSpend30d": 18420.75,
    "avgPerOrder": 767.53,
    "bestWeek": { "key": "W7", "spend": 4880.00 }
  }
}
```

**`needAttention.breakdown[]`:** `kind` (`alert` \| `awaiting-action`) — стабільна
ідентичність бакета, саме по ній треба розгалужуватись; `label` — це текст для показу,
матчитись на нього не можна. `orderNumber` і `detail` — **один представник** бакета для
прикладу, а не його вміст: при `count > 1` посилатись на цей номер означає показати один
ордер замість двох. Тому alert-чіп на дашборді веде на таб `?tab=alerts` (він фільтрує
рівно цей бакет), а не на `?search=<номер>`.

**`buckets` — рівно 10 елементів** (W1 найдавніший, W10 поточний), навіть якщо в
якомусь тижні нуль. Порожні тижні заповнюються нулями **на бекенді**, бо `GROUP BY`
не повертає рядків для порожніх груп — інакше графік «стрибатиме».

Агрегація — `$queryRaw` з `date_trunc('week', closed_at)` (`DECISIONS.md` A4).

---

## GET /api/orders/export

CSV із тими самими фільтрами, що й `GET /api/orders` (крім `page`/`pageSize` —
експортується вся вибірка).

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="orders-2026-09-03.csv"` (дата — UTC)
- Колонки: `Number, Type, Status, Hub, Scheduled, Destination, Declared Qty, Actual Qty, Carrier, Amount, Next Action`
- Ліміт **5000 рядків**: вибірка матеріалізується в памʼять і склеюється в один рядок, тому
  необмежений запит — це не повільна відповідь, а обрив по памʼяті. Якщо ліміт спрацював,
  у відповіді є заголовок `X-Export-Truncated: true` (тіло CSV лишається валідним).
- Екранування — `lib/csv.ts`: лапки/коми/CR/LF беруться в лапки, комірки з провідними
  `=`, `+`, `-`, `@` знешкоджуються від formula injection.

Використовує **той самий** `getOrders()`, що й список — не окрему реалізацію
фільтрів. Це головний сенс сервісного шару.

> Nice to have. Перший кандидат на відсічення (див. PROGRESS.md).
