import { useEffect, useState, useRef } from "react";
import styles from "./Supplier.module.css";
import { useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaPencilAlt,
  FaTrash,
} from "react-icons/fa";
import { FiArrowUp } from "react-icons/fi";
import Toast from "../../components/Toast";
import { API } from "../../constants/api";

function Supplier() {

  const [suppliers, setSuppliers] =
    useState([]);
  const [supplierBalances, setSupplierBalances] = useState([]);
  const [activeView, setActiveView] = useState("all");
  const [toast, setToast] =
    useState(null);

  const [loadingId, setLoadingId] =
    useState(null);

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [
    showDeleteConfirm,
    setShowDeleteConfirm,
  ] = useState(false);

  const [editLoading, setEditLoading] =
    useState(false);

  const [selectedDeleteId, setSelectedDeleteId] =
    useState(null);

  const [editSupplier, setEditSupplier] = useState({
    _id: "",
    supplierName: "",
    mobile: "",
    gstNumber: "",
    panNumber: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    bankDetails: {
      accountHolderName: "",
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      branchName: "",
    },
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuppliers();
    fetchSupplierTotals();
  }, []);

  const showToast = (
    message,
    type = "success"
  ) => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 2500);
  };


  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const [suppliersRes, balancesRes] = await Promise.all([
        fetch(API.suppliers, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API.suppliers}/supplier-balances`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const suppliersData = await suppliersRes.json();
      const balancesData = await balancesRes.json();

      const balanceMap = {};
      (balancesData.data || []).forEach((b) => {
        balanceMap[b.supplierId] = b.balance;
      });

      const merged = (suppliersData.data || []).map((s) => ({
        ...s,
        balance: balanceMap[s._id] ?? 0,
      }));

      setSuppliers(merged);

    } catch (err) {
      showToast(err.message || "Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierBalances = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API.suppliers}/supplier-balances`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      const balanceMap = {};
      suppliers.forEach((s) => {
        balanceMap[s._id] = s.gstNumber;
      });

      const merged = (data.data || []).map((b) => ({
        ...b,
        gstNumber: balanceMap[b.supplierId] || "-",
      }));

      setSupplierBalances(merged);

      if (!res.ok) {
        throw new Error(
          data.message || "Failed to fetch balances"
        );
      }

      setSupplierBalances(data.data || []);


    } catch (err) {
      showToast(
        err.message || "Server error",
        "error"
      );
    }
  };

  const fetchSupplierTotals = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API.suppliers}/supplier-totals`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Failed to fetch totals"
        );
      }

      setSupplierTotals(data.data);

    } catch (err) {
      console.error(err);
    }
  };

  const openDeleteConfirm = (id) => {
    setSelectedDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    try {
      setLoadingId(selectedDeleteId);

      const token =
        localStorage.getItem("token");

      const res = await fetch(
        `${API.suppliers}/${selectedDeleteId}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
          "Failed to delete supplier"
        );
      }

      setSuppliers((prev) =>
        prev.filter(
          (sup) =>
            sup._id !== selectedDeleteId
        )
      );

      showToast(
        data.message ||
        "Supplier deleted successfully",
        "success"
      );

      setShowDeleteConfirm(false);

    } catch (err) {
      showToast(
        err.message || "Server error",
        "error"
      );
    } finally {
      setLoadingId(null);
    }
  };

  const openEditModal = (supplier) => {
    setEditSupplier({
      _id: supplier._id,
      supplierName: supplier.supplierName || "",
      mobile: supplier.mobile || "",
      gstNumber: supplier.gstNumber || "",
      panNumber: supplier.panNumber || "",
      email: supplier.email || "",
      address: supplier.address || "",
      city: supplier.city || "",
      state: supplier.state || "",
      pincode: supplier.pincode || "",
      bankDetails: {
        accountHolderName: supplier.bankDetails?.accountHolderName || "",
        bankName: supplier.bankDetails?.bankName || "",
        accountNumber: supplier.bankDetails?.accountNumber || "",
        ifscCode: supplier.bankDetails?.ifscCode || "",
        branchName: supplier.bankDetails?.branchName || "",
      },
    });
    setShowEditModal(true);
    document.body.style.overflow = "hidden";
  };

  const closeEditModal = () => {
    setShowEditModal(false);

    document.body.style.overflow =
      "auto";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("bank_")) {
      const key = name.replace("bank_", "");
      setEditSupplier((prev) => ({
        ...prev,
        bankDetails: { ...prev.bankDetails, [key]: value },
      }));
    } else {
      setEditSupplier((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleUpdate = async () => {
    try {
      setEditLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API.suppliers}/${editSupplier._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            supplierName: editSupplier.supplierName,
            mobile: editSupplier.mobile,
            gstNumber: editSupplier.gstNumber,
            panNumber: editSupplier.panNumber,
            email: editSupplier.email,
            address: editSupplier.address,
            city: editSupplier.city,
            state: editSupplier.state,
            pincode: editSupplier.pincode,
            bankDetails: editSupplier.bankDetails,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Update failed");
      }

      setSuppliers((prev) =>
        prev.map((supplier) =>
          supplier._id === editSupplier._id
            ? {
              ...data.data,
              bankDetails: data.data.bankDetails || {
                accountHolderName: "",
                bankName: "",
                accountNumber: "",
                ifscCode: "",
                branchName: "",
              }
            }
            : supplier
        )
      );

      showToast(
        data.message || "Supplier updated successfully",
        "success"
      );

      closeEditModal();
    } catch (err) {
      showToast(err.message || "Server Error", "error");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className={styles.container}>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
        />
      )}

      <div className={styles.header}>

        <h2>Suppliers</h2>

      </div>

      <div className={styles.searchRow}>

        <div className={styles.searchBox}>

          <FaSearch className={styles.searchIcon} />

          <input
            type="text"
            placeholder="Search suppliers..."
            className={styles.searchInput}
          />

        </div>

        <div
          className={styles.createSupplierBox}
          onClick={() =>
            navigate("/create-supplier")
          }
        >
          <span>Create supplier</span>
        </div>

      </div>

      <div
        className={styles.tableWrapper}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No</th>
              <th>Supplier name</th>
              <th>Gst no</th>
              <th>Mobile</th>
              <th>Balance</th>
              <th></th>
            </tr>
          </thead>

          <tbody>

            {loading ? (
              <tr>
                <td colSpan="6">
                  <div className={styles.tableLoader}>
                    <div className={styles.spinner}></div>
                    <p>Loading suppliers...</p>
                  </div>
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan="6">
                  <div className={styles.emptyState}>
                    No suppliers found
                  </div>
                </td>
              </tr>
            ) : (
              activeView === "all" &&
              suppliers.map((sup, index) => (
                <tr
                  key={sup._id}
                  onClick={() =>
                    navigate(`/supplier/${sup._id}`)
                  }
                >

                  <td>{index + 1}</td>
                  <td>{sup.supplierName || "-"}</td>
                  <td>{sup.gstNumber || "-"}</td>
                  <td>{sup.mobile}</td>
                  <td className={styles.balanceCell}>
                    ₹ {(Number(sup.balance) || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className={styles.actionButtons}>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => openEditModal(sup)}
                        title="Edit"
                      >
                        <FaPencilAlt />
                      </button>

                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => openDeleteConfirm(sup._id)}
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
          </tbody>
        </table>
      </div>

      {showEditModal && (
        <div
          className={
            styles.modalOverlay
          }
          onClick={closeEditModal}
        >
          <div
            className={styles.modal}
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div
              className={
                styles.modalHeader
              }
            >
              <h3>Edit supplier</h3>

              <button
                className={
                  styles.closeBtn
                }
                onClick={
                  closeEditModal
                }
              >
                ×
              </button>
            </div>

            <div
              className={
                styles.modalBody
              }
            >

              <div
                className={
                  styles.field
                }
              >
                <label>
                  Supplier name
                </label>

                <input
                  type="text"
                  name="supplierName"
                  value={
                    editSupplier.supplierName
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div
                className={
                  styles.field
                }
              >
                <label>Mobile</label>

                <input
                  type="text"
                  name="mobile"
                  value={
                    editSupplier.mobile
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div
                className={
                  styles.field
                }
              >
                <label>
                  Gst number
                </label>

                <input
                  type="text"
                  name="gstNumber"
                  value={
                    editSupplier.gstNumber
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div
                className={
                  styles.field
                }
              >
                <label>Email</label>

                <input
                  type="email"
                  name="email"
                  value={
                    editSupplier.email
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>


              <div
                className={styles.field}>
                <label>Address</label>
                <input
                  type="address"
                  name="address"
                  value={
                    editSupplier.address
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div
                className={
                  styles.field
                }
              >
                <label>City</label>

                <input
                  type="text"
                  name="city"
                  value={
                    editSupplier.city
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div
                className={
                  styles.field
                }
              >
                <label>State</label>

                <input
                  type="text"
                  name="state"
                  value={
                    editSupplier.state
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div
                className={
                  styles.field
                }
              >
                <label>
                  Pincode
                </label>

                <input
                  type="text"
                  name="pincode"
                  value={
                    editSupplier.pincode
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div className={styles.field}>
                <label>Pan number</label>
                <input
                  type="text"
                  name="panNumber"
                  value={editSupplier.panNumber}
                  onChange={handleChange}
                />
              </div>


              {/* Bank Details */}
              <div className={styles.field}>
                <label>Account holder name</label>
                <input
                  type="text"
                  name="bank_accountHolderName"
                  value={editSupplier.bankDetails?.accountHolderName || ""}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Bank name</label>
                <input
                  type="text"
                  name="bank_bankName"
                  value={editSupplier.bankDetails?.bankName || ""}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Account number</label>
                <input
                  type="text"
                  name="bank_accountNumber"
                  value={editSupplier.bankDetails?.accountNumber || ""}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Ifsc Code</label>
                <input
                  type="text"
                  name="bank_ifscCode"
                  value={editSupplier.bankDetails?.ifscCode || ""}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Branch name</label>
                <input
                  type="text"
                  name="bank_branchName"
                  value={editSupplier.bankDetails?.branchName || ""}
                  onChange={handleChange}
                />
              </div>


              <button
                className={
                  styles.saveBtn
                }
                onClick={
                  handleUpdate
                }
                disabled={
                  editLoading
                }
              >
                {editLoading
                  ? "Saving..."
                  : "Save changes"}
              </button>

            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div
          className={
            styles.modalOverlay
          }
        >
          <div
            className={
              styles.confirmBox
            }
          >
            <h3>
              Delete supplier?
            </h3>

            <p>
              Are you sure you want
              to delete this supplier?
            </p>

            <div
              className={
                styles.confirmActions
              }
            >
              <button
                className={
                  styles.cancelBtn
                }
                onClick={() =>
                  setShowDeleteConfirm(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                className={
                  styles.confirmDeleteBtn
                }
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Supplier;