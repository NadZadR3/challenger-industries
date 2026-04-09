"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClientStore } from "@/lib/store/client-store";
import { useInvoiceStore } from "@/lib/store/invoice-store";
import { formatCurrency } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { Plus, MoreHorizontal, Users, Eye, Pencil, Trash2 } from "lucide-react";

export default function ClientsPage() {
  const hydrated = useHydrated();
  const clients = useClientStore((s) => s.clients);
  const deleteClient = useClientStore((s) => s.deleteClient);
  const invoices = useInvoiceStore((s) => s.invoices);
  const router = useRouter();

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const sorted = clients
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" description="Manage your client list">
        <Link href="/clients/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Link>
      </PageHeader>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium">No clients yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Add your first client to start creating invoices.
            </p>
            <Link href="/clients/new" className={buttonVariants({ variant: "outline" })}>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Company Name</TableHead>
                <TableHead className="hidden sm:table-cell font-semibold">GST / Tax ID</TableHead>
                <TableHead className="hidden sm:table-cell font-semibold">Email</TableHead>
                <TableHead className="text-right font-semibold">Total Billed</TableHead>
                <TableHead className="text-right font-semibold">Invoices</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((client) => {
                const clientInvoices = invoices.filter(
                  (i) => i.clientId === client.id
                );
                const totalBilled = clientInvoices.reduce(
                  (sum, i) => sum + i.total,
                  0
                );
                return (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      {client.name}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-xs">{client.taxId || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {client.email || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(totalBilled)}
                    </TableCell>
                    <TableCell className="text-right">
                      {clientInvoices.length}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/clients/${client.id}`)
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/clients/${client.id}/edit`)
                            }
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteClient(client.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
