# PROGRESS — Freitty Client Cabinet

**Поточний етап: 7 (Поліш закрито й задеплоєно — усі заплановані етапи виконано)**

Оцінка: **~19–20 год** чистої роботи (2.5–3 дні).

**Карта документів:** `CLAUDE.md` (правила) · `docs/DECISIONS.md` (чому саме так) ·
`docs/data-model.md` (схема + seed) · `docs/api-contract.md` (контракт API) ·
`docs/mockup.html` (як має виглядати) · `docs/task.md` (умова).

---

## ✅ Фінальний прогін перед здачею — 04.09.2026

Усе перевірено на **проді** (https://freitty-cabinet.vercel.app), не тільки локально.

| Що | Результат |
|---|---|
| `npx tsc --noEmit` | 0 помилок |
| `npm test` | 81/81 зелені (6 файлів: `week`, `csv`, `status`, `filters`, `format`, `query`) |
| `npm run build` | ✅ 9 маршрутів, усі динамічні крім `/_not-found`; `/sandbox` у білді немає |
| `npx eslint .` | 0 попереджень |
| Прод `/api/health` | `{"status":"ok","db":"up"}` — Supabase **не на паузі** |
| Три екрани на проді | `/`, `/orders`, `/orders/FR001383`, `/orders/DRAFT-003` → 200 |
| Шеряний URL | `/orders?tab=alerts&hub=markham` → 200, фільтри застосовані |
| 404 / 400 | `/orders/NOPE999` → 404, `/api/orders/NOPE999` → 404, `/api/orders?page=0` → 400 |
| Export CSV | 200, `text/csv; charset=utf-8`, `attachment; filename="orders-2026-09-04.csv"`; `?tab=alerts` → рівно 2 рядки |
| Контрольні числа на проді | `all 27 · cross-dock 18 · consolidation 6 · alerts 2 · drafts 1`, `active 7`, `completed30d 24`, `prev30d 20 (+20%)`, `needAttention 3` — збігається з `data-model.md` §2.5 один в один |
| Кодування | `·` у відповіді API приходить як `C2 B7` (коректний UTF-8) |
| Скріншоти 1440×900 і 375×812 | три екрани — 0 помилок консолі, 0 відповідей ≥400, 0 горизонтального переповнення сторінки |
| Мобільні скрол-контейнери | жоден блок із `scrollWidth > clientWidth` не має `overflow: hidden` — стрічка табів і таблиця Operations реально скролються; таб `Drafts` на 375px клікається і дає `?tab=drafts` з `DRAFT-003` |

Відхилення від макета, зафіксовані в документах: `Best week: W1` замість `W7`
(`data-model.md` §2.6 — `bestWeek` рахується з даних, не хардкодиться).

---

## ⚠️ Ризик №1: пауза проєкту Supabase

Free tier ставить проєкт на паузу після ~тижня неактивності і **не піднімає його
сам** — треба зайти в дашборд і натиснути restore.

Сценарій, якого уникаємо: здав → нікому не показуєш тиждень-два → відкриваєш
посилання, коли воно комусь знадобилось → 500.

- [x] Мітигація A (обов'язково): **перед тим, як комусь показувати прод, відкрити його заздалегідь**
      — зроблено 04.09.2026 під час фінального прогону: проєкт не на паузі, `db:"up"`, усі три
      екрани віддали живі дані. Перед самим показом повторити ще раз.
- [x] Мітигація B: `.github/workflows/keepalive.yml` — cron раз на 2 дні смикає `/api/health`
      (з ретраями; URL перевизначається змінною репо `HEALTH_URL`). Мітигацію A це **не**
      замінює: cron доводить, що БД відповідає, а не що три екрани виглядають правильно.

---

## Етап -1. Файли контексту — 15 хв

- [x] Скопіювати весь комплект документів у корінь репо (структура — в кінці файлу)
- [x] `git init`, коміт `docs: project context`
- [x] Перевірити, що Claude Code бачить `CLAUDE.md` (`/context`)

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
- [x] Задеплоїти, перевірити на проді — закрито на фінальному прогоні: прод віддає
      `Active Orders: 7` і ті самі картки, що й локально

**DoD:** ✅ живе число з бази і одна картка підтверджено локально (`npm run dev`, curl
`/` → `200`, у HTML реальні `FR002009` і `Active Orders: 7` з Postgres, збігається з
прикладом `api-contract.md`) **і на проді** (див. «Фінальний прогін»).

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

## Етап 4. Dashboard — 2.5 год ✅

- [x] 3 KPI-картки з трендами (розкладка `Need Attention` — за `DECISIONS.md` B5)
- [x] `OrderCard` доведена до вигляду макета
- [x] Секція `Active Orders` (4 картки) + `View all →`
- [x] Два графіки Recharts по тижнях + рядок інсайтів
- [x] Перемикач `Day/CW/Month/Quarter` — `CW` і `Month` робочі, решта `disabled`

**DoD:** ✅ `/` повністю з БД, жодного мок-масиву. Перевірено в headless-браузері:
при завантаженні `/` — **нуль запитів до `/api/*`** (сторінка кличе сервіс напряму,
`DECISIONS.md` A2), CW → Month реально міняє графік (`W1..W10` → `M1..M10`).

---

## Етап 5. Order List — 3 год ✅

- [x] Таби з лічильниками (взаємовиключні, `DECISIONS.md` B1)
- [x] Фільтри Hub / Date / Status через URL searchParams (взаємодія — B2). Значення фільтра
      Hub — це `Hub.slug` (`?hub=markham`); список опцій тягнеться з БД (`hubs.service.ts`)
- [x] Пагінація `Showing 6 of 27` + Prev/Next
- [x] Перемикач Cards / Table, `Pipeline` — `disabled`
- [x] Draft-картка окремим виглядом (`Continue editing →`, задизейблене — мутації поза скоупом)
- [x] Export CSV — через той самий `getOrders`

**DoD:** ✅ фільтри переживають F5 і шеряться посиланням — перевірено в headless-браузері:
URL `?tab=alerts&hub=markham` відкритий у **новій вкладці** дає ті самі рядки, активний таб
і вибраний Hub. Плюс: нуль запитів до `/api/*` при завантаженні.

---

## Етап 6. Order Detail — 4 год ✅

Найщільніший екран: header із 6 контролами, банер, сітка на 12 полів, панель доку,
дві таблиці.

- [x] Header: номер, тип, статус, alert `Actual ≠ Expected`, лічильники, кнопки (disabled)
- [x] Read-only info-банер
- [x] Info-сітка (12 полів, перелік у `data-model.md` §2.7)
- [x] Панель Dock + BOL vs Actual delta + warehouse note + плейсхолдери фото
- [x] Таблиця `Operations`
- [x] Таблиця `Supplies` + subtotal (обчислюється)
- [x] `notFound()` для неіснуючого номера — **із реальним HTTP 404** (див. ревʼю нижче)
- [x] Таблиця `Sub-orders` (додано на ревʼю — без неї Consolidation на деталі був порожній)
- [x] Банер причини алерта (`alertMessage` ордера + сабордерів)

**DoD:** ✅ будь-який ордер із seed відкривається за прямим посиланням — перевірено на
FR001383 (повний happy path), FR001676 (`actualQty: null`), FR001674 (`hasAlert` +
делта одночасно, від'ємний diff), DRAFT-003 (нульова qty, усі транспортні поля null) —
жодних крашів.

---

## Етап 7. Поліш — 1.5 год ✅

- [x] `loading.tsx` + `error.tsx` + `not-found.tsx` (+ `global-error.tsx` — помилка в layout
      обходить `error.tsx` свого сегмента; зроблено достроково під час ревʼю Етапів 0–3)
- [x] Адаптив (sidebar → бургер, сітки в одну колонку)
- [x] `README.md`: стек, як підняти, схема, посилання на прод і на `DECISIONS.md`
- [x] Прогнати seed на проді — 16/16 assertion-ів зелені
- [x] Пройтись по трьох екранах на проді в мобільному viewport (375×812, еквівалент DevTools
      responsive mode — Playwright, а не фізичний телефон)

**DoD:** посилання працює в інкогніто. ✅

---

## ✂️ Лінія відсічення

Якщо на 15-й годині зроблено ~70% — ріжемо **строго в цьому порядку**:

1. Export CSV
2. Table view (лишається тільки Cards)
3. Перемикач granularity (лишається фіксований тижневий вигляд)
4. Адаптив під мобільний
5. Юніт-тести

**Недоторканні:** три екрани з реальними даними, деплой, seed із правильними
цифрами.

**Підсумок: не порізано нічого** — усі п'ять пунктів списку увійшли в реліз.

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
