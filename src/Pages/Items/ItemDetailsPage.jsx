import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaBarcode, FaEdit, FaTrash, FaKeyboard } from "react-icons/fa";
import { FiEdit, FiTrash2, } from "react-icons/fi";
import { MdAdjust } from "react-icons/md";
import styles from "./ItemDetailsPage.module.css";
import { API } from "../../constants/api";
import Toast from "../../components/Toast";


function ItemDetails() {

    const { id } = useParams();
    const navigate = useNavigate();
    const [itemHistory, setItemHistory] = useState([]);

    const [data, setData] = useState(null);
    const [products, setProducts] = useState([]);
    const [activeTab, setActiveTab] = useState("itemDetails");
    const [switching, setSwitching] = useState(false);
    const [search, setSearch] = useState("");
    const [showEditModal, setShowEditModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [categories, setCategories] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const showToast = (type, message) => {
        setToast({ type, message });

        setTimeout(() => {
            setToast(null);
        }, 2500);
    };

    // Fetch all products once
    useEffect(() => {
        const fetchProducts = async () => {
            const token = localStorage.getItem("token");
            const res = await fetch(API.products, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (json.success) setProducts(json.data || []);
        };
        fetchProducts();
    }, []);

    useEffect(() => {
        const fetchCategories = async () => {
            const token = localStorage.getItem("token");
            const res = await fetch(API.categories, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (json.success) setCategories(json.data || []);
        };
        fetchCategories();
    }, []);

    const fetchItemHistory = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");

            const res = await fetch(
                `${API.productPriceHistory}/${id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const json = await res.json();

            if (json.success) {
                setItemHistory(json.data || []);
            }
        } catch (err) {
            console.error("Item History Error:", err);
        }
    }, [id]);

    const fetchItemDetails = useCallback(async () => {
        try {
            setSwitching(true);
            const token = localStorage.getItem("token");
            const res = await fetch(`${API.stockList}/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (json.success) setData(json);
            else setData(null);
        } catch (err) {
            console.error(err);
            setData(null);
        } finally {
            setSwitching(false);
        }
    }, [id]);

    const searchProducts = async (value) => {
        try {
            const token = localStorage.getItem("token");

            if (!value.trim()) {
                const res = await fetch(API.products, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await res.json();

                if (data.success) {
                    setProducts(data.data || []);
                }

                return;
            }

            const res = await fetch(
                `${API.products}/search?search=${encodeURIComponent(value)}`,
                {
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
            console.log(err);
        }
    };

    const openEdit = async () => {
        try {
            const token = localStorage.getItem("token");

            const itemId = product?._id || id;

            const res = await fetch(`${API.products}/${itemId}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const json = await res.json();

            const fullItem =
                json.success && json.data
                    ? json.data
                    : product;

            const categoryId =
                fullItem.categoryId?._id ||
                fullItem.categoryId ||
                fullItem.category?._id ||
                fullItem.category ||
                "";

            setEditProduct({
                ...fullItem,

                _id: itemId,

                name:
                    fullItem.name ||
                    fullItem.productName ||
                    "",

                categoryId:
                    typeof categoryId === "object"
                        ? categoryId._id || ""
                        : categoryId,

                description:
                    fullItem.description || "",

                hsnCode:
                    fullItem.hsnCode || "",

                gstRate:
                    fullItem.gstRate ??
                    fullItem.taxPercentage ??
                    "",

                lowStockQty:
                    fullItem.lowStockQty ?? "",

                mrp:
                    fullItem.mrp ?? "",

                costPrice:
                    fullItem.costPrice ??
                    fullItem.purchasePrice ??
                    fullItem.netcost ??
                    "",

                retailPrice:
                    fullItem.retailPrice ?? "",

                wholesalePrice:
                    fullItem.wholesalePrice ?? "",

                unit:
                    fullItem.unit ||
                    fullItem.unitType ||
                    "",

                barcode:
                    fullItem.barcode ||
                    fullItem.barcodeNumber ||
                    fullItem.primaryBarcode ||
                    fullItem.barcodes?.[0]?.barcode ||
                    "",
            });

            setShowEditModal(true);
            document.body.style.overflow = "hidden";
        } catch (error) {
            console.error("Edit product fetch error:", error);

            showToast("error", "Unable to load item details");
        }
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        document.body.style.overflow = "auto";
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditProduct((prev) => ({ ...prev, [name]: value }));
    };

    const handleUpdate = async () => {
        try {
            const token = localStorage.getItem("token");

            const payload = {
                name: editProduct.name || editProduct.productName,
                categoryId: editProduct.categoryId,
                description: editProduct.description,
                hsnCode: editProduct.hsnCode,
                lowStockQty: Number(editProduct.lowStockQty),
                gstRate:
                    editProduct.gstRate === "none"
                        ? "none"
                        : Number(editProduct.gstRate || 0),
                mrp: Number(editProduct.mrp),
                costPrice: Number(editProduct.costPrice),
                retailPrice: Number(editProduct.retailPrice),
                wholesalePrice: Number(editProduct.wholesalePrice),
                unit: editProduct.unit || "",
                barcode: editProduct.barcode,
            };

            const res = await fetch(`${API.products}/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data.success) {
                await fetchItemDetails();

                const updatedRes = await fetch(`${API.products}/${id}`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const updatedJson = await updatedRes.json();

                if (updatedJson.success && updatedJson.data) {
                    setProducts((prev) =>
                        prev.map((item) =>
                            item._id === id
                                ? updatedJson.data
                                : item
                        )
                    );
                }

                closeEditModal();

                showToast(
                    "success",
                    data.message || "Item updated successfully"
                );

            } else {
                showToast(
                    "error",
                    data.message || "Item update failed"
                );
            }
        } catch (err) {
            console.log(err);
            showToast("error", "Server Error");
        }
    };

    const handleDelete = async () => {
        try {
            setDeleteLoading(true);
            const token = localStorage.getItem("token");

            const res = await fetch(`${API.products}/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json();

            if (data.success) {
                showToast("success", data.message || "Item deleted");
                navigate("/product");
            } else {
                showToast("error", data.message || "Delete failed");
            }
        } catch (err) {
            console.log(err);
            showToast("error", "Server error");
        } finally {
            setDeleteLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    useEffect(() => {
        fetchItemDetails();
        fetchItemHistory();
    }, [fetchItemDetails, fetchItemHistory]);

    // First load — nothing yet
    if (!data && switching) return <div className={styles.loading}>Loading...</div>;
    if (!data) return <div className={styles.loading}>Item not found</div>;

    const { product, summary, data: stockData } = data;

    const firstStock = stockData?.[0] || {};

    const productFromList =
        products.find((p) => p._id === id || p.productId === id) || {};

    const item = {
        ...productFromList,
        ...product,
    };

    const firstBarcode = item.barcodes?.[0] || product.barcodes?.[0] || {};


    const getValue = (...values) => {
        const value = values.find(
            (v) =>
                v !== undefined &&
                v !== null &&
                v !== "" &&
                v !== "null" &&
                v !== "undefined" &&
                !Number.isNaN(v)
        );

        return value ?? "-";
    };

    const formatMoney = (...values) => {
        const value = getValue(...values);

        if (value === "-") return "-";

        const num = Number(value);

        if (Number.isNaN(num)) return "-";

        return num;
    };

    const categoryName =
        item.categoryId?.name ||
        item.category?.name ||
        item.categoryName ||
        categories.find(
            (cat) =>
                cat._id === item.categoryId ||
                cat._id === item.categoryId?._id ||
                cat._id === firstStock.categoryId
        )?.name ||
        "-";

    const tabs = [
        { key: "itemDetails", label: "Item details" },
        { key: "stockDetails", label: "Stock details" },
        { key: "itemHistory", label: "Item history" },
    ];

    return (
        <div className={styles.wrap}>
            {toast && <Toast {...toast} />}

            {/* RIGHT PANEL */}
            <div className={`${styles.right} ${switching ? styles.switching : ""}`}>

                {/* HEADER */}
                <div className={styles.mainHeader}>
                    <div className={styles.headerLeft}>
                        <button
                            className={styles.backBtn}
                            onClick={() => navigate("/product")}
                        >
                            <FaArrowLeft />
                        </button>
                        <div className={styles.headerName}>
                            {getValue(product.productName, product.name)}
                        </div>
                        
                    </div>
                </div>

                {/* TABS */}
                <div className={styles.tabs}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""
                                }`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className={styles.content}>
                    {/* TAB: ITEM DETAILS */}
                    {activeTab === "itemDetails" && (
                        <div className={styles.profileGrid}>
                            <div className={styles.profileCard}>
                                <h3 className={styles.cardHeading}>General details</h3>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Item name</span>
                                    <span className={styles.val}>{getValue(product.productName, product.name)}</span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Item code</span>
                                    <span className={styles.val}>
                                        {getValue(item.itemCode, product.itemCode)}
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Barcode</span>
                                    <span className={styles.val}>
                                        {getValue(
                                            item.barcode,
                                            product.barcode,
                                            firstBarcode.barcode,
                                            firstStock.barcode
                                        )}
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Category</span>
                                    <span className={styles.val}>{categoryName}</span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Unit</span>
                                    <span className={styles.val}>
                                        {getValue(
                                            item.unit,
                                            product.unit,
                                            firstStock.unit
                                        )}
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Stock</span>
                                    <span className={styles.val}>
                                        {getValue(product.currentStock, product.stock, firstStock.availableQty, 0)}
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Low stock</span>
                                    <span className={styles.val}>
                                        {getValue(item.lowStockQty, firstStock.lowStockQty)}
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Description</span>
                                    <span className={styles.val}>
                                        {getValue(item.description, firstStock.description)}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.profileCard}>
                                <h3 className={styles.cardHeading}>Pricing details</h3>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Retail price</span>
                                    <span className={styles.val}>
                                        ₹ {formatMoney(item.retailPrice, firstStock.retailPrice)}
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Wholesale price</span>
                                    <span className={styles.val}>
                                        ₹ {formatMoney(item.wholesalePrice, firstStock.wholesalePrice)}
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Cost Price</span>
                                    <span className={styles.val}>
                                        ₹ {formatMoney(item.costPrice, firstStock.costPrice)}
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Mrp</span>
                                    <span className={styles.val}>
                                        ₹ {formatMoney(item.mrp, firstStock.mrp)}
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Gst</span>
                                    <span className={styles.val}>
                                        {getValue(item.gstRate, item.taxPercentage, firstStock.gstRate, firstStock.gstpercentage)}%
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Hsn code</span>
                                    <span className={styles.val}>
                                        {getValue(item.hsnCode, firstStock.hsnCode)}
                                    </span>
                                </div>

                                <div className={styles.profileRow}>
                                    <span className={styles.lbl}>Stock value</span>
                                    <span className={styles.val}>₹ {formatMoney(summary?.totalCostValue)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: STOCK DETAILS */}
                    {activeTab === "stockDetails" && (
                        <div className={styles.stockDetailsTab}>


                            <div className={styles.tableWrap}>
                                <table className={styles.tbl}>
                                    <thead>
                                        <tr>
                                            <th>Current Stock</th>
                                            <th>Sold Qty</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stockData.map((item, index) => (
                                            <tr key={item.barcode || index}>
                                                <td>{item.currentStock}</td>

                                                <td>{item.soldQty}</td>

                                                <td>
                                                    <span
                                                        className={`${styles.badge} ${item.status === "Available"
                                                            ? styles.inStock
                                                            : styles.outStock
                                                            }`}
                                                    >
                                                        {item.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB: PARTY WISE */}
                    {activeTab === "itemHistory" && (
                        <div className={styles.stockDetailsTab}>
                            <div className={styles.tableWrap}>
                                <table className={styles.tbl}>
                                    <thead>
                                        <tr>
                                            <th>Invoice no</th>
                                            <th>Date</th>
                                            <th>Qty</th>
                                            <th>Cost price</th>
                                            <th>Retail price</th>
                                            <th>Wholesale price</th>
                                            <th>Mrp</th>

                                        </tr>
                                    </thead>

                                    <tbody>
                                        {itemHistory.length > 0 ? (
                                            itemHistory.map((item, index) => (
                                                <tr key={item.purchaseId || index}>
                                                    <td>{item.invoiceNo || "-"}</td>

                                                    <td>
                                                        {item.purchaseDate &&
                                                            item.purchaseDate !== "Invalid Date"
                                                            ? item.purchaseDate
                                                            : "-"}
                                                    </td>

                                                    <td>{item.qty}</td>

                                                    <td>
                                                        ₹ {Number(item.costPrice || 0)}
                                                    </td>

                                                    <td>
                                                        ₹ {Number(item.retailPrice || 0)}
                                                    </td>

                                                    <td>₹ {Number(item.wholesalePrice || 0)}</td>

                                                    <td>
                                                        ₹ {Number(item.mrp || 0)}
                                                    </td>


                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" style={{ textAlign: "center" }}>
                                                    No History Found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
                {showEditModal && editProduct && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h3>Edit item</h3>
                                <button className={styles.closeBtn} onClick={closeEditModal}>×</button>
                            </div>

                            <div className={styles.form}>
                                <div className={styles.field}>
                                    <label>Item name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={editProduct.name || editProduct.productName || ""}
                                        onChange={handleEditChange}
                                    />
                                </div>


                                <div className={styles.field}>
                                    <label>Category</label>
                                    <select
    name="categoryId"
    value={editProduct.categoryId || ""}
    onChange={handleEditChange}
>
    <option value="">Select category</option>

    {categories.map((cat) => (
        <option key={cat._id} value={cat._id}>
            {cat.name}
        </option>
    ))}
</select>
                                </div>

                                <div className={styles.field}>
                                    <label>Description</label>
                                    <input type="text" name="description" value={editProduct.description || ""} onChange={handleEditChange} />
                                </div>

                                <div className={styles.field}>
                                    <label>Hsn code</label>
                                    <input type="text" name="hsnCode" value={editProduct.hsnCode || ""} onChange={handleEditChange} />
                                </div>

                                <div className={styles.field}>
                                    <label>Gst %</label>

                                    <select
                                        name="gstRate"
                                        value={editProduct.gstRate ?? ""}
                                        onChange={handleEditChange}
                                    >
                                        <option value="">Select GST</option>
                                        <option value="none">None</option>
                                        <option value="0">0%</option>
                                        <option value="5">5%</option>
                                        <option value="12">12%</option>
                                        <option value="18">18%</option>
                                        <option value="40">40%</option>
                                    </select>
                                </div>

                                <div className={styles.field}>
                                    <label>Low stock qty</label>
                                    <input type="text" name="lowStockQty" value={editProduct.lowStockQty || ""} onChange={handleEditChange} />
                                </div>

                                <div className={styles.field}>
                                    <label>Mrp</label>
                                    <input type="text" name="mrp" value={editProduct.mrp || ""} onChange={handleEditChange} />
                                </div>

                                <div className={styles.field}>
                                    <label>Cost price</label>
                                    <input type="text" name="costPrice" value={editProduct.costPrice || ""} onChange={handleEditChange} />
                                </div>

                                <div className={styles.field}>
                                    <label>Retail price</label>
                                    <input
                                        type="text"
                                        name="retailPrice"
                                        value={editProduct.retailPrice ?? ""}
                                        onChange={handleEditChange}
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label>Wholesale price</label>
                                    <input
                                        type="text"
                                        name="wholesalePrice"
                                        value={editProduct.wholesalePrice ?? ""}
                                        onChange={handleEditChange}
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label>Unit</label>

                                    <select
                                        name="unit"
                                        value={editProduct.unit || ""}
                                        onChange={handleEditChange}
                                    >
                                        <option value="">Select unit</option>
                                        <option value="pcs">pcs</option>
                                        <option value="kg">kg</option>
                                        <option value="g">g</option>
                                    </select>
                                </div>

                                <div className={styles.field}>
                                    <label>Barcode</label>
                                    <input type="text" name="barcode" value={editProduct.barcode || ""} onChange={handleEditChange} />
                                </div>

                                <div className={styles.modalBtns}>
                                    <button className={styles.cancelBtn} onClick={closeEditModal}>Cancel</button>
                                    <button className={styles.saveBtn} onClick={handleUpdate}>Save changes</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showDeleteConfirm && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.deleteModal}>
                            <h3>Delete item?</h3>
                            <p>Are you sure you want to delete this item?</p>
                            <div className={styles.deleteActions}>
                                <button className={styles.cancelBtn} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                                <button className={styles.confirmDeleteBtn} onClick={handleDelete} disabled={deleteLoading}>
                                    {deleteLoading ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}

export default ItemDetails;