# PROGRESS — Freitty Client Cabinet

**Поточний етап: 0 (завершено, локально)** ← оновлювати в кінці кожної сесії

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
- [ ] Деплой на Vercel — **не зроблено, чекає на дію користувача** (див. інструкції нижче)

**DoD:** `/api/health` → 200 локально (перевірено, `db:"up"`, реальний timestamp). На проді — після деплою.

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

## Етап 1. Схема + seed — 2.5 год

Джерело правди: **`docs/data-model.md`**. Не імпровізувати.

- [ ] `prisma/schema.prisma` — скопіювати з `data-model.md` §1
- [ ] `npx prisma migrate dev --name init`
- [ ] `src/lib/week.ts` — `getWeekBucket` (ISO-тиждень, 10 бакетів від сьогодні назад)
- [ ] `prisma/seed.ts` за специфікацією §2: 72 ордери (27 recent + 45 older),
      6 users, 2 hubs, sub-orders, operations, supplies
- [ ] Фіксований seed рандомайзера
- [ ] Дати з макета — як відносні зсуви від `T`, не абсолютні
- [ ] **Assertion-и в кінці seed** (§2.5) — 10 контрольних чисел

**DoD:** `npm run seed` проходить із зеленими assertion-ами; повторний запуск дає
ті самі дані; Supabase Table Editor показує наповнені таблиці.

> Найважливіший етап. Якщо цифри не зійдуться — усі три екрани на демо виглядатимуть
> порожньо або суперечливо, і це помітять.

---

## Етап 1.5. Вертикальний зріз — 40 хв

Мета: один раз пройти шлях `Postgres → Prisma → service → route → Server Component`,
поки не написано багато коду. Красу не робимо взагалі.

- [ ] `orders.service.ts` — одна функція `getActiveOrdersCount()`
- [ ] `GET /api/dashboard/summary` — повертає тільки це число
- [ ] `app/(cabinet)/page.tsx` — Server Component, викликає сервіс напряму
- [ ] Одна `OrderCard` без стилів із реальними даними
- [ ] Задеплоїти, перевірити на проді

**DoD:** на проді видно живе число з бази і одну картку.

> Тут вилазять усі архітектурні косяки одразу: серіалізація `Decimal`, випадковий
> імпорт `src/server/**` у клієнтський компонент, формат дат, `force-dynamic`.
> Полагодити на одній картці — 10 хвилин. На тридцяти — вечір.

---

## Етап 2. Сервіси + API + юніт-тести — 3 год

Джерело правди: **`docs/api-contract.md`**.

- [ ] `getOrders(filters)` — `Promise.all([findMany, count, groupBy])`
- [ ] `getOrderByNumber(number)` — з include sub-orders / operations / supplies
- [ ] `getDashboardSummary(granularity)` — KPI + `$queryRaw` з `date_trunc('week')`
- [ ] Заповнення порожніх тижнів нулями на бекенді
- [ ] Route handlers: `/api/orders`, `/api/orders/[number]`, `/api/dashboard/summary`,
      `/api/orders/export`
- [ ] `dynamic = 'force-dynamic'` скрізь
- [ ] zod-схеми query, формат помилок `{ error: { code, message } }`
- [ ] DTO-мапери: `Decimal → number`, `Date → ISO`
- [ ] `src/lib/`: `filters.ts`, `status.ts`, `format.ts`
- [ ] Юніт-тести (vitest, без БД): `buildOrdersWhere`, `getWeekBucket`,
      `getStatusLabel` (включно з alert-override), тренди, `lineTotal`

**DoD:** усі ендпоінти віддають JSON за контрактом; `npm test` зелений.

---

## Етап 3. UI-фундамент — 2 год

Джерело правди для стилів: **`docs/mockup.html`** (відкрити, там CSS із точними
відступами й кольорами).

- [ ] Layout: sidebar (Orders / Settings), topbar (search, balance, bell, avatar), breadcrumbs
- [ ] Токени в `globals.css`: `#1F4E79`, `#2E75B6`, фон `#F0F2F5`, радіус 12px
- [ ] Атоми: `StatusBadge` (мапінг із `DECISIONS.md` B4), `TypeBadge`, `KpiCard`,
      `Card`, `DataTable`, `EmptyState`, `Skeleton`

**DoD:** сторінка-пісочниця з усіма атомами схожа на макет.

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
- `2026-09-03 15:47` — Прочитано CLAUDE.md, PROGRESS.md, docs/DECISIONS.md, суперечностей між ними не знайдено. Виконано Етап 0: Next.js 15.5.25 + TS + Tailwind + ESLint у `src/`, Prettier підключено до ESLint, Prisma 6.19.3 + @prisma/client 6.19.3 (запінено вручну — `@latest` тягнув Next 16 і Prisma 8-rc, обидва ламали контракт CLAUDE.md; рішення підтверджені користувачем), класичний `datasource { url directUrl }` без `prisma.config.ts`, `src/server/db/prisma.ts` singleton, `GET /api/health` реальний `SELECT 1`. `.env.local`/`.env.example` створено; користувач вставив реальні Supabase-креди — виправлено `DIRECT_URL` (був `db.<ref>.supabase.co:5432`, замінено на session pooler `aws-1-eu-west-1.pooler.supabase.com:5432`, бо прямий хост IPv6-only). Локально перевірено: `tsc --noEmit` чисто, `eslint` чисто, `next build` проходить, `/api/health` → 200 `{status:"ok",db:"up"}` проти реального Supabase. Git репозиторій ще не ініціалізовано (Етап -1 не виконувався за проханням користувача). Побічний інцидент: одного разу помилково вбито всі процеси `node.exe` в системі командою `taskkill /F /IM node.exe` замість точкового PID — користувач підтвердив, що це не зашкодило (N5Deal вже задеплоєний, локально не потрібен), надалі вбивати процеси лише за точним PID. / Далі: Деплой скелета на Vercel (додати ENV vars там же — DATABASE_URL/DIRECT_URL), перевірити `/api/health` на проді, потім Етап 1 (schema.prisma + seed за `docs/data-model.md`). / Відкрито: git init ще не робився — вирішити, чи ініціалізувати репозиторій зараз чи перед Vercel-деплоєм.
