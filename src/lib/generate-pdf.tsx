import type { Invoice, Client, BusinessProfile } from "./types";

/**
 * Dynamically imports @react-pdf/renderer and generates an invoice PDF blob.
 * Uses dynamic imports to avoid SSR issues with the PDF library.
 */
export async function generateInvoicePdf(
  invoice: Invoice,
  client: Client | undefined,
  profile: BusinessProfile,
): Promise<Blob> {
  const [{ pdf }, { InvoicePDF }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/invoice-pdf"),
  ]);
  return pdf(
    <InvoicePDF invoice={invoice} client={client} profile={profile} />
  ).toBlob();
}
