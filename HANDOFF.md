# Challenger Industries — Invoice App Handoff

## Project Overview
A full-featured invoice management app for a small business. No authentication — single-user, localStorage-backed via Zustand persist stores.

## Tech Stack
- **Framework**: Next.js 16.2.0 (App Router, Turbopack)
- **Styling**: Tailwind CSS v4 (`@theme inline`, `@import "tailwindcss"`)
- **Components**: shadcn/ui (latest — uses `@base-ui/react`, NOT Radix)
- **State**: Zustand with `persist` middleware (localStorage)
- **Fonts**: Geist Sans + Geist Mono via `next/font`
- **Dark mode**: Enabled by default (`dark` class on `<html>`)

## Architecture

### Stores (all in `src/lib/store/`)
| Store | Key | Purpose |
|-------|-----|---------|
| `settings-store.ts` | `challenger-settings` | Business profile, invoice prefix, next number, registration numbers |
| `client-store.ts` | `challenger-clients` | Client CRUD with nanoid IDs |
| `invoice-store.ts` | `challenger-invoices` | Invoice CRUD, auto-numbering, totals recalculation |
| `payment-store.ts` | `challenger-payments` | Payment recording, auto-updates invoice balanceDue |

### Key Design Decisions
- **Money in cents** — all monetary values stored as integers to avoid floating-point issues. `dollarsToCents()` / `centsToDollars()` for conversion.
- **Invoice numbers** — auto-generated: `{prefix}-{year}-{0001}`. Sequence consumed from settings store.
- **Registration numbers** — dynamic array of `{ id, label, value }` on BusinessProfile. Supports FDA, GST, FSSAI, CIN, MSME, IEC, etc.
- **Hydration guard** — `useHydrated()` hook in `src/lib/use-hydrated.ts` prevents SSR/client mismatch. Every page using Zustand stores must call this and show a loading state until hydrated. Without this, React silently drops all event handlers.

### File Structure
```
src/
├── app/
│   ├── layout.tsx          # Root layout: Geist fonts, Sidebar, TooltipProvider, Toaster
│   ├── page.tsx            # Redirects to /dashboard
│   ├── dashboard/page.tsx  # 4 stat cards, recent invoices, quick summary
│   ├── invoices/
│   │   ├── page.tsx        # List with status filter tabs, dropdown actions
│   │   ├── new/page.tsx    # Invoice builder: client select, line items, live totals
│   │   └── [id]/
│   │       ├── page.tsx    # Polished invoice detail with gradient bar, reg numbers banner
│   │       └── edit/page.tsx
│   ├── clients/
│   │   ├── page.tsx        # Client list with total billed
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx    # Client detail with invoice history
│   │       └── edit/page.tsx
│   ├── settings/page.tsx   # Business profile, registration numbers, data export/import
│   ├── recurring/page.tsx  # Placeholder (Coming Soon)
│   └── reports/page.tsx    # Placeholder (Coming Soon)
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx     # Desktop sidebar + mobile Sheet drawer
│   │   └── page-header.tsx # Reusable header with title, description, action slot
│   └── ui/                 # shadcn/ui components (base-ui backed)
└── lib/
    ├── types.ts            # All type definitions (Invoice, Client, LineItem, etc.)
    ├── format.ts           # Currency, date, invoice number, totals calculation
    ├── use-hydrated.ts     # Client-mount guard for Zustand persist stores
    ├── utils.ts            # cn() utility
    └── store/              # Zustand stores (see table above)
```

## Gotchas / Things to Know

### base-ui (NOT Radix)
- Latest shadcn/ui uses `@base-ui/react` instead of Radix
- **No `asChild` prop** — use `render` prop or `buttonVariants()` for Link-as-Button
- `SheetTrigger` / `DropdownMenuTrigger` render children directly (no wrapper element)
- To compose triggers with custom elements, use `render={<Component />}` prop
- Select `onValueChange` passes `string | null`, not `string`

### Hydration
- Every page that reads Zustand stores MUST use `useHydrated()` guard
- Place all `useState`/`useEffect` hooks BEFORE the hydration guard (React hooks rules)
- The guard returns a "Loading…" placeholder until client mount

### Tailwind v4
- Uses `@theme inline` block in `globals.css` for CSS variables
- Geist fonts referenced by literal name (`"Geist"`, `"Geist Mono"`) in theme — NOT `var(--font-*)` (causes circular reference)
- Font CSS variables applied on `<html>` element, not `<body>`

## Completed (Phase 1-2)
- [x] Zustand stores with localStorage persistence
- [x] Full client CRUD
- [x] Full invoice CRUD with auto-numbering and totals
- [x] Payment store linked to invoices
- [x] Dashboard with stat cards, recent invoices, overdue alerts
- [x] Polished dark-mode UI throughout
- [x] Registration numbers (FDA, GST, FSSAI, etc.) on settings and invoice detail
- [x] Settings page with data export/import
- [x] Hydration fix for all pages
- [x] Sidebar with desktop + mobile responsive layout

## Remaining Work

### Phase 3 — PDF & Payments
- [ ] PDF generation with `@react-pdf/renderer` (invoice download/print)
- [ ] Payment recording dialog on invoice detail page
- [ ] Email invoice (generate mailto link or integrate Resend)

### Phase 4 — Recurring & Charts
- [ ] Recurring invoice templates (create, schedule, auto-generate)
- [ ] Dashboard charts with `recharts` (revenue over time, status breakdown)

### Phase 5 — Reports & Polish
- [ ] Revenue report (filterable by date range)
- [ ] Aging report (overdue analysis)
- [ ] Tax report (tax collected summary)
- [ ] Client revenue report
- [ ] Dark mode toggle (currently always dark)
- [ ] Responsive polish pass
- [ ] Empty/loading/error states audit

## Running the App
```bash
cd C:\Users\maxra\Documents\Code\challenger-industries
npm run dev        # http://localhost:3000
npm run build      # Production build (verified clean)
```

## Git History
```
7417976 fix: resolve hydration mismatch and nested button issues
8d5a5d8 feat: full invoice app with polished UI and registration numbers
68eb31b feat: initial commit
77af2a2 Initial commit from Create Next App
```
