import { useState, useEffect } from "react";
import styles from "./Repack.module.css";
import { FiPackage, FiSearch, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { API } from "../constants/api";

function Repack() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [fromKg, setFromKg] = useState("");
  const [fromUnit, setFromUnit] = useState("");
  const [fromUnitValue, setFromUnitValue] = useState("");
  const [repackProducts, setRepackProducts] = useState([]);
  const [repackLoading, setRepackLoading] = useState(false);
  const [note, setNote] = useState("");
  const [outputs, setOutputs] = useState([
    { toProductId: "", toQty: "", toBarcode: "" }
  ]);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        API.repackBulkProducts,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (data.success) setProducts(data.data || []);
    } catch (err) {
      console.error("Failed to fetch products", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOutputChange = (index, field, value) => {
    const list = [...outputs];
    list[index][field] = value;
    setOutputs(list);
  };

  const resetForm = () => {
    setOutputs([{ toProductId: "", toQty: "" }]);
    setSelectedProduct(null);
    setShowPopup(false);
  };

  const fetchRepackProducts = async (bulkProduct) => {
    try {
      setRepackLoading(true);

      const res = await fetch(
        API.repackProductsByBulk(bulkProduct._id),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      console.log("REPACK LIST STATUS:", res.status);
      console.log("REPACK LIST RESPONSE:", data);

      const list = data.data || [];
      setRepackProducts(list);

      setOutputs(
        list.length > 0
          ? list.map((p) => ({
            toProductId: p._id,
            toQty: "",
            toBarcode: p.barcode || "",
          }))
          : [{ toProductId: "", toQty: "", toBarcode: "" }]
      );
    } catch (err) {
      console.error("Failed to fetch repack products", err);
      setRepackProducts([]);
      setOutputs([{ toProductId: "", toQty: "" }]);
    } finally {
      setRepackLoading(false);
    }
  };

  const saveRepack = async () => {
    if (!selectedProduct?._id) {
      return alert("Select from product");
    }

    const selectedOutputs = outputs.filter(
      (o) => o.toProductId && Number(o.toQty) > 0
    );

    if (selectedOutputs.length === 0) {
      return alert("Enter qty for at least one output product");
    }

    try {
      setSaving(true);

      const payload = {
        fromProductId: selectedProduct._id,
        outputs: selectedOutputs.map((o) => ({
          toProductId: o.toProductId,
          toQty: Number(o.toQty),
          toBarcode: o.toBarcode || "",
        })),
      };

      console.log("CREATE REPACK PAYLOAD:", JSON.stringify(payload, null, 2));

      if (note.trim()) {
        payload.note = note.trim();
      }

      const res = await fetch(API.createRepack, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Failed to create repack");
        return;
      }

      alert("Repack Created Successfully");
      setNote("");
      resetForm();
      fetchProducts();
    } catch (err) {
      console.log(err);
      alert("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const getProductById = (id) => {
    return repackProducts.find((p) => p._id === id);
  };

  const getUnitText = (product) => {
    if (!product) return "-";

    const value = product.unitValue || "";
    const unit = product.unit || "";

    if (!value && !unit) return "-";

    return `${value}${unit}`;
  };

  const filtered = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      {/* TOP BAR */}
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <h2>Repack</h2>
        </div>
        <div className={styles.searchWrapper}>
          <FiSearch size={14} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by name or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* TABLE */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No</th>
              <th>Name</th>
              <th>Description</th>
              <th>Category</th>
              <th>Barcode</th>
              <th>Hsn</th>
              <th>Gst %</th>
              <th>Mrp</th>
              <th>Cost price</th>
              <th>Selling price</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11}>
                  <div className={styles.tableLoader}>
                    <div className={styles.spinner}></div>
                    <p>Loading products...</p>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11}>
                  <div className={styles.emptyState}>
                    No products found
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((p, index) => (
                <tr
                  key={p._id}
                  className={styles.clickableRow}
                  onClick={() => {
                    setSelectedProduct(p);
                    setRepackProducts([]);
                    setOutputs([]);
                    setShowPopup(true);
                    fetchRepackProducts(p);
                  }}
                >
                  <td>{index + 1}</td>
                  <td>{p.name}</td>
                  <td>{p.description || "-"}</td>
                  <td>{p.categoryName || "-"}</td>
                  <td>{p.barcode || "-"}</td>
                  <td>{p.hsnCode || "-"}</td>
                  <td>{p.gstRate ?? 0}%</td>
                  <td>₹ {p.mrp ?? 0}</td>
                  <td>₹ {p.costPrice ?? 0}</td>
                  <td>₹ {p.sellingPrice ?? 0}</td>
                  <td>{p.stock ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* REPACK MODAL */}
      {showPopup && (
        <div className={styles.overlay} onClick={resetForm}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.modalLabel}>Repack Product</p>
                <h3 className={styles.modalTitle}>{selectedProduct?.name}</h3>
              </div>
              <button className={styles.closeBtn} onClick={resetForm}><FiX size={18} /></button>
            </div>

            {/* From Section */}
            <div className={styles.section}>
              <p className={styles.sectionLabel}>From Product</p>
              <div className={styles.fromGrid}>
                <div className={styles.field}>
                  <label>Product</label>
                  <input type="text" value={selectedProduct?.name || ""} readOnly />
                </div>

                <div className={styles.field}>
                  <label>Available stock</label>
                  <input
                    type="text"
                    value={`${selectedProduct?.stock ?? 0} ${selectedProduct?.unitValue ?? ""}${selectedProduct?.unit ?? ""}`}
                    readOnly
                  />
                </div>

              </div>
            </div>

            <div className={styles.divider} />

            {/* Output Section */}
            <div className={styles.section}>
              <div className={styles.sectionRow}>
                <p className={styles.sectionLabel}>Output products</p>
              </div>

              <div className={styles.outputTableWrapper}>
                <table className={styles.outputTable}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Unit</th>
                    </tr>
                  </thead>

                  <tbody>
                    {repackLoading ? (
                      <tr>
                        <td colSpan={4} className={styles.emptyState}>
                          Loading output products...
                        </td>
                      </tr>
                    ) : outputs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={styles.emptyState}>
                          No output products found
                        </td>
                      </tr>
                    ) : (
                      outputs.map((row, index) => {
                        const selectedOutputProduct = getProductById(row.toProductId);

                        return (
                          <tr key={index}>
                            <td>
                              <input
                                type="text"
                                value={selectedOutputProduct?.name || ""}
                                readOnly
                              />
                            </td>

                            <td>
                              <input
                                type="number"
                                min="1"
                                placeholder="Qty"
                                value={row.toQty}
                                onChange={(e) =>
                                  handleOutputChange(index, "toQty", e.target.value)
                                }
                              />
                            </td>

                            <td>
                              <input
                                type="text"
                                value={getUnitText(selectedOutputProduct)}
                                readOnly
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={resetForm}>Cancel</button>
              <button
                className={styles.saveBtn}
                onClick={saveRepack}
                disabled={saving || repackLoading}
              >
                {saving ? "Saving..." : "Create repack"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default Repack;