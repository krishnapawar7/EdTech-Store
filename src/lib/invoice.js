import { calculateGSTBreakdown } from "./pricing";
export function generateInvoiceHtml(data) {
    const gst = calculateGSTBreakdown(data.totalPaise);
    const formatINR = (paise) => {
        return (paise / 100).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };
    const itemRows = data.items
        .map((item, index) => {
        const itemGst = calculateGSTBreakdown(item.finalPricePaise);
        return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${index + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">
          <strong>${escapeHtml(item.title)}</strong>
          ${item.upgradeCreditPaise > 0
            ? `<br><span style="color: #059669; font-size: 11px;">(Includes ₹${formatINR(item.upgradeCreditPaise)} upgrade credit)</span>`
            : ""}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: center;">9992</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right;">₹${formatINR(item.unitPricePaise)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right;">₹${formatINR(itemGst.basePaise)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right;">₹${formatINR(itemGst.cgstPaise)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right;">₹${formatINR(itemGst.sgstPaise)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right; font-weight: bold;">₹${formatINR(item.finalPricePaise)}</td>
      </tr>
    `;
    })
        .join("");
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${escapeHtml(data.orderNumber)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      margin: 0;
      padding: 30px;
      background: #f9fafb;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border: 1px solid #e5e7eb;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #4f46e5;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .company-title {
      font-size: 24px;
      font-weight: 800;
      color: #4f46e5;
      margin: 0 0 5px 0;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      background: #dcfce7;
      color: #15803d;
      font-size: 12px;
      font-weight: 600;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .table th {
      background: #f3f4f6;
      padding: 10px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      color: #4b5563;
      border-bottom: 2px solid #e5e7eb;
    }
    .summary-box {
      margin-left: auto;
      width: 320px;
      border-collapse: collapse;
    }
    .summary-box td {
      padding: 6px 10px;
      font-size: 13px;
    }
    .total-row {
      border-top: 2px solid #1f2937;
      font-weight: bold;
      font-size: 16px;
      color: #111827;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
    .no-print {
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
      gap: 12px;
    }
    .btn {
      background: #4f46e5;
      color: white;
      padding: 10px 20px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      border: none;
    }
    @media print {
      body { background: white; padding: 0; }
      .invoice-card { box-shadow: none; border: none; padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="invoice-card">
    <div class="header">
      <div>
        <h1 class="company-title">ED-TECH STORE</h1>
        <div style="font-size: 13px; color: #4b5563;">
          EdTech Learning Solutions Pvt. Ltd.<br>
          GSTIN: 27AABCE1234F1Z8<br>
          SAC Code: 9992 (Online Educational Services)<br>
          Email: support@edstore.com
        </div>
      </div>
      <div style="text-align: right;">
        <span class="badge">PAID TAX INVOICE</span>
        <div style="margin-top: 10px; font-size: 13px; color: #4b5563;">
          <strong>Invoice No:</strong> ${escapeHtml(data.orderNumber)}<br>
          <strong>Date:</strong> ${escapeHtml(data.invoiceDate)}<br>
          ${data.paymentId
        ? `<strong>Razorpay ID:</strong> ${escapeHtml(data.paymentId)}<br>`
        : ""}
          ${data.paymentMethod
        ? `<strong>Method:</strong> ${escapeHtml(data.paymentMethod).toUpperCase()}<br>`
        : ""}
        </div>
      </div>
    </div>

    <div class="details-grid">
      <div>
        <div style="font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Billed To:</div>
        <div style="font-size: 14px; font-weight: 600; color: #111827;">${escapeHtml(data.customerName)}</div>
        <div style="font-size: 13px; color: #4b5563;">
          Email: ${escapeHtml(data.customerEmail)}<br>
          ${data.customerPhone ? `Phone: ${escapeHtml(data.customerPhone)}<br>` : ""}
          State: Maharashtra (27)
        </div>
      </div>
      <div>
        <div style="font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Supply Type:</div>
        <div style="font-size: 13px; color: #4b5563;">
          Intra-State Digital Learning Supply<br>
          Place of Supply: State of Maharashtra<br>
          Applicable Tax: CGST 9% + SGST 9% (Total 18%)
        </div>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Item Description</th>
          <th style="text-align: center;">SAC</th>
          <th style="text-align: right;">MRP</th>
          <th style="text-align: right;">Taxable Val</th>
          <th style="text-align: right;">CGST 9%</th>
          <th style="text-align: right;">SGST 9%</th>
          <th style="text-align: right;">Total (INR)</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <table class="summary-box">
      <tr>
        <td style="color: #4b5563;">Gross Catalogue Value:</td>
        <td style="text-align: right;">₹${formatINR(data.subtotalPaise)}</td>
      </tr>
      ${data.upgradeCreditPaise > 0
        ? `<tr>
        <td style="color: #059669;">Upgrade Credit:</td>
        <td style="text-align: right; color: #059669;">- ₹${formatINR(data.upgradeCreditPaise)}</td>
      </tr>`
        : ""}
      ${data.discountPaise > 0
        ? `<tr>
        <td style="color: #059669;">Coupon Discount:</td>
        <td style="text-align: right; color: #059669;">- ₹${formatINR(data.discountPaise)}</td>
      </tr>`
        : ""}
      <tr>
        <td style="color: #4b5563;">Net Taxable Base Amount:</td>
        <td style="text-align: right;">₹${formatINR(gst.basePaise)}</td>
      </tr>
      <tr>
        <td style="color: #4b5563;">Central GST (CGST 9%):</td>
        <td style="text-align: right;">₹${formatINR(gst.cgstPaise)}</td>
      </tr>
      <tr>
        <td style="color: #4b5563;">State GST (SGST 9%):</td>
        <td style="text-align: right;">₹${formatINR(gst.sgstPaise)}</td>
      </tr>
      <tr class="total-row">
        <td>Total Paid (Incl. 18% GST):</td>
        <td style="text-align: right;">₹${formatINR(data.totalPaise)}</td>
      </tr>
    </table>

    <div class="footer">
      <p>This is a computer-generated official tax invoice under Section 31 of CGST Act, 2017. No signature required.</p>
      <p>Thank you for learning with Ed-Tech Store! For any queries, contact billing@edstore.com</p>
    </div>
  </div>
</body>
</html>`;
}
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
