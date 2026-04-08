import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BusinessProfile } from "../types";

const defaultProfile: BusinessProfile = {
  name: "Challenger Industries",
  email: "",
  phone: "",
  address: {
    street: "2988, Shah Ganj, Ajmeri Gate",
    city: "Delhi",
    state: "Delhi",
    zip: "110006",
    country: "India",
  },
  address2: {
    street: "C-6/1, Street No. 9, Wazirabad Village",
    city: "Delhi",
    state: "Delhi",
    zip: "110084",
    country: "India",
  },
  logo: "",
  taxId: "07AXDPS2025H1ZM", // GSTN — shown prominently on invoice
  website: "",
  registrations: [
    { id: "iec-default", label: "IEC", value: "0509060251" },
    { id: "fssai-default", label: "FSSAI", value: "13326998000015" },
    { id: "fda-default", label: "FDA", value: "17546996940" },
  ],
  defaultPaymentTerms: "Net 30",
  defaultTaxRate: 18,
  invoicePrefix: "INV",
  nextInvoiceNumber: 1,
  currency: "INR",
  supplierStateCode: "07",       // Delhi — first 2 digits of GSTIN 07AXDPS2025H1ZM
  defaultGSTType: "intrastate",  // most Challenger Industries sales are within Delhi
  bankDetails: {
    accountHolder: "Challenger Industries",
    bankName: "",
    branch: "",
    accountNumber: "",
    ifscCode: "",
    accountType: "current",
    swiftCode: "",
    upiId: "",
  },
};

interface SettingsState {
  profile: BusinessProfile;
  updateProfile: (updates: Partial<BusinessProfile>) => void;
  consumeInvoiceNumber: () => number;
  setNextInvoiceNumber: (n: number) => void;
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
      setNextInvoiceNumber: (n) =>
        set((state) => ({
          profile: { ...state.profile, nextInvoiceNumber: n },
        })),
    }),
    { name: "challenger-settings" }
  )
);
