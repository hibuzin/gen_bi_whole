import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ======================================================
// HELPERS
// ======================================================

const number = (value) => Number(value || 0);

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// ======================================================
// SALES GST - EXCEL EXPORT
// ======================================================

export const exportSalesReportExcel = (records = []) => {
  if (!records.length) return;

  const rows = records.map((row, index) => {
    const item = row.item || {};

    const isFirstRow =
      index === 0 ||
      records[index - 1]?.documentId !== row.documentId;

    return {
      "S.No": index + 1,

      "Invoice No": row.invoiceNo || "-",

      "Invoice Date": formatDate(row.invoiceDate),

      Customer: row.customerName || "-",

      "Customer GST No": row.customerGstNumber || "-",

      "Place of Supply": row.placeOfSupply || "-",

      "HSN Code": item.hsnCode || "-",

      "Item Name": item.itemName || "-",

      Barcode: item.barcode || "-",

      Quantity: number(item.qty),

      Unit: item.unit || "-",

      Rate: number(item.rate),

      Discount: number(item.discountAmount),

      "Taxable Amount": number(item.taxableAmount),

      "GST Rate": number(item.gstRate),

      "CGST Rate": number(item.cgstRate),

      "SGST Rate": number(item.sgstRate),

      "CGST Amount": number(item.cgstAmount),

      "SGST Amount": number(item.sgstAmount),

      "GST Amount": number(item.gstAmount),

      "Item Total": number(
        item.itemTotalAmount ??
        item.finalAmount ??
        item.totalAmount
      ),

      "Sub Total": isFirstRow
        ? number(row.summary?.subTotal)
        : "",

      "Total GST": isFirstRow
        ? number(row.summary?.totalGST)
        : "",

      "Total CGST": isFirstRow
        ? number(row.summary?.totalCGST)
        : "",

      "Total SGST": isFirstRow
        ? number(row.summary?.totalSGST)
        : "",

      "Total CGST Rate": isFirstRow
        ? number(row.summary?.totalCGSTRate)
        : "",

      "Total SGST Rate": isFirstRow
        ? number(row.summary?.totalSGSTRate)
        : "",

      "Item Discount": isFirstRow
        ? number(row.summary?.itemDiscountAmount)
        : "",

      "Bill Discount": isFirstRow
        ? number(row.summary?.billDiscountAmount)
        : "",

      "Bill Discount %": isFirstRow
        ? number(row.summary?.billDiscountPercentage)
        : "",

      "Loyalty Discount": isFirstRow
        ? number(row.summary?.loyaltyDiscount)
        : "",

      "Grand Total": isFirstRow
        ? number(row.summary?.grandTotal)
        : "",

      "Payment Method": row.paymentMethod || "-",

    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 7 },   // S.No
    { wch: 15 },  // Invoice
    { wch: 15 },  // Invoice Date
    { wch: 22 },  // Customer
    { wch: 20 },  // Customer GST
    { wch: 18 },  // Place
    { wch: 14 },  // HSN
    { wch: 24 },  // Item
    { wch: 14 },  // Barcode
    { wch: 12 },  // Qty
    { wch: 12 },  // Unit
    { wch: 14 },  // Rate
    { wch: 14 },  // Discount
    { wch: 18 },  // Taxable
    { wch: 12 },  // GST Rate
    { wch: 12 },  // CGST Rate
    { wch: 12 },  // SGST Rate
    { wch: 15 },  // CGST Amount
    { wch: 15 },  // SGST Amount
    { wch: 15 },  // GST Amount
    { wch: 16 },  // Item Total
    { wch: 16 },  // Payment
    { wch: 18 },  // User
    { wch: 15 },  // Role
    { wch: 16 },  // Payment
    { wch: 16 },  // Payment
    { wch: 16 },  // Payment
    { wch: 16 },  // Payment
    { wch: 16 },  // Payment
    { wch: 16 },  // Payment
    { wch: 16 },  // Payment
    { wch: 16 },  // Payment
    { wch: 16 },  // Payment
    { wch: 16 },  // Payment
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Sales GST"
  );

  XLSX.writeFile(
    workbook,
    `Sales_GST_Report_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`
  );
};

// ======================================================
// SALES GST - PDF EXPORT
// ======================================================

export const exportSalesReportPDF = (records = []) => {
  if (!records.length) return;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });


  // ====================================================
  // REPORT HEADER
  // ====================================================

  doc.setFont(undefined, "bold");
  doc.setFontSize(16);

  doc.text(
    "AR TRADERS",
    doc.internal.pageSize.width / 2,
    14,
    {
      align: "center",
    }
  );

  doc.setFont(undefined, "normal");
  doc.setFontSize(12);

  doc.text(
    "Purchase Bill Wise Audit Report",
    doc.internal.pageSize.width / 2,
    20,
    {
      align: "center",
    }
  );

  doc.setFontSize(9);

  doc.text(
    `Generated: ${new Date().toLocaleString("en-IN")}`,
    14,
    27
  );

  // ====================================================
  // TABLE
  // ====================================================

  autoTable(doc, {
    startY: 37,

    head: [
      [
        "S.No",
        "Invoice",
        "Invoice Date",
        "Customer",
        "GST No",
        "Place",
        "HSN",
        "Item",
        "Barcode",
        "Qty",
        "Unit",
        "Rate",
        "Discount",
        "Taxable",
        "GST %",
        "CGST %",
        "SGST %",
        "CGST",
        "SGST",
        "GST",
        "Total",
        "Sub Total",
        "Total GST",
        "Total CGST",
        "Total SGST",
        "Grand Total",
        "Payment",
      ],
    ],

    body: records.map((row, index) => {
      const item = row.item || {};

      const isFirstRow =
        index === 0 ||
        records[index - 1]?.documentId !== row.documentId;

      return [
        index + 1,

        row.invoiceNo || "-",

        formatDate(row.invoiceDate),

        row.customerName || "-",

        row.customerGstNumber || "-",

        row.placeOfSupply || "-",

        item.hsnCode || "-",

        item.itemName || "-",

        item.barcode || "-",

        number(item.qty),

        item.unit || "-",

        number(item.rate).toFixed(2),

        number(item.discountAmount).toFixed(2),

        number(item.taxableAmount).toFixed(2),

        `${number(item.gstRate)}%`,

        `${number(item.cgstRate)}%`,

        `${number(item.sgstRate)}%`,

        number(item.cgstAmount).toFixed(2),

        number(item.sgstAmount).toFixed(2),

        number(item.gstAmount).toFixed(2),

        number(
          item.itemTotalAmount ??
          item.finalAmount ??
          item.totalAmount
        ).toFixed(2),

        isFirstRow
          ? number(row.summary?.subTotal).toFixed(2)
          : "",

        isFirstRow
          ? number(row.summary?.totalGST).toFixed(2)
          : "",

        isFirstRow
          ? number(row.summary?.totalCGST).toFixed(2)
          : "",

        isFirstRow
          ? number(row.summary?.totalSGST).toFixed(2)
          : "",

        isFirstRow
          ? number(row.summary?.grandTotal).toFixed(2)
          : "",

        row.paymentMethod || "-",

      ];
    }),

    styles: {
      fontSize: 5.5,
      cellPadding: 1.5,
      overflow: "linebreak",
    },

    headStyles: {
      fontStyle: "bold",
      fontSize: 5.5,
    },

    margin: {
      left: 5,
      right: 5,
    },

    tableWidth: "auto",
  });

  // ====================================================
  // SAVE
  // ====================================================

  doc.save(
    `Sales_GST_Report_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`
  );
};

// ======================================================
// PURCHASE BILL-WISE EXCEL EXPORT
// ======================================================

const flattenPurchaseBillRows = (records = []) =>
  records.map((row, index) => {
    const isFirstRow =
      index === 0 ||
      records[index - 1]?.documentId !== row.documentId;

    return {
      "S.No": index + 1,

      Date: formatDate(
        row.invoiceDate || row.date
      ),

      "Invoice No": row.invoiceNo || "-",

      Customer: row.customerName || "-",

      "Customer GST":
        row.customerGstNumber || "-",

      "Place of Supply":
        row.placeOfSupply || "-",

      "Item Count":
        row.itemCount ??
        row.items?.length ??
        0,

      "Item Names":
        (row.items || [])
          .map((item) => item.itemName)
          .filter(Boolean)
          .join(", "),

      // ONLY FIRST ROW OF BILL
      "Sub Total": isFirstRow
        ? number(row.summary?.subTotal)
        : "",

      GST: isFirstRow
        ? number(row.summary?.totalGST)
        : "",

      "Item Discount": isFirstRow
        ? number(row.summary?.itemDiscountAmount)
        : "",

      "Bill Discount": isFirstRow
        ? number(row.summary?.billDiscountAmount)
        : "",

      "Loyalty Discount": isFirstRow
        ? number(row.summary?.loyaltyDiscount)
        : "",

      "Grand Total": isFirstRow
        ? number(row.summary?.grandTotal)
        : "",

      "Paid Amount": isFirstRow
        ? number(row.paidAmount)
        : "",

      "Pending Amount": isFirstRow
        ? number(row.pendingAmount)
        : "",

      "Payment Method": isFirstRow
        ? row.paymentMethod || "-"
        : "",

      "Payment Status": isFirstRow
        ? row.paymentStatus || "-"
        : "",
    };
  });

export const exportPurchaseBillWiseExcel = (
  records = []
) => {
  if (!records.length) return;

  const rows =
    flattenPurchaseBillRows(records);

  const worksheet =
    XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 7 },
    { wch: 13 },
    { wch: 15 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 11 },
    { wch: 35 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 15 },
    { wch: 16 },
    { wch: 15 },
    { wch: 12 },
    { wch: 14 },
  ];

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Bill Wise"
  );

  XLSX.writeFile(
    workbook,
    `Purchase_Bill_Wise_Audit_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`
  );
};

// ======================================================
// PURCHASE BILL-WISE PDF EXPORT
// ======================================================

export const exportPurchaseBillWisePdf = (
  records = []
) => {
  if (!records.length) return;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  doc.setFontSize(15);

  doc.text(
    "Purchase Bill Wise Audit Report",
    14,
    15
  );

  doc.setFontSize(9);

  doc.text(
    `Generated: ${new Date().toLocaleString("en-IN")}`,
    14,
    21
  );

  const grandTotal = records.reduce(
    (sum, row) =>
      sum +
      number(
        row.summary?.grandTotal
      ),
    0
  );

  const pendingTotal = records.reduce(
    (sum, row) =>
      sum +
      number(row.pendingAmount),
    0
  );

  doc.text(
    `Bills: ${records.length}    ` +
    `Total: Rs. ${grandTotal.toFixed(2)}    ` +
    `Pending: Rs. ${pendingTotal.toFixed(2)}`,
    14,
    27
  );

  autoTable(doc, {
    startY: 32,

    head: [
      [
        "S.No",
        "Date",
        "Invoice",
        "Customer",
        "Items",
        "Sub Total",
        "GST",
        "Grand Total",
        "Paid",
        "Pending",
        "Payment",
        "Status",
        "Action",
      ],
    ],

    body: records.map(
      (row, index) => [
        index + 1,

        formatDate(
          row.invoiceDate ||
          row.date
        ),

        row.invoiceNo || "-",

        row.customerName || "-",

        row.itemCount ??
        row.items?.length ??
        0,

        number(
          row.summary?.subTotal
        ).toFixed(2),

        number(
          row.summary?.totalGST
        ).toFixed(2),

        number(
          row.summary?.grandTotal
        ).toFixed(2),

        number(
          row.paidAmount
        ).toFixed(2),

        number(
          row.pendingAmount
        ).toFixed(2),

        row.paymentMethod || "-",

        row.paymentStatus || "-",

        row.action || "-",
      ]
    ),

    styles: {
      fontSize: 7,
      cellPadding: 2.2,
      overflow: "linebreak",
    },

    headStyles: {
      fontStyle: "bold",
    },

    margin: {
      left: 8,
      right: 8,
    },
  });

  doc.save(
    `Purchase_Bill_Wise_Audit_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`
  );
};