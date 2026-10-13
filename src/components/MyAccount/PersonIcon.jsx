import styles from "./PersonIcon.module.css";
import { useNavigate } from "react-router-dom";

function MyAccount({ onClose }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();
  const role = user?.role;

  const roleText =
  role === "super_admin"
    ? "Super Admin"
    : role === "admin"
    ? "Admin"
    : role === "cashier"
    ? "Cashier"
    : "";

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
  <div className={styles.panel} onClick={(e) => e.stopPropagation()}>

    <div className={styles.userRow}>
      <div className={styles.avatar}>
        {user?.name?.charAt(0).toUpperCase()}
      </div>

      <div className={styles.userInfo}>
        <div className={styles.nameRow}>
  <p className={styles.name}>
    {user?.name || "Admin"}
  </p>

  <span
    className={`${styles.roleChip} ${
      role === "admin"
        ? styles.admin
        : role === "cashier"
        ? styles.cashier
        : styles.superAdmin
    }`}
  >
    {role === "super_admin"
      ? "Super Admin"
      : role === "admin"
      ? "Admin"
      : "Cashier"}
  </span>
</div>

<p className={styles.email}>
  {user?.email || "admin@gmail.com"}
</p>
      </div>
    </div>
<div className={styles.thickDivider}></div>
  <div className={styles.menuList}>
  <div
  className={styles.menuItem}
  onClick={() => navigate("/myaccountpage")}
>
  <span>My Account</span>
  <span className={styles.arrow}>›</span>
</div>

  {role === "super_admin" && (
    <div
      className={styles.menuItem}
      onClick={() => navigate("/admin")}
    >
      <span>Admin</span>
      <span className={styles.arrow}>›</span>
    </div>
  )}

  {(role === "super_admin" || role === "admin") && (
    <div
      className={styles.menuItem}
      onClick={() => navigate("/cashier")}
    >
      <span>Cashier</span>
      <span className={styles.arrow}>›</span>
    </div>
  )}
</div>

    <div className={styles.bottomActions}>
      <button className={styles.logoutBtn} onClick={handleLogout}>
        Logout
      </button>
    </div>

  </div>
</div>
  );
}

export default MyAccount;