import { useEffect, useState } from "react";
import styles from "./GST.module.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { API } from "../../constants/api";

function GST() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    fetchGSTReports();
  }, []);

  const filtered = reports.filter((item) => {
    const q = search.toLowerCase();
    return (
      !q ||
      String(item.invoiceNo).toLowerCase().includes(q) ||
      String(item.distributor).toLowerCase().includes(q) ||
      String(item.gstin || "").toLowerCase().includes(q)
    );
  });
  
  const exportPDF = () => {
  const doc = new jsPDF("landscape");

  doc.setFontSize(16);
  doc.text("GST Purchase Register", 14, 15);

  const tableColumn = [
    "S.No",
    "Date",
    "Invoice No",
    "Invoice Date",
    "Distributor",
    "GSTIN",
    "Goods Amt",
    "GST 0%",
    "GST 5%",
    "GST 12%",
    "GST 18%",
    "GST 28%",
  ];

  const tableRows = filtered.map((item, idx) => [
    item.sno ?? idx + 1,
    new Date(item.date).toLocaleDateString("en-IN"),
    item.invoiceNo,
    new Date(item.invoiceDate).toLocaleDateString("en-IN"),
    item.distributor,
    item.gstin || "N/A",
    item.goodsAmount || 0,
    item.gst0 || 0,
    item.gst5 || 0,
    item.gst12 || 0,
    item.gst18 || 0,
    item.gst28 || 0,
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 25,
    styles: {
      fontSize: 8,
    },
    headStyles: {
      fillColor: [30, 41, 59],
    },
  });

  doc.save("GST_Purchase_Register.pdf");
};

const exportExcel = () => {
  const excelData = filtered.map((item, idx) => ({
    "S.No": item.sno ?? idx + 1,
    Date: new Date(item.date).toLocaleDateString("en-IN"),
    "Invoice No": item.invoiceNo,
    "Invoice Date": new Date(item.invoiceDate).toLocaleDateString(
      "en-IN"
    ),
    Distributor: item.distributor,
    GSTIN: item.gstin || "N/A",
    "Goods Amt": item.goodsAmount || 0,
    "GST 0%": item.gst0 || 0,
    "GST 5%": item.gst5 || 0,
    "GST 12%": item.gst12 || 0,
    "GST 18%": item.gst18 || 0,
    "GST 28%": item.gst28 || 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "GST Report"
  );

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const data = new Blob([excelBuffer], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  });

  saveAs(data, "GST_Purchase_Register.xlsx");
};

  const fetchGSTReports = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
              `${API.gst}`,
              {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success && data.data) {
        setReports(data.data);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (val) =>
    val !== undefined && val !== null && val !== ""
      ? `₹ ${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      : "—";

  const totalGoods = filtered.reduce(
    (sum, i) => sum + (Number(i.goodsAmount) || 0),
    0
  );

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Gst purchase register</h1>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total goods value</span>
            <span className={styles.statValue}>
              ₹{" "}
              {totalGoods.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total records</span>
            <span className={styles.statValue}>{filtered.length}</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <svg
            className={styles.searchIcon}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.exportWrapper}>
  <button
    className={styles.exportBtn}
    onClick={() => setShowExportMenu(!showExportMenu)}
  >
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>

    Export
  </button>

  {showExportMenu && (
    <div className={styles.exportMenu}>
      <button
        className={styles.exportOption}
        onClick={() => {
          exportPDF();
          setShowExportMenu(false);
        }}
      >
        Export as PDF
      </button>

      <button
        className={styles.exportOption}
        onClick={() => {
          exportExcel();
          setShowExportMenu(false);
        }}
      >
        Export as Excel
      </button>
    </div>
  )}
</div>
         
      </div>

      {/* Table */}
      {/* Table */}
<div className={styles.tableCard}>
  <div className={styles.tableWrapper}>
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.thCenter}>S.No</th>
          <th>Date</th>
          <th>Invoice no</th>
          <th>Invoice date</th>
          <th>Distributor</th>
          <th>Gstin</th>
          <th className={styles.thRight}>Goods amt</th>
          <th className={styles.thRight}>Gst 0%</th>
          <th className={styles.thRight}>Gst 5%</th>
          <th className={styles.thRight}>Gst 12%</th>
          <th className={styles.thRight}>Gst 18%</th>
          <th className={styles.thRight}>Gst 28%</th>
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <tr>
            <td colSpan="12">
              <div className={styles.tableLoader}>
                <div className={styles.spinner}></div>
                <p>Fetching records...</p>
              </div>
            </td>
          </tr>
        ) : filtered.length === 0 ? (
          <tr>
            <td colSpan="12">
              <div className={styles.emptyState}>No records found</div>
            </td>
          </tr>
        ) : (
          filtered.map((item, idx) => (
            <tr key={item.sno || idx} className={styles.row}>
              <td className={styles.tdCenter}>
                <span className={styles.sno}>{item.sno ?? idx + 1}</span>
              </td>
              <td className={styles.dateCell}>
                {new Date(item.date).toLocaleDateString("en-IN")}
              </td>
              <td>
                <span className={styles.invoiceTag}>{item.invoiceNo}</span>
              </td>
              <td className={styles.dateCell}>
                {new Date(item.invoiceDate).toLocaleDateString("en-IN")}
              </td>
              <td className={styles.distributor}>{item.distributor}</td>
              <td>
                {item.gstin ? (
                  <span className={styles.gstin}>{item.gstin}</span>
                ) : (
                  <span className={styles.naTag}>N/A</span>
                )}
              </td>
              <td className={styles.amount}>{fmt(item.goodsAmount)}</td>
              <td className={styles.gstCell}>{fmt(item.gst0)}</td>
              <td className={styles.gstCell}>{fmt(item.gst5)}</td>
              <td className={styles.gstCell}>{fmt(item.gst12)}</td>
              <td className={styles.gstCell}>{fmt(item.gst18)}</td>
              <td className={styles.gstCell}>{fmt(item.gst28)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>

  {!loading && filtered.length > 0 && (
    <div className={styles.tableFooter}>
      <span className={styles.footerText}>
        Showing {filtered.length} of {reports.length} records
      </span>
    </div>
  )}
</div>
    </div>
  );
}

export default GST;