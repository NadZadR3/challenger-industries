import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { CatalogItem, LineItemType } from "../types";

interface CatalogState {
  items: CatalogItem[];
  addItem: (data: Omit<CatalogItem, "id">) => CatalogItem;
  updateItem: (id: string, data: Partial<CatalogItem>) => void;
  deleteItem: (id: string) => void;
  getItem: (id: string) => CatalogItem | undefined;
  getByType: (type: LineItemType) => CatalogItem[];
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (data) => {
        const item: CatalogItem = { ...data, id: nanoid() };
        set((state) => ({ items: [...state.items, item] }));
        return item;
      },
      updateItem: (id, data) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, ...data } : i)),
        })),
      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),
      getItem: (id) => get().items.find((i) => i.id === id),
      getByType: (type) => get().items.filter((i) => i.type === type),
    }),
    { name: "challenger-catalog" }
  )
);
