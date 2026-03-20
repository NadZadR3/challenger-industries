import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Payment, PaymentMethod } from "../types";
import { useInvoiceStore } from "./invoice-store";

interface PaymentState {
  payments: Payment[];
  addPayment: (data: {
    invoiceId: string;
    amount: number;
    method: PaymentMethod;
    date: string;
    reference?: string;
    notes?: string;
  }) => Payment;
  getInvoicePayments: (invoiceId: string) => Payment[];
  deletePayment: (id: string) => void;
}

export const usePaymentStore = create<PaymentState>()(
  persist(
    (set, get) => ({
      payments: [],

      addPayment: (data) => {
        const payment: Payment = {
          id: nanoid(),
          invoiceId: data.invoiceId,
          amount: data.amount,
          method: data.method,
          date: data.date,
          reference: data.reference || "",
          notes: data.notes || "",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ payments: [...state.payments, payment] }));
        // Update the invoice's paid amount
        useInvoiceStore.getState().recordPayment(data.invoiceId, data.amount);
        return payment;
      },

      getInvoicePayments: (invoiceId) =>
        get().payments.filter((p) => p.invoiceId === invoiceId),

      deletePayment: (id) =>
        set((state) => ({
          payments: state.payments.filter((p) => p.id !== id),
        })),
    }),
    { name: "challenger-payments" }
  )
);
