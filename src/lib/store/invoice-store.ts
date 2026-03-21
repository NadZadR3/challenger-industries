import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Invoice, InvoiceStatus, LineItem } from "../types";
import { generateInvoiceNumber, calculateInvoiceTotals } from "../format";
import { useSettingsStore } from "./settings-store";

interface InvoiceState {
  invoices: Invoice[];
  createInvoice: (
    data: Pick<
      Invoice,
      | "clientId" | "issueDate" | "dueDate" | "lineItems" | "discount"
      | "notes" | "terms" | "recurringTemplateId"
      | "gstType" | "placeOfSupply" | "reverseCharge"
      | "transporter" | "ewayBill"
      | "shipToName" | "shipToAddress"
    >
  ) => Invoice;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  getInvoice: (id: string) => Invoice | undefined;
  updateStatus: (id: string, status: InvoiceStatus) => void;
  recordPayment: (id: string, amountCents: number) => void;
  getClientInvoices: (clientId: string) => Invoice[];
  markOverdueInvoices: () => number;
}

function buildInvoice(
  data: Pick<
    Invoice,
    | "clientId" | "issueDate" | "dueDate" | "lineItems" | "discount"
    | "notes" | "terms" | "recurringTemplateId"
    | "gstType" | "placeOfSupply" | "reverseCharge"
    | "transporter" | "ewayBill"
    | "shipToName" | "shipToAddress"
  >
): Invoice {
  const settings = useSettingsStore.getState();
  const seq = settings.consumeInvoiceNumber();
  const invoiceNumber = generateInvoiceNumber(settings.profile.invoicePrefix, seq);

  const { subtotal, taxTotal, total } = calculateInvoiceTotals(
    data.lineItems,
    data.discount
  );

  const now = new Date().toISOString();
  return {
    id: nanoid(),
    invoiceNumber,
    clientId: data.clientId,
    status: "draft",
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    lineItems: data.lineItems,
    subtotal,
    taxTotal,
    discount: data.discount,
    total,
    amountPaid: 0,
    balanceDue: total,
    notes: data.notes || "",
    terms: data.terms || "",
    recurringTemplateId: data.recurringTemplateId || "",
    gstType: data.gstType ?? "intrastate",
    placeOfSupply: data.placeOfSupply ?? "07",
    reverseCharge: data.reverseCharge ?? false,
    shipToName: data.shipToName,
    shipToAddress: data.shipToAddress,
    transporter: data.transporter,
    ewayBill: data.ewayBill,
    createdAt: now,
    updatedAt: now,
  };
}

export const useInvoiceStore = create<InvoiceState>()(
  persist(
    (set, get) => ({
      invoices: [],

      createInvoice: (data) => {
        const invoice = buildInvoice(data);
        set((state) => ({ invoices: [...state.invoices, invoice] }));
        return invoice;
      },

      updateInvoice: (id, data) =>
        set((state) => {
          const invoices = state.invoices.map((inv) => {
            if (inv.id !== id) return inv;
            const updated = { ...inv, ...data, updatedAt: new Date().toISOString() };
            // Recalculate totals if line items or discount changed
            if (data.lineItems || data.discount !== undefined) {
              const items = data.lineItems || updated.lineItems;
              const disc = data.discount ?? updated.discount;
              const { subtotal, taxTotal, total } = calculateInvoiceTotals(items, disc);
              updated.subtotal = subtotal;
              updated.taxTotal = taxTotal;
              updated.total = total;
              updated.balanceDue = total - updated.amountPaid;
            }
            return updated;
          });
          return { invoices };
        }),

      deleteInvoice: (id) =>
        set((state) => ({
          invoices: state.invoices.filter((inv) => inv.id !== id),
        })),

      getInvoice: (id) => get().invoices.find((inv) => inv.id === id),

      updateStatus: (id, status) =>
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id
              ? { ...inv, status, updatedAt: new Date().toISOString() }
              : inv
          ),
        })),

      recordPayment: (id, amountCents) =>
        set((state) => ({
          invoices: state.invoices.map((inv) => {
            if (inv.id !== id) return inv;
            const newPaid = inv.amountPaid + amountCents;
            const newBalance = inv.total - newPaid;
            return {
              ...inv,
              amountPaid: newPaid,
              balanceDue: Math.max(0, newBalance),
              status: newBalance <= 0 ? "paid" : inv.status,
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      getClientInvoices: (clientId) =>
        get().invoices.filter((inv) => inv.clientId === clientId),

      markOverdueInvoices: () => {
        const today = new Date().toISOString().split("T")[0];
        let count = 0;
        set((state) => ({
          invoices: state.invoices.map((inv) => {
            if (
              (inv.status === "sent" || inv.status === "draft") &&
              inv.dueDate < today &&
              inv.balanceDue > 0
            ) {
              count++;
              return { ...inv, status: "overdue" as InvoiceStatus, updatedAt: new Date().toISOString() };
            }
            return inv;
          }),
        }));
        return count;
      },
    }),
    { name: "challenger-invoices" }
  )
);
