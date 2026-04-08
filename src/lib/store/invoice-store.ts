import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Invoice, InvoiceStatus, LineItem } from "../types";
import { generateInvoiceNumber, calculateInvoiceTotals, getFinancialYear } from "../format";
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
  deleteAndRenumber: (id: string) => void;
  getInvoice: (id: string) => Invoice | undefined;
  updateStatus: (id: string, status: InvoiceStatus) => void;
  finalizeInvoice: (id: string) => void;
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
  const { subtotal, taxTotal, total } = calculateInvoiceTotals(
    data.lineItems,
    data.discount
  );

  const now = new Date().toISOString();
  return {
    id: nanoid(),
    invoiceNumber: "",  // assigned only on finalization
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

/** Assign the next sequential invoice number and return it. */
function assignInvoiceNumber(): string {
  const settings = useSettingsStore.getState();
  const seq = settings.consumeInvoiceNumber();
  return generateInvoiceNumber(settings.profile.invoicePrefix, seq);
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

      deleteAndRenumber: (id) => {
        const inv = get().invoices.find((i) => i.id === id);
        if (!inv) return;

        // Extract the financial year from the invoice number (e.g. "2025-26/003" → "2025-26")
        const fy = inv.invoiceNumber
          ? inv.invoiceNumber.split("/")[0]
          : getFinancialYear(new Date(inv.issueDate));

        set((state) => {
          // Remove the invoice
          const remaining = state.invoices.filter((i) => i.id !== id);

          // Resequence all finalized invoices in the same FY, sorted by issueDate then createdAt
          const inFy = remaining
            .filter((i) => i.invoiceNumber && i.invoiceNumber.startsWith(fy + "/"))
            .sort((a, b) =>
              a.issueDate !== b.issueDate
                ? a.issueDate.localeCompare(b.issueDate)
                : a.createdAt.localeCompare(b.createdAt)
            );

          const renumbered = new Map<string, string>();
          inFy.forEach((i, idx) => {
            renumbered.set(i.id, `${fy}/${String(idx + 1).padStart(3, "0")}`);
          });

          // Update nextInvoiceNumber in settings so future invoices don't collide
          useSettingsStore.getState().setNextInvoiceNumber(inFy.length + 1);

          return {
            invoices: remaining.map((i) =>
              renumbered.has(i.id)
                ? { ...i, invoiceNumber: renumbered.get(i.id)!, updatedAt: new Date().toISOString() }
                : i
            ),
          };
        });
      },

      getInvoice: (id) => get().invoices.find((inv) => inv.id === id),

      updateStatus: (id, status) =>
        set((state) => ({
          invoices: state.invoices.map((inv) => {
            if (inv.id !== id) return inv;
            // Assign a number when leaving draft status for the first time
            const invoiceNumber =
              inv.status === "draft" && status !== "draft" && !inv.invoiceNumber
                ? assignInvoiceNumber()
                : inv.invoiceNumber;
            return { ...inv, status, invoiceNumber, updatedAt: new Date().toISOString() };
          }),
        })),

      finalizeInvoice: (id) =>
        set((state) => ({
          invoices: state.invoices.map((inv) => {
            if (inv.id !== id || inv.status !== "draft") return inv;
            return {
              ...inv,
              status: "sent" as InvoiceStatus,
              invoiceNumber: inv.invoiceNumber || assignInvoiceNumber(),
              updatedAt: new Date().toISOString(),
            };
          }),
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
