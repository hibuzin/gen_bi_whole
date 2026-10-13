import { useEffect, useState, useRef } from "react";
import styles from "./Items.module.css";
import { useNavigate } from "react-router-dom";
import Toast from "../../components/Toast";
import { API } from "../../constants/api";
import * as XLSX from "xlsx";
import { FaTrash, FaPencilAlt, FaSearch, } from "react-icons/fa";
import { FiLayers, FiChevronDown, FiChevronUp, } from "react-icons/fi";

function Item() {
  const [product, setProduct] =
    useState([]);

  const [categories, setCategories] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [toast, setToast] =
    useState(null);

  const [deleteLoading, setDeleteLoading] =
    useState(null);

  const [showModal, setShowModal] =
    useState(false);


  const [editProduct, setEditProduct] = useState(null);
  const [deleteProductId, setDeleteProductId] = useState(null);
  const lowStockItems = 0;
  const [stockValue, setStockValue] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [itemHeaderClicks, setItemHeaderClicks] = useState(0);
  const [showExcelPopup, setShowExcelPopup] = useState(false);
  const [excelPassword, setExcelPassword] = useState("");
  const [excelUnlocked, setExcelUnlocked] = useState(false);
  const [excelError, setExcelError] = useState("");

  const [editCategoryData, setEditCategoryData] = useState({
    name: "",
    hsnCode: "",
    gstRate: "",
  });

  const categoryRef = useRef(null);
  const [search, setSearch] = useState("");

  const navigate = useNavigate();

  const handleItemHeaderClick = () => {
    setItemHeaderClicks((prev) => {
      const next = prev + 1;

      if (next >= 5) {
        setShowExcelPopup(true);
        setExcelPassword("");
        setExcelUnlocked(false);
        setExcelError("");
        return 0;
      }

      return next;
    });
  };

  const handleExcelPassword = () => {
    if (excelPassword === "tokyo@del") {
      setExcelUnlocked(true);
      setExcelError("");
    } else {
      setExcelError("Incorrect password");
    }
  };

  const handleExcelDownloadAndClose = () => {
    handleDownloadExcel();
    setShowExcelPopup(false);
    setExcelPassword("");
    setExcelUnlocked(false);
    setExcelError("");
  };

  const handleDownloadExcel = () => {
    const excelData = filteredProducts.map((p, index) => ({
      No: index + 1,
      "Item Name": p.name || p.productName || "",
      "Item Code": p.itemCode || "",
      Barcode: p.barcode || p.barcodeNumber || "",
      Category:
        p.categoryId?.name ||
        p.category?.name ||
        p.categoryName ||
        "",
      Unit: p.unit || p.unitType || "",
      Stock: p.availableQty || p.stock || 0,
      "Low Stock": p.lowStockQty || 0,
      Description: p.description || "",

      "Retail Price": p.retailPrice || 0,
      "Wholesale Price": p.wholesalePrice || 0,
      "Cost Price": p.costPrice || p.purchasePrice || 0,
      Mrp: p.mrp || 0,
      "Gst %":
        String(p.gstRate ?? p.taxPercentage ?? "").toLowerCase() === "none"
          ? "None"
          : `${p.gstRate ?? p.taxPercentage ?? 0}%`,
      "Hsn Code": p.hsnCode || "",

      "Stock Value":
        (Number(p.availableQty || p.stock || 0) *
          Number(p.costPrice || p.purchasePrice || 0)).toFixed(2),
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Items");

    XLSX.writeFile(workbook, "Items.xlsx");
  };

  useEffect(() => {
    fetchProduct();
    fetchCategories();
    fetchStockValue();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        categoryRef.current &&
        !categoryRef.current.contains(event.target)
      ) {
        setShowCategoryDropdown(false);
        setCategorySearch("");
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const placeholders = [
    "Search by name",
    "Search by hSN code",
  ];

  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const showToast = (type, message) => {
    setToast({ type, message });

    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // stock value 

  const fetchStockValue = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(API.stockValue, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      console.log(data); // check response

      if (data.success) {
        setStockValue(
          data.summary?.totalCostValue || 0
        );
      }
    } catch (err) {
      console.error("Stock Value Error:", err);
    }
  };

  // FETCH PRODUCTS

  const fetchProduct = async () => {
    try {
      setLoading(true);

      const token =
        localStorage.getItem("token");

      const res = await fetch(
        API.products,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (data.success) {
        setProduct(data.data || []);
      } else {
        showToast(
          "error",
          data.message || "Failed to load items"
        );
      }
    } catch (err) {
      console.error(err);

      setToast({
        type: "error",
        message: "Server error",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (value) => {
    try {
      const token = localStorage.getItem("token");

      if (!value.trim()) {
        fetchProduct();
        return;
      }

      const res = await fetch(
        `${API.products}/search?search=${encodeURIComponent(value)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (data.success) {
        setProduct(data.data || []);
      }
    } catch (err) {
      console.log(err);
    }
  };

  // FETCH CATEGORIES

  const fetchCategories = async () => {
    try {
      const token =
        localStorage.getItem("token");

      const res = await fetch(
        API.categories,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (err) {
      console.log(err);
    }
  };


  //create category
  const handleCreateCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      setCreatingCategory(true);

      const token = localStorage.getItem("token");

      const res = await fetch(API.categories, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCategory.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchCategories();

        setSelectedCategory("");

        setNewCategory("");
        setShowCategoryModal(false);

        showToast("success", "Category created successfully");
      } else {
        setToast({
          type: "error",
          message: data.message,
        });
      }
    } catch (err) {
      console.log(err);
      showToast("error", data.message || "Category create failed");
    } finally {
      setCreatingCategory(false);
    }
  };

  // DELETE

  const handleDelete = async () => {
    if (!deleteProductId) return;

    try {
      setDeleteLoading(deleteProductId);

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API.products}/${deleteProductId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (data.success) {
        setProduct((prev) =>
          prev.filter(
            (item) => item._id !== deleteProductId
          )
        );

        showToast(
          "success",
          data.message || "Item deleted successfully"
        );
      } else {
        setToast({
          type: "error",
          message:
            data.message ||
            "Delete failed",
        });
      }
    } catch (err) {
      console.error(err);

      setToast({
        type: "error",
        message: "Server error",
      });
    } finally {
      setDeleteLoading(null);
      setDeleteProductId(null);
    }
  };

  // OPEN EDIT
  const openEdit = async (item) => {
    try {
      const itemId = item._id || item.productId;
      const token = localStorage.getItem("token");

      // Full product details fetch
      const res = await fetch(
        `${API.products}/${itemId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      const fullItem =
        data.success && data.data
          ? data.data
          : item;

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

        openingStock:
          fullItem.stock ??
          fullItem.openingStock ??
          0,

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
          fullItem.barcodes?.[0]?.barcodeNumber ||
          "",
      });

      setShowModal(true);
      document.body.style.overflow = "hidden";
    } catch (error) {
      console.error("Edit product fetch error:", error);

      showToast(
        "error",
        "Unable to load item details"
      );
    }
  };

  const closeModal = () => {
    if (updateLoading) return;

    setShowModal(false);
    setEditProduct(null);

    document.body.style.overflow = "auto";
  };

  // CHANGE

  const handleChange = (e) => {
    const { name, value } = e.target;

    setEditProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // UPDATE
  const handleUpdate = async () => {
    if (!editProduct?._id || updateLoading) return;

    if (!editProduct.name?.trim()) {
      showToast("error", "Item name is required");
      return;
    }

    const numberValue = (value) => {
      if (
        value === "" ||
        value === null ||
        value === undefined
      ) {
        return 0;
      }

      return Number(value);
    };

    const payload = {
      name: editProduct.name.trim(),

      categoryId:
        editProduct.categoryId?._id ||
        editProduct.categoryId ||
        null,

      description:
        editProduct.description?.trim() || "",

      hsnCode:
        editProduct.hsnCode?.trim() || "",

      openingStock:
        numberValue(editProduct.openingStock),

      lowStockQty:
        numberValue(editProduct.lowStockQty),

      gstRate:
        editProduct.gstRate === "none"
          ? "none"
          : numberValue(editProduct.gstRate),

      mrp:
        numberValue(editProduct.mrp),

      costPrice:
        numberValue(editProduct.costPrice),

      retailPrice:
        numberValue(editProduct.retailPrice),

      wholesalePrice:
        numberValue(editProduct.wholesalePrice),

      unit: editProduct.unit || "",

      barcode:
        editProduct.barcode?.trim() || "",
    };

    try {
      setUpdateLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API.products}/${editProduct._id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.message || "Item update failed"
        );
      }

      const selectedCategoryData =
        categories.find(
          (category) =>
            category._id === payload.categoryId
        );

      setProduct((prev) =>
        prev.map((item) => {
          const itemId =
            item._id || item.productId;

          if (itemId !== editProduct._id) {
            return item;
          }

          return {
            ...item,
            ...(data.data || {}),
            ...payload,

            _id:
              item._id || editProduct._id,

            productId:
              item.productId ||
              editProduct._id,

            productName:
              payload.name,

            categoryId:
              selectedCategoryData ||
              payload.categoryId,
          };
        })
      );

      setShowModal(false);
      setEditProduct(null);

      document.body.style.overflow = "auto";

      showToast(
        "success",
        data.message ||
        "Item updated successfully"
      );

      fetchStockValue();
    } catch (err) {
      console.error(err);

      showToast(
        "error",
        err.message || "Server error"
      );
    } finally {
      setUpdateLoading(false);
    }
  };

  //update category
  const handleUpdateCategory = async () => {

    try {

      const token = localStorage.getItem("token");

      const res = await fetch(

        `${API.categories}/${editCategory._id}`,

        {

          method: "PUT",

          headers: {

            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`

          },

          body: JSON.stringify(editCategoryData)

        }

      );

      const data = await res.json();

      if (data.success) {

        fetchCategories();

        setEditCategory(null);

        showToast("success", "Category Updated");

      }

    } catch (err) {

      console.log(err);

    }

  }
  // delete category 

  const handleDeleteCategory = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API.categories}/${deleteItem._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        fetchCategories();
        setShowDeleteConfirm(false);
        setDeleteItem(null);

        showToast("success", "Category deleted successfully");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to delete category");
    }
  };

  const filteredProducts = product.filter((item) => {
    if (!selectedCategory) return true;

    return (
      item.categoryId?._id === selectedCategory ||
      item.categoryId === selectedCategory
    );
  });

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );
  return (
    <div className={styles.container}>
      {toast && <Toast {...toast} />}

      {/* HEADER */}

      <div className={styles.header}>
        <div>
          <h2 onClick={handleItemHeaderClick}>items</h2>
        </div>


      </div>

      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />

          <div className={styles.placeholderWrapper}>

            <input
              type="text"
              value={search}
              placeholder="Search Item..."
              onChange={(e) => {
                const value = e.target.value;
                setSearch(value);
                searchProducts(value);
              }}
              className={styles.searchInput}
            />
          </div>
        </div>

        <div
          className={styles.categoryDropdown}
          ref={categoryRef}
        >
          <div
            className={styles.categoryInput}
            onClick={() => {
              if (!showCategoryDropdown) {
                setShowCategoryDropdown(true);
                setTimeout(() => {
                  document.getElementById("categorySearchInput")?.focus();
                }, 0);
              }
            }}
          >
            {showCategoryDropdown ? (
              <input
                id="categorySearchInput"
                type="text"
                autoFocus
                className={styles.categorySearchInput}
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span onClick={() => setShowCategoryDropdown(true)}>
                {selectedCategory
                  ? categories.find(c => c._id === selectedCategory)?.name
                  : "Search categories"}
              </span>
            )}

            <span
              className={styles.dropdownIcon}
              onClick={(e) => {
                e.stopPropagation();
                setShowCategoryDropdown(prev => !prev);
              }}
            >
              {showCategoryDropdown ? <FiChevronUp /> : <FiChevronDown />}
            </span>
          </div>

          {showCategoryDropdown && (
            <div className={styles.categoryMenu}>
              <div className={styles.categoryList}>
                <div
                  className={styles.categoryItem}
                  onClick={() => {
                    setSelectedCategory("");
                    setShowCategoryDropdown(false);
                    setCategorySearch("");
                  }}
                >
                  <span>All categories</span>
                </div>

                {filteredCategories.length === 0 ? (
                  <div className={styles.categoryItem}>
                    <span style={{ color: "#aaa" }}>No match found</span>
                  </div>
                ) : (
                  filteredCategories.map(cat => (
                    <div key={cat._id} className={styles.categoryItem}>
                      <span
                        onClick={() => {
                          setSelectedCategory(cat._id);
                          setShowCategoryDropdown(false);
                          setCategorySearch("");
                        }}
                      >
                        {cat.name}
                      </span>

                      <button
                        className={styles.categoryEditBtn}
                        onClick={() => {
                          setEditCategory(cat);
                          setEditCategoryData({
                            name: cat.name,
                            hsnCode: cat.hsnCode || "",
                            gstRate: cat.gstRate || ""
                          });
                          setShowCategoryDropdown(false);
                        }}
                      >
                        <FaPencilAlt />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button
                className={styles.addCategoryBtn}
                onClick={() => {
                  setShowCategoryModal(true);
                  setShowCategoryDropdown(false);
                  setCategorySearch("");
                }}
              >
                + Add category
              </button>
            </div>
          )}
        </div>

        <button
          className={styles.bulkBtn}
          onClick={() => navigate("/bulk-action")}
        >

          <span>Bulk Upload</span>
        </button>

        <button
          className={styles.addBtn}
          onClick={() => navigate("/create-product")}
        >
          <span>Create items</span>
        </button>
      </div>
      <div
        className={styles.tableWrapper}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No</th>
              <th>Item code</th>
              <th>Name</th>
              <th>Mrp</th>
              <th>Purchase price</th>
              <th>Retail price</th>
              <th>Wholesale price</th>
              <th>Stock</th>
              <th>Hsn code</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9">
                  <div className={styles.tableLoader}>
                    <div className={styles.spinner}></div>
                    <p>Loading items...</p>
                  </div>
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="9">
                  <div className={styles.emptyState}>
                    No items found
                  </div>
                </td>
              </tr>
            ) : (
              filteredProducts.map((p, index) => {
                const itemId = p._id || p.productId;

                return (
                  <tr
                    key={itemId}
                    onClick={() => navigate(`/item/${itemId}`)}
                  >
                    <td>{index + 1}</td>

                    <td>{p.itemCode || "—"}</td>

                    <td className={styles.nameCell}>
                      {p.name || p.productName}
                    </td>

                    <td>₹ {p.mrp || 0}</td>

                    <td>₹ {p.costPrice || 0}</td>

                    <td>₹ {p.retailPrice || 0}</td>

                    <td>₹ {p.wholesalePrice || 0}</td>

                    <td>{p.availableQty || p.stock || 0}</td>

                    <td>{p.hsnCode || "—"}</td>

                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          type="button"
                          className={styles.editBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(p);
                          }}
                          title="Edit"
                        >
                          <FaPencilAlt />
                        </button>

                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteProductId(itemId);
                          }}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}

      {showModal && editProduct && (
        <div
          className={styles.modalOverlay}
        >
          <div className={styles.modal}>
            <div
              className={
                styles.modalHeader
              }
            >
              <h3>Edit item</h3>

              <button
                className={
                  styles.closeBtn
                }
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <div className={styles.form}>
              <div className={styles.field}>
                <label>
                  item name
                </label>

                <input
                  type="text"
                  name="name"
                  value={editProduct.name}
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div className={styles.field}>
                <label>
                  Category
                </label>

                <select
                  name="categoryId"
                  value={editProduct.categoryId || ""}
                  onChange={handleChange}
                >
                  <option value="">
                    Select category
                  </option>

                  {categories.map((cat) => (
                    <option
                      key={cat._id}
                      value={cat._id}
                    >
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label>Description</label>
                <input
                  type="text"
                  name="description"
                  value={editProduct.description || ""}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>hsn Code</label>
                <input
                  type="text"
                  name="hsnCode"
                  value={editProduct.hsnCode || ""}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Gst %</label>

                <select
                  name="gstRate"
                  value={editProduct.gstRate ?? ""}
                  onChange={handleChange}
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
                <label>Opening stock</label>

                <input
                  type="number"
                  name="openingStock"
                  min="0"
                  step="0.001"
                  value={editProduct.openingStock ?? ""}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Low stock qty</label>
                <input
                  type="number"
                  name="lowStockQty"
                  value={editProduct.lowStockQty ?? ""}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Mrp</label>
                <input
                  type="number"
                  name="mrp"
                  value={editProduct.mrp ?? ""}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Cost price</label>
                <input
                  type="number"
                  name="costPrice"
                  value={editProduct.costPrice ?? ""}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Retail price</label>
                <input
                  type="number"
                  name="retailPrice"
                  value={editProduct.retailPrice ?? ""}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Wholesale price</label>
                <input
                  type="number"
                  name="wholesalePrice"
                  value={editProduct.wholesalePrice ?? ""}
                  onChange={handleChange}
                />
              </div>


              <div className={styles.field}>
                <label>Unit</label>

                <select
                  name="unit"
                  value={editProduct.unit || ""}
                  onChange={handleChange}
                >
                  <option value="">Select unit</option>
                  <option value="pcs">pcs</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="box">box</option>
                  <option value="tin">tin</option>
                </select>
              </div>

              <div className={styles.field}>
                <label>Barcode</label>
                <input
                  type="text"
                  name="barcode"
                  value={editProduct.barcode ?? ""}
                  onChange={handleChange}
                />
              </div>



              <div
                className={
                  styles.modalBtns
                }
              >
                <button
                  className={
                    styles.cancelBtn
                  }
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={handleUpdate}
                  disabled={updateLoading}
                >
                  {updateLoading
                    ? "Saving..."
                    : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteProductId && (
        <div className={styles.modalOverlay}>
          <div className={styles.deleteModal}>
            <h3>Delete product?</h3>

            <p>
              Are you sure you want to delete this
              item?
            </p>

            <div className={styles.deleteActions}>
              <button
                className={styles.cancelBtn}
                onClick={() =>
                  setDeleteProductId(null)
                }
              >
                Cancel
              </button>

              <button
                className={styles.confirmDeleteBtn}
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.categoryModal}>
            <div className={styles.modalHeader}>
              <h3>Create Category</h3>

              <button
                className={styles.closeBtn}
                onClick={() => {
                  setShowCategoryModal(false);
                  setNewCategory("");
                }}
              >
                ×
              </button>
            </div>

            <div className={styles.form}>
              <div className={styles.field}>
                <label>Category Name</label>

                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter category name"
                />
              </div>

              <div className={styles.modalBtns}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => {
                    setShowCategoryModal(false);
                    setNewCategory("");
                  }}
                >
                  Cancel
                </button>

                <button
                  className={styles.saveBtn}
                  onClick={handleCreateCategory}
                  disabled={creatingCategory}
                >
                  {creatingCategory ? "Creating..." : "Create"}
                </button>
              </div>



            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.deleteModal}>
            <h3>Delete category?</h3>

            <p>
              Are you sure you want to delete{" "}
              <b>{deleteItem?.name}</b> ?
            </p>

            <div className={styles.deleteActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteItem(null);
                }}
              >
                Cancel
              </button>

              <button
                className={styles.confirmDeleteBtn}
                onClick={handleDeleteCategory}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {editCategory && (
        <div className={styles.modalOverlay}>
          <div className={styles.categoryModal}>

            <div className={styles.modalHeader}>
              <h3>Edit {editCategory.name}</h3>

              <button
                className={styles.closeBtn}
                onClick={() => setEditCategory(null)}
              >
                ×
              </button>
            </div>

            <div className={styles.form}>
              <div className={styles.field}>
                <label>Category Name</label>

                <input
                  value={editCategoryData.name}
                  onChange={(e) =>
                    setEditCategoryData({
                      ...editCategoryData,
                      name: e.target.value,
                    })
                  }
                />
              </div>

              {/* Delete */}
              <button
                type="button"
                className={styles.deleteCategoryText}
                onClick={() => {
                  setDeleteItem(editCategory);
                  setShowDeleteConfirm(true);
                  setEditCategory(null);
                }}
              >
                Delete Category
              </button>

              <div className={styles.modalBtns}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setEditCategory(null)}
                >
                  Cancel
                </button>

                <button
                  className={styles.saveBtn}
                  onClick={handleUpdateCategory}
                >
                  Save
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {showExcelPopup && (
        <div className={styles.modalOverlay}>
          <div className={styles.deleteModal}>
            {!excelUnlocked ? (
              <>
                <h3>Download Excel</h3>

                <p>Enter password to continue</p>

                <input
                  className={styles.excelPasswordInput}
                  type="password"
                  value={excelPassword}
                  onChange={(e) => {
                    setExcelPassword(e.target.value);
                    setExcelError("");
                  }}
                  placeholder="Enter password"
                  autoFocus
                />

                {excelError && (
                  <p style={{ color: "#d32f2f" }}>
                    {excelError}
                  </p>
                )}

                <div className={styles.deleteActions}>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => {
                      setShowExcelPopup(false);
                      setExcelPassword("");
                      setExcelError("");
                    }}
                  >
                    Close
                  </button>

                  <button
                    className={styles.confirmDeleteBtn}
                    onClick={handleExcelPassword}
                  >
                    Verify
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>Download Excel</h3>

                <p>Password verified successfully.</p>

                <div className={styles.deleteActions}>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => {
                      setShowExcelPopup(false);
                      setExcelPassword("");
                      setExcelUnlocked(false);
                    }}
                  >
                    Close
                  </button>

                  <button
                    className={styles.confirmDeleteBtn}
                    onClick={handleExcelDownloadAndClose}
                  >
                    Download Excel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default Item;