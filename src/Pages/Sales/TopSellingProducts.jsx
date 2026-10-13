import { useEffect, useState } from "react";
import styles from "./TopSellingProducts.module.css";
import { API } from "../../constants/api";

function TopSellingProducts() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopProducts();
  }, []);

  const fetchTopProducts = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        API.topselling, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
      );

      const data = await res.json();

      if (data.success) {
        setProducts(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    p =>
      p.productName
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      p.brand
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const totalQty = products.reduce(
    (sum, p) => sum + p.totalQtySold,
    0
  );

  const totalSales = products.reduce(
    (sum, p) => sum + p.totalSalesAmount,
    0
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>Top selling products</h2>

        <input
          type="text"
          placeholder="Search product..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className={styles.search}
        />
      </div>

      <div className={styles.stats}>
        <div className={styles.card}>
          <span>Total products</span>
          <h3>{products.length}</h3>
        </div>

        <div className={styles.card}>
          <span>Total qty sold</span>
          <h3>{totalQty}</h3>
        </div>

        <div className={styles.card}>
          <span>Total sales</span>
          <h3>₹{totalSales.toFixed(2)}</h3>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No</th>
              <th>Item Code</th>
              <th>Product</th>
              <th>Qty sold</th>
              <th>Sales amount</th>
              <th>Gst</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">
                  <div className={styles.tableLoader}>
                    <div className={styles.spinner}></div>
                    <p>Loading products...</p>
                  </div>
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="6">
                  <div className={styles.emptyState}>
                    No products found
                  </div>
                </td>
              </tr>
            ) : (
              filteredProducts.map((item, index) => (
                <tr key={item.productId}>
                  <td>{index + 1}</td>
                  <td>{item.itemCode}</td>

                  <td>
                    <div
                      className={
                        styles.productInfo
                      }
                    >
                      <span
                        className={
                          styles.productName
                        }
                      >
                        {item.productName}
                      </span>

                    </div>
                  </td>


                  <td>
                    <span>
                      {item.totalQtySold}
                    </span>
                  </td>

                  <td>
                    ₹
                    {item.totalSalesAmount.toFixed(
                      2
                    )}
                  </td>

                  <td>
                    ₹
                    {item.totalGST.toFixed(
                      2
                    )}
                  </td>
                </tr>
              )
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TopSellingProducts;