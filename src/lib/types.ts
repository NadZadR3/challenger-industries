// ── Status & Enum Types ──────────────────────────────────────────────

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type PaymentMethod = "cash" | "check" | "bank_transfer" | "credit_card" | "paypal" | "other";
export type RecurrenceInterval = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
export type LineItemType = "product" | "service";

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
  name: string;
  email: string;
  phone: string;
  company: string;
  address: Address;
  notes: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface LineItem {
  id: string;
  type: LineItemType;
  description: string;
  quantity: number;
  unitPrice: number; // cents
  taxRate: number; // percentage, e.g. 8.5
  amount: number; // computed: quantity * unitPrice (cents)
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-2026-0001"
  clientId: string;
  status: InvoiceStatus;
  issueDate: string; // ISO date
  dueDate: string;
  lineItems: LineItem[];
  subtotal: number; // cents
  taxTotal: number; // cents
  discount: number; // cents
  total: number; // cents
  amountPaid: number; // cents
  balanceDue: number; // cents
  notes: string;
  terms: string;
  recurringTemplateId: string;
  createdAt: string;
  updatedAt: string;
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

export interface BusinessProfile {
  name: string;
  email: string;
  phone: string;
  address: Address;
  logo: string; // base64 data URL
  taxId: string;
  website: string;
  registrations: RegistrationNumber[]; // FDA, GST, FSSAI, etc.
  defaultPaymentTerms: string;
  defaultTaxRate: number; // percentage
  invoicePrefix: string; // e.g. "INV"
  nextInvoiceNumber: number;
  currency: string; // e.g. "USD"
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
