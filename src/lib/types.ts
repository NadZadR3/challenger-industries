// ── Status & Enum Types ──────────────────────────────────────────────

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type PaymentMethod = "cash" | "check" | "bank_transfer" | "credit_card" | "paypal" | "other";
export type RecurrenceInterval = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
export type LineItemType = "product" | "service";
import type { GSTType } from "./gst";
export type { GSTType };

// ── Core Entities ────────────────────────────────────────────────────

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface Client {
  id: string;
  name: string;       // company / business name (primary identifier)
  email: string;
  phone: string;
  taxId: string;       // customer's GSTIN / Tax ID
  address: Address;
  notes: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

// ── Product / Service Catalog ───────────────────────────────────────

export interface CatalogItem {
  id: string;
  type: LineItemType;
  description: string;
  hsnSacCode: string;
  unit: string;
  unitPrice: number;  // cents
  taxRate: number;     // GST rate %
}

export interface LineItem {
  id: string;
  type: LineItemType;
  description: string;
  quantity: number;
  unitPrice: number; // cents
  taxRate: number;   // GST rate %, e.g. 18 (total — split 50/50 for intra-state)
  amount: number;    // computed: quantity * unitPrice (cents)
  hsnSacCode?: string; // HSN code for goods, SAC code for services
  unit?: string;       // UQC e.g. "NOS", "KGS", "MTR"
}

/** Transporter details for inter-state / outstation movement of goods. */
export interface TransporterDetails {
  name: string;           // transporter / courier name
  transporterId: string;  // GSTIN of the transporter (15-digit)
  docNumber: string;      // GR / LR / Railway Receipt / Airway Bill number
  docDate: string;        // ISO date of transport document
  vehicleNumber: string;  // e.g. "DL 01 AB 1234"
  vehicleType?: "regular" | "over_dimensional_cargo";
  mode?: "road" | "rail" | "air" | "ship";
}

/** E-Way Bill details — mandatory for goods > ₹50,000 moved inter-state or > 50 km. */
export interface EWayBillDetails {
  ewayBillNumber: string;  // 12-digit EBN generated on ewaybillgst.gov.in
  ewayBillDate: string;    // ISO date when generated
  validUntil: string;      // ISO date — depends on distance + vehicle type
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-2026-0001" (max 16 chars per GST rules)
  clientId: string;
  status: InvoiceStatus;
  issueDate: string; // ISO date
  dueDate: string;
  lineItems: LineItem[];
  subtotal: number;  // cents (taxable value)
  taxTotal: number;  // cents (total GST = CGST+SGST or IGST)
  discount: number;  // cents
  total: number;     // cents
  amountPaid: number; // cents
  balanceDue: number; // cents
  notes: string;
  terms: string;
  recurringTemplateId: string;
  createdAt: string;
  updatedAt: string;
  // ── Indian GST fields ──────────────────────────────────────────────
  gstType?: GSTType;        // "intrastate" (CGST+SGST) | "interstate" (IGST)
  placeOfSupply?: string;   // 2-digit state code e.g. "07" for Delhi
  reverseCharge?: boolean;  // true → "Tax is payable on reverse charge basis"
  // ── Ship To (defaults to Bill To) ────────────────────────────────
  shipToName?: string;      // recipient name (if different from client)
  shipToAddress?: Address;  // delivery address (if different from billing)
  // ── Transporter & E-Way Bill ───────────────────────────────────────
  transporter?: TransporterDetails;
  ewayBill?: EWayBillDetails;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number; // cents
  method: PaymentMethod;
  date: string;
  reference: string;
  notes: string;
  createdAt: string;
}

export interface RecurringTemplate {
  id: string;
  clientId: string;
  lineItems: LineItem[];
  interval: RecurrenceInterval;
  startDate: string;
  endDate: string;
  nextGenerationDate: string;
  lastGeneratedDate: string;
  isActive: boolean;
  notes: string;
  terms: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationNumber {
  id: string;
  label: string; // e.g. "FSSAI", "GST", "FDA", "CIN"
  value: string; // the actual registration number
}

/** Bank account details — printed on invoice footer for payment remittance. */
export interface BankDetails {
  accountHolder: string;  // name as it appears on the account
  bankName: string;       // e.g. "State Bank of India"
  branch: string;         // e.g. "Ajmeri Gate, Delhi"
  accountNumber: string;  // savings / current account number
  ifscCode: string;       // 11-char IFSC e.g. "SBIN0001234"
  accountType: "current" | "savings";
  swiftCode?: string;     // for international remittances e.g. "SBININBB"
  upiId?: string;         // e.g. "company@bank"
}

export interface BusinessProfile {
  name: string;
  email: string;
  phone: string;
  address: Address;
  address2?: Address; // second office / warehouse address
  logo: string; // base64 data URL
  taxId: string; // GSTN in India — shown prominently on invoice
  website: string;
  registrations: RegistrationNumber[]; // FDA, FSSAI, IEC, etc.
  defaultPaymentTerms: string;
  defaultTaxRate: number; // percentage
  invoicePrefix: string; // e.g. "INV"
  nextInvoiceNumber: number;
  currency: string; // e.g. "INR"
  // ── Indian GST settings ────────────────────────────────────────────
  supplierStateCode?: string; // 2-digit code from GSTIN, e.g. "07" for Delhi
  defaultGSTType?: GSTType;   // default to "intrastate" for same-state supplies
  // ── Bank details (printed on invoice for payment remittance) ──────
  bankDetails?: BankDetails;
  // ── Signature & stamp (printed on invoice footer) ─────────────────
  signatureImage?: string;   // base64 data URL of signature
  stampImage?: string;       // base64 data URL of company stamp/seal
  authorizedSignatory?: string; // name of the authorized signatory
  // ── WhatsApp sharing ────────────────────────────────────────────────
  accountantPhone?: string;     // WhatsApp number for accountant (with country code)
  accountantName?: string;      // display name for the accountant
}

// ── Dashboard Types ──────────────────────────────────────────────────

export interface DashboardStats {
  totalRevenue: number;
  outstandingAmount: number;
  overdueAmount: number;
  invoiceCount: number;
  paidCount: number;
  overdueCount: number;
  revenueByMonth: { month: string; amount: number }[];
  topClients: { clientId: string; clientName: string; total: number }[];
}
