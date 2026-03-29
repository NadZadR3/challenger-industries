import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { RecurringTemplate, RecurrenceInterval, LineItem } from "../types";

interface RecurringState {
  templates: RecurringTemplate[];
  addTemplate: (data: {
    clientId: string;
    lineItems: LineItem[];
    interval: RecurrenceInterval;
    startDate: string;
    endDate?: string;
    notes?: string;
    terms?: string;
  }) => RecurringTemplate;
  updateTemplate: (id: string, data: Partial<RecurringTemplate>) => void;
  deleteTemplate: (id: string) => void;
  getTemplate: (id: string) => RecurringTemplate | undefined;
  toggleActive: (id: string) => void;
}

export const useRecurringStore = create<RecurringState>()(
  persist(
    (set, get) => ({
      templates: [],

      addTemplate: (data) => {
        const now = new Date().toISOString();
        const template: RecurringTemplate = {
          id: nanoid(),
          clientId: data.clientId,
          lineItems: data.lineItems,
          interval: data.interval,
          startDate: data.startDate,
          endDate: data.endDate || "",
          nextGenerationDate: data.startDate,
          lastGeneratedDate: "",
          isActive: true,
          notes: data.notes || "",
          terms: data.terms || "",
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ templates: [...state.templates, template] }));
        return template;
      },

      updateTemplate: (id, data) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id
              ? { ...t, ...data, updatedAt: new Date().toISOString() }
              : t
          ),
        })),

      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        })),

      getTemplate: (id) => get().templates.find((t) => t.id === id),

      toggleActive: (id) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id
              ? { ...t, isActive: !t.isActive, updatedAt: new Date().toISOString() }
              : t
          ),
        })),
    }),
    { name: "challenger-recurring" }
  )
);
