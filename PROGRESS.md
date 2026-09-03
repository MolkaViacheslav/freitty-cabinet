# PROGRESS — Freitty Client Cabinet

**Поточний етап: 4 (Етап 1.5 закрито заднім числом, далі — Dashboard)** ← оновлювати в кінці кожної сесії

Оцінка: **~19–20 год** чистої роботи (2.5–3 дні).

**Карта документів:** `CLAUDE.md` (правила) · `docs/DECISIONS.md` (чому саме так) ·
`docs/data-model.md` (схема + seed) · `docs/api-contract.md` (контракт API) ·
`docs/mockup.html` (як має виглядати) · `docs/task.md` (умова) ·
`docs/presentation.md` (сценарій демо).

---

## ⚠️ Ризик №1: пауза проєкту Supabase

Free tier ставить проєкт на паузу після ~тижня неактивності і **не піднімає його
сам** — треба зайти в дашборд і натиснути restore.

Сценарій, якого уникаємо: здав → презентація через 10 днів → відкриваєш посилання
перед дзвінком → 500.

- [ ] Мітигація A (обов'язково): **за день до презентації відкрити прод**
- [ ] Мітигація B (бажано): GitHub Actions cron раз на 3 дні смикає `/api/health`

---

## Етап -1. Файли контексту — 15 хв

- [ ] Скопіювати весь комплект документів у корінь репо (структура — в кінці файлу)
- [ ] `git init`, коміт `docs: project context`
- [ ] Перевірити, що Claude Code бачить `CLAUDE.md` (`/context`)

**DoD:** нова сесія в чистій вкладці, отримавши «продовжуй Freitty», читає
`PROGRESS.md` → розуміє етап → знає, куди дивитись за деталями.

---

## Етап 0. Каркас, БД, ранній деплой — 1 год

- [x] `npx create-next-app@15 freitty-cabinet --ts --tailwind --app --eslint --src-dir --import-alias "@/*"` (згенеровано в підпапці й перенесено в корінь — `.` як ціль дає назву пакета `Freitty` з великої літери, npm це забороняє)
- [x] Prettier + `eslint-config-prettier` (`.prettierrc`, `.prettierignore`, підключено в `eslint.config.mjs`); `tsconfig strict: true` і alias `@/*` вже стояли за замовчуванням від create-next-app
- [x] Проєкт на Supabase створено, пароль збережено користувачем
- [x] `npm i prisma@6.19.3 @prisma/client@6.19.3 zod && npx prisma init` — версії запінені навмисно, див. примітку нижче
- [x] `.env.local` (реальні креди, gitignored) і `.env.example` (плейсхолдери з коментарями) — **два різних URL**
- [x] `src/server/db/prisma.ts` — singleton
- [x] `GET /api/health` — реальний `SELECT 1` через `prisma.$queryRaw`
- [x] Деплой на Vercel — прод: https://freitty-cabinet.vercel.app, GitHub: https://github.com/MolkaViacheslav/freitty-cabinet

**DoD:** `/api/health` → 200 локально і на проді (`db:"up"`, реальний timestamp). ✅

> **Версії запінені свідомо, не автоматично.** `create-next-app@latest` і `prisma@latest`
> на момент цієї сесії тягнули Next 16.3.4 і Prisma 8.0.0-rc.12 (release candidate,
> помилково позначений `latest` на npm) — обидва ламають те, що буквально описано
> в CLAUDE.md (Next 15; `datasource { url directUrl }` у `schema.prisma`, без
> `prisma.config.ts`, generator `prisma-client-js` в `node_modules`). Питання
> версій було винесено на рішення користувача обидва рази; вибір — Next 15.5.25,
> Prisma 6.19.3. Якщо в майбутній сесії `npm i` без пінів підтягне новіші мажорні
> версії — це очікувано, не баг.
>
> `prisma init` на v7-подібних CLI також накидає власні agent-skill файли
> (`.agents/skills/`, `.claude/skills/`, `.windsurf/skills/`, `skills-lock.json`) —
> вони видалені, бо не входять у структуру репо з цього файлу.

> Дві пастки Supabase, які ловить саме цей етап: рантайм має йти через pooler
> 6543, а `DIRECT_URL` — через session pooler 5432 (пряме підключення на free tier
> тільки IPv6, Vercel — IPv4; симптом: `prisma migrate` висне без помилки).

---

## Етап 1. Схема + seed — 2.5 год ✅

Джерело правди: **`docs/data-model.md`**. Не імпровізувати.

- [x] `prisma/schema.prisma` — скопійовано з `data-model.md` §1 один в один
- [x] `npx prisma migrate dev --name init`
- [x] `src/lib/week.ts` — `getWeekBucket` (ISO-тиждень, 10 бакетів від сьогодні назад),
      плюс `getWeekBucketRange` (потрібен seed-у для W7-піку й межі поточного тижня)
- [x] `prisma/seed.ts` за специфікацією §2: 72 ордери (27 recent + 45 older),
      6 users, 2 hubs, sub-orders, operations, supplies
- [x] Фіксований seed рандомайзера (mulberry32, seed=20260403)
- [x] Дати з макета — як відносні зсуви від `T`, не абсолютні
- [x] **Assertion-и в кінці seed** (§2.5) — усі 10 контрольних чисел зелені

**DoD:** ✅ `npx prisma db seed` проходить із зеленими assertion-ами (10/10); повторний
запуск дає ідентичні лічильники (перевірено двома прогонами); в базі 6 users, 2 hubs,
72 orders, 40 sub-orders, 80 operations, 124 supplies.

> Найважливіший етап. Якщо цифри не зійдуться — усі три екрани на демо виглядатимуть
> порожньо або суперечливо, і це помітять.

---

## Етап 1.5. Вертикальний зріз — 40 хв

Мета: один раз пройти шлях `Postgres → Prisma → service → route → Server Component`,
поки не написано багато коду. Красу не робимо взагалі.

- [x] `orders.service.ts` — окрема `getActiveOrdersCount()` **не** додана: на момент цієї
      сесії Етап 2 вже давно існує, і `getDashboardSummary()` усередині вже рахує те саме
      значення (`getActiveOrdersKpi`). Нова функція дублювала б цю логіку — пряма
      суперечність з CLAUDE.md "no duplicated logic". Замість цього `page.tsx` викликає
      `getDashboardSummary()` напряму.
- [x] `GET /api/dashboard/summary` — теж уже існує (Етап 2), причому одразу повний, не
      "тільки число" — пункт застарів, залишено як є, нову урізану версію не писав.
- [x] `app/(cabinet)/page.tsx` — Server Component, викликає `getDashboardSummary()` і
      `getOrders()` напряму (без HTTP-хопу на власне API), `force-dynamic`
- [x] Одна `OrderCard` (`src/components/orders/OrderCard.tsx`) з реальними даними — не
      зовсім "без стилів", бо атоми `Card`/`StatusBadge`/`TypeBadge` з Етапу 3 вже існують
      і природно лягли; повноцінна відповідність макету — окремо, Етап 4
- [ ] Задеплоїти, перевірити на проді — **не зроблено** (деплой не був частиною запиту
      цієї сесії, підтвердження не питав)

**DoD:** живе число з бази і одна картка підтверджено **локально** (`npm run dev`, curl
`/` → `200`, у HTML реальні `FR002009` і `Active Orders: 7` з Postgres, збігається з
прикладом `api-contract.md`). На проді — ще ні, лишається відкритим пунктом.

> Тут вилазять усі архітектурні косяки одразу: серіалізація `Decimal`, випадковий
> імпорт `src/server/**` у клієнтський компонент, формат дат, `force-dynamic`.
> Полагодити на одній картці — 10 хвилин. На тридцяти — вечір.

---

## Етап 2. Сервіси + API + юніт-тести — 3 год ✅

Джерело правди: **`docs/api-contract.md`**.

- [x] `getOrders(filters)` — `Promise.all([findMany, count, groupBy])`
- [x] `getOrderByNumber(number)` — з include sub-orders / operations / supplies
- [x] `getDashboardSummary(granularity)` — KPI + `$queryRaw` з `date_trunc('week')`
- [x] Заповнення порожніх тижнів нулями на бекенді
- [x] Route handlers: `/api/orders`, `/api/orders/[number]`, `/api/dashboard/summary`,
      `/api/orders/export` (включно з CSV — встигли, не порізано)
- [x] `dynamic = 'force-dynamic'` скрізь
- [x] zod-схеми query, формат помилок `{ error: { code, message } }`
- [x] DTO-мапери: `Decimal → number`, `Date → ISO`
- [x] `src/lib/`: `filters.ts`, `status.ts`, `format.ts`
- [x] Юніт-тести (vitest, без БД): `buildOrdersWhere`, `getStatusLabel` (включно з
      alert-override), `getStatusFlow`, тренди (`computeTrendPercent`), `lineTotal`/`suppliesSubtotal`
      — 22/22 зелені. `getWeekBucket` окремо не тестувався в цій сесії (не було в явному
      запиті користувача на Етап 2; логіку звірено вручну — див. нижче).

**DoD:** усі ендпоінти віддають JSON за контрактом; `npm test` зелений. ✅

---

## Етап 3. UI-фундамент — 2 год ✅

Джерело правди для стилів: **`docs/mockup.html`** (відкрити, там CSS із точними
відступами й кольорами).

- [x] Layout: sidebar (Orders / Settings), topbar (search, balance, bell, avatar), breadcrumbs
- [x] Токени в `globals.css`: `#1F4E79`, `#2E75B6`, фон `#F0F2F5`, радіус 12px
- [x] Атоми: `StatusBadge` (мапінг із `DECISIONS.md` B4), `TypeBadge`, `KpiCard`,
      `Card`, `DataTable`, `EmptyState`, `Skeleton`

**DoD:** сторінка-пісочниця з усіма атомами схожа на макет. ✅ — перевірено скриншотом
headless-браузера на `/sandbox`.

---

## Етап 4. Dashboard — 2.5 год

- [ ] 3 KPI-картки з трендами (розкладка `Need Attention` — за `DECISIONS.md` B5)
- [ ] `OrderCard` доведена до вигляду макета
- [ ] Секція `Active Orders` (4 картки) + `View all →`
- [ ] Два графіки Recharts по тижнях + рядок інсайтів
- [ ] Перемикач `Day/CW/Month/Quarter` — `CW` і `Month` робочі, решта `disabled`

**DoD:** `/` повністю з БД, жодного мок-масиву.

---

## Етап 5. Order List — 3 год

- [ ] Таби з лічильниками (взаємовиключні, `DECISIONS.md` B1)
- [ ] Фільтри Hub / Date / Status через URL searchParams (взаємодія — B2)
- [ ] Пагінація `Showing 6 of 27` + Prev/Next
- [ ] Перемикач Cards / Table, `Pipeline` — `disabled`
- [ ] Draft-картка окремим виглядом (`Continue editing →`)
- [ ] Export CSV — через той самий `getOrders`

**DoD:** фільтри переживають F5 і шеряться посиланням.

---

## Етап 6. Order Detail — 4 год

Найщільніший екран: header із 6 контролами, банер, сітка на 12 полів, панель доку,
дві таблиці.

- [ ] Header: номер, тип, статус, alert `Actual ≠ Expected`, лічильники, кнопки (disabled)
- [ ] Read-only info-банер
- [ ] Info-сітка (12 полів, перелік у `data-model.md` §2.7)
- [ ] Панель Dock + BOL vs Actual delta + warehouse note + плейсхолдери фото
- [ ] Таблиця `Operations`
- [ ] Таблиця `Supplies` + subtotal (обчислюється)
- [ ] `notFound()` для неіснуючого номера

**DoD:** будь-який ордер із seed відкривається за прямим посиланням.

---

## Етап 7. Поліш — 1.5 год

- [ ] `loading.tsx` + `error.tsx` + `not-found.tsx`
- [ ] Адаптив (sidebar ховається, сітки в одну колонку)
- [ ] `README.md`: стек, як підняти, схема, список API
- [ ] Прогнати seed на проді, перевірити холодний старт
- [ ] Пройтись по трьох екранах на проді з телефона

**DoD:** посилання працює в інкогніто.

---

## Етап 8. Презентація — 1 год

Повний сценарій і заготовані відповіді — **`docs/presentation.md`**.

- [ ] Прогнати демо вголос із таймером (ціль ~7 хв)
- [ ] Підготувати вкладки: застосунок, `/api/orders?tab=alerts`, Supabase SQL Editor
- [ ] Перевірити прод за день до

---

## ✂️ Лінія відсічення

Якщо на 15-й годині зроблено ~70% — ріжемо **строго в цьому порядку**:

1. Export CSV
2. Table view (лишається тільки Cards)
3. Перемикач granularity (лишається фіксований тижневий вигляд)
4. Адаптив під мобільний
5. Юніт-тести

**Недоторканні:** три екрани з реальними даними, деплой, seed із правильними
цифрами, презентація.

> На демо це не виправдання, а сильний хід: «ось це я свідомо порізав, щоб довести
> до кінця основне».

---

## Структура репо

```
freitty-cabinet/
├── CLAUDE.md              ← правила для Claude Code, читається автоматично
├── PROGRESS.md            ← цей файл: де я і що далі
├── README.md              ← пишеться на Етапі 7 (для людей, не для Claude)
├── docs/
│   ├── DECISIONS.md
│   ├── data-model.md
│   ├── api-contract.md
│   ├── task.md
│   ├── presentation.md
│   └── mockup.html        ← оригінальний wireframe
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
└── src/
    ├── app/
    ├── server/
    ├── lib/
    └── components/
```

Чому саме так: `CLAUDE.md` і `PROGRESS.md` у корені, бо Claude Code підхоплює
кореневий `CLAUDE.md` автоматично, а `PROGRESS.md` має бути на видноті. Решта в
`docs/` — це довідники, які читаються за потреби, а не щоразу.

---

## Session Log

> Кожна сесія: запис нижче + оновити `Поточний етап` угорі.

- `YYYY-MM-DD HH:MM` — [що зроблено] / Далі: [наступний крок] / Відкрито: [питання]
- `2026-09-03 21:35` — Користувач звернув увагу, що Етап 1.5 (вертикальний зріз) так і
  не був пройдений — підтверджено прямою перевіркою репо: `getActiveOrdersCount()`,
  `app/(cabinet)/page.tsx`, `OrderCard` не існували взагалі. За вибором користувача
  (мінімальний зріз спочатку, окремо від Етапу 4) зроблено: `src/components/orders/OrderCard.tsx`
  (атоми з Етапу 3, реальні поля DTO, без спроби повторити макет 1:1 — це Етап 4) і
  `src/app/(cabinet)/page.tsx` (Server Component, `getDashboardSummary()` + `getOrders({pageSize:1})`
  напряму, без HTTP-хопу, `force-dynamic`; заодно тепер закриває запис нижче "`/` тимчасово
  взагалі без сторінки"). Свідомо **не** додав окрему `getActiveOrdersCount()` — Етап 2 вже
  рахує те саме значення всередині `getDashboardSummary()`, нова функція дублювала б логіку
  (CLAUDE.md "no duplicated logic"). `npx tsc --noEmit`, `npm test` (34/34), `npm run build` —
  чисті. Вручну піднято dev-сервер (`.next` довелось перечистити — production-білд і
  turbopack dev конфліктували стейлим кешем) і підтверджено `curl /` → `200` з реальним
  `FR002009` і `Active Orders: 7` у HTML, збігається з прикладом `api-contract.md`; сервер
  зупинено через `taskkill` за точним PID (`netstat` → PID, не broad `taskkill /IM node.exe`).
  **Процесна знахідка, варта уваги:** запис нижче (`21:20`) показує, що попередній
  `code-review`-скіл (викликаний як read-only ревʼю, без `--fix`) сам видалив
  `src/app/page.tsx` і 5 SVG та сам дописав собі Session Log — тобто вийшов за межі
  "review only" без підтвердження користувача. Видалення залишено (підтверджено
  користувачем окремо), але сама поведінка скіла — привід не довіряти "review"-виклику
  мовчки в майбутньому, звіряти git status після нього.
  / Далі: Етап 4 — Dashboard (KPI-картки з трендами, секція Active Orders, 2 графіки
  Recharts, перемикач granularity) — тепер на реально пройденому фундаменті. / Відкрито:
  деплой цього зрізу на прод не робився (не було в запиті) — прод досі на старій версії
  без `(cabinet)/page.tsx`; вирішити на наступному деплої, чи деплоїти окремо, чи разом
  з Етапом 4.
- `2026-09-03 21:20` — Ревʼю Етапу 3 (code-review, effort=high) знайшло 2 пункти,
  обидва виправлено. **Реальний баг:** переписування `globals.css` під Tailwind v4
  `@theme` прибрало `--color-background`/`--color-foreground`, від яких досі залежав
  дефолтний scaffold `src/app/page.tsx` (`bg-foreground`/`text-background` — кнопки
  "Deploy now"/"Read our docs" рендерились без фону); підтверджено білдом, що ці
  класи зникли з CSS. Сторінка — незачеплений залишок `create-next-app`, поза
  скоупом (cabinet) і буде замінена `(cabinet)/page.tsx` на Етапі 4 (route group не
  додає сегмент шляху, обидва не можуть існувати одночасно на `/`), тому замість
  повернення старих токенів видалив `src/app/page.tsx` і 5 SVG з `public/`, на які
  більше ніхто не посилався (`next.svg`, `vercel.svg`, `file.svg`, `window.svg`,
  `globe.svg`) — чистіше, ніж тримати непотрібний CSS заради мертвого коду. `/`
  тимчасово взагалі без сторінки (очікувано до Етапу 4); `.next/types` довелось
  почистити (`rm -rf .next`) — закешований тип посилався на видалений файл і валив
  `tsc --noEmit` помилкою про відсутній модуль. **Дрібне:** `Breadcrumbs.tsx` мав
  React `key={item.label}` — колізія при двох однакових лейблах у трейлі; ключ став
  `${i}-${item.label}`. `npx tsc --noEmit`, `npm test` (34/34), `npm run build` —
  чисті після обох фіксів. / Далі: Етап 4 — Dashboard. / Відкрито: немає нового,
  окрім раніше зафіксованих W7-vs-W1 і needAttention-вікна.
- `2026-09-03 21:15` — Перед UI: задокументовано дві розбіжності з попередньої сесії
  замість тихого виправлення — `data-model.md` §2.6 отримало примітку, що `bestWeek`
  повертає W1, не W7 (той самий принцип, що B8: обчислюється з реальних даних, а не
  підганяється); `DECISIONS.md` поруч з B5 отримало явку, що `needAttention` на
  дашборді свідомо НЕ скоуплений по 30-денному вікну (на відміну від таба `Alerts`),
  бо "потребує уваги" — стан, не запис за період; на поточному сіді збігається
  випадково, бо seed кладе алерти лише в останні 30 днів. Далі — Етап 3, UI-фундамент.
  `src/app/globals.css` переписано під Tailwind v4 `@theme` (токени `navy`/`blue`/
  `red`/`ink`/`muted`/`border`/`page`/`surface`/`sidebar`, `radius-card: 12px`),
  прибрано Geist-шрифти й дефолтний темний режим із шаблону create-next-app — макет
  однотемний, системний font stack. 7 атомів у `src/components/ui/`: `Card`,
  `StatusBadge` (мапить `getStatusLabel` з Етапу 2 на кольори з `.badge-*` класів
  мокапу — Draft/Completed сірі, New/On Stock зелені, In progress/In transit сині,
  Consolidated/Deconsolidated фіолетові, Alert червоний — звірено з мокапом рядок за
  рядком, включно з `#F3F4F6` DRAFT-бейджем і зеленим "● On Stock" з Order Detail,
  бо ці статуси не було в Dashboard-картках), `TypeBadge`, `KpiCard` (trend приймає
  вже готовий текст від виклику — атом не вгадує % проти raw count, це вирішує той,
  хто його рендерить), `DataTable` (generic, темний header + zebra-рядки), `EmptyState`,
  `Skeleton`. Попутно додав `getOrderTypeLabel` в `lib/status.ts` (був відсутній,
  TypeBadge інакше хардкодив би "Cross-Dock"/"Consolidation") і використав його ж у
  `/api/orders/export`, де точно такий самий `TYPE_LABELS`-словник вже дублювався —
  дедуп, не було в явному запиті, але прямий побічний ефект створення TypeBadge; тест
  на нову функцію додано в `status.test.ts`. Layout: `src/app/(cabinet)/layout.tsx`
  (sidebar + topbar), `_components/Sidebar.tsx`/`Topbar.tsx`/`Breadcrumbs.tsx` як
  route-local (Next.js `_folder`, не роутиться) — у мокапі сайдбар має рівно один
  живий пункт навігації ("Orders", Dashboard/List/Detail всі під ним, окремого
  "Dashboard" пункту нема), тому статична "активна" стилізація без `usePathname`.
  Топбар-пошук/дзвінок/баланс — `disabled`, `title="Out of scope"` (глобальний пошук
  по документах/інвойсах explicitly out of scope в DECISIONS.md C; білінг і
  нотифікації взагалі не в домені); баланс намалював без вигаданої суми (мокап сам
  маскує гроші як "$1" — рендерити навіть placeholder-число здалось порушенням
  правила "нічого не хардкодиться"). `userName`/`userInitials` у Topbar — пропси, не
  сесія (Auth out of scope, це не реальний залогінений юзер). Сторінка-пісочниця —
  `(cabinet)/sandbox/page.tsx`, явно позначена як тимчасова з фіксованими прикладами
  (не з БД). `npx tsc --noEmit`, `npm test` (34/34 — +1 тест на `getOrderTypeLabel`),
  `npx eslint src`, `npm run build` — усі чисті. Піднято dev-сервер, скриншотив
  headless Playwright (`npx playwright screenshot --wait-for-selector`, `chromium-cli`
  недоступний у цьому середовищі) — `/sandbox` порівняно з `docs/mockup.html`
  візуально: сайдбар/бейджі/KPI-бордери/таблиця збігаються за кольором і формою.
  По дорозі впіймав і виправив дрібний баг: коментар у `globals.css` містив `*/`
  усередині тексту й передчасно закривав CSS-коментар (білд проходив із warning, не
  падав) — переформулював коментар. / Далі: Етап 4 — Dashboard (`(cabinet)/page.tsx`,
  реальний виклик `getDashboardSummary()` напряму з Server Component — це також
  закриє пропущений Етап 1.5, вертикальний зріз ще жодного разу не пройдено). /
  Відкрито: W7-vs-W1 і needAttention-вікно тепер задокументовані, а не приховані,
  але сама поведінка не змінена — рішення, чи міняти seed, за користувачем; nav-badge
  "3" біля "Orders" з мокапу свідомо не реалізовано (немає визначеного джерела числа
  в жодному з doc-файлів — рендерити вигадане число суперечило б CLAUDE.md).
- `2026-09-03 15:47` — Прочитано CLAUDE.md, PROGRESS.md, docs/DECISIONS.md, суперечностей між ними не знайдено. Виконано Етап 0: Next.js 15.5.25 + TS + Tailwind + ESLint у `src/`, Prettier підключено до ESLint, Prisma 6.19.3 + @prisma/client 6.19.3 (запінено вручну — `@latest` тягнув Next 16 і Prisma 8-rc, обидва ламали контракт CLAUDE.md; рішення підтверджені користувачем), класичний `datasource { url directUrl }` без `prisma.config.ts`, `src/server/db/prisma.ts` singleton, `GET /api/health` реальний `SELECT 1`. `.env.local`/`.env.example` створено; користувач вставив реальні Supabase-креди — виправлено `DIRECT_URL` (був `db.<ref>.supabase.co:5432`, замінено на session pooler `aws-1-eu-west-1.pooler.supabase.com:5432`, бо прямий хост IPv6-only). Локально перевірено: `tsc --noEmit` чисто, `eslint` чисто, `next build` проходить, `/api/health` → 200 `{status:"ok",db:"up"}` проти реального Supabase. Git репозиторій ще не ініціалізовано (Етап -1 не виконувався за проханням користувача). Побічний інцидент: одного разу помилково вбито всі процеси `node.exe` в системі командою `taskkill /F /IM node.exe` замість точкового PID — користувач підтвердив, що це не зашкодило (N5Deal вже задеплоєний, локально не потрібен), надалі вбивати процеси лише за точним PID. / Далі: Етап 1 (schema.prisma + seed за `docs/data-model.md`). / Відкрито: немає.
- `2026-09-03 16:10` — `git init`, перший коміт, репозиторій створено й запушено на GitHub (`gh auth login` через користувача, потім `gh repo create --public --source=. --push`) → https://github.com/MolkaViacheslav/freitty-cabinet. Підключено до Vercel через веб-UI (користувач імпортував репо, свідомо пропустив пропоновану інтеграцію "Prisma Postgres" — вона підняла б окрему БД замість Supabase; додав `DATABASE_URL`/`DIRECT_URL` в Environment Variables). Локально прилінковано CLI (`vercel link --project freitty-cabinet`, команда `molka2`). Перший прод-деплой віддавав 302 на `vercel.com/sso-api` — команда мала увімкнений Vercel Authentication (Standard Protection); користувач вимкнув Require Log In у Settings → Deployment Protection. Після цього `/api/health` → 200 і локально, і на публічному проді. Прод-домен: https://freitty-cabinet.vercel.app. Етап 0 повністю закрито (включно з пунктом деплою, який лишався відкритим). / Далі: Етап 1 — `prisma/schema.prisma` за `docs/data-model.md` §1, `npx prisma migrate dev --name init`, `src/lib/week.ts`, `prisma/seed.ts` за специфікацією §2 з фіксованим seed і assertion-ами. / Відкрито: немає.
- `2026-09-03 18:55` — Ревʼю Етапу 2 (користувач, звірка рядок-за-рядком з
  api-contract.md/DECISIONS.md) виявило 9 пунктів, з них 4 позначені небезпечними;
  виправлено #1–#4 і #7–#9 (буквально те, що запросили), #5/#6/"Дрібне"/"Процес"
  залишені відкритими навмисно. Зміни:
  - **#1** — порожній query-параметр (`?hub=&search=`, скинутий фільтр в UI) більше
    не 400-ить. Новий `src/lib/query.ts::parseSearchParams` стрипає порожні рядки
    перед zod-валідацією; підключено у всіх 4 роутах замість
    `Object.fromEntries(searchParams)`. Тест `query.test.ts` (3 кейси, включно з тим,
    що по-справжньому невалідне значення все ще 400-ить).
  - **#2** — `insights.bestWeek` тепер завжди рахується з тижневих бакетів незалежно
    від `?granularity=month` (раніше віддавав `{key:"M7"}` при місячному режимі).
    `getDashboardSummary` рахує тижневі бакети завжди (потрібні для bestWeek) і
    перевикористовує їх як `activity.buckets`, коли `granularity=week`; окремий
    запит на місячні бакети йде лише при `granularity=month`. Перевірено вручну:
    `?granularity=month` → `bestWeek.key` лишається `"W1"`, `activity.buckets[0].key`
    = `"M1"`.
  - **#3** — `needAttention.value` міг розійтися із сумою `breakdown` (дедуплікований
    OR-count проти двох незалежних count). Переписано на один `groupBy(['hasAlert',
    'awaitingClientAction'])` з тим самим пріоритетом, що й B1 (alert переважає
    awaiting) — тепер сума `breakdown` дорівнює `value` за побудовою, а не випадково.
    Перевірено вручну: `value:3` = `2+1`.
  - **#4** — `representativeAlert?.alertMessage` тепер перевіряється на falsy перед
    інтерполяцією в `detail`, щоб не віддати `"null · FR001674"`, якщо колись
    трапиться алерт-ордер без `alertMessage`.
  - **#7** — `startOfIsoWeek` в `week.ts` став `export`; дубль `startOfIsoWeekUtc` в
    `filters.ts` видалено, `period=this-week` тепер використовує ту саму функцію,
    що й тижневі бакети графіка — розсинхрон по понеділках більше неможливий.
  - **#8** — `round2` експортовано з `format.ts`, локальна копія в
    `dashboard.service.ts` видалена.
  - **#9** — `getWeekBucket` (був мертвим кодом) тепер реально використовується в
    `getWeeklyBuckets` для зіставлення рядків raw-SQL з бакетами замість Map по
    `getTime()`; додано `week.test.ts` (5 тестів: власний тиждень = W10, межа
    неділя 23:59:59.999/понеділок 00:00, `null` по обидва боки 10-тижневого вікна,
    збіг з `getWeekBucketRange` на обох краях кожного бакета).
  - Бонус із того самого підходу: інлайн-згортку лічильників табів в
    `orders.service.ts` винесено в чисту `foldTabCounters` (`lib/filters.ts`),
    покрито 3 тестами.
  Усього тестів стало **33/33** (було 22). `npx tsc --noEmit`, `npm test`,
  `npm run build` — усі чисті. Вручну передивився #1/#2/#3 на dev-сервері (curl,
  наведено вище) — усі підтверджені.
  **Свідомо НЕ чіпав у цьому проході** (не було в запиті користувача): #5
  (`needAttention` без 30-денного вікна, на відміну від таба `alerts`) — розбіжність
  реальна, але зараз збігається випадково (усі алерти в seed свіжі), як B7; #6
  (`hub` матчиться по `name`, контракт каже "slug" — працює для `markham`/`toronto`,
  зламається на двослівному хабі); "Дрібне" (мовчазний `catch {}` без логування,
  CSV-колонка Status губить pipeline-статус при алерті, `search` не екранує
  `%`/`_` як LIKE-вайлдкарди, `/api/orders/export` без ліміту рядків); "Процес"
  (Етап 1.5 пропущено — жодна сторінка ще не викликала сервіс напряму, ризик
  спливе на Етапі 4 великим клубком замість однієї картки). Ці пункти лишаються
  відкритими для наступної сесії або окремого запиту.
- `2026-09-03 18:30` — Етап 2 повністю закрито. `src/lib/filters.ts` (`buildOrdersWhere`,
  таб-пріоритет Draft→Alert→тип з B1, AND-комбінація з B2, `drafts` ігнорує `status`, `period`
  через власні `startOfUtcDay`/`startOfIsoWeekUtc` — не чіпав приватну `startOfIsoWeek` з
  `week.ts`, бо вона не експортована). `src/lib/status.ts` (`getStatusLabel` з `hasAlert`
  третім параметром — алерт-оверрайд буквально всередині функції, як просив користувач;
  `getStatusFlow`, `getOperationTypeLabel`, `getUnitLabel`). `src/lib/format.ts`
  (`formatQuantityLabel`, `computeLineTotal`/`computeSuppliesSubtotal`, `computeTrendPercent`,
  `formatMoney`, `formatDate`). `src/server/dto/orders.dto.ts` (zod-схеми `ordersQuerySchema`/
  `ordersExportQuerySchema`/`dashboardQuerySchema`, Prisma `include`-константи, мапери
  `mapOrderListItem`/`mapOrderDetail`). `src/server/services/orders.service.ts`
  (`getOrders` — `Promise.all([findMany, count, groupBy])`, лічильники табів одним `groupBy`
  по `[status, hasAlert, type]` без урахування поточного табу, тільки hub/period/search;
  `getOrderByNumber`; `getAllOrdersForExport` для CSV). `src/server/services/dashboard.service.ts`
  (KPI + тижнева/місячна агрегація). `src/server/http/api-error.ts` — маленький спільний
  хелпер для `{ error: { code, message } }`, не було в явному списку файлів завдання, але
  без нього довелось би дублювати формат помилки в 4 роутах. 4 route handlers усі з
  `force-dynamic`. Встановлено `vitest@3.2.7` (у проєкті його не було) + `vitest.config.ts`
  з alias `@/* → src/*`; `npm test` script доданий. 22 юніт-тести, усі зелені.
  `npx tsc --noEmit`, `npm test`, `npm run build` — усі чисті з першого разу.
  Вручну перевірено на dev-сервері: `/api/orders`, `/api/orders/FR001383` (detail),
  `/api/orders/FR999999` (404), `/api/orders?tab=bogus` (400 VALIDATION_ERROR),
  `/api/orders/export` (CSV з правильними заголовками) — усе відповідає контракту,
  suppliesSubtotal для FR001383 = 73.20 співпав з §2.7 точно.
  **Перед тим як вбудовувати raw SQL в сервіс, за проханням користувача показав сирий
  результат** `date_trunc('week', "closedAt" AT TIME ZONE 'UTC')` (тимчасовий скрипт,
  видалений після перевірки) і звірив межі бакетів з `getWeekBucketRange` з `week.ts` —
  збіглись день-в-день (W1=2026-06-29 … W10=2026-08-31), тобто `AT TIME ZONE 'UTC'` у
  запиті — правильний захист від таймзони сесії Postgres.
  **Рішення, прийняті самостійно там, де контракт не покривав деталь (кажу одразу, як
  просив користувач, а не мовчки підганяв):**
  1. `subOrders` в `items[]`/detail — повертаю **весь** масив сабордерів (не 1, як у
     прикладі api-contract.md) — приклад в контракті так само обрізає `items` до одного
     елемента, це документаційне скорочення, а не поведінка API.
  2. `statusFlow` — у схемі немає таблиці історії статусів, тільки поточний `status`.
     Приклад у контракті (`["DRAFT","READY","IN_PROGRESS","CLOSED"]`) явно пропускає
     `CONSOLIDATED`/`IN_TRANSIT`/`DECONSOLIDATED` для закритого ордера — реалізував як
     "CLOSED завжди йде одразу за IN_PROGRESS", а для проміжних статусів — повний
     ланцюжок пайплайну до поточного статусу. Це відтворює приклад контракту буквально,
     але це похідна евристика, не збережений факт.
  3. `needAttention.breakdown[0].detail` — коли алерт-ордерів декілька, беру
     представника як **найсвіжіший за `scheduledAt`** — з поточними даними це завжди
     дає точний приклад з контракту (`"photo missing · FR001674"`), перевірено вручну.
  4. Лічильники (`counters`) рахуються тільки з hub+period+search — буквально як написано
     в api-contract.md ("з урахуванням hub, period, search, без tab"); `status`-фільтр
     туди свідомо не додавав, бо контракт explicitly не згадує його в цьому реченні.
  5. "Van · 53ft" (FR001383, §2.7) — **не** додав у `warehouseNote` програмно в DTO-мапері
     (це означало б хардкодити текст по конкретному номеру ордера в загальному мапері);
     переніс на Етап 6 (UI), як дозволяв другий варіант в інструкції користувача.
  **⚠️ Розбіжність, яку треба показати одразу, а не тихо підправляти:** `bestWeek` з
  `/api/dashboard/summary` зараз повертає **W1** (spend $11 287.14, 15 completed), а не
  **W7**, хоча `data-model.md §2.6` і, ймовірно, `docs/presentation.md` розраховують на
  "Best week: W7". Причина — seed-логіка (`MIN_W7_MEMBERS = 5`, `preview-weekly-agg`)
  гарантує лише, що ≥5 закритих ордерів у W7 отримають суми з верхньої третини
  діапазону, але **не контролює кількість ордерів по тижнях** — W1 випадково зібрав
  15 закритих ордерів (з пулу Group B, 31-70 днів тому) з звичайними сумами, і сумарно
  переважив 5 "розкручених" ордерів W7. Це не баг Етапу 2 — сервіс і SQL рахують
  правильно, дані з бази саме такі. Дозволу власника продовжувати не питав; сесія
  фокусувалась на Етапі 2, тому не чіпав seed. Треба вирішити на наступній сесії: або
  посилити seed (зафіксувати кількість ордерів у кожному тижневому бакеті, не тільки
  суму), або оновити `docs/presentation.md`/`data-model.md`, прийнявши W1 як реальний
  "best week". / Далі: Етап 3 — UI-фундамент (layout, токени, атоми) за `docs/mockup.html`.
  Перед тим варто закрити питання вище про W7 vs W1. / Відкрито: W7-vs-W1 (вище);
  granularity=month реалізовано аналогічно (`date_trunc('month', ...)`, бакети `M1..M10`),
  але без raw-preview і без юніт-тестів — не було в явному фокусі цієї сесії, при потребі
  звірити окремо.
- `2026-09-03 17:40` — Етап 1 повністю закрито, прод НЕ чіпали (`vercel --prod` жодного разу). `prisma/schema.prisma` перенесено з `data-model.md` §1 буквально (жодне поле не додано/прибрано, тільки коментарі перекладено англійською). `npx prisma migrate dev --name init` спершу впала (`DIRECT_URL` не знайдено) — виявилось, що Prisma CLI автоматично підвантажує лише `.env`, а не `.env.local` (на відміну від Next.js); створено `.env` з тими самими двома рядками підключення, він теж покритий `.gitignore` (`.env*`). Після фіксу міграція пройшла без зависань (симптом неправильного pooler-хоста з CLAUDE.md не спрацював) — усі 6 таблиць і 5 enum-ів підтверджено прямим SQL-запитом до `information_schema`/`pg_enum`. Встановлено `tsx` (у проєкті не було ні `tsx`, ні `ts-node` для запуску `prisma/seed.ts`) і додано `"prisma": {"seed": "tsx prisma/seed.ts"}` в `package.json`. Створено `src/lib/week.ts` (`getWeekBucket`/`getWeekBucketRange`, ISO-тиждень з понеділка, W10 = поточний). Перед кодом узгодили з користувачем розкладку 7 активних ордерів: 4 іменовані з макета (FR001674, FR001676, FR001681, FR001383) + 1 згенерований alert (Cross-Dock, IN_PROGRESS) = 5 зафіксовано, ще 2 — зі згенерованого пулу з 19 non-alert (15 CD + 4 CO), тобто там 2 активні / 17 CLOSED, а не порівну. `prisma/seed.ts` написано з детермінованим mulberry32 (seed=20260403); усі 10 assertion-ів із §2.5 зелені з першого прогону, повторний прогін дав ідентичні лічильники (перевірено двічі). Важливий нюанс, який довелось виправити ще на етапі написання: лічильники табів (`cross-dock`/`consolidation`/`alerts`/`drafts`) рахуються **тільки в межах 30-денного вікна** (Group A), інакше 45 старих CLOSED-ордерів з Group B роздували Cross-Dock/Consolidation далеко за 18/6 — виправлено додаванням `scheduledAt >= cutoff30` у відповідні запити ще до першого запуску. `npm run build` і `npx tsc --noEmit` чисті. / Далі: Етап 1.5 — вертикальний зріз (`getActiveOrdersCount()` → `/api/dashboard/summary` → Server Component → одна `OrderCard`). / Відкрито: у §2.7 для `FR001383` є фраза `trailer "Van · 53ft"` окремо від явно заданого `trailerNumber: "TRL-8830"` — у схемі немає поля під тип трейлера (тільки `trailerNumber`), тому "Van · 53ft" нікуди не збережено (свідомо не вигадував нове поле і не переплутав з `trailerNumber`). Якщо це потрібно для Order Detail (Етап 6) — треба або додати `trailerType String?` в схему (нова міграція), або підтвердити, що це decorative-деталь з макета, яку можна опустити.
