import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Client } from "../types";

interface ClientState {
  clients: Client[];
  addClient: (data: Omit<Client, "id" | "createdAt" | "updatedAt">) => Client;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  getClient: (id: string) => Client | undefined;
}

export const useClientStore = create<ClientState>()(
  persist(
    (set, get) => ({
      clients: [],
      addClient: (data) => {
        const now = new Date().toISOString();
        const client: Client = {
          ...data,
          id: nanoid(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ clients: [...state.clients, client] }));
        return client;
      },
      updateClient: (id, data) =>
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id
              ? { ...c, ...data, updatedAt: new Date().toISOString() }
              : c
          ),
        })),
      deleteClient: (id) =>
        set((state) => ({
          clients: state.clients.filter((c) => c.id !== id),
        })),
      getClient: (id) => get().clients.find((c) => c.id === id),
    }),
    { name: "challenger-clients" }
  )
);
