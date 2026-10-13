import { useEffect, useState } from "react";
import styles from "./CreatePurchaseReturn.module.css";
import Toast from "../../components/Toast";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { API } from "../../constants/api";


function CreatePurchaseReturn() {
  const [form, setForm] = useState({
    purchaseId: "",
    supplierId: "",
    items: [{ productId: "", qty: "", reason: "" }],
  });

  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "" });
  const navigate = useNavigate();

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 2500);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(API.purchase, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setPurchases(data.data || []))
      .catch((err) => console.error("PURCHASE FETCH ERROR:", err));

    fetch(API.products, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setProducts(data.data || []))
      .catch((err) => console.error("PRODUCT FETCH ERROR:", err));
  }, []);

  const handlePurchaseChange = (purchaseId) => {
    const selectedPurchase = purchases.find(
      (p) => p._id === purchaseId || p.purchaseId === purchaseId
    );

    const supplierId =
      selectedPurchase?.supplierId?._id ||
      selectedPurchase?.supplierId ||
      selectedPurchase?.supplier?._id ||
      selectedPurchase?.supplier?.id ||
      "";

    setForm({
      ...form,
      purchaseId,
      supplierId,
    });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...form.items];
    updatedItems[index][field] = value;
    setForm({ ...form, items: updatedItems });
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { productId: "", qty: "", reason: "" }],
    });
  };

  const removeItem = (index) => {
    if (form.items.length === 1) return;
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.purchaseId || !form.supplierId) {
      showToast("Please select valid purchase", "error");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const payload = {
        purchaseId: form.purchaseId,
        supplierId: form.supplierId,
        items: form.items.map((item) => ({
          productId: item.productId,
          qty: Number(item.qty),
          reason: item.reason || "",
        })),
      };

      const res = await fetch(API.purchaseReturnpost, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create return request");
      }

      showToast(data.message || "Purchase return created successfully");

      setForm({
        purchaseId: "",
        supplierId: "",
        items: [{ productId: "", qty: "", reason: "" }],
      });
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toast message={toast.message} type={toast.type} />

      <div className={styles.container}>
        <div className={styles.topSection}>
          <div className={styles.headerLeft}>
            <button
              className={styles.backBtn}
              onClick={() => navigate("/return")}
              type="button"
            >
              <FaArrowLeft />
            </button>

            <div>
              <h2 className={styles.title}>Create purchase return</h2>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.card}>
          <div className={styles.formGrid}>
            <div className={`${styles.field} ${styles.purchaseBillField}`}>
              <label>Purchase bill</label>
              <select
                className={styles.purchaseSelect}
                value={form.purchaseId}
                onChange={(e) => handlePurchaseChange(e.target.value)}
                required
              >
                <option value="">Select purchase</option>

                {purchases.map((purchase) => {
                  const id = purchase._id || purchase.purchaseId;
                  const supplierName =
                    purchase.supplierId?.name ||
                    purchase.supplier?.name ||
                    purchase.supplierName ||
                    "Supplier";

                  return (
                    <option key={id} value={id}>
                      {purchase.invoiceNo || id} - {supplierName}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className={styles.itemsWrap}>
            {form.items.map((item, index) => (
              <div key={index} className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <h4>Return item {index + 1}</h4>

                  {form.items.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => removeItem(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className={styles.itemGrid}>
                  <div className={styles.field}>
                    <label>Product</label>
                    <select
                      value={item.productId}
                      onChange={(e) =>
                        handleItemChange(index, "productId", e.target.value)
                      }
                      required
                    >
                      <option value="">Select product</option>

                      {products.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.name || product.productName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label>Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) =>
                        handleItemChange(index, "qty", e.target.value)
                      }
                      placeholder="Enter qty"
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label>Reason</label>
                    <input
                      type="text"
                      value={item.reason}
                      onChange={(e) =>
                        handleItemChange(index, "reason", e.target.value)
                      }
                      placeholder="Damaged bag"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.footerActions}>
            <button type="button" className={styles.addBtn} onClick={addItem}>
              + Add item
            </button>

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? "Creating..." : "Create return"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default CreatePurchaseReturn;