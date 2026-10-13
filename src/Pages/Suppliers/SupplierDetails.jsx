import { useEffect, useState } from "react";
import { FaArrowUp, FaArrowLeft, } from "react-icons/fa";
import {
  FiFileText,
  FiEdit,
  FiTrash2,
  FiCreditCard,
  FiChevronDown,
  FiArrowUp
} from "react-icons/fi";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./SupplierDetails.module.css";
import { API } from "../../constants/api";
import Toast from "../../components/Toast";

function SupplierDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [activeTab, setActiveTab] = useState("Transactions");
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [productSummary, setProductSummary] = useState([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState(null);

  const [loadingId, setLoadingId] = useState(null);
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


  const totalPurchaseQty = productSummary.reduce(
    (sum, item) => sum + item.purchaseQty,
    0
  );

  const totalSalesQty = productSummary.reduce(
    (sum, item) => sum + item.salesQty,
    0
  );


  useEffect(() => {
    fetchSupplierDetails(id);
  }, [id]);

  useEffect(() => {
    fetchAllSuppliers();
  }, []);

  useEffect(() => {
    if (allSuppliers.length && id) {
      const selectedSupplier = allSuppliers.find((s) => s._id === id);

      if (selectedSupplier) {
        setSupplier(selectedSupplier);
      }
    }
  }, [allSuppliers, id]);

  const fetchAllSuppliers = async () => {
    try {
      const token = localStorage.getItem("token");

      const [suppliersRes, balancesRes] = await Promise.all([
        fetch(API.suppliers, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(API.supplierbalance, {
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

      setAllSuppliers(merged);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchSupplierDetails = async (supplierId) => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const [purchaseRes, productRes] = await Promise.all([
        fetch(API.supplierPurchases(supplierId), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(API.supplierProductSummary(supplierId),
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ),
      ]);

      const purchaseData = await purchaseRes.json();
      const productData = await productRes.json();
      console.log("Supplier Data:", purchaseData.supplier);

      setPurchases(purchaseData.data || []);
      setProductSummary(productData.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSupplier = (sup) => {
    navigate(`/supplier/${sup._id}`);
    setActiveTab("Transactions");
  };

  const filteredSuppliers = allSuppliers.filter((s) =>
    (s.supplierName || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const totalPaid = purchases.reduce((sum, bill) => sum + bill.paidAmount, 0);
  const totalBalance = purchases.reduce((sum, bill) => sum + bill.balanceAmount, 0);

  const getStatus = (bill) => {
    if (bill.balanceAmount === 0) return "Paid";
    if (bill.paidAmount > 0) return "Partial";
    return "Pending";
  };

  //supplier edite 

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
      "";
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
      console.log("1. Starting update", editSupplier._id);

      const token = localStorage.getItem("token");
      const res = await fetch(`${API.suppliers}/${editSupplier._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...editSupplier }),
      });
      console.log("2. Response received", res.status);

      const data = await res.json();
      console.log("3. Data parsed", data);

      if (!res.ok) throw new Error(data.message || "Update failed");

      setSupplier(data.data);
      closeEditModal();
    } catch (err) {
      console.log("ERROR:", err);
    } finally {
      setEditLoading(false);
    }
  };

  //supplier delete 
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

      navigate("/supplier");

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

  return (
    <div className={styles.wrap}>
      {/* Right Panel */}
      <div className={styles.right}>
        {loading ? (
          <div className={styles.loadingState}>Loading...</div>
        ) : (
          <>
            {/* Header */}
            <div className={styles.mainHeader}>
              <button
                className={styles.backBtn}
                onClick={() => navigate("/supplier")}
              >
                <FaArrowLeft />
              </button>
              <div>
                <div className={styles.headerName}>{supplier?.supplierName}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
              {["Transactions", "Profile", "Product report"].map((tab) => (
                <button
                  key={tab}
                  className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""
                    }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className={styles.content}>
              {/* Transactions Tab */}
              {activeTab === "Transactions" && (
                <div className={styles.tableWrap}>
                  <table className={styles.tbl}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Invoice</th>
                        <th>Amount</th>
                        <th>Paid</th>
                        <th>Paid date</th>
                        <th>Payment type</th>
                        <th>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.length > 0 ? (
                        purchases.map((bill) =>
                          bill.paymentHistory?.length > 0 ? (
                            bill.paymentHistory.map((payment, idx) => (
                              <tr key={`${bill.purchaseId}-${idx}`}>
                                <td>{idx === 0 ? bill.invoiceDate : ""}</td>
                                <td>{idx === 0 ? bill.invoiceNo : ""}</td>
                                <td>{idx === 0 ? `₹ ${Number(bill.supplierBillAmount || 0).toLocaleString("en-IN")}` : ""}</td>
                                <td>₹ {Number(payment.amount || 0).toLocaleString("en-IN")}</td>
                                <td>{payment.paidDate || "-"}</td>
                                <td>{payment.paymentType || "-"}</td>
                                <td>{idx === 0 ? `₹ ${Number(bill.balanceAmount || 0).toLocaleString("en-IN")}` : ""}</td>
                                <td>
                                  {idx === 0 && (
                                    <span>
                                      {getStatus(bill)}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr key={bill.purchaseId}>
                              <td>{bill.invoiceDate}</td>
                              <td>{bill.invoiceNo}</td>
                              <td>₹ {Number(bill.supplierBillAmount || 0).toLocaleString("en-IN")}</td>
                              <td>-</td>
                              <td>-</td>
                              <td>-</td>
                              <td>₹ {Number(bill.balanceAmount || 0).toLocaleString("en-IN")}</td>
                              <td>
                                <span>
                                  {getStatus(bill)}
                                </span>
                              </td>
                            </tr>
                          )
                        )
                      ) : (
                        <tr>
                          <td colSpan="8" className={styles.emptyCell}>
                            No Transactions Found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Profile Tab */}
              {activeTab === "Profile" && (
                <div className={styles.profileGrid}>

                  {/* General Details */}
                  <div className={styles.profileCard}>
                    <h3 className={styles.cardHeading}>
                      General details
                    </h3>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Name</span>
                      <span className={styles.val}>
                        {supplier?.supplierName || "-"}
                      </span>
                    </div>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Mobile</span>
                      <span className={styles.val}>
                        {supplier?.mobile || "-"}
                      </span>
                    </div>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Email</span>
                      <span className={styles.val}>
                        {supplier?.email || "-"}
                      </span>
                    </div>
                  </div>

                  {/* Business Details */}
                  <div className={styles.profileCard}>
                    <h3 className={styles.cardHeading}>
                      Business details
                    </h3>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Gst no</span>
                      <span className={styles.val}>
                        {supplier?.gstNumber || "-"}
                      </span>
                    </div>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Address</span>
                      <span className={styles.val}>
                        {supplier?.address || "-"}
                      </span>
                    </div>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>City</span>
                      <span className={styles.val}>
                        {supplier?.city || "-"}
                      </span>
                    </div>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>State</span>
                      <span className={styles.val}>
                        {supplier?.state || "-"}
                      </span>
                    </div>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Pincode</span>
                      <span className={styles.val}>
                        {supplier?.pincode || "-"}
                      </span>
                    </div>
                  </div>

                </div>
              )}

              {activeTab === "Product report" && (
                <>
                  <div className={styles.summaryRow}>
                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>Products</div>
                      <div className={styles.statValue}>
                        {productSummary.length}
                      </div>
                    </div>

                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>Purchase qty</div>
                      <div className={styles.statValue}>
                        {totalPurchaseQty}
                      </div>
                    </div>

                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>Sales qty</div>
                      <div className={styles.statValue}>
                        {totalSalesQty}
                      </div>
                    </div>
                  </div>

                  <div className={styles.tableWrap}>
                    <table className={styles.tbl}>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Brand</th>
                          <th>Purchase qty</th>
                          <th>Purchase amount</th>
                          <th>Sales qty</th>
                          <th>Sales amount</th>
                        </tr>
                      </thead>

                      <tbody>
                        {productSummary.length > 0 ? (
                          productSummary.map((item) => (
                            <tr key={item.productId}>
                              <td>{item.productName}</td>
                              <td>{item.brand || "-"}</td>
                              <td>{item.purchaseQty}</td>
                              <td>₹ {item.purchaseAmount.toFixed(2)}</td>
                              <td>{item.salesQty}</td>
                              <td>₹ {item.salesAmount.toFixed(2)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className={styles.emptyCell}>
                              No Product Report Found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

            </div>
          </>
        )}
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
              <h3>Edit Supplier</h3>

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
                  Supplier Name
                </label>

                <input
                  type="text"
                  name="supplierName"
                  value={
                    editSupplier.suppliername
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

              <div className={styles.field}
              >
                <label>
                  Address
                </label>

                <input
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
                <label>Ifsc code</label>
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

export default SupplierDetails;