import { useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { FiEdit, FiTrash2, FiChevronDown, FiArrowUp, FiArrowDown } from "react-icons/fi";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./CustomerDetails.module.css";
import { API } from "../../constants/api";
import { FiRefreshCw } from "react-icons/fi";
import Toast from "../../components/Toast";

function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [bills, setBills] = useState([]);
  const [customerBalances, setCustomerBalances] = useState([]);
  const [activeTab, setActiveTab] = useState("Transactions");
  const [allCustomers, setAllCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerItems, setCustomerItems] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [loyaltyChange, setLoyaltyChange] = useState("");
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(""), 2500);
      return () => clearTimeout(t);
    }
  }, [message]);

  const showToast = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
  };


  const [editCustomer, setEditCustomer] = useState({
    _id: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    state: "",
    city: "",
    pincode: "",
    panNumber: "",
    gstNumber: "",
    bankDetails: {
      accountHolderName: "",
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      branchName: "",
    },
  });


  useEffect(() => {
    fetchCustomerDetails(id);
    fetchCustomerBalances();
    fetchAllCustomers();
    fetchCustomerItems();
  }, [id]);

  const fetchAllCustomers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API.customers, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAllCustomers(data.data || []);
    } catch (err) {
    }
  };

  const handleUpdateLoyalty = async (type) => {
    const enteredPoints = Number(loyaltyChange || 0);

    if (!enteredPoints || enteredPoints <= 0) {
      showToast("Enter valid loyalty points", "error");
      return;
    }

    const pointsToSend =
      type === "reduce"
        ? -enteredPoints
        : enteredPoints;

    const currentPoints = Number(customer?.loyaltyPoints || 0);

    if (
      type === "reduce" &&
      enteredPoints > currentPoints
    ) {
      showToast(
        `Customer has only ${currentPoints} loyalty points`,
        "error"
      );
      return;
    }

    try {
      setLoyaltyLoading(true);

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API.customers}/${customer._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            loyaltyPoints: pointsToSend,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to update loyalty points"
        );
      }

      setCustomer(data.data);

      setLoyaltyChange("");

      showToast(
        type === "reduce"
          ? `${enteredPoints} loyalty points reduced`
          : `${enteredPoints} loyalty points added`,
        "success"
      );
    } catch (error) {
      console.error("Loyalty update error:", error);

      showToast(
        error.message || "Failed to update loyalty points",
        "error"
      );
    } finally {
      setLoyaltyLoading(false);
    }
  };

  const fetchCustomerDetails = async (customerId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Customer details
      const customerRes = await fetch(`${API.customers}/${customerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const customerData = await customerRes.json();
      const customerInfo =
        customerData.customer || customerData.data || customerData;

      // Get numeric customerId
      const numericCustomerId =
        customerInfo.customerId || customerInfo.id;

      // Customer purchase report
      const purchaseRes = await fetch(
        `${API.customerPurchaseReport}?customerId=${numericCustomerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const purchaseData = await purchaseRes.json();


      setCustomer(customerInfo);

      setEditCustomer({
        _id: customerInfo._id,
        name: customerInfo.name || "",
        phone:
          customerInfo.phone ||
          customerInfo.mobile ||
          customerInfo.mobileNumber ||
          "",
        email: customerInfo.email || "",
        address: customerInfo.address || "",
        state: customerInfo.state || "",
        city: customerInfo.city || "",
        pincode: customerInfo.pincode || "",
        panNumber: customerInfo.panNumber || "",
        gstNumber: customerInfo.gstNumber || "",

        bankDetails: {
          accountHolderName:
            customerInfo.bankDetails?.accountHolderName || "",
          bankName:
            customerInfo.bankDetails?.bankName || "",
          accountNumber:
            customerInfo.bankDetails?.accountNumber || "",
          ifscCode:
            customerInfo.bankDetails?.ifscCode || "",
          branchName:
            customerInfo.bankDetails?.branchName || "",
        },
      });

      setBills(purchaseData.data || []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };


  const fetchCustomerBalances = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(API.customerBalances, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setCustomerBalances(result.data || []);
      }
    } catch (err) {
    }
  };

  const fetchCustomerItems = async () => {
    try {
      const token = localStorage.getItem("token");

      // Get current customer details
      const customerRes = await fetch(`${API.customers}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const customerData = await customerRes.json();
      const customerInfo =
        customerData.customer || customerData.data || customerData;

      const numericCustomerId =
        customerInfo.customerId || customerInfo.id;

      // Product Wise Customer Report
      const res = await fetch(API.customerProductReport, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json();

      if (result.success) {
        const filtered = (result.data || []).filter(
          (item) => String(item.customerId) === String(numericCustomerId)
        );

        setCustomerItems(filtered);
      } else {
        setCustomerItems([]);
      }
    } catch (err) {
      setCustomerItems([]);
    }
  };

  const handleSelectCustomer = (c) => {
    navigate(`/customer/${c._id}`);
    setActiveTab("Transactions");
  };

  const filteredCustomers = allCustomers.filter((c) =>
    (c.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("bankDetails.")) {
      const field = name.split(".")[1];

      setEditCustomer((prev) => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          [field]: value,
        },
      }));
    } else {
      setEditCustomer((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleUpdate = async () => {
    try {
      setEditLoading(true);

      const token = localStorage.getItem("token");

      const res = await fetch(`${API.customers}/${editCustomer._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editCustomer),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      setCustomer(data.data);

      setShowEditModal(false);

      fetchAllCustomers();

    } catch (err) {
      console.log(err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API.customers}/${customer._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete customer");
      }

      setShowDeleteConfirm(false);

      showToast("Customer deleted successfully", "success");

      const updatedCustomers = allCustomers.filter(
        (c) => c._id !== customer._id
      );

      setAllCustomers(updatedCustomers);

      setTimeout(() => {
        if (updatedCustomers.length > 0) {
          navigate(`/customer/${updatedCustomers[0]._id}`);
        } else {
          navigate("/customers");
        }
      }, 600);

    } catch (err) {
      showToast(err.message || "Server error", "error");
    }
  };


  return (
    <div className={styles.wrap}>
      {message && <Toast message={message} type={messageType} />}

      {/* Right Panel */}
      <div className={styles.right}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className={styles.mainHeader}>
              <button
                className={styles.backBtn}
                onClick={() => navigate("/customers")}
              >
                <FaArrowLeft />
              </button>
              <div>
                <div className={styles.headerName}>{customer?.name}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
              {["Transactions", "Profile", "Item report"].map((tab) => (
                <button
                  key={tab}
                  className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
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
                        <th>Bill No</th>
                        <th>Items</th>
                        <th>Payment</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.length > 0 ? (
                        bills.map((bill) => (
                          <tr
                            key={bill.billId}
                          /*  onClick={() => navigate(`/customer/${id}/bill/${bill.billId}`)}*/
                            style={{ cursor: "pointer" }}
                          >
                            <td>{bill.billDate}</td>
                            <td>{bill.invoiceNo}</td>
                            <td>{bill.totalQty}</td>
                            <td>{bill.paymentMethod}</td>
                            <td>
                              ₹{" "}
                              {Number(bill.grandTotal).toLocaleString("en-IN", {
                                maximumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className={styles.emptyCell}>
                            No transactions found
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
                    <h3 className={styles.cardHeading}>General details</h3>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Name</span>
                      <span className={styles.val}>{customer?.name || "-"}</span>
                    </div>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Phone</span>
                      <span className={styles.val}>
                        {customer?.phone ||
                          customer?.mobile ||
                          customer?.mobileNumber ||
                          "-"}
                      </span>
                    </div>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Email</span>
                      <span className={styles.val}>{customer?.email || "-"}</span>
                    </div>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Pan number</span>
                      <span className={styles.val}>{customer?.panNumber || "-"}</span>
                    </div>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Gst number</span>
                      <span className={styles.val}>
                        {customer?.gstNumber || "-"}
                      </span>
                    </div>
                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>State</span>
                      <span className={styles.val}>{customer?.state || "-"}</span>
                    </div>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>City</span>
                      <span className={styles.val}>{customer?.city || "-"}</span>
                    </div>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Pincode</span>
                      <span className={styles.val}>{customer?.pincode || "-"}</span>
                    </div>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Address</span>
                      <span className={styles.val}>{customer?.address || "-"}</span>
                    </div>
                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Loyalty points</span>
                      <span className={styles.val}>
                        {
                          customer?.loyaltyPoints ??
                          0}
                      </span>
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div className={styles.profileCard}>
                    <h3 className={styles.cardHeading}>Bank details</h3>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Account holder</span>
                      <span className={styles.val}>
                        {customer?.bankDetails?.accountHolderName || "-"}
                      </span>
                    </div>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Bank name</span>
                      <span className={styles.val}>
                        {customer?.bankDetails?.bankName || "-"}
                      </span>
                    </div>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Account number</span>
                      <span className={styles.val}>
                        {customer?.bankDetails?.accountNumber || "-"}
                      </span>
                    </div>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Ifsc code</span>
                      <span className={styles.val}>
                        {customer?.bankDetails?.ifscCode || "-"}
                      </span>
                    </div>

                    <div className={styles.profileRow}>
                      <span className={styles.lbl}>Branch</span>
                      <span className={styles.val}>
                        {customer?.bankDetails?.branchName || "-"}
                      </span>
                    </div>
                  </div>

                </div>
              )}

              {activeTab === "Item report" && (
                <div className={styles.tableWrap}>
                  <table className={styles.tbl}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Total bills</th>
                        <th>Gst</th>
                        <th>Total amount</th>
                      </tr>
                    </thead>

                    <tbody>
                      {customerItems.length > 0 ? (
                        customerItems.map((item, index) => (
                          <tr key={index}>
                            <td>{item.productName}</td>

                            <td>{item.totalQty}</td>

                            <td>{item.totalBills}</td>

                            <td>
                              ₹
                              {Number(item.totalGST).toLocaleString("en-IN", {
                                maximumFractionDigits: 2,
                              })}
                            </td>

                            <td>
                              ₹
                              {Number(item.totalAmount).toLocaleString("en-IN", {
                                maximumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className={styles.emptyCell}>
                            No item report found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </>
        )}
      </div>
      {showEditModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowEditModal(false)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Edit customer</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.field}>
                <label>Name</label>
                <input name="name" value={editCustomer.name} onChange={handleChange} />
              </div>

              <div className={styles.field}>
                <label>Phone</label>
                <input name="phone" value={editCustomer.phone} onChange={handleChange} />
              </div>

              <div className={styles.field}>
                <label>Email</label>
                <input name="email" value={editCustomer.email} onChange={handleChange} />
              </div>

              <div className={styles.field}>
                <label>Pan number</label>
                <input name="panNumber" value={editCustomer.panNumber} onChange={handleChange} />
              </div>

              <div className={styles.field}>
                <label>Gst number</label>
                <input name="gstNumber" value={editCustomer.gstNumber} onChange={handleChange} />
              </div>

              <div className={styles.field}>
                <label>Address</label>
                <input name="address" value={editCustomer.address} onChange={handleChange} />
              </div>

              <div className={styles.field}>
                <label>State</label>
                <input name="state" value={editCustomer.state} onChange={handleChange} />
              </div>

              <div className={styles.field}>
                <label>City</label>
                <input name="city" value={editCustomer.city} onChange={handleChange} />
              </div>

              <div className={styles.field}>
                <label>Pincode</label>
                <input name="pincode" value={editCustomer.pincode} onChange={handleChange} />
              </div>

              <div className={styles.sectionTitle}>
                Loyalty points
              </div>

              <div className={styles.loyaltyEditBox}>
                <div className={styles.currentLoyalty}>
                  <span>Current points</span>

                  <strong>
                    {Number(customer?.loyaltyPoints || 0)}
                  </strong>
                </div>

                <div className={styles.field}>
                  <label>Add / reduce points</label>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={loyaltyChange}
                    onChange={(event) => {
                      const value = event.target.value.replace(/\D/g, "");
                      setLoyaltyChange(value);
                    }}
                    placeholder="Enter points"
                    disabled={loyaltyLoading}
                  />
                </div>

                <div className={styles.loyaltyActions}>
                  <button
                    type="button"
                    className={styles.addPointsBtn}
                    onClick={() => handleUpdateLoyalty("add")}
                    disabled={loyaltyLoading}
                  >
                    {loyaltyLoading ? "Updating..." : "Add points"}
                  </button>

                  <button
                    type="button"
                    className={styles.reducePointsBtn}
                    onClick={() => handleUpdateLoyalty("reduce")}
                    disabled={loyaltyLoading}
                  >
                    {loyaltyLoading ? "Updating..." : "Reduce points"}
                  </button>
                </div>
              </div>

              <div className={styles.sectionTitle}>Bank details</div>

              <div className={styles.field}>
                <label>Account holder name</label>
                <input name="bankDetails.accountHolderName" value={editCustomer.bankDetails.accountHolderName} onChange={handleChange} />
              </div>

              <div className={styles.field}>
                <label>Bank name</label>
                <input name="bankDetails.bankName" value={editCustomer.bankDetails.bankName} onChange={handleChange} />
              </div>

              <div className={styles.field}>
                <label>Account number</label>
                <input name="bankDetails.accountNumber" value={editCustomer.bankDetails.accountNumber} onChange={handleChange} />
              </div>

              <div className={styles.field}>
                <label>Ifsc code</label>
                <input name="bankDetails.ifscCode" value={editCustomer.bankDetails.ifscCode} onChange={handleChange} />
              </div>

              <div className={styles.field}>
                <label>Branch name</label>
                <input name="bankDetails.branchName" value={editCustomer.bankDetails.branchName} onChange={handleChange} />
              </div>

              <button
                className={styles.saveBtn}
                onClick={handleUpdate}
                disabled={editLoading}
              >
                {editLoading ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className={styles.confirmBox}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Delete customer?</h3>

            <p>Are you sure?</p>

            <div className={styles.confirmActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>

              <button
                className={styles.deleteBtn}
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

export default CustomerDetails;