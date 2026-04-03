import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import type { Invoice, Client, BusinessProfile } from "@/lib/types";
import { formatCurrency, formatDateIndia } from "@/lib/format";
import { groupLineItemsByGSTRate, getStateName, amountInWords } from "@/lib/gst";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    padding: 40,
    color: "#111",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  logo: {
    maxHeight: 40,
    maxWidth: 160,
  },
  copyLabel: {
    fontSize: 7,
    fontStyle: "italic",
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    textAlign: "right",
  },
  gstnBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    border: "1pt solid #ddd",
    borderRadius: 3,
    padding: "3 6",
  },
  gstnLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    color: "#666",
  },
  gstnValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  iecLine: {
    fontSize: 7,
    color: "#666",
    textAlign: "right",
    marginTop: 2,
  },
  companyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  companyName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  companyAddress: {
    fontSize: 8,
    color: "#444",
    marginTop: 2,
    lineHeight: 1.4,
  },
  invoiceNoLabel: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#333",
    textAlign: "right",
  },
  invoiceNoValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textAlign: "right",
    marginTop: 2,
  },
  regBanner: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    backgroundColor: "#f7f7f7",
    border: "0.5pt solid #e0e0e0",
    borderRadius: 4,
    padding: "5 10",
    marginBottom: 12,
  },
  regItem: {
    fontSize: 7,
  },
  regLabel: {
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    color: "#666",
  },
  reverseCharge: {
    backgroundColor: "#FFF8E1",
    border: "0.5pt solid #FFE082",
    borderRadius: 4,
    padding: "5 10",
    marginBottom: 12,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#B8860B",
  },
  taxInvoiceHeading: {
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    letterSpacing: 3,
    borderTop: "0.5pt solid #333",
    borderBottom: "0.5pt solid #333",
    paddingVertical: 4,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    gap: 20,
    fontSize: 8,
    marginBottom: 10,
  },
  metaLabel: {
    color: "#666",
  },
  metaValue: {
    fontFamily: "Helvetica-Bold",
  },
  addressGrid: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 14,
  },
  addressBox: {
    flex: 1,
  },
  addressTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#666",
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  addressName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  addressLine: {
    fontSize: 8,
    color: "#444",
    lineHeight: 1.4,
  },
  // Table
  table: {
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f3f3",
    borderBottom: "0.5pt solid #ccc",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #eee",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  thText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  tdText: {
    fontSize: 8,
  },
  colDesc: { flex: 3 },
  colHsn: { width: 55, textAlign: "center" },
  colQty: { width: 50, textAlign: "right" },
  colPrice: { width: 60, textAlign: "right" },
  colGst: { width: 50, textAlign: "right" },
  colTaxable: { width: 65, textAlign: "right" },
  // Transport
  transportSection: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  transportBox: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    border: "0.5pt solid #e0e0e0",
    borderRadius: 4,
    padding: 8,
  },
  transportTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    color: "#666",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  transportLine: {
    fontSize: 7,
    color: "#444",
    lineHeight: 1.5,
  },
  // Bank + Totals
  bankTotalsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  bankBox: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    border: "0.5pt solid #e0e0e0",
    borderRadius: 4,
    padding: 8,
  },
  bankTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    color: "#666",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  bankLine: {
    fontSize: 7,
    color: "#444",
    lineHeight: 1.5,
  },
  bankBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  totalsBox: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    border: "0.5pt solid #ddd",
    borderRadius: 4,
    padding: 8,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  totalsLabel: {
    fontSize: 8,
    color: "#666",
  },
  totalsValue: {
    fontSize: 8,
    fontFamily: "Helvetica",
  },
  totalsBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  totalsWords: {
    fontSize: 7,
    color: "#666",
    fontStyle: "italic",
    marginTop: 2,
    lineHeight: 1.3,
  },
  gstBreakdownBox: {
    backgroundColor: "#fff",
    border: "0.5pt solid #eee",
    borderRadius: 3,
    padding: 5,
    marginVertical: 3,
  },
  gstGroupTitle: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#666",
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  gstGroupNote: {
    fontSize: 6,
    color: "#888",
    fontStyle: "italic",
    marginBottom: 1,
  },
  divider: {
    borderBottom: "0.5pt solid #ddd",
    marginVertical: 3,
  },
  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 12,
    borderTop: "0.5pt solid #ccc",
    paddingTop: 8,
  },
  declaration: {
    fontSize: 7,
    color: "#666",
    lineHeight: 1.5,
    maxWidth: 220,
  },
  signatoryBox: {
    alignItems: "center",
    minWidth: 130,
  },
  stampImage: {
    maxHeight: 100,
    maxWidth: 160,
    marginBottom: 2,
  },
  signatureImage: {
    maxHeight: 70,
    maxWidth: 200,
  },
  signatoryName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    marginTop: 2,
  },
  signatoryLabel: {
    fontSize: 7,
    color: "#666",
  },
  dscBox: {
    borderWidth: 0.5,
    borderColor: "#22c55e",
    borderRadius: 3,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 3,
    alignItems: "center" as const,
  },
  dscTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#16a34a",
    marginBottom: 2,
  },
  dscDetail: {
    fontSize: 6,
    color: "#666",
    lineHeight: 1.5,
    textAlign: "center" as const,
  },
  dscHash: {
    fontSize: 5,
    color: "#999",
    fontFamily: "Courier",
    marginTop: 1,
  },
  manualLine: {
    width: 150,
    borderBottom: "0.5pt dashed #999",
    marginBottom: 3,
    height: 50,
  },
});

interface InvoicePDFProps {
  invoice: Invoice;
  client?: Client;
  profile: BusinessProfile;
}

function InvoiceCopy({
  invoice,
  client,
  profile,
  copyLabel,
}: InvoicePDFProps & { copyLabel: string }) {
  const gstType = invoice.gstType ?? "intrastate";
  const gstGroups = groupLineItemsByGSTRate(invoice.lineItems, gstType);
  const hasBankDetails =
    profile.bankDetails?.bankName && profile.bankDetails?.accountNumber;

  const iecReg = profile.registrations.find(
    (r) => r.label.toUpperCase() === "IEC" && r.value
  );
  const otherRegistrations = profile.registrations.filter(
    (r) => r.label && r.value && r.label.toUpperCase() !== "IEC"
  );

  return (
    <Page size="A4" style={styles.page}>
      {/* Header: Logo + GSTN/IEC */}
      <View style={styles.headerRow}>
        {profile.logo ? (
          <Image src={profile.logo} style={styles.logo} />
        ) : (
          <View />
        )}
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.copyLabel}>{copyLabel}</Text>
          {profile.taxId && (
            <View style={styles.gstnBox}>
              <Text style={styles.gstnLabel}>GSTN:</Text>
              <Text style={styles.gstnValue}>{profile.taxId}</Text>
            </View>
          )}
          {iecReg && (
            <Text style={styles.iecLine}>
              IEC: {iecReg.value}
            </Text>
          )}
        </View>
      </View>

      {/* Company info + Invoice No */}
      <View style={styles.companyRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.companyName}>
            {profile.name || "Your Business"}
          </Text>
          <Text style={styles.companyAddress}>
            {profile.address.street && `${profile.address.street}, ${profile.address.city}${profile.address.zip ? ` - ${profile.address.zip}` : ""}`}
          </Text>
          {profile.address2?.street && (
            <Text style={styles.companyAddress}>
              {profile.address2.street}, {profile.address2.city}
              {profile.address2.zip ? ` - ${profile.address2.zip}` : ""}
            </Text>
          )}
          {(profile.email || profile.phone) && (
            <Text style={[styles.companyAddress, { marginTop: 1 }]}>
              {[profile.email, profile.phone].filter(Boolean).join("  |  ")}
            </Text>
          )}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.invoiceNoLabel}>INVOICE No.</Text>
          <Text style={styles.invoiceNoValue}>{invoice.invoiceNumber}</Text>
        </View>
      </View>

      {/* Registration Numbers */}
      {otherRegistrations.length > 0 && (
        <View style={styles.regBanner}>
          {otherRegistrations.map((r) => (
            <Text key={r.id} style={styles.regItem}>
              <Text style={styles.regLabel}>{r.label}: </Text>
              {r.value}
            </Text>
          ))}
        </View>
      )}

      {/* Reverse Charge */}
      {invoice.reverseCharge && (
        <Text style={styles.reverseCharge}>
          Tax is payable on reverse charge basis
        </Text>
      )}

      {/* TAX INVOICE */}
      <Text style={styles.taxInvoiceHeading}>Tax Invoice</Text>

      {/* Meta row */}
      <View style={styles.metaRow}>
        <Text>
          <Text style={styles.metaLabel}>Date: </Text>
          <Text style={styles.metaValue}>
            {formatDateIndia(invoice.issueDate)}
          </Text>
        </Text>
        {invoice.placeOfSupply && (
          <Text>
            <Text style={styles.metaLabel}>Place of Supply: </Text>
            <Text style={styles.metaValue}>
              {getStateName(invoice.placeOfSupply)} ({invoice.placeOfSupply})
            </Text>
          </Text>
        )}
        <Text>
          <Text style={styles.metaLabel}>Tax Type: </Text>
          <Text style={styles.metaValue}>
            {gstType === "intrastate" ? "CGST + SGST" : "IGST"}
          </Text>
        </Text>
      </View>

      {/* Bill To / Ship To */}
      <View style={styles.addressGrid}>
        <View style={styles.addressBox}>
          <Text style={styles.addressTitle}>Bill To</Text>
          {client ? (
            <>
              <Text style={styles.addressName}>{client.name}</Text>
              {client.taxId && (
                <Text style={styles.addressLine}>GSTIN: {client.taxId}</Text>
              )}
              {client.address.street && (
                <Text style={styles.addressLine}>{client.address.street}</Text>
              )}
              {client.address.city && (
                <Text style={styles.addressLine}>
                  {client.address.city}
                  {client.address.state ? `, ${client.address.state}` : ""}{" "}
                  {client.address.zip}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.addressLine}>Unknown client</Text>
          )}
        </View>
        <View style={styles.addressBox}>
          <Text style={styles.addressTitle}>Ship To</Text>
          {invoice.shipToAddress?.street ? (
            <>
              <Text style={styles.addressName}>
                {invoice.shipToName || client?.name}
              </Text>
              <Text style={styles.addressLine}>
                {invoice.shipToAddress.street}
              </Text>
              {invoice.shipToAddress.city && (
                <Text style={styles.addressLine}>
                  {invoice.shipToAddress.city}
                  {invoice.shipToAddress.state
                    ? `, ${invoice.shipToAddress.state}`
                    : ""}{" "}
                  {invoice.shipToAddress.zip}
                </Text>
              )}
            </>
          ) : client ? (
            <>
              <Text style={styles.addressName}>{client.name}</Text>
              {client.address.street && (
                <Text style={styles.addressLine}>{client.address.street}</Text>
              )}
              {client.address.city && (
                <Text style={styles.addressLine}>
                  {client.address.city}
                  {client.address.state ? `, ${client.address.state}` : ""}{" "}
                  {client.address.zip}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.addressLine}>Same as Bill To</Text>
          )}
        </View>
      </View>

      {/* Line Items Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.thText, styles.colDesc]}>Description</Text>
          <Text style={[styles.thText, styles.colHsn]}>HSN/SAC</Text>
          <Text style={[styles.thText, styles.colQty]}>Qty</Text>
          <Text style={[styles.thText, styles.colPrice]}>Unit Price</Text>
          <Text style={[styles.thText, styles.colGst]}>GST</Text>
          <Text style={[styles.thText, styles.colTaxable]}>Taxable</Text>
        </View>
        {invoice.lineItems.map((item) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={[styles.tdText, styles.colDesc]}>
              {item.description}
            </Text>
            <Text
              style={[styles.tdText, styles.colHsn, { color: "#666" }]}
            >
              {item.hsnSacCode || "—"}
            </Text>
            <Text style={[styles.tdText, styles.colQty]}>
              {item.quantity} {item.unit || "PCS"}
            </Text>
            <Text style={[styles.tdText, styles.colPrice]}>
              {formatCurrency(item.unitPrice)}
            </Text>
            <Text
              style={[styles.tdText, styles.colGst, { color: "#666" }]}
            >
              {item.taxRate > 0
                ? gstType === "intrastate"
                  ? `${item.taxRate / 2}+${item.taxRate / 2}%`
                  : `${item.taxRate}%`
                : "Nil"}
            </Text>
            <Text
              style={[
                styles.tdText,
                styles.colTaxable,
                { fontFamily: "Helvetica-Bold" },
              ]}
            >
              {formatCurrency(item.amount)}
            </Text>
          </View>
        ))}
      </View>

      {/* Transport & E-Way Bill */}
      {(invoice.transporter?.name || invoice.ewayBill?.ewayBillNumber) && (
        <View style={styles.transportSection}>
          {invoice.transporter?.name && (
            <View style={styles.transportBox}>
              <Text style={styles.transportTitle}>Transporter Details</Text>
              <Text style={styles.transportLine}>
                {invoice.transporter.name}
              </Text>
              {invoice.transporter.transporterId && (
                <Text style={styles.transportLine}>
                  GSTIN: {invoice.transporter.transporterId}
                </Text>
              )}
              {invoice.transporter.docNumber && (
                <Text style={styles.transportLine}>
                  GR/LR No: {invoice.transporter.docNumber}
                  {invoice.transporter.docDate
                    ? ` — ${formatDateIndia(invoice.transporter.docDate)}`
                    : ""}
                </Text>
              )}
              {invoice.transporter.vehicleNumber && (
                <Text style={styles.transportLine}>
                  Vehicle: {invoice.transporter.vehicleNumber}
                </Text>
              )}
            </View>
          )}
          {invoice.ewayBill?.ewayBillNumber && (
            <View style={styles.transportBox}>
              <Text style={styles.transportTitle}>E-Way Bill</Text>
              <Text style={[styles.transportLine, { fontFamily: "Helvetica-Bold", fontSize: 9 }]}>
                {invoice.ewayBill.ewayBillNumber}
              </Text>
              {invoice.ewayBill.ewayBillDate && (
                <Text style={styles.transportLine}>
                  Generated: {formatDateIndia(invoice.ewayBill.ewayBillDate)}
                </Text>
              )}
              {invoice.ewayBill.validUntil && (
                <Text style={styles.transportLine}>
                  Valid until: {formatDateIndia(invoice.ewayBill.validUntil)}
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Bank Details + Totals */}
      <View style={styles.bankTotalsRow}>
        <View style={{ flex: 1 }}>
          {hasBankDetails && (
            <View style={styles.bankBox}>
              <Text style={styles.bankTitle}>Bank Details</Text>
              <Text style={styles.bankBold}>
                {profile.bankDetails!.accountHolder || profile.name}
              </Text>
              <Text style={styles.bankLine}>
                {profile.bankDetails!.bankName}
                {profile.bankDetails!.branch
                  ? `, ${profile.bankDetails!.branch}`
                  : ""}
              </Text>
              <Text style={styles.bankLine}>
                A/c: {profile.bankDetails!.accountNumber}
              </Text>
              <Text style={styles.bankLine}>
                IFSC: {profile.bankDetails!.ifscCode}
              </Text>
              {profile.bankDetails!.upiId && (
                <Text style={styles.bankLine}>
                  UPI: {profile.bankDetails!.upiId}
                </Text>
              )}
            </View>
          )}
          {invoice.notes && (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.bankTitle}>Notes</Text>
              <Text style={[styles.bankLine, { fontSize: 7 }]}>
                {invoice.notes}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Taxable Value</Text>
            <Text style={styles.totalsValue}>
              {formatCurrency(invoice.subtotal)}
            </Text>
          </View>

          {gstGroups.length > 0 && (
            <View style={styles.gstBreakdownBox}>
              <Text style={styles.gstGroupTitle}>GST Breakdown</Text>
              {gstGroups.map((g) =>
                g.rate === 0 ? (
                  <View key={g.rate} style={styles.totalsRow}>
                    <Text style={[styles.totalsLabel, { fontSize: 7 }]}>
                      0% GST (Nil/Exempt)
                    </Text>
                    <Text style={[styles.totalsValue, { fontSize: 7, color: "#888" }]}>
                      —
                    </Text>
                  </View>
                ) : gstType === "intrastate" ? (
                  <View key={g.rate}>
                    <Text style={styles.gstGroupNote}>
                      @ {g.rate}% on {formatCurrency(g.taxableAmount)}
                    </Text>
                    <View style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, { fontSize: 7 }]}>
                        CGST @ {g.rate / 2}%
                      </Text>
                      <Text style={[styles.totalsValue, { fontSize: 7 }]}>
                        {formatCurrency(g.cgst)}
                      </Text>
                    </View>
                    <View style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, { fontSize: 7 }]}>
                        SGST @ {g.rate / 2}%
                      </Text>
                      <Text style={[styles.totalsValue, { fontSize: 7 }]}>
                        {formatCurrency(g.sgst)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View key={g.rate}>
                    <Text style={styles.gstGroupNote}>
                      @ {g.rate}% on {formatCurrency(g.taxableAmount)}
                    </Text>
                    <View style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, { fontSize: 7 }]}>
                        IGST @ {g.rate}%
                      </Text>
                      <Text style={[styles.totalsValue, { fontSize: 7 }]}>
                        {formatCurrency(g.igst)}
                      </Text>
                    </View>
                  </View>
                )
              )}
              <View style={[styles.divider, { marginTop: 2 }]} />
              <View style={styles.totalsRow}>
                <Text style={[styles.totalsLabel, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>
                  Total GST
                </Text>
                <Text style={[styles.totalsValue, { fontFamily: "Helvetica-Bold", fontSize: 7 }]}>
                  {formatCurrency(invoice.taxTotal)}
                </Text>
              </View>
            </View>
          )}

          {invoice.discount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount</Text>
              <Text style={[styles.totalsValue, { color: "#dc2626" }]}>
                -{formatCurrency(invoice.discount)}
              </Text>
            </View>
          )}

          <View style={styles.divider} />
          <View style={styles.totalsRow}>
            <Text style={styles.totalsBold}>Total Amount</Text>
            <Text style={styles.totalsBold}>
              {formatCurrency(invoice.total)}
            </Text>
          </View>
          <Text style={styles.totalsWords}>{amountInWords(invoice.total)}</Text>
          {invoice.taxTotal > 0 && (
            <Text style={styles.totalsWords}>
              GST: {amountInWords(invoice.taxTotal)}
            </Text>
          )}

          {invoice.amountPaid > 0 && (
            <>
              <View style={styles.totalsRow}>
                <Text style={[styles.totalsLabel, { fontSize: 7 }]}>Paid</Text>
                <Text style={[styles.totalsValue, { fontSize: 7, color: "#059669" }]}>
                  -{formatCurrency(invoice.amountPaid)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.totalsRow}>
                <Text style={[styles.totalsLabel, { fontFamily: "Helvetica-Bold" }]}>
                  Balance Due
                </Text>
                <Text style={[styles.totalsValue, { fontFamily: "Helvetica-Bold" }]}>
                  {formatCurrency(invoice.balanceDue)}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.declaration}>
            Certified that the particulars given above are true and correct.
          </Text>
          <Text style={styles.declaration}>
            Payment should be made at the presentation of the invoice.
          </Text>
          <Text style={styles.declaration}>
            Subject to Delhi Jurisdiction Only.
          </Text>
        </View>
        <View style={styles.signatoryBox}>
          {profile.stampImage && (
            <Image src={profile.stampImage} style={styles.stampImage} />
          )}

          {invoice.dscSignature ? (
            <View style={styles.dscBox}>
              <Text style={styles.dscTitle}>Digitally Signed</Text>
              <Text style={styles.dscDetail}>{invoice.dscSignature.certHolder}</Text>
              <Text style={styles.dscDetail}>CA: {invoice.dscSignature.issuingCA}</Text>
              <Text style={styles.dscDetail}>
                Date: {formatDateIndia(invoice.dscSignature.signedAt)}
              </Text>
              <Text style={styles.dscHash}>
                {invoice.dscSignature.signatureHash.slice(0, 32)}…
              </Text>
            </View>
          ) : (profile.signatureMode ?? "manual") === "image" && profile.signatureImage ? (
            <Image src={profile.signatureImage} style={styles.signatureImage} />
          ) : (
            <View style={styles.manualLine} />
          )}

          <Text style={styles.signatoryName}>
            {profile.authorizedSignatory || profile.name}
          </Text>
          <Text style={styles.signatoryLabel}>Authorized Signatory</Text>
        </View>
      </View>
    </Page>
  );
}

export function InvoicePDF({ invoice, client, profile }: InvoicePDFProps) {
  return (
    <Document>
      <InvoiceCopy
        invoice={invoice}
        client={client}
        profile={profile}
        copyLabel="Original Copy for Buyer"
      />
      <InvoiceCopy
        invoice={invoice}
        client={client}
        profile={profile}
        copyLabel="Duplicate Copy for Transporter"
      />
    </Document>
  );
}
