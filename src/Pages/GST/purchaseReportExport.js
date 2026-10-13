import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ==========================================
// COMMON HELPERS
// ==========================================

const formatDate = (date) => {
  if (!date) return "-";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "-";
  }

  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "-";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "-";
  }

  return value.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const amount = (value) => {
  return Number(value || 0).toFixed(2);
};

// ==========================================
// NORMALIZE PURCHASE DATA
// ==========================================

const preparePurchaseRows = (data = []) => {
  const seenPurchases = new Set();

  return data.map((row, index) => {
    const item = row.item || {};

    // Same purchase/bill identification
    const purchaseKey =
      row.documentId ||
      row.grnNo ||
      row.invoiceNo ||
      row.auditId;

    // First product of this purchase only
    const isFirstProduct = !seenPurchases.has(purchaseKey);

    if (isFirstProduct) {
      seenPurchases.add(purchaseKey);
    }

    return {
      "S.No": index + 1,

      "GRN No": isFirstProduct
        ? row.grnNo || "-"
        : "",

      "Invoice No": isFirstProduct
        ? row.invoiceNo || "-"
        : "",

      "GRN Date": isFirstProduct
        ? formatDate(row.grnDate)
        : "",

      // Supplier only for first product
      Supplier: isFirstProduct
        ? row.supplierName || "-"
        : "",

      "Supplier GST No": isFirstProduct
        ? row.supplierGstNumber || "-"
        : "",

      "Place of Supply": isFirstProduct
        ? row.placeOfSupply || "-"
        : "",

      "HSN Code": item.hsnCode || "-",

      "Item Name": item.itemName || "-",

      Quantity:
        item.qty !== undefined &&
          item.qty !== null &&
          item.qty !== ""
          ? Number(item.qty)
          : "-",

      Unit: item.unit || "-",

      "Cost Price": amount(item.costPrice),

      "GST Rate":
        item.gstRate !== undefined &&
          item.gstRate !== null &&
          item.gstRate !== ""
          ? `${item.gstRate}%`
          : "-",

      "CGST Rate":
        item.cgstRate !== undefined &&
          item.cgstRate !== null &&
          item.cgstRate !== ""
          ? `${item.cgstRate}%`
          : "-",

      "SGST Rate":
        item.sgstRate !== undefined &&
          item.sgstRate !== null &&
          item.sgstRate !== ""
          ? `${item.sgstRate}%`
          : "-",

      "CGST Amount": amount(item.cgstAmount),

      "SGST Amount": amount(item.sgstAmount),

      "Tax Amount": amount(item.taxAmount),

      "Item Total": amount(item.itemTotalAmount),


      "Total CGST": isFirstProduct
        ? amount(row.cgstAmount)
        : "",

      "Total SGST": isFirstProduct
        ? amount(row.sgstAmount)
        : "",

      "Total GST": isFirstProduct
        ? amount(row.totalGstAmount)
        : "",

      "Total Item Amount": isFirstProduct
        ? amount(row.itemsTotal)
        : "",

      // These are bill-level too, so optionally first row only
      "Payment Mode": isFirstProduct
        ? row.paymentMethod || "-"
        : "",

    };
  });
};

// ==========================================
// EXCEL EXPORT
// ==========================================

export const exportPurchaseReportExcel = (data = []) => {
  if (!data.length) {
    alert("No purchase report data available");
    return;
  }

  const rows = preparePurchaseRows(data);

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // COLUMN WIDTHS
  worksheet["!cols"] = [
    { wch: 7 },  // S.No
    { wch: 22 }, // GRN
    { wch: 18 }, // Invoice
    { wch: 15 }, // GRN Date
    { wch: 25 }, // Supplier
    { wch: 22 }, // GST
    { wch: 25 }, // Item
    { wch: 12 }, // Item Index
    { wch: 15 }, // HSN
    { wch: 10 }, // Unit
    { wch: 10 }, // Qty
    { wch: 10 }, // Free Qty
    { wch: 12 }, // MRP
    { wch: 16 }, // Purchase Price
    { wch: 14 }, // CGST
    { wch: 14 }, // SGST
    { wch: 14 }, // IGST
    { wch: 14 }, // Tax
    { wch: 18 }, // User
    { wch: 15 }, // Role
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Purchase Report"
  );

  const today = new Date()
    .toLocaleDateString("en-GB")
    .replaceAll("/", "-");

  XLSX.writeFile(
    workbook,
    `Purchase_Report_${today}.xlsx`
  );
};

// ==========================================
// PDF EXPORT
// ==========================================

export const exportPurchaseReportPDF = (data = []) => {
  if (!data.length) {
    alert("No purchase report data available");
    return;
  }

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a3",
  });

  const today = new Date().toLocaleDateString("en-IN");

  // ==========================================
  // TITLE
  // ==========================================

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("AR TRADERS", doc.internal.pageSize.width / 2, 14, {
    align: "center",
  });

  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.text(
    "Purchase Item-wise Audit Report",
    doc.internal.pageSize.width / 2,
    20,
    {
      align: "center",
    }
  );

  doc.setFontSize(9);
  doc.text(`Generated On: ${today}`, 14, 26);

  doc.text(`Total Records: ${data.length}`, 14, 31);


  // ==========================================
  // TABLE
  // ==========================================

  const rows = preparePurchaseRows(data);

  const tableBody = rows.map((row) => [
    row["S.No"],
    row["GRN No"],
    row["Invoice No"],
    row["GRN Date"],
    row["Supplier"],
    row["Supplier GST No"],
    row["Place of Supply"],
    row["HSN Code"],
    row["Item Name"],
    row["Quantity"],
    row["Unit"],
    row["Cost Price"],
    row["GST Rate"],
    row["CGST Rate"],
    row["SGST Rate"],
    row["CGST Amount"],
    row["SGST Amount"],
    row["Tax Amount"],
    row["Item Total"],
    row["Total CGST"],
    row["Total SGST"],
    row["Total GST"],
    row["Total Item Amount"],
    row["Payment Mode"],
  ]);

  autoTable(doc, {
    startY: 32,

    head: [
      [
        "S.No",
        "GRN No",
        "Invoice",
        "GRN Date",
        "Supplier",
        "Supplier GST",
        "Place of Supply",
        "HSN",
        "Item Name",
        "Qty",
        "Unit",
        "Cost Price",
        "GST Rate",
        "CGST Rate",
        "SGST Rate",
        "CGST Amount",
        "SGST Amount",
        "Tax Amount",
        "Item Total",
        "Total CGST",
        "Total SGST",
        "Total GST",
        "Total Item Amount",
        "Payment Mode",

      ],
    ],
    body: tableBody,

    theme: "grid",

    styles: {
      fontSize: 6.5,
      cellPadding: 2,
      overflow: "linebreak",
      valign: "middle",
    },

    headStyles: {
      fillColor: [3, 85, 85],
      textColor: 255,
      fontStyle: "bold",
    },

    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },

    margin: {
      left: 8,
      right: 8,
    },

    didDrawPage: (dataArg) => {
      const pageCount =
        doc.internal.getNumberOfPages();

      doc.setFontSize(8);

      doc.text(
        `Page ${pageCount}`,
        doc.internal.pageSize.width - 25,
        doc.internal.pageSize.height - 8
      );
    },
  });

  const fileDate = new Date()
    .toLocaleDateString("en-GB")
    .replaceAll("/", "-");

  doc.save(`Purchase_Report_${fileDate}.pdf`);
};