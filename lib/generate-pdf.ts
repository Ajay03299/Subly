import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Generate ORDER PDF                                                 */
/* ------------------------------------------------------------------ */

interface OrderPdfData {
  subscriptionNo: string;
  status: string;
  customerEmail: string;
  planName?: string;
  startDate?: string;
  endDate?: string | null;
  createdAt?: string;
  lines: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    amount: number;
  }>;
  discountCode?: string;
  discountAmount?: number;
  subtotal: number;
  taxBreakdown?: Array<{ rate: number; name: string; amount: number }>;
  taxAmount: number;
  totalAmount: number;
}

export function generateOrderPdf(data: OrderPdfData) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(22);
  doc.setTextColor(33, 33, 33);
  doc.text("Subscription Order", 14, 22);

  // Order number and status
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Order: ${data.subscriptionNo}`, 14, 32);
  doc.text(`Status: ${data.status}`, 14, 38);
  doc.text(`Date: ${fmtDate(data.createdAt)}`, 14, 44);

  // Customer info
  doc.setFontSize(11);
  doc.setTextColor(33, 33, 33);
  doc.text("Customer", 14, 56);
  doc.setTextColor(100, 100, 100);
  doc.text(data.customerEmail, 14, 62);

  // Plan info
  if (data.planName) {
    doc.setTextColor(33, 33, 33);
    doc.text("Subscription Plan", 110, 56);
    doc.setTextColor(100, 100, 100);
    doc.text(data.planName, 110, 62);
    if (data.startDate) {
      doc.text(`Start: ${fmtDate(data.startDate)}`, 110, 68);
    }
    if (data.endDate) {
      doc.text(`End: ${fmtDate(data.endDate)}`, 110, 74);
    }
  }

  // Separator
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 80, 196, 80);

  // Products table
  const tableBody = data.lines.map((line) => [
    line.productName,
    String(line.quantity),
    formatCurrency(line.unitPrice),
    line.taxRate > 0 ? `${line.taxRate}%` : "—",
    formatCurrency(line.amount),
  ]);

  autoTable(doc, {
    startY: 85,
    head: [["Product", "Qty", "Unit Price", "Tax", "Amount"]],
    body: tableBody,
    theme: "striped",
    headStyles: {
      fillColor: [41, 41, 41],
      textColor: [255, 255, 255],
      fontSize: 10,
    },
    bodyStyles: { fontSize: 9.5 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: "center", cellWidth: 25 },
      2: { halign: "right", cellWidth: 35 },
      3: { halign: "right", cellWidth: 25 },
      4: { halign: "right", cellWidth: 35 },
    },
    margin: { left: 14, right: 14 },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable?.finalY ?? 140;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);

  const totalsX = 140;
  const amountX = 190;
  let y = finalY + 12;

  doc.text("Untaxed Amount", totalsX, y);
  doc.text(formatCurrency(data.subtotal), amountX, y, { align: "right" });

  // Discount
  if (data.discountAmount && data.discountAmount > 0) {
    y += 7;
    doc.setTextColor(34, 139, 34); // Green color
    const discountLabel = data.discountCode ? `Discount (${data.discountCode})` : "Discount";
    doc.text(discountLabel, totalsX, y);
    doc.text(`−${formatCurrency(data.discountAmount)}`, amountX, y, { align: "right" });
    doc.setTextColor(100, 100, 100); // Reset color
  }

  // Tax breakdown
  if (data.taxBreakdown && data.taxBreakdown.length > 0) {
    data.taxBreakdown.forEach((tax) => {
      y += 7;
      doc.text(tax.name, totalsX, y);
      doc.text(formatCurrency(tax.amount), amountX, y, { align: "right" });
    });
  } else {
    y += 7;
    doc.text("Tax", totalsX, y);
    doc.text(formatCurrency(data.taxAmount), amountX, y, { align: "right" });
  }

  y += 2;
  doc.setDrawColor(180, 180, 180);
  doc.line(totalsX, y, amountX, y);

  y += 7;
  doc.setFontSize(12);
  doc.setTextColor(33, 33, 33);
  doc.text("Total", totalsX, y);
  doc.text(formatCurrency(data.totalAmount), amountX, y, { align: "right" });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text(
    `Generated on ${new Date().toLocaleDateString("en-IN")} — Subly Subscription Management`,
    14,
    285
  );

  doc.save(`Order_${data.subscriptionNo}.pdf`);
}

/* ------------------------------------------------------------------ */
/*  Generate INVOICE PDF                                               */
/* ------------------------------------------------------------------ */

interface InvoicePdfData {
  invoiceNo: string;
  subscriptionNo: string;
  status: string;
  customerEmail: string;
  invoiceDate: string;
  dueDate?: string | null;
  paymentTerm?: string;
  lines: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    taxName?: string;
    amount: number;
  }>;
  discountCode?: string;
  discountAmount?: number;
  subtotal: number;
  taxBreakdown?: Array<{ name: string; amount: number }>;
  taxAmount: number;
  totalAmount: number;
  isPaid: boolean;
  paidDate?: string | null;
  amountDue: number;
}

export function generateInvoicePdf(data: InvoicePdfData) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(22);
  doc.setTextColor(33, 33, 33);
  doc.text("Invoice", 14, 22);

  // Invoice metadata
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Invoice: ${data.invoiceNo}`, 14, 32);
  doc.text(`Source: ${data.subscriptionNo}`, 14, 38);
  doc.text(`Status: ${data.status}`, 14, 44);

  // Right side metadata
  doc.setTextColor(33, 33, 33);
  doc.text("Invoice Date", 120, 32);
  doc.setTextColor(100, 100, 100);
  doc.text(fmtDate(data.invoiceDate), 120, 38);

  doc.setTextColor(33, 33, 33);
  doc.text("Due Date", 160, 32);
  doc.setTextColor(100, 100, 100);
  doc.text(fmtDate(data.dueDate), 160, 38);

  // Customer
  doc.setFontSize(11);
  doc.setTextColor(33, 33, 33);
  doc.text("Customer", 14, 56);
  doc.setTextColor(100, 100, 100);
  doc.text(data.customerEmail, 14, 62);

  if (data.paymentTerm) {
    doc.setTextColor(33, 33, 33);
    doc.text("Payment Term", 120, 56);
    doc.setTextColor(100, 100, 100);
    doc.text(data.paymentTerm, 120, 62);
  }

  // Separator
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 70, 196, 70);

  // Products table
  const tableBody = data.lines.map((line) => [
    line.productName,
    String(line.quantity),
    formatCurrency(line.unitPrice),
    line.taxRate && line.taxRate > 0 ? `${line.taxRate}%` : "—",
    formatCurrency(line.amount),
  ]);

  autoTable(doc, {
    startY: 75,
    head: [["Product", "Qty", "Unit Price", "Tax", "Amount"]],
    body: tableBody,
    theme: "striped",
    headStyles: {
      fillColor: [41, 41, 41],
      textColor: [255, 255, 255],
      fontSize: 10,
    },
    bodyStyles: { fontSize: 9.5 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: "center", cellWidth: 25 },
      2: { halign: "right", cellWidth: 35 },
      3: { halign: "right", cellWidth: 25 },
      4: { halign: "right", cellWidth: 35 },
    },
    margin: { left: 14, right: 14 },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable?.finalY ?? 130;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);

  const totalsX = 130;
  const amountX = 190;
  let y = finalY + 12;

  doc.text("Untaxed Amount", totalsX, y);
  doc.text(formatCurrency(data.subtotal), amountX, y, { align: "right" });

  // Discount
  if (data.discountAmount && data.discountAmount > 0) {
    y += 7;
    doc.setTextColor(34, 139, 34); // Green color
    const discountLabel = data.discountCode ? `Discount (${data.discountCode})` : "Discount";
    doc.text(discountLabel, totalsX, y);
    doc.text(`−${formatCurrency(data.discountAmount)}`, amountX, y, { align: "right" });
    doc.setTextColor(100, 100, 100); // Reset color
  }

  // Tax breakdown
  if (data.taxBreakdown && data.taxBreakdown.length > 0) {
    data.taxBreakdown.forEach((tax) => {
      y += 7;
      doc.text(tax.name, totalsX, y);
      doc.text(formatCurrency(tax.amount), amountX, y, { align: "right" });
    });
  } else {
    y += 7;
    doc.text("Tax", totalsX, y);
    doc.text(formatCurrency(data.taxAmount), amountX, y, { align: "right" });
  }

  y += 2;
  doc.setDrawColor(180, 180, 180);
  doc.line(totalsX, y, amountX, y);

  y += 7;
  doc.setFontSize(12);
  doc.setTextColor(33, 33, 33);
  doc.text("Total", totalsX, y);
  doc.text(formatCurrency(data.totalAmount), amountX, y, { align: "right" });

  // Payment info
  if (data.isPaid && data.paidDate) {
    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(34, 139, 34);
    doc.text(`Paid on ${fmtDate(data.paidDate)}`, totalsX, y);
    doc.text(formatCurrency(data.totalAmount), amountX, y, { align: "right" });
  }

  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(data.amountDue > 0 ? 200 : 33, data.amountDue > 0 ? 50 : 33, data.amountDue > 0 ? 50 : 33);
  doc.text("Amount Due", totalsX, y);
  doc.text(formatCurrency(data.amountDue), amountX, y, { align: "right" });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text(
    `Generated on ${new Date().toLocaleDateString("en-IN")} — Subly Subscription Management`,
    14,
    285
  );

  doc.save(`Invoice_${data.invoiceNo.replace(/\//g, "_")}.pdf`);
}
