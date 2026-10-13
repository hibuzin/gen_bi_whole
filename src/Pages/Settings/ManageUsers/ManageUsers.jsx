import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ManageUsers.module.css";
import { API } from "../../../constants/api";
import Toast from "../../../components/Toast";

function ManageUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editData, setEditData] = useState({ name: "", email: "", phone: "" });
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handler = () => setOpenMenu(null);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");

      const [adminRes, cashierRes] = await Promise.all([
        fetch(API.adminUsers, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(API.cashierUsers, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const adminData = await adminRes.json();
      const cashierData = await cashierRes.json();

      const admins = (adminData.data || []).map((u) => ({ ...u, role: "Admin" }));
      const cashiers = (cashierData.data || []).map((u) => ({ ...u, role: "Cashier" }));

      setUsers([...admins, ...cashiers]);
    } catch (err) {
      console.log(err);
    }
  };

  const toggleMenu = (id, e) => {
    e.stopPropagation();
    setOpenMenu(openMenu === id ? null : id);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditData({ name: user.name, email: user.email, phone: user.phone || "" });
    setShowEdit(true);
    setOpenMenu(null);
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete ${user.name}?`)) return;
    try {
      const token = localStorage.getItem("token");
      const endpoint =
        user.role === "Admin"
          ? `${API.updateadmin}/${user._id}`
          : `${API.updatecashier}/${user._id}`;

      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        fetchUsers();
        showToast("User deleted successfully", "success");
      } else {
        showToast(data.message || "Delete failed", "error");
      }
    } catch (err) {
      console.log(err);
      showToast("Something went wrong", "error");
    }
  };

  const handleUpdate = async () => {
    try {
      setUpdating(true);
      const token = localStorage.getItem("token");

      const endpoint =
        selectedUser.role === "Admin"
          ? `${API.updateadmin}/${selectedUser._id}`
          : `${API.updatecashier}/${selectedUser._id}`;

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editData),
      });

      const data = await res.json();

      if (data.success) {
        setShowEdit(false);
        fetchUsers();
        showToast("User updated successfully", "success");
      } else {
        showToast(data.message || "Update failed", "error");
      }
    } catch (err) {
      console.log(err);
      showToast("Something went wrong", "error");
    } finally {
      setUpdating(false);
    }
  };

  const getRoleBadgeClass = (role) =>
    role === "Admin" ? styles.badgeAdmin : styles.badgeCashier;

  return (
    <div className={styles.wrap}>

      {toast && <Toast message={toast.message} type={toast.type} />}
      {/* Top */}
      <div className={styles.topSection}>
        <div>
          <h1 className={styles.title}>Manage Users</h1>
          <p className={styles.subtitle}>View and manage all users</p>
        </div>
        <button className={styles.addBtn} onClick={() => navigate("/createuser")}>
          + Create User
        </button>
      </div>

      {/* Table */}
      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.phone || "—"}</td>
                <td>
                  <span className={`${styles.badge} ${getRoleBadgeClass(u.role)}`}>
                    {u.role}
                  </span>
                </td>
                <td className={styles.actionCell}>
                  <button
                    className={styles.menuBtn}
                    onClick={(e) => toggleMenu(u._id, e)}
                  >
                    ⋮
                  </button>
                  {openMenu === u._id && (
                    <div
                      className={styles.dropdown}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <button onClick={() => handleEdit(u)}>Edit</button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(u)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.empty}>No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className={styles.modalOverlay} onClick={() => setShowEdit(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Edit {selectedUser?.role}</h2>

            <div className={styles.field}>
              <label>Name</label>
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>

            <div className={styles.field}>
              <label>Email</label>
              <input
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              />
            </div>

            <div className={styles.field}>
              <label>Phone</label>
              <input
                type="text"
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              />
            </div>

            <div className={styles.modalButtons}>
              <button
                className={styles.updateBtn}
                onClick={handleUpdate}
                disabled={updating}
              >
                {updating ? "Updating..." : "Update"}
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowEdit(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageUsers;