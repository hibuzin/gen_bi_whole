import { useEffect, useState } from "react";
import styles from "./StockManagement.module.css";
import Toast from "../../components/Toast";
import { API } from "../../constants/api";

const TABS = [
  { key: "all", label: "All stocks" },
  { key: "low", label: "Low stock" },
  { key: "out", label: "Out of stock" },
  { key: "bulk", label: "Remaining bulk" },
  { key: "repack", label: "Repack" },
];

function StockManagement() {
  const [stocks, setStocks] = useState([]);
  const [outStocks, setOutStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState("");
  const [bulkStocks, setBulkStocks] = useState([]);
  const [repackStocks, setRepackStocks] = useState([]);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTabData(activeTab);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, activeTab]);

  const getSearchParams = () => {
    const q = search.trim();
    return q ? `?search=${encodeURIComponent(q)}` : "";
  };

  const fetchAll = async () => {
    fetchTabData(activeTab);
  };

  const fetchTabData = async (tab) => {
    try {
      setLoading(true);

      if (tab === "all") {
        await fetchStocks(search);
      } else if (tab === "low") {
        await fetchLowStock();
      } else if (tab === "out") {
        await fetchOutOfStock();
      } else if (tab === "bulk") {
        await fetchBulkStock();
      } else if (tab === "repack") {
        await fetchRepackStock();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStocks = async (searchText = "") => {
    try {
      const token = localStorage.getItem("token");

      const url = searchText.trim()
        ? API.searchStock(searchText)
        : API.stock;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        setStocks(data.data || []);
      } else {
        setStocks([]);
      }
    } catch (err) {
      console.log(err);
      setToast({
        type: "error",
        message: "Failed to load stocks",
      });
    }
  };


  const fetchLowStock = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API.lowStock}${getSearchParams()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        setStocks(data.data || []);
      } else {
        setStocks([]);
      }
    } catch (err) {
      console.log(err);
      setStocks([]);
    }
  };

  const fetchOutOfStock = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API.outOfStock}${getSearchParams()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        setOutStocks(data.data || []);
      } else {
        setOutStocks([]);
      }
    } catch (err) {
      console.log(err);
      setOutStocks([]);
    }
  };

  const fetchBulkStock = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API.bulkStock}${getSearchParams()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        setBulkStocks(data.data || []);
      } else {
        setBulkStocks([]);
      }
    } catch (err) {
      console.log(err);
      setBulkStocks([]);
      setToast({
        type: "error",
        message: "Failed to load bulk stocks",
      });
    }
  };

  const fetchRepackStock = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API.repackStock}${getSearchParams()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        setRepackStocks(data.data || []);
      } else {
        setRepackStocks([]);
      }
    } catch (err) {
      console.log(err);
      setRepackStocks([]);
      setToast({
        type: "error",
        message: "Failed to load repack stocks",
      });
    }
  };


  const getBaseList = () => {
    if (activeTab === "low") return stocks;
    if (activeTab === "out") return outStocks;
    if (activeTab === "bulk") return bulkStocks;
    if (activeTab === "repack") return repackStocks;
    return stocks;
  };

  const filteredStocks = getBaseList().filter((item) => {
    const matchesLimit =
      activeTab !== "low" ||
      !limit ||
      item.currentStock <= Number(limit);

    return matchesLimit;
  });

  const getStatusClass = (status) => {
    if (status === "Low Stock") return styles.lowStock;
    if (status === "Out Of Stock") return styles.outStock;
    return styles.available;
  };

  const getEmptyMessage = () => {
    if (activeTab === "low") return "No low stock products";
    if (activeTab === "out") return "No out of stock products";
    if (activeTab === "bulk") return "No bulk products found";
    if (activeTab === "repack") return "No repack products found";
    return "No stock found";
  };

  return (
    <div className={styles.container}>
      {toast && <Toast {...toast} />}

      {/* HEADER */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Stock management</h2>
          <p className={styles.subtitle}>
            Total products : {filteredStocks.length}
          </p>
        </div>

        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Search product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />

          {activeTab === "low" && (
            <input
              type="text"
              placeholder="Stock limit"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className={styles.limitInput}
            />
          )}
        </div>
      </div>

      {/* TABS */}
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tab} ${activeTab === tab.key ? styles.activeTab : ""
              }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No</th>
              <th>Item code</th>
              <th>Product</th>
              <th>Mrp</th>
              <th>Stock</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">
                  <div className={styles.tableLoader}>
                    <div className={styles.spinner}></div>
                    <p>Loading stocks...</p>
                  </div>
                </td>
              </tr>
            ) : filteredStocks.length === 0 ? (
              <tr>
                <td colSpan="6">
                  <div className={styles.emptyState}>
                    {getEmptyMessage()}
                  </div>
                </td>
              </tr>
            ) : (
              filteredStocks.map((item, index) => (
                <tr key={index} className={styles.tableRow}>
                  <td>{index + 1}</td>

                  <td>{item.itemCode || ""}</td>

                  <td>
                    <div className={styles.productName}>
                      {item.productName}
                    </div>
                  </td>

                  <td>₹ {item.mrp}</td>

                  <td>
                    <span className={styles.stockCount}>
                      {item.currentStock ?? item.stock ?? 0}
                      {activeTab === "repack"
                        ? " pac"
                        : item.unit
                          ? ` ${item.unit}`
                          : ""}
                    </span>
                  </td>

                  <td>
                    <span>
                      {item.status || "-"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StockManagement;