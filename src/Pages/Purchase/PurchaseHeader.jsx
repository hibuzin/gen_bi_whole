import { useEffect, useRef, useState } from "react";
import { API } from "../../constants/api";
import styles from "./CreatePurchase.module.css";

export default function PurchaseHeader({
    form,
    setForm,
    handleChange,
    purchaseTotals,
    token,
    supplierId,
    showToast,
    onSuppliersChange,
    onSupplierSearchChange,
    onSupplierDetailsChange,
    registerCreateSupplier,
    firstItemRef,
}) {

    const [suppliers, setSuppliers] = useState([]);
    const [supplierDetails, setSupplierDetails] = useState({
        number: "",
        address: "",
        gstNumber: "",

    });
    const invoiceDateRef = useRef(null);
    const invoiceAmountRef = useRef(null);
    const invoiceNoRef = useRef(null);
    const grnDateRef = useRef(null);
    const dueDateRef = useRef(null);
    const supplierDropdownRef = useRef(null);
    const supplierInputRef = useRef(null);
    const supplierNumberRef = useRef(null);
    const supplierAddressRef = useRef(null);
    const supplierGstRef = useRef(null);
    const [supplierSearch, setSupplierSearch] = useState("");
    const [showSupplierList, setShowSupplierList] = useState(false);
    const [highlightedSupplierIndex, setHighlightedSupplierIndex] = useState(-1);
    const filteredSuppliers = suppliers.filter((s) =>
        (s.supplierName || "")
            .toLowerCase()
            .includes(supplierSearch.toLowerCase())
    );


    useEffect(() => {
        fetchSuppliers();
    }, []);

    useEffect(() => {
        const handleCtrlS = (e) => {
            if (
                e.ctrlKey &&
                !e.shiftKey &&
                !e.altKey &&
                e.key.toLowerCase() === "s"
            ) {
                e.preventDefault();

                supplierInputRef.current?.focus();
                supplierInputRef.current?.select();
            }
        };

        window.addEventListener("keydown", handleCtrlS);

        return () => {
            window.removeEventListener("keydown", handleCtrlS);
        };
    }, []);

    const fetchSuppliers = async () => {
        try {
            const res = await fetch(API.suppliers, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setSuppliers(data.data || []);

            const supplierList = data.data || [];
            setSuppliers(supplierList);
            onSuppliersChange?.(supplierList);

            if (supplierId) {
                setForm((prev) => ({
                    ...prev,
                    supplierId,
                }));
            }
        } catch {
            showToast("Failed to load suppliers", "error");
        }
    };

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (
                supplierDropdownRef.current &&
                !supplierDropdownRef.current.contains(e.target)
            ) {
                setShowSupplierList(false);
                setHighlightedSupplierIndex(-1);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, []);

    useEffect(() => {
        if (!form.supplierId || suppliers.length === 0) return;

        const supplier = suppliers.find(
            (s) => String(s._id || s.id) === String(form.supplierId)
        );

        if (!supplier) return;

        setSupplierSearch(
            supplier.supplierName || supplier.name || ""
        );

        setSupplierDetails({
            number:
                supplier.phone ||
                supplier.mobile ||
                supplier.supplierPhone ||
                "",

            address: supplier.address || "",

            gstNumber: supplier.gstNumber || "",

            city: supplier.city || "",

            state: supplier.state || "",

            pincode: supplier.pincode || "",
        });
    }, [form.supplierId, suppliers]);

    const createInlineSupplier = async () => {
        const supplierPayload = {
            supplierName: String(supplierSearch || "").trim(),
            mobile: String(supplierDetails.number || "").trim(),

            // Optional fields
            address: String(supplierDetails.address || "").trim(),
            gstNumber: String(supplierDetails.gstNumber || "").trim(),
        };

        const res = await fetch(API.createsupplier, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(supplierPayload),
        });

        const data = await res.json();

        if (!res.ok || data.success === false) {
            throw new Error(
                data.message || "Failed to create supplier"
            );
        }

        const createdSupplier =
            data.data?.supplier ||
            data.data?.createdSupplier ||
            data.supplier ||
            data.data;

        const createdSupplierId =
            createdSupplier?._id ||
            createdSupplier?.supplierId ||
            data.data?.supplierId ||
            data.supplierId;

        if (!createdSupplierId) {
            throw new Error(
                "Supplier created but supplier ID was not returned"
            );
        }

        return {
            supplierId: String(createdSupplierId),
            supplier: createdSupplier,
        };
    };

    const updateSupplierDetail = (field, value) => {
        const updatedDetails = {
            ...supplierDetails,
            [field]: value,
        };

        setSupplierDetails(updatedDetails);

        onSupplierDetailsChange?.(
            updatedDetails
        );
    };

    useEffect(() => {
        registerCreateSupplier?.(createInlineSupplier);
    }, [
        registerCreateSupplier,
        supplierSearch,
        supplierDetails,
        token,
    ]);

    const handleSupplierSearchChange = (e) => {
        const value = e.target.value;

        setSupplierSearch(value);
        onSupplierSearchChange?.(value);

        const emptyDetails = {
            number: "",
            address: "",
            gstNumber: "",
        };

        setSupplierDetails(emptyDetails);
        onSupplierDetailsChange?.(emptyDetails);

        setForm((prev) => ({
            ...prev,
            supplierId: "",
        }));

        const trimmedValue = value.trim().toLowerCase();

        if (!trimmedValue) {
            setShowSupplierList(false);
            setHighlightedSupplierIndex(-1);
            return;
        }

        const hasMatchingSupplier = suppliers.some((supplier) =>
            (supplier.supplierName || supplier.name || "")
                .toLowerCase()
                .includes(trimmedValue)
        );

        setShowSupplierList(hasMatchingSupplier);
        setHighlightedSupplierIndex(-1);
    };

    const handleSupplierSelect = (supplier) => {
        const selectedName =
            supplier.supplierName ||
            supplier.name ||
            "";

        const selectedDetails = {
            number:
                supplier.phone ||
                supplier.mobile ||
                supplier.supplierPhone ||
                "",

            address:
                supplier.address || "",

            gstNumber:
                supplier.gstNumber || "",

            city:
                supplier.city || "",

            state:
                supplier.state || "",

            pincode:
                supplier.pincode || "",
        };

        setSupplierSearch(selectedName);
        setSupplierDetails(selectedDetails);

        onSupplierSearchChange?.(
            selectedName
        );

        onSupplierDetailsChange?.(
            selectedDetails
        );

        setForm((prev) => ({
            ...prev,
            supplierId:
                supplier._id || supplier.id,
        }));

        setShowSupplierList(false);
        setShowSupplierList(false);
        setHighlightedSupplierIndex(-1);

        setTimeout(() => {
            invoiceDateRef.current?.focus();
        }, 0);
    };

    return (
        <div className={styles.headerSection}>
            <div className={styles.billFrom}>
                <div className={styles.supplierDetailsGrid}>
                    <div
                        ref={supplierDropdownRef}
                        className={styles.supplierDetailField}
                    >
                        <label>Name</label>

                        <input
                            ref={supplierInputRef}
                            value={supplierSearch}
                            placeholder="Search supplier"
                            onFocus={() => {
                                if (filteredSuppliers.length > 0) {
                                    setShowSupplierList(true);
                                }
                            }}
                            onChange={handleSupplierSearchChange}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();

                                    if (showSupplierList && filteredSuppliers.length > 0) {
                                        const index =
                                            highlightedSupplierIndex >= 0
                                                ? highlightedSupplierIndex
                                                : 0;

                                        handleSupplierSelect(filteredSuppliers[index]);
                                    } else if (supplierSearch.trim()) {
                                        supplierNumberRef.current?.focus();
                                    }

                                    return;
                                }

                                if (!showSupplierList || filteredSuppliers.length === 0) return;

                                if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    setHighlightedSupplierIndex((prev) =>
                                        prev < filteredSuppliers.length - 1 ? prev + 1 : 0
                                    );
                                }

                                if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    setHighlightedSupplierIndex((prev) =>
                                        prev > 0 ? prev - 1 : filteredSuppliers.length - 1
                                    );
                                }

                                if (e.key === "Escape") {
                                    setShowSupplierList(false);
                                    setHighlightedSupplierIndex(-1);
                                }
                            }}
                        />

                        {showSupplierList && supplierSearch && (
                            <div className={styles.supplierDropdown}>
                                {filteredSuppliers.length > 0 ? (
                                    filteredSuppliers.map((supplier, index) => (
                                        <div
                                            key={supplier._id || supplier.id}
                                            className={`${styles.supplierOption} ${index === highlightedSupplierIndex
                                                ? styles.highlightedSupplier
                                                : ""
                                                }`}
                                            onClick={() => handleSupplierSelect(supplier)}
                                        >
                                            <div className={styles.supplierName}>
                                                {supplier.supplierName ||
                                                    supplier.name}
                                            </div>

                                            <div className={styles.supplierSub}>
                                                {supplier.phone ||
                                                    supplier.mobile ||
                                                    "No number"}{" "}
                                                •{" "}
                                                {supplier.gstNumber ||
                                                    "No GST"}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.noSupplier}>
                                        No supplier found
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className={styles.supplierDetailField}>
                        <label>Number</label>

                        <input
                            ref={supplierNumberRef}
                            value={supplierDetails.number}
                            readOnly={Boolean(form.supplierId)}
                            placeholder={
                                form.supplierId
                                    ? ""
                                    : "Enter mobile"
                            }
                            onChange={(e) =>
                                updateSupplierDetail(
                                    "number",
                                    e.target.value
                                )
                            }
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    supplierAddressRef.current?.focus();
                                }
                            }}
                        />
                    </div>

                    <div className={styles.supplierDetailField}>
                        <label>Address</label>

                        <input
                            ref={supplierAddressRef}
                            value={supplierDetails.address || ""}
                            readOnly={Boolean(form.supplierId)}
                            placeholder="Enter address"
                            onChange={(e) =>
                                updateSupplierDetail("address", e.target.value)
                            }
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    supplierGstRef.current?.focus();
                                }
                            }}
                        />
                    </div>

                    <div className={styles.supplierDetailField}>
                        <label>GST no</label>

                        <input
                            ref={supplierGstRef}
                            value={supplierDetails.gstNumber || ""}
                            readOnly={Boolean(form.supplierId)}
                            placeholder="Enter GST no"
                            onChange={(e) =>
                                updateSupplierDetail("gstNumber", e.target.value)
                            }
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    invoiceDateRef.current?.focus();
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className={styles.invoiceMeta}>
                <div className={styles.metaRow}>
                    <div className={styles.metaField}>
                        <label>Purchase inv date</label>

                        <input
                            ref={invoiceDateRef}
                            type="date"
                            name="invoiceDate"
                            value={form.invoiceDate}
                            onChange={handleChange}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    invoiceAmountRef.current?.focus();
                                }
                            }}
                        />
                    </div>

                    <div className={styles.metaField}>
                        <label>Invoice Amount</label>

                        <input
                            ref={invoiceAmountRef}
                            type="text"
                            name="invoiceAmount"
                            value={form.invoiceAmount}
                            onChange={handleChange}
                            placeholder="Enter invoice amount"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    invoiceNoRef.current?.focus();
                                }
                            }}
                        />
                    </div>
                </div>

                <div className={styles.metaRow}>
                    <div className={styles.metaField}>
                        <label>Purchase inv number</label>

                        <input
                            ref={invoiceNoRef}
                            type="text"
                            name="invoiceNo"
                            value={form.invoiceNo}
                            onChange={handleChange}
                            placeholder="INV-1235"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    grnDateRef.current?.focus();
                                }
                            }}
                        />
                    </div>

                    <div className={styles.metaField}>
                        <label>GRN date</label>

                        <input
                            ref={grnDateRef}
                            type="date"
                            name="grnDate"
                            value={form.grnDate}
                            onChange={handleChange}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    dueDateRef.current?.focus();
                                }
                            }}
                        />
                    </div>
                </div>

                <div className={styles.metaRow}>
                    <div className={styles.metaField}>
                        <label>GRN amount</label>

                        <input
                            type="text"
                            value={Number(
                                purchaseTotals.itemsTotal || 0
                            ).toFixed(2)}
                            readOnly
                        />
                    </div>

                    <div className={styles.metaField}>
                        <label>Due date</label>

                        <input
                            ref={dueDateRef}
                            type="date"
                            name="dueDate"
                            value={form.dueDate}
                            onChange={handleChange}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();

                                    firstItemRef.current?.focus();
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}