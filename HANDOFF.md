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
- **Signature Mode** — 3-way selector in Settings: Manual (dotted line), Image Upload (scanned signature), or DSC USB Token (digital certificate signing via local bridge software).
- **DSC USB Token** — communicates with local signing middleware (emSigner, eMudhra, Sify RA) on configurable port (default 27372). Lists certificates from USB token, signs PDF, stores `DscSignatureInfo` on the invoice. Signed invoices display cert holder, CA, date, and hash in both web view and PDF.
- **Stamp** — uploaded as base64 in settings, displayed in Authorized Signatory section (available for all signature modes).
- **Print layout** — 2-page A4: "Original Copy for Buyer" + "Duplicate Copy for Transporter". Monochrome-safe.
- **Hydration guard** — `useHydrated()` hook prevents SSR/client mismatch. Every page using Zustand stores must call this.

### File Structure
```
src/
├── app/
│   ├── layout.tsx          # Root layout: Geist fonts, Sidebar, TooltipProvider, Toaster
│   ├── page.tsx            # Redirects to /dashboard
│   ├── globals.css         # Tailwind v4 theme + @media print styles (2-page A4)
│   ├── dashboard/page.tsx  # 4 stat cards, recharts (revenue bar + status pie), recent invoices
│   ├── invoices/
│   │   ├── page.tsx        # List with status filter tabs, dropdown actions
│   │   ├── new/page.tsx    # Invoice builder: client, GST, transport, e-way bill, line items
│   │   └── [id]/
│   │       ├── page.tsx    # Invoice detail: print/PDF/email, payment dialog, WhatsApp
│   │       └── edit/page.tsx
│   ├── clients/
│   │   ├── page.tsx        # Client list with total billed
│   │   ├── new/page.tsx    # New client with GSTIN validation
│   │   └── [id]/
│   │       ├── page.tsx    # Client detail with invoice history
│   │       └── edit/page.tsx  # Edit client with GSTIN validation
│   ├── settings/page.tsx   # Business profile, addresses, logo, bank, registrations, signature mode (manual/image/DSC)
│   ├── recurring/page.tsx  # Recurring templates: CRUD, generate on demand, pause/resume
│   └── reports/page.tsx    # 4 tab reports: Revenue, Aging, Tax (GST), Client
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx     # Desktop sidebar + mobile Sheet drawer + dark mode toggle
│   │   └── page-header.tsx # Reusable header with title, description, action slot
│   ├── invoice-pdf.tsx     # @react-pdf/renderer 2-page PDF (Original + Duplicate)
│   ├── payment-dialog.tsx  # Payment recording dialog (amount, method, date, ref)
│   └── ui/                 # shadcn/ui components (base-ui backed)
└── lib/
    ├── types.ts            # All types: Invoice, Client, LineItem, TransporterDetails, etc.
    ├── format.ts           # Currency, date (Indian DD/MM/YYYY), invoice number (FY format), totals
    ├── gst.ts              # Indian GST: states, rates, CGST/SGST/IGST split, amount in words
    ├── gstin-validate.ts   # GSTIN validation: format regex + Luhn mod 36 check digit
    ├── use-hydrated.ts     # Client-mount guard for Zustand persist stores
    ├── dsc.ts              # DSC USB token bridge: status check, list certs, sign PDF via local service
    ├── utils.ts            # cn() utility
    └── store/
        ├── settings-store.ts   # Business profile, bank details, stamp/signature
        ├── client-store.ts     # Client CRUD
        ├── invoice-store.ts    # Invoice CRUD, FY numbering, GST
        ├── payment-store.ts    # Payment recording
        ├── catalog-store.ts    # Products & services catalog
        ├── recurring-store.ts  # Recurring invoice templates
        └── theme-store.ts      # Dark/light mode persistence
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
- Logo max-height capped at 40px, stamp at 128px, signature at 80px

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
- [x] **Phase 3**: PDF generation with `@react-pdf/renderer` (2-page invoice download)
- [x] **Phase 3**: Payment recording dialog on invoice detail page (amount, method, date, reference)
- [x] **Phase 3**: Email invoice via mailto link (pre-filled subject + body)
- [x] **Phase 4**: Recurring invoice templates (CRUD, generate on demand, pause/resume)
- [x] **Phase 4**: Dashboard charts with `recharts` (revenue bar chart, status pie chart)
- [x] **Phase 5**: Revenue report (monthly billed vs collected, date-filterable)
- [x] **Phase 5**: Aging report (current/30/60/90/90+ day buckets, overdue details)
- [x] **Phase 5**: Tax report (GST summary by rate — CGST/SGST/IGST breakdowns)
- [x] **Phase 5**: Client revenue report (top clients chart, breakdown table)
- [x] **Phase 5**: Dark mode toggle in sidebar (persisted via Zustand)
- [x] **Phase 5**: GSTIN validation (format regex + Luhn mod 36 check digit + state code check)
- [x] **Phase 6**: Fix PDF generation — dynamic imports to avoid SSR failures, shared `generate-pdf.tsx` helper
- [x] **Phase 6**: WhatsApp PDF sharing — Web Share API on mobile, download+text fallback on desktop
- [x] **Phase 6**: Signature & stamp size doubled across screen, PDF, and print CSS
- [x] **Phase 6**: Deployed to Vercel — https://challenger-industries.vercel.app
- [x] **Phase 6**: GitHub repo — https://github.com/Maxray77/Challenger-Industries.git
- [x] **Phase 7**: DSC USB Token digital signature — 3-way signature mode selector (Manual / Image / DSC)
- [x] **Phase 7**: DSC bridge utility (`src/lib/dsc.ts`) for local signing software communication
- [x] **Phase 7**: DSC certificate selection from USB token in Settings
- [x] **Phase 7**: "Sign with DSC" button on invoice detail page, stores `DscSignatureInfo` on invoice
- [x] **Phase 7**: DSC signature display in web view and PDF (cert holder, CA, date, hash)
- [x] **Phase 7**: Deployed to Vercel production (via Deploy Hook — see Deployment Notes below)

## Deployment Notes
- **Vercel project**: `challenger-industries` on `maxray77s-projects` team (Hobby plan)
- **Production URL**: https://challenger-industries.vercel.app
- **GitHub repo**: https://github.com/Maxray77/Challenger-Industries.git
- **Git-triggered deploys are currently blocked** by Vercel's "Commit Author Required" check — the git email (`nshehzad@raptorrescueusa.org`) is not verified on the Vercel team.
  - **Fix option 1**: Add the email as a verified email on your GitHub account (GitHub → Settings → Emails), then reconnect GitHub in Vercel Dashboard → Account Settings → Authentication.
  - **Fix option 2**: Use a **Deploy Hook** (already set up in project Settings → Git → Deploy Hooks). Trigger with:
    ```powershell
    Invoke-WebRequest -Uri "<deploy-hook-url>" -Method POST
    ```
    or from real curl: `curl.exe -X POST "<deploy-hook-url>"`
- **Vercel CLI** is installed globally (`npm i -g vercel`), project is linked at the main repo root.
- **Vercel Non-profit**: No dedicated plan. Contact `sponsorships@vercel.com` for case-by-case nonprofit support. Open Source Program accepts quarterly cohorts for free Pro-tier (12 months).

## Remaining Work
- [ ] Multi-user database (Supabase recommended — 2 users sharing data, auth, real-time sync)
- [ ] E-invoice integration (NIC portal API)
- [ ] Recurring auto-generation (cron/scheduler — currently manual "Generate Now")
- [ ] Responsive polish pass
- [ ] Empty/loading/error states audit

## Running the App
```bash
cd C:\Users\maxra\Documents\Code\challenger-industries
npm run dev        # http://localhost:3001
npm run build      # Production build
```

## Key Files (Phase 7 — DSC Signing)
- `src/lib/dsc.ts` — DSC USB token bridge: `isDscServiceRunning()`, `listCertificates()`, `signPdf()`
- `src/lib/types.ts` — added `signatureMode`, `dscBridgePort`, `dscCertAlias` to `BusinessProfile`; added `DscSignatureInfo` type and `dscSignature` field on `Invoice`
- `src/app/settings/page.tsx` — 3-way signature mode selector UI, DSC connection status, certificate dropdown
- `src/app/invoices/[id]/page.tsx` — DSC signing button, signed invoice display, imports `signPdf`
- `src/components/invoice-pdf.tsx` — DSC signature box in PDF footer (green "Digitally Signed" with cert details)

## Key Files (Phase 6)
- `src/lib/generate-pdf.tsx` — shared PDF generation helper (dynamic imports)
- `src/lib/whatsapp.ts` — added `shareWithPdf()` for PDF sharing via Web Share API
- `src/app/invoices/[id]/page.tsx` — updated PDF button, WhatsApp handlers, signature sizes
- `src/components/invoice-pdf.tsx` — removed `"use client"`, doubled stamp/signature sizes
- `src/app/globals.css` — doubled print CSS signature/stamp max-heights
- `next.config.ts` — added `serverExternalPackages` for @react-pdf/renderer

## Git History
```
750ea05 docs: add project handoff document
7417976 fix: resolve hydration mismatch and nested button issues
8d5a5d8 feat: full invoice app with polished UI and registration numbers
68eb31b feat: initial commit
77af2a2 Initial commit from Create Next App
```
