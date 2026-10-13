import { useEffect, useState } from "react";
import styles from "./ManageBusiness.module.css";
import { FiImage } from "react-icons/fi";
import Toast from "../../../components/Toast";

function ManageBusiness() {
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const token = localStorage.getItem("token");

  const role = storedUser?.role;

  const [message, setMessage] = useState("");
const [messageType, setMessageType] = useState("");

  const [logo, setLogo] = useState("");

  const [form, setForm] = useState({
    CompanyName: storedUser.CompanyName || "",
    CompanyPhone: storedUser.CompanyPhone || "",
    CompanyEmail: storedUser.CompanyEmail || "",
  });

  useEffect(() => {
    const savedLogo = localStorage.getItem("businessLogo");

    if (savedLogo) {
      setLogo(savedLogo);
    }
  }, []);

  useEffect(() => {
  if (message) {
    const timer = setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }
}, [message]);

  const roleText =
    role === "super_admin"
      ? "Super Admin"
      : role === "admin"
      ? "Admin"
      : role === "cashier"
      ? "Cashier"
      : "";

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdate = async () => {
    try {
      const payload = {
        ...storedUser,
        CompanyName: form.CompanyName,
        CompanyPhone: form.CompanyPhone,
        CompanyEmail: form.CompanyEmail,
      };

      delete payload._id;
      delete payload.role;

      const res = await fetch(
        API.profileme,
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

      if (res.ok && data.success) {
  localStorage.setItem(
    "user",
    JSON.stringify({
      ...storedUser,
      ...data.data,
    })
  );

    window.dispatchEvent(new Event("businessUpdated"));
  setMessage("Business details updated successfully.");
  setMessageType("success");
} else {
  setMessage(data.message || "Update failed");
  setMessageType("error");
}
    } catch (err) {
  console.error(err);
  setMessage("Something went wrong");
  setMessageType("error");
}
  };

  return (
    <div className={styles.container}>
      {message && (
  <Toast
    message={message}
    type={messageType}
  />
)}
      <h1 className={styles.title}>Manage Business</h1>

      <div className={styles.topSection}>
        <div className={styles.logoSection}>
          <label className={styles.logoUpload}>
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files[0];

                if (file) {
                  const reader = new FileReader();

                  reader.onloadend = () => {
                    setLogo(reader.result);

                    localStorage.setItem(
                      "businessLogo",
                      reader.result
                    );
                  };

                  reader.readAsDataURL(file);
                }
              }}
            />

            {logo ? (
              <img
                src={logo}
                alt="Logo"
                className={styles.logo}
              />
            ) : (
              <div className={styles.uploadText}>
                <FiImage />

                <div>
                  Upload Logo
                  <br />

                  <span>PNG/JPG, max 5 MB.</span>
                </div>
              </div>
            )}
          </label>
        </div>

        <div
          className={`${styles.roleChip} ${
            role === "admin"
              ? styles.admin
              : role === "cashier"
              ? styles.cashier
              : styles.superAdmin
          }`}
        >
          {roleText}
        </div>
      </div>

      <div className={styles.detailsGrid}>
        <div className={styles.field}>
          <label>Company Name</label>

          <input
            className={styles.input}
            type="text"
            name="CompanyName"
            value={form.CompanyName}
            onChange={handleChange}
          />
        </div>

        <div className={styles.field}>
          <label>Phone</label>

          <input
            className={styles.input}
            type="text"
            name="CompanyPhone"
            value={form.CompanyPhone}
            onChange={handleChange}
          />
        </div>

        <div className={styles.field}>
          <label>Email</label>

          <input
            className={styles.input}
            type="email"
            name="CompanyEmail"
            value={form.CompanyEmail}
            onChange={handleChange}
          />
        </div>
      </div>

      <button
        className={styles.saveBtn}
        onClick={handleUpdate}
      >
        Save Changes
      </button>
    </div>
  );
}

export default ManageBusiness;