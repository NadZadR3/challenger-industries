import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BusinessProfile } from "../types";

const defaultProfile: BusinessProfile = {
  name: "Challenger Industries",
  email: "",
  phone: "",
  address: { street: "", city: "", state: "", zip: "", country: "US" },
  logo: "",
  taxId: "",
  website: "",
  registrations: [],
  defaultPaymentTerms: "Net 30",
  defaultTaxRate: 0,
  invoicePrefix: "INV",
  nextInvoiceNumber: 1,
  currency: "USD",
};

interface SettingsState {
  profile: BusinessProfile;
  updateProfile: (updates: Partial<BusinessProfile>) => void;
  consumeInvoiceNumber: () => number;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      updateProfile: (updates) =>
        set((state) => ({
          profile: { ...state.profile, ...updates },
        })),
      consumeInvoiceNumber: () => {
        const current = get().profile.nextInvoiceNumber;
        set((state) => ({
          profile: {
            ...state.profile,
            nextInvoiceNumber: state.profile.nextInvoiceNumber + 1,
          },
        }));
        return current;
      },
    }),
    { name: "challenger-settings" }
  )
);
