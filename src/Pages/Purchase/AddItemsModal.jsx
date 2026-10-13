import { useState, useMemo } from "react";
import { FiX, FiSearch } from "react-icons/fi";
import styles from "./AddItemsModal.module.css";

function AddItemsModal({ products = [], loading = false, onClose, onAddItems }) {
    const [search, setSearch] = useState("");
    const [quantities, setQuantities] = useState({});

    const getUnit = (p) => {
        return p?.unit ? p.unit.toUpperCase() : "PCS";
    };

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return products.filter(
            (p) =>
                p.name?.toLowerCase().includes(q) ||
                p.barcode?.toLowerCase().includes(q) ||
                p.itemCode?.toLowerCase().includes(q)
        );
    }, [search, products]);

    const addItem = (product) => {
        setQuantities((prev) => ({ ...prev, [product._id]: 1 }));
    };

    const removeItem = (id) => {
        setQuantities((prev) => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
        });
    };

    const setQty = (id, val) => {
        const num = Math.max(1, Number(val) || 1);
        setQuantities((prev) => ({ ...prev, [id]: num }));
    };

    const selectedCount = Object.keys(quantities).length;

    const handleAddToBill = () => {
        const items = Object.entries(quantities).map(([productId, qty]) => {
            const p = products.find((x) => x._id === productId);

            return {
                productId,
                productName: p?.name || "",
                hsnCode: p?.hsnCode || "",
                description: p?.description || "",
                tax: p?.gstRate || "",
                mrp: p?.mrp || "",
                stock: p?.stock ?? 0,
                qty: String(qty),
                unit: p?.unit || "pcs",
                unitValue: p?.unitValue || "",
                costPrice: p?.costPrice || "",
                sellingPrice: p?.sellingPrice || "",
                itemCode: p?.itemCode || "",
                discount: "",
            };
        });

        onAddItems(items);
        onClose();
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                {/* HEADER */}
                <div className={styles.header}>
                    <h2 className={styles.title}>Add Items to Bill</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <FiX size={20} />
                    </button>
                </div>

                {/* SEARCH */}
                <div className={styles.searchBar}>
                    <div className={styles.searchInput}>
                        <FiSearch size={15} className={styles.searchIcon} />
                        <input
                            autoFocus
                            placeholder="Search by Item / Barcode / Item Code"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* TABLE */}
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Item Code</th>
                                <th>Stock</th>
                                <th>MRP</th>
                                <th>Sales Price</th>
                                <th>Purchase Price</th>
                                <th>GST (%)</th>
                                <th>Slab Price</th>
                                <th>Quantity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={9}>
                                        <div className={styles.tableLoader}>
                                            <div className={styles.spinner}></div>
                                            <p>Loading items...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9}>
                                        <div className={styles.emptyState}>No items found</div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((p) => {
                                    const qty = quantities[p._id];
                                    const isAdded = qty !== undefined;
                                    return (
                                        <tr key={p._id} className={isAdded ? styles.addedRow : ""}>
                                            <td className={styles.itemName}>{p.name}</td>
                                            <td className={styles.code}>{p.barcode || p.itemCode || "-"}</td>
                                            <td>
                                                {p.stock != null
                                                    ? `${Number(p.stock).toFixed(2)} ${getUnit(p)}`
                                                    : "-"}
                                            </td>
                                            <td>₹ {Number(p.mrp || 0).toFixed(2)}</td>
                                            <td>₹ {Number(p.sellingPrice || 0).toFixed(2)}</td>
                                            <td>₹ {Number(p.costPrice || 0).toFixed(2)}</td>
                                            <td>{p.gstRate ?? 0}%</td>
                                            <td>
                                                {p.priceLevel?.pricingType === "slab" &&
                                                    p.priceLevel?.slabs?.length > 0 ? (
                                                    <div>
                                                        {p.priceLevel.slabs.map((slab, idx) => (
                                                            <div key={idx}>
                                                                ₹{Number(slab.price || 0).toFixed(2)} ({(slab.minQty || 0) + 1} {getUnit(p)})
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                            <td>
                                                {!isAdded ? (
                                                    <button className={styles.addBtn} onClick={() => addItem(p)}>
                                                        + Add
                                                    </button>
                                                ) : (
                                                    <div className={styles.stepper}>
                                                        <button
                                                            className={styles.stepBtn}
                                                            onClick={() => {
                                                                if (qty <= 1) removeItem(p._id);
                                                                else setQty(p._id, qty - 1);
                                                            }}
                                                        >
                                                            −
                                                        </button>
                                                        <input
                                                            type="text"
                                                            className={styles.stepInput}
                                                            value={qty}
                                                            onChange={(e) => setQty(p._id, e.target.value)}
                                                        />
                                                        <button
                                                            className={styles.stepBtn}
                                                            onClick={() => setQty(p._id, qty + 1)}
                                                        >
                                                            +
                                                        </button>
                                                        <span className={styles.pcs}>{getUnit(p)}</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* FOOTER */}
                <div className={styles.footer}>
                    <span className={styles.selectedInfo}>
                        {selectedCount > 0 ? `Show ${selectedCount} Item(s) Selected` : ""}
                    </span>
                    <div className={styles.footerBtns}>
                        <button className={styles.cancelBtn} onClick={onClose}>
                            Cancel [ESC]
                        </button>
                        <button
                            className={styles.addToBillBtn}
                            onClick={handleAddToBill}
                            disabled={selectedCount === 0}
                        >
                            Add to Bill [F7]
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AddItemsModal;