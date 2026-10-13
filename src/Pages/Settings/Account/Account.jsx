import { useEffect, useState } from "react";
import styles from "./Account.module.css";
import { API } from "../../../constants/api";

function Account() {

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });

  const [toastVisible, setToastVisible] =
    useState(false);

  const API_URL = API.account;

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch profile");
      }

      const profileData = data.data || data;

      setForm({
        name: profileData.name || "",
        phone: profileData.phone || "",
        email: profileData.email || "",
        password: "",
      });

    } catch (err) {
      console.error("Fetch profile error:", err);
      alert(err.message);
    }
  };

  const handleChange = (e) => {

    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");

      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
      };

      const res = await fetch(API_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      setToastVisible(true);

      setTimeout(() => {
        setToastVisible(false);
      }, 2500);

    } catch (err) {
      console.error("Update profile error:", err);
      alert(err.message);
    }
  };

  const getInitials = (name) => {

    if (!name) return "?";

    const parts =
      name.trim().split(" ");

    return parts.length >= 2
      ? (
        parts[0][0] +
        parts[parts.length - 1][0]
      ).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  return (

    <div className={styles.accountPage}>

      <div className={styles.topHeader}>

        <div className={styles.headerLeft}>

          <h1 className={styles.title}>
            Account Settings
          </h1>

          <p className={styles.subtitle}>
            Manage your account details
          </p>

        </div>

      </div>

      <div className={styles.avatarRow}>

        <div className={styles.avatar}>
          {getInitials(form.name)}
        </div>

        <div className={styles.avatarInfo}>

          <p className={styles.avatarName}>
            {form.name || "—"}
          </p>

          <p className={styles.avatarEmail}>
            {form.email || "—"}
          </p>

        </div>

      </div>

      <div className={styles.sectionHeader}>

        <h2 className={styles.sectionTitle}>
          General Information
        </h2>

      </div>

      <hr className={styles.divider} />

      <div className={styles.formGrid}>

        <div className={styles.inputGroup}>

          <label className={styles.label}>
            Name
          </label>

          <input
            type="text"
            name="name"
            placeholder="Enter name"
            value={form.name}
            onChange={handleChange}
            className={styles.input}
          />

        </div>

        <div className={styles.inputGroup}>

          <label className={styles.label}>
            Mobile Number
          </label>

          <input
            type="text"
            name="phone"
            placeholder="Enter mobile number"
            value={form.phone}
            onChange={handleChange}
            className={styles.input}
          />

        </div>

        <div className={styles.inputGroup}>

          <label className={styles.label}>
            E-mail
          </label>

          <input
            type="email"
            name="email"
            placeholder="Enter email"
            value={form.email}
            onChange={handleChange}
            className={styles.input}
          />

        </div>

        <div className={styles.inputGroup}>

          <label className={styles.label}>
            Password
          </label>

          <input
            type="password"
            name="password"
            placeholder="Enter password"
            value={form.password}
            onChange={handleChange}
            className={styles.input}
          />

        </div>

      </div>

      <div className={styles.saveWrap}>

        <button
          className={styles.saveBtn}
          onClick={handleSave}
        >
          Save Changes
        </button>

      </div>

      {toastVisible && (
        <div className={styles.toast}>
          Changes saved successfully
        </div>
      )}

    </div>
  );
}

export default Account;