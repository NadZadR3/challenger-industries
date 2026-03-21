# Challenger Industries — Invoice App Handoff

## Project Overview
A full-featured GST-compliant invoice management app for Challenger Industries, an Indian business. No authentication — single-user, localStorage-backed via Zustand persist stores.

## Tech Stack
- **Framework**: Next.js 16.2.0 (App Router, Turbopack)
- **Styling**: Tailwind CSS v4 (`@theme inline`, `@import "tailwindcss"`)
- **Components**: shadcn/ui (latest — uses `@base-ui/react`, NOT Radix)
- **State**: Zustand with `persist` middleware (localStorage)
- **Fonts**: Geist Sans + Geist Mono via `next/font`
- **Dark mode**: Enabled by default (`dark` class on `<html>`)

## Company Data (Pre-filled in defaults)
- **Name**: Challenger Industries
- **GSTN**: 07AXDPS2025H1ZM
- **IEC**: 0509060251
- **FSSAI**: 13326998000015
- **FDA**: 17546996940
- **Address 1**: 2988, Shah Ganj, Ajmeri Gate, Delhi - 110006
- **Address 2**: C-6/1, Street No. 9, Wazirabad Village, Delhi - 110084
- **Logo**: Raptor (uploaded via Settings → Company Logo)
- **Currency**: INR, Default GST: 18%, Supplier State: Delhi (07)

## Architecture

### Stores (all in `src/lib/store/`)
| Store | Key | Purpose |
|-------|-----|---------|
| `settings-store.ts` | `challenger-settings` | Business profile, bank details, stamp/signature, invoice prefix, next number, registration numbers |
| `client-store.ts` | `challenger-clients` | Client CRUD with nanoid IDs |
| `invoice-store.ts` | `challenger-invoices` | Invoice CRUD, FY-based numbering (2025-26/001), totals recalculation, GST split |
| `payment-store.ts` | `challenger-payments` | Payment recording, auto-updates invoice balanceDue |

### Indian GST Module (`src/lib/gst.ts`)
- **INDIAN_STATES**: all 37 state/UT codes
- **GST_RATES**: 0%, 5%, 12%, 18%, 28%
- **resolveGSTType()**: compares supplier vs recipient state → `intrastate` (CGST+SGST) or `interstate` (IGST)
- **groupLineItemsByGSTRate()**: groups line items by rate, splits CGST/SGST/IGST amounts
- **amountInWords()**: Indian numbering system (lakhs, crores) → "Rupees Thirty One Thousand Two Hundred Twelve Only"
- **stateCodeFromGSTIN()**: extracts 2-digit state code from 15-digit GSTIN

### Invoice Number Format
- **Financial year based**: `2025-26/001`, `2026-27/001`
- FY runs April 1 to March 31
- Sequential counter resets at each new financial year
- Generated in `src/lib/format.ts` → `generateInvoiceNumber()`

### Key Design Decisions
- **Money in cents** — all monetary values stored as integers. `dollarsToCents()` / `centsToDollars()` for conversion.
- **GST calculation** — per line item: taxRate is total rate (e.g. 18%). For intrastate, split 50/50 → CGST 9% + SGST 9%. For interstate, full IGST 18%.
- **Registration numbers** — dynamic array of `{ id, label, value }` on BusinessProfile. GSTN shown prominently at top of invoice; IEC shown just below GSTN; FSSAI, FDA in the registration banner.
- **Ship To** — defaults to same as Bill To. Toggle to add a different shipping address.
- **Transporter & E-Way Bill** — collapsible section on invoice form. Required for inter-state goods > ₹50,000.
- **Bank Details** — shown on invoice left side, beside the totals box.
- **Stamp & Signature** — uploaded as base64 in settings, displayed in Authorized Signatory section.
- **Print layout** — 2-page A4: "Original Copy for Buyer" + "Duplicate Copy for Transporter". Monochrome-safe.
- **Hydration guard** — `useHydrated()` hook prevents SSR/client mismatch. Every page using Zustand stores must call this.

### File Structure
```
src/
├── app/
│   ├── layout.tsx          # Root layout: Geist fonts, Sidebar, TooltipProvider, Toaster
│   ├── page.tsx            # Redirects to /dashboard
│   ├── globals.css         # Tailwind v4 theme + @media print styles (2-page A4)
│   ├── dashboard/page.tsx  # 4 stat cards, recent invoices, quick summary
│   ├── invoices/
│   │   ├── page.tsx        # List with status filter tabs, dropdown actions
│   │   ├── new/page.tsx    # Invoice builder: client, GST, transport, e-way bill, line items
│   │   └── [id]/
│   │       ├── page.tsx    # Invoice detail: print-ready, 2-page copies, bank details, signatory
│   │       └── edit/page.tsx
│   ├── clients/
│   │   ├── page.tsx        # Client list with total billed
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx    # Client detail with invoice history
│   │       └── edit/page.tsx
│   ├── settings/page.tsx   # Business profile, addresses, logo, bank, registrations, stamp/signature
│   ├── recurring/page.tsx  # Placeholder (Coming Soon)
│   └── reports/page.tsx    # Placeholder (Coming Soon)
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx     # Desktop sidebar + mobile Sheet drawer
│   │   └── page-header.tsx # Reusable header with title, description, action slot
│   └── ui/                 # shadcn/ui components (base-ui backed)
└── lib/
    ├── types.ts            # All types: Invoice, Client, LineItem, TransporterDetails, EWayBillDetails, BankDetails, BusinessProfile
    ├── format.ts           # Currency, date (Indian DD/MM/YYYY), invoice number (FY format), totals
    ├── gst.ts              # Indian GST: states, rates, CGST/SGST/IGST split, amount in words
    ├── use-hydrated.ts     # Client-mount guard for Zustand persist stores
    ├── utils.ts            # cn() utility
    └── store/              # Zustand stores (see table above)
```

## Invoice Detail Page — Print Layout
The invoice detail page (`invoices/[id]/page.tsx`) renders a print-ready invoice using `renderInvoiceBody(copyLabel)`:
- **Header**: Logo (left) + GSTN: + IEC (right) + Invoice No. + number
- **Registration banner**: FSSAI, FDA (IEC is above with GSTN)
- **"TAX INVOICE"** centered heading
- **Meta row**: Date (DD/MM/YYYY), Place of Supply, Tax Type (CGST+SGST or IGST)
- **Bill To / Ship To** side by side
- **Line items table**: Description, HSN/SAC, Qty (N PCS), Unit Price, GST (9+9% or Nil), Taxable
- **Transport & E-Way Bill** (if present)
- **Bank Details (left) + Totals (right)**: 2-column grid
  - Bank: account holder, bank name + branch, A/c, IFSC, UPI
  - Totals: Taxable Value, GST Breakdown (CGST/SGST or IGST per rate slab), Total GST, Total Amount, amount in words, GST in words
- **Footer**: 3-line declaration + Authorized Signatory with stamp/signature
- **Print**: 2 copies — "Original Copy for Buyer" (page 1) + "Duplicate Copy for Transporter" (page 2)

## Gotchas / Things to Know

### base-ui (NOT Radix)
- Latest shadcn/ui uses `@base-ui/react` instead of Radix
- **No `asChild` prop** — use `render` prop or `buttonVariants()` for Link-as-Button
- `SheetTrigger` / `DropdownMenuTrigger` render children directly (no wrapper element)
- Select `onValueChange` passes `string | null`, not `string`

### Hydration
- Every page that reads Zustand stores MUST use `useHydrated()` guard
- Place all `useState`/`useEffect` hooks BEFORE the hydration guard
- The guard returns a "Loading..." placeholder until client mount

### Zustand getSnapshot Loop
- Store methods that return filtered arrays (`.filter()`) create new references each call
- This causes `getSnapshot` infinite loops in React 19 / Next.js 16
- **Fix**: select the raw array from the store, filter outside: `const all = useStore(s => s.items); const filtered = all.filter(...);`

### Tailwind v4
- Uses `@theme inline` block in `globals.css` for CSS variables
- Geist fonts referenced by literal name (`"Geist"`, `"Geist Mono"`) in theme
- Font CSS variables applied on `<html>` element, not `<body>`

### Print CSS
- All print styles in `globals.css` `@media print` block
- Forces light theme, hides sidebar/nav/status badges
- `.print-copy-label` shown only in print (copy label at top right)
- `.print-duplicate-copy` renders second page with `page-break-before: always`
- Logo max-height capped at 40px, stamp at 64px, signature at 40px

## Completed
- [x] Zustand stores with localStorage persistence
- [x] Full client CRUD
- [x] Full invoice CRUD with auto-numbering (FY format: 2025-26/001)
- [x] Indian GST compliance: CGST+SGST (intrastate) / IGST (interstate)
- [x] GST rate selection per line item (0%, 5%, 12%, 18%, 28%)
- [x] HSN/SAC codes and UQC units per line item
- [x] Place of Supply auto-detection from client state
- [x] Reverse charge mechanism support
- [x] Ship To address (defaults to Bill To, toggle for different address)
- [x] Transporter details (name, GSTIN, GR/LR, vehicle, mode)
- [x] E-Way Bill number, dates, validity
- [x] Bank account details on invoices (with UPI)
- [x] Company logo upload
- [x] Stamp & signature upload for Authorized Signatory
- [x] Print-ready invoice: 2-page A4 (Original + Duplicate copies)
- [x] Amount in words (Indian numbering: lakhs, crores)
- [x] GST amount in words
- [x] Pre-filled Challenger Industries data (GSTN, IEC, FSSAI, FDA, addresses)
- [x] Payment store linked to invoices
- [x] Dashboard with stat cards, recent invoices, overdue alerts
- [x] Settings page: business info, 2 addresses, logo, bank, registrations, stamp/signature
- [x] Data export/import (localStorage backup)
- [x] Polished dark-mode UI throughout
- [x] Hydration fix for all pages
- [x] Sidebar with desktop + mobile responsive layout

## Remaining Work

### Phase 3 — PDF & Email
- [ ] PDF generation with `@react-pdf/renderer` (invoice download as PDF)
- [ ] Payment recording dialog on invoice detail page
- [ ] Email invoice (generate mailto link or integrate Resend)

### Phase 4 — Recurring & Charts
- [ ] Recurring invoice templates (create, schedule, auto-generate)
- [ ] Dashboard charts with `recharts` (revenue over time, status breakdown)

### Phase 5 — Reports & Polish
- [ ] Revenue report (filterable by date range)
- [ ] Aging report (overdue analysis)
- [ ] Tax report (GST collected summary — CGST/SGST/IGST breakdowns)
- [ ] Client revenue report
- [ ] Dark mode toggle (currently always dark)
- [ ] Responsive polish pass
- [ ] Empty/loading/error states audit
- [ ] GSTIN validation (check digit algorithm)
- [ ] E-invoice integration (NIC portal API)

## Running the App
```bash
cd C:\Users\maxra\Documents\Code\challenger-industries
npm run dev        # http://localhost:3001
npm run build      # Production build
```

## Git History
```
750ea05 docs: add project handoff document
7417976 fix: resolve hydration mismatch and nested button issues
8d5a5d8 feat: full invoice app with polished UI and registration numbers
68eb31b feat: initial commit
77af2a2 Initial commit from Create Next App
```
