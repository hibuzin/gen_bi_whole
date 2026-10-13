import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Customers.module.css";
import { FiSearch, FiX, FiArrowUp, FiArrowDown } from "react-icons/fi";
import {
  FaRegFileAlt,
  FaEdit,
  FaTrash,
  FaPencilAlt
} from "react-icons/fa";
import Toast from "../../components/Toast";
import { API } from "../../constants/api";
import {
  Users,
  Award,
  UserCheck,
  ExternalLink
} from "lucide-react";


function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [customerBalances, setCustomerBalances] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const openDeleteConfirm = (e, id) => {
    e?.stopPropagation();
    setSelectedDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const getCustomerDue = (customerId) => {
    const balance = customerBalances.find(
      (item) => item.customerId === customerId
    );

    return balance?.balanceAmount || 0;
  };

  const navigate = useNavigate();

  useEffect(() => {
    if (search.trim()) {
      searchCustomers(search);
    } else {
      fetchCustomers();
    }
  }, [search]);

  useEffect(() => {
    fetchCustomerBalances();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");
      const res = await fetch(API.customers, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to fetch customers");

      setCustomers(data.data || []);
    } catch (err) {
      showToast(err.message || "Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerBalances = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(API.customerBalances, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch balances");
      }

      setCustomerBalances(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };


  const searchCustomers = async (query) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API.customerSearch}?q=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      setCustomers(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (e, customer) => {
    e.stopPropagation();

    setEditCustomer({
      _id: customer._id,
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      state: customer.state || "",
      city: customer.city || "",
      pincode: customer.pincode || "",
      panNumber: customer.panNumber || "",
      gstNumber: customer.gstNumber || "",
      bankDetails: {
        accountHolderName: customer.bankDetails?.accountHolderName || "",
        bankName: customer.bankDetails?.bankName || "",
        accountNumber: customer.bankDetails?.accountNumber || "",
        ifscCode: customer.bankDetails?.ifscCode || "",
        branchName: customer.bankDetails?.branchName || "",
      },
    });

    setShowEditModal(true);
    document.body.style.overflow = "hidden";
  };
  const closeEditModal = () => {
    setShowEditModal(false);
    document.body.style.overflow = "auto";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("bankDetails.")) {
      const key = name.split(".")[1];

      setEditCustomer((prev) => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          [key]: value,
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
        body: JSON.stringify({
          name: editCustomer.name,
          phone: editCustomer.phone,
          email: editCustomer.email,
          address: editCustomer.address,
          state: editCustomer.state,
          city: editCustomer.city,
          pincode: editCustomer.pincode,
          panNumber: editCustomer.panNumber,
          gstNumber: editCustomer.gstNumber,
          bankDetails: {
            accountHolderName: editCustomer.bankDetails.accountHolderName,
            bankName: editCustomer.bankDetails.bankName,
            accountNumber: editCustomer.bankDetails.accountNumber,
            ifscCode: editCustomer.bankDetails.ifscCode,
            branchName: editCustomer.bankDetails.branchName,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Update failed");

      setCustomers((prev) =>
        prev.map((c) =>
          c._id === editCustomer._id ? data.data : c
        )
      );

      showToast("Customer updated successfully", "success");

      setShowEditModal(false);
      document.body.style.overflow = "auto";

    } catch (err) {
      showToast(err.message || "Server error", "error");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoadingId(selectedDeleteId);

      const token = localStorage.getItem("token");
      const res = await fetch(`${API.customers}/${selectedDeleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to delete");

      setCustomers((prev) =>
        prev.filter((c) => c._id !== selectedDeleteId)
      );

      showToast("Customer deleted successfully", "success");

      setShowDeleteConfirm(false);
      setSelectedDeleteId(null);

    } catch (err) {
      showToast(err.message || "Server error", "error");
    } finally {
      setLoadingId(null);
    }
  };

  const totalPoints = customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0);

  return (
    <div className={styles.container}>

      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* HEADER */}
      <div className={styles.header}>
        <h2>Customers</h2>

      </div>


      {/* SEARCH + CREATE */}
      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search customers..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div
          className={styles.createCustomerBox}
          onClick={() => navigate("/create-customer")}
        >
          <span>Create customer</span>
        </div>
      </div>


      {/* TABLE */}
      <div
        className={styles.tableWrapper}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No</th>
              <th>Id</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Points</th>
              <th>Due</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8">
                  <div className={styles.tableLoader}>
                    <div className={styles.spinner}></div>
                    <p>Loading customers...</p>
                  </div>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan="8">
                  <div className={styles.emptyState}>
                    No customers found
                  </div>
                </td>
              </tr>
            ) : (
              customers.map((c, index) => (

                <tr
                  key={c._id}
                  className={styles.tableRow}
                  onClick={() => navigate(`/customer/${c._id}`)}
                >
                  <td className={styles.serialNo}>
                    {index + 1}
                  </td>
                  <td className={styles.idCell}>{c.id}</td>
                  <td className={styles.nameCell}>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.email || "—"}</td>
                  <td>{(c.loyaltyPoints || 0)}</td>
                  <td className={styles.dueCell}>
                    ₹ {getCustomerDue(c.id)}
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.editBtn}
                        onClick={(e) => openEditModal(e, c)}
                        title="Edit"
                      >
                        <FaPencilAlt />
                      </button>

                      <button
                        className={styles.deleteBtn}
                        onClick={(e) => openDeleteConfirm(e, c._id)}
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

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className={styles.modalOverlay} onClick={closeEditModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Edit customer</h3>
              <button className={styles.closeBtn} onClick={closeEditModal}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.field}>
                <label>Name</label>
                <input type="text" name="name" value={editCustomer.name} onChange={handleChange} />
              </div>
              <div className={styles.field}>
                <label>Phone</label>
                <input type="text" name="phone" value={editCustomer.phone} onChange={handleChange} />
              </div>
              <div className={styles.field}>
                <label>Pan number</label>
                <input
                  type="text"
                  name="panNumber"
                  value={editCustomer.panNumber}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.field}>
                <label>Email</label>
                <input type="email" name="email" value={editCustomer.email} onChange={handleChange} />
              </div>
              <div className={styles.field}>
                <label>Gst number</label>

                <input
                  type="text"
                  name="gstNumber"
                  value={editCustomer.gstNumber}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  value={editCustomer.address} onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>State</label>
                <input
                  type="text"
                  name="state"
                  value={editCustomer.state}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={editCustomer.city}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  value={editCustomer.pincode}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.field}>
                <label>Account holder name</label>
                <input
                  type="text"
                  name="bankDetails.accountHolderName"
                  value={editCustomer.bankDetails.accountHolderName}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Bank name</label>
                <input
                  type="text"
                  name="bankDetails.bankName"
                  value={editCustomer.bankDetails.bankName}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Account number</label>
                <input
                  type="text"
                  name="bankDetails.accountNumber"
                  value={editCustomer.bankDetails.accountNumber}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Ifsc code</label>
                <input
                  type="text"
                  name="bankDetails.ifscCode"
                  value={editCustomer.bankDetails.ifscCode}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label>Branch name</label>
                <input
                  type="text"
                  name="bankDetails.branchName"
                  value={editCustomer.bankDetails.branchName}
                  onChange={handleChange}
                />
              </div>

              <button className={styles.saveBtn} onClick={handleUpdate} disabled={editLoading}>
                {editLoading ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {showDeleteConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmBox}>
            <h3>Delete customer?</h3>
            <p>Are you sure you want to delete this customer?</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className={styles.confirmDeleteBtn} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Customers;