# Freitty — тестове завдання (розбір)

## 1. Що просять

Реалізувати **три екрани кабінету клієнта логістичної платформи** як робочий веб-застосунок: **backend + frontend**.

| Екран | Роут | Зміст |
|---|---|---|
| Dashboard | `/` | KPI-метрики + список останніх ордерів + графіки активності |
| Order List | `/orders` | Список усіх ордерів з табами, фільтрами, пагінацією |
| Order Detail | `/orders/[number]` | Детальна сторінка ордера (Cross-Dock) |

### Жорсткі вимоги
- TypeScript на backend і frontend
- PostgreSQL як БД (обов'язково)
- Дані віддає **backend через API**, не захардкоджені на фронті
- БД заповнена прикладними даними (беремо з макетів)
- Верстка близька до макета, pixel-perfect не потрібен
- Базова якість коду: структура, читабельність
- Задеплоїти (Vercel / Render / Railway / Fly.io)
- Міні-презентація: показати задеплоєне + розповісти що і як зроблено

### Що НЕ потрібно
- Вихідний код віддавати не треба — оцінюють **задеплоєний застосунок + презентацію**
- Решта стека — на вибір кандидата

### Головний висновок з формату оцінювання
Оцінюють не код, а **працюючий продукт + твоє пояснення рішень**. Отже:
1. Все має працювати на проді (без «на локалці працювало»)
2. Треба вміти пояснити **кожне** рішення: чому Next.js, чому Prisma, чому така схема БД, чому так порахував метрики
3. Треба свідомо озвучити межі скоупу («авторизацію не робив, бо…») — це сильний сигнал, а не слабкість

---

## 2. Домен, витягнутий з макетів

### Сутності

**User** — `User 1 (U1, Admin)`, `User 2 (Dispatcher)`, `User 3`, `User 4`, `User 5 (driver)`, `User 6 (floor lead)`
Поля: name, initials, role (`ADMIN | DISPATCHER | DRIVER | FLOOR_LEAD`)

**Hub** — `Markham (ON)`, `Toronto`
Поля: name, province

**Order** — центральна сутність
- `number` — `FR001676`, `FR001681`, `FR001674`, `FR001672`, `FR001668`, `DRAFT-003`, `FR001383`
- `type` — `CROSS_DOCK | CONSOLIDATION`
- `status` — pipeline у макеті: `Draft · Ready · In Progress · Consolidated · In Transit · Deconsolidated · Closed`
  У картках бачимо ярлики: `New`, `In progress`, `Alert`, `Completed/Done`, `Draft`, `On Stock`
- `service` — `Storage`, `Pickup`, `Transload`, `Restock & Rework`
- `refNumber` — `REF-1004` (для простих ордерів; у консолідації refs живуть у sub-orders)
- `hub`, `scheduledAt` (`12 Apr, 09:00`), `destination` (`Toronto, ON`)
- `declaredQty` / `actualQty` (`20 decl · 18 actual`, `12 Δ +2`), `unitLabel` (`Standard 48×40`, `XL`)
- `carrierName` (`Schneider`, `TForce`, `Self pickup`, `R-way Transport Inc.`), `driverName`, `phone`, `truck/trailer`, `dock`
- `trailersCount` (`2 consolidated`)
- `nextActionLabel` (`Loading · 2h 14m`, `Waiting for truck`, `Upload photo`, `Paid · $1`)
- `hasAlert` + `alertMessage` (`photo missing · FR001674`)
- `createdBy` → User, `assignedTo` → User
- `amount` (`$1 · #001812`) — суми в макеті замасковані як `$1`
- лічильники: `comments 0/0`, `photos 0/5`

**SubOrder** (тільки для Consolidation)
`FR001676-1 · REF-1001 · 9 pallets`, у `FR001674-2` — `⚠ missing photo`
Поля: code, refNumber, pallets, hasAlert, alertMessage

**Operation** (Order Detail, таблиця Operations)
`Unloading | Disposal | Restack | Loading`, trailer (`TRL-8830`), qty, unit (`Standard (48×40)`), appliedAt (`17 Apr · 08:55`), commentsCount, photosCount

**Supply** (Order Detail, таблиця Supplies — Platform Sale)
`Straps 12 / Securement / 4`, `Corners 50 / Edge protect / 16`, `Shrink wrap 120g / Wrap / 2`
Поля: sku, category, qty, unitPrice, (lineTotal = qty × unitPrice — рахуємо, не зберігаємо)

**WarehouseNote / Delta** — на детальній: `Expected (BOL) 10` vs `Actual (warehouse) 12 (+2)`, текстова нотатка, фото-прев'ю

### Dashboard: метрики
- `Active Orders: 7` + тренд `▲ 2 this week`
- `Completed (30 d): 24` + тренд `same as last month`
- `Need Attention: 3` = `2 · awaiting your action` + `1 · alert`
- Activity: перемикач `Day / CW / Month / Quarter`, два графіки — `Completed orders` та `Spend`, вісь `W1…W10` (по тижнях)
- Інсайти: `+18% completed vs previous month`, `avg $/order`, `Best week: W7`

### Order List: фільтри
- Таби з лічильниками: `All 27 · Cross-Dock 18 · Consolidation 6 · Alerts 2 · Drafts 1`
- Фільтри: `Hub: All / Markham / Toronto`, `Date: Last 30 days / Today / This week`, `Status: Any / New / In progress`
- Перемикач вигляду: `Cards / Table / Pipeline`
- Пагінація: `Showing 6 of 27` + `Prev / Next`
- Кнопки: `Export CSV`, `+ New Order`

---

## 3. Скоуп: що робимо, а що свідомо ні

### MVP (обов'язково)
- 3 екрани, дані з PostgreSQL через API
- Фільтри + таби + пагінація на Order List (працюють через backend, а не на клієнті)
- Dashboard-метрики рахуються **запитом до БД**, а не константами
- Cards + Table view
- Deploy + seed на проді

### Nice to have (якщо лишається час)
- Export CSV (реальний, генерується на бекенді тим самим фільтром)
- Pipeline (kanban) view — read-only, без drag-drop
- Skeleton loading states

### Out of scope (озвучити на презентації + сказати як робив би)
- Авторизація / ролі → NextAuth + middleware, ролі як enum у БД, перевірка на рівні сервісу
- Мутації: створення/редагування ордера, `+ Operation`, `+ Supply` → Server Actions + zod + revalidatePath
- Реальні файли/фото → S3-сумісне сховище (R2/S3) + presigned URLs, у БД тільки метадані
- Чат, нотифікації, друк BOL PDF
- Drag-drop у Pipeline з обмеженням по ролі
