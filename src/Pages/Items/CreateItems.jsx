import { useState, useEffect, useRef } from "react";
import styles from "./CreateItems.module.css";
import Toast from "../../components/Toast";
import { API } from "../../constants/api";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiChevronDown, FiChevronUp } from "react-icons/fi";

function CreateProduct() {
  const defaultUnit = localStorage.getItem("defaultUnit") || "pcs";
  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    hsnCode: "",
    lowStockQty: "",
    gstRate: "",
    mrp: "",
    costPrice: "",
    retailPrice: "",
    wholesalePrice: "",
    openingStock: "",
    description: "",
    barcode: "",
    unit: defaultUnit,
    unitValue: "",
    productType: "normal",
    parentProductId: "",
    pricingType: "standard",
    slabs: [],
  });

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDefaultUnit, setShowDefaultUnit] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const nameRef = useRef(null);
  const categoryRef = useRef(null);
  const hsnRef = useRef(null);
  const gstRef = useRef(null);
  const mrpRef = useRef(null);
  const costRef = useRef(null);
  const retailRef = useRef(null);
  const wholesaleRef = useRef(null);
  const descriptionRef = useRef(null);
  const barcodeRef = useRef(null);
  const submitRef = useRef(null);
  const unitRef = useRef(null);
  const unitValueRef = useRef(null);
  const lowStockRef = useRef(null);
  const [bulkProducts, setBulkProducts] = useState([]);
  const [showBulkDropdown, setShowBulkDropdown] = useState(false);
  const categoryWrapperRef = useRef(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (nameRef.current) nameRef.current.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        categoryWrapperRef.current &&
        !categoryWrapperRef.current.contains(e.target)
      ) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleKeyDown = (e, nextRef) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextRef?.current) nextRef.current.focus();
      else handleSubmit(e);
    }
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 2500);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(API.categories, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setCategories(data.data || []))
      .catch((err) => console.error("CATEGORY FETCH ERROR:", err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateCategory = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(API.categories, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCategory,
        }),
      });

      const data = await res.json();
      console.log("CATEGORY SUBMIT");
      console.log("STATUS:", res.status);
      console.log("RESPONSE:", data);

      if (!res.ok) {
        throw new Error(data.message || "Failed to create category");
      }

      setCategories((prev) => [...prev, data.data]);

      setForm((prev) => ({
        ...prev,
        categoryId: data.data._id,
      }));

      setNewCategory("");
      setShowCategoryModal(false);

      showToast("Category created successfully", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const fetchBulkProducts = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        API.repackBulkProducts,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      console.log("BULK PRODUCTS:", data);

      if (data.success) {
        setBulkProducts(data.data || []);
      }
    } catch (err) {
      console.error("Bulk products fetch error:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const payload = {
        name: form.name.trim(),
        description: form.description,

        // Send empty category as empty string
        categoryId: form.categoryId || "",

        hsnCode: form.hsnCode,

        gstRate:
          form.gstRate === "none"
            ? "none"
            : Number(form.gstRate || 0),
        mrp: Number(form.mrp || 0),

        unit: form.unit,
        unitValue: Number(form.unitValue || 1),

        lowStockQty: Number(form.lowStockQty || 0),

        costPrice: Number(form.costPrice || 0),
        retailPrice: Number(form.retailPrice || 0),
        wholesalePrice: Number(form.wholesalePrice || 0),

        openingStock: Number(form.openingStock || 0),

        productType: form.productType,

        barcode: form.barcode || "",
      };

      // Slab pricing
      if (form.pricingType === "slab") {
        payload.priceLevel = {
          pricingType: "slab",
          slabs: form.slabs.map((s) => ({
            minQty: Number(s.minQty),
            maxQty: s.maxQty ? Number(s.maxQty) : null,
            price: Number(s.price),
          })),
        };
      }

      const url =
        form.productType === "repack"
          ? API.createBulkProduct
          : API.createProduct;

      const finalPayload =
        form.productType === "repack"
          ? {
            products: [
              {
                ...payload,
                productType: "repack",
                parentProductId: form.parentProductId,
              },
            ],
          }
          : payload;

      console.log("CREATE PRODUCT URL:", url);
      console.log("CREATE PRODUCT PAYLOAD:", finalPayload);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(finalPayload),
      });

      const data = await res.json();

      console.log("CREATE PRODUCT RESPONSE:", data);

      if (!res.ok || !data.success) {
        throw new Error(
          data.message || "Failed to create item"
        );
      }

      showToast("Item created successfully", "success");

      // Reset form
      setForm({
        name: "",
        categoryId: "",
        hsnCode: "",
        gstRate: "",
        mrp: "",
        costPrice: "",
        retailPrice: "",
        wholesalePrice: "",
        openingStock: "",
        lowStockQty: "",
        barcode: "",
        description: "",
        unit: localStorage.getItem("defaultUnit") || "pcs",
        unitValue: "",
        productType: "normal",
        parentProductId: "",
        pricingType: "standard",
        slabs: [],
      });

    } catch (err) {
      console.error("CREATE PRODUCT ERROR:", err);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toast message={toast.message} type={toast.type} />

      <div className={styles.container}>

        <div className={styles.header}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate("/product")}
          >
            <FiArrowLeft size={18} />
          </button>

          <h2>Create item</h2>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>

          <div className={styles.sectionTitle}>
            Product details
          </div>

          <div className={styles.productGrid}>

            <div className={styles.field}>
              <label>Item name</label>
              <input
                ref={nameRef}
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, categoryRef)}
                placeholder="Enter item name"
                required
              />
            </div>

            <div className={styles.field}>
              <label>Category</label>

              <div
                className={styles.categoryWrapper}
                ref={categoryWrapperRef}
              >
                <button
                  type="button"
                  ref={categoryRef}
                  className={styles.categorySelect}
                  onClick={() => setShowCategoryDropdown(prev => !prev)}
                >
                  <span>
                    {form.categoryId
                      ? categories.find((cat) => cat._id === form.categoryId)?.name
                      : "Select category"}
                  </span>

                  {showCategoryDropdown ? (
                    <FiChevronUp className={styles.dropdownIcon} />
                  ) : (
                    <FiChevronDown className={styles.dropdownIcon} />
                  )}
                </button>

                {showCategoryDropdown && (
                  <div className={styles.categoryMenu}>
                    {categories.map((cat) => (
                      <div
                        key={cat._id}
                        className={styles.categoryOption}
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            categoryId: cat._id,
                          }));
                          setShowCategoryDropdown(false);
                        }}
                      >
                        {cat.name}
                      </div>
                    ))}

                    <div
                      className={`${styles.categoryOption} ${styles.addCategoryOption}`}
                      onClick={() => {
                        setShowCategoryModal(true);
                        setShowCategoryDropdown(false);
                      }}
                    >
                      + Add category
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <label>Hsn code</label>
              <input
                ref={hsnRef}
                type="text"
                name="hsnCode"
                value={form.hsnCode}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, gstRef)}
                placeholder="Enter hsn code"
              />
            </div>

            <div className={styles.field}>
              <label>Gst rate (%)</label>

              <select
                ref={gstRef}
                name="gstRate"
                value={form.gstRate}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, mrpRef)}
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

          </div>

          <div className={styles.sectionTitle}>
            Pricing details
          </div>

          <div className={styles.grid}>

            <div className={styles.field}>
              <label>Mrp</label>
              <input
                ref={mrpRef}
                type="text"
                name="mrp"
                value={form.mrp}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, costRef)}
                placeholder="Mrp"
              />
            </div>

            <div className={styles.field}>
              <label>Cost price</label>
              <input
                ref={costRef}
                type="text"
                name="costPrice"
                value={form.costPrice}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, sellingRef)}
                placeholder="Cost price"
              />
            </div>

            <div className={styles.field}>
              <label>Retail price</label>
              <input
                ref={retailRef}
                type="text"
                name="retailPrice"
                value={form.retailPrice}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, wholesaleRef)}
                placeholder="Retail price"
              />
            </div>

            <div className={styles.field}>
              <label>Wholesale price</label>
              <input
                ref={wholesaleRef}
                type="text"
                name="wholesalePrice"
                value={form.wholesalePrice}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, descriptionRef)}
                placeholder="Wholesale price"
              />
            </div>

            <div className={styles.field}>
              <label>Description</label>
              <input
                ref={descriptionRef}
                name="description"
                value={form.description}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, submitRef)}
                placeholder="Enter product description"
              />
            </div>



            <div className={styles.field}>
              <label>Pricing type</label>

              <select
                value={form.pricingType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    pricingType: e.target.value,
                    slabs:
                      e.target.value === "slab"
                        ? [{ minQty: "", maxQty: null, price: "" }]
                        : [],
                  })
                }
              >
                <option value="standard">Standard</option>
                <option value="slab">Slab pricing</option>
              </select>
            </div>

            {form.pricingType === "slab" && (
              <div className={`${styles.field} ${styles.full}`}>
                <label>Slab pricing</label>

                <div className={styles.slabRow}>
                  <input
                    type="text"
                    placeholder="Min qty"
                    value={form.slabs[0]?.minQty || ""}
                    onChange={(e) => {
                      const slabs = [...form.slabs];
                      slabs[0] = {
                        ...slabs[0],
                        minQty: e.target.value,
                        maxQty: null,
                      };
                      setForm({ ...form, slabs });
                    }}
                  />

                  <input
                    type="text"
                    placeholder="Price"
                    value={form.slabs[0]?.price || ""}
                    onChange={(e) => {
                      const slabs = [...form.slabs];
                      slabs[0] = {
                        ...slabs[0],
                        price: e.target.value,
                        maxQty: null,
                      };
                      setForm({ ...form, slabs });
                    }}
                  />
                </div>
              </div>
            )}

          </div>

          <div className={styles.inventoryHeader}>
            <span>Inventory details</span>

            <button
              type="button"
              className={`${styles.defaultBtn} ${showDefaultUnit ? styles.defaultBtnActive : ""
                }`}
              onClick={() =>
                setShowDefaultUnit((prev) => !prev)
              }
            >
              Default unit
              {showDefaultUnit ? (
                <FiChevronUp />
              ) : (
                <FiChevronDown />
              )}
            </button>
          </div>

          {showDefaultUnit && (
            <div className={styles.defaultUnitBox}>
              <div>
                <strong>Default item unit</strong>
                <p>
                  New items will use this unit automatically.
                </p>
              </div>

              <select
                value={form.unit}
                onChange={(e) => {
                  const value = e.target.value;

                  localStorage.setItem(
                    "defaultUnit",
                    value
                  );

                  setForm((prev) => ({
                    ...prev,
                    unit: value,
                  }));

                  showToast(
                    "Default unit updated",
                    "success"
                  );
                }}
              >

                <option value="pcs">Pcs</option>
                <option value="kg">Kg</option>
                <option value="g">Gram</option>
                <option value="box">Box</option>
                <option value="tin">Tin</option>
              </select>
            </div>
          )}

          <div className={styles.grid}>

            <div className={styles.field}>
              <label>Unit</label>
              <select
                ref={unitRef}
                name="unit"
                value={form.unit}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, unitValueRef)}
              >

                <option value="pcs">Pcs</option>
                <option value="kg">Kg</option>
                <option value="g">Gram</option>
                <option value="box">Box</option>
                <option value="tin">Tin</option>
              </select>
            </div>

            <div className={styles.field}>
              <label>Unit value</label>
              <input
                ref={unitValueRef}
                type="text"
                step="0.01"
                name="unitValue"
                value={form.unitValue}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, barcodeRef)}
                placeholder="Optional"
              />
            </div>

            <div className={styles.field}>
              <label>Opening stock</label>

              <input
                type="text"
                name="openingStock"
                value={form.openingStock}
                onChange={handleChange}
                placeholder="Enter opening stock"
              />
            </div>

            <div className={styles.field}>
              <label>Low stock qty</label>
              <input
                ref={lowStockRef}
                type="text"
                name="lowStockQty"
                value={form.lowStockQty}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, gstRef)}
                placeholder="Enter low stock qty"
              />
            </div>
            <div className={styles.field}>
              <label>Product type</label>
              <select
                name="productType"
                value={form.productType}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, unitRef)}
              >
                <option value="normal">Normal</option>
                <option value="bulk">Bulk</option>
                <option value="repack">Repack</option>
              </select>
            </div>
            {form.productType === "repack" && (
              <div className={styles.field}>
                <label>Parent Product ID</label>
                <div className={`${styles.categoryWrapper} ${styles.bulkDropdown}`}>
                  <button
                    type="button"
                    className={styles.categorySelect}
                    onClick={() => {
                      setShowBulkDropdown((prev) => !prev);
                      if (bulkProducts.length === 0) fetchBulkProducts();
                    }}
                  >
                    <span>
                      {form.parentProductId
                        ? bulkProducts.find((p) => p._id === form.parentProductId)?.name
                        : "Select parent bulk product"}
                    </span>

                    {showBulkDropdown ? (
                      <FiChevronUp className={styles.dropdownIcon} />
                    ) : (
                      <FiChevronDown className={styles.dropdownIcon} />
                    )}
                  </button>

                  {showBulkDropdown && (
                    <div className={styles.categoryMenu}>
                      {bulkProducts.map((p) => (
                        <div
                          key={p._id}
                          className={styles.categoryOption}
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              parentProductId: p._id,
                            }));
                            setShowBulkDropdown(false);
                          }}
                        >
                          {p.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={styles.field}>
              <label>Barcode</label>
              <input
                ref={barcodeRef}
                type="text"
                name="barcode"
                value={form.barcode}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, submitRef)}
                placeholder="Barcode"
              />
            </div>

          </div>

          <div className={styles.submitRow}>
            <button
              ref={submitRef}
              type="submit"
              disabled={loading}
              className={styles.submitBtn}
            >
              {loading ? "Creating..." : "Create item"}
            </button>
          </div>

        </form>
      </div>

      {showCategoryModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Create Category</h3>

            <input
              type="text"
              value={newCategory}
              onChange={(e) =>
                setNewCategory(e.target.value)
              }
              placeholder="Enter category name"
            />

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() =>
                  setShowCategoryModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCreateCategory();
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

export default CreateProduct;