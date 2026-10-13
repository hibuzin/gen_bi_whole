import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./CreateUser.module.css";
import Toast from "../../../components/Toast";
import { API } from "../../../constants/api";

function CreateUser() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "cashier",
  });

  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({
    message: "",
    type: "success",
  });

  const showToast = (
    message,
    type = "success"
  ) => {
    setToast({ message, type });

    setTimeout(() => {
      setToast({
        message: "",
        type: "success",
      });
    }, 2500);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const token =
        localStorage.getItem("token");

      const res = await fetch(API.createSuperAdminUser, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(form),
});

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Failed"
        );
      }

      showToast(
        data.message ||
          "User created successfully"
      );

      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "cashier",
      });

      setTimeout(() => {
        navigate("/settings/users");
      }, 1000);

    } catch (err) {

      showToast(err.message, "error");

    } finally {

      setLoading(false);
    }
  };

  return (
    <>
      <div className={styles.container}>

        <div className={styles.card}>

          <div className={styles.header}>
            <h1>Create User</h1>

            <p>
              Add a new user to your
              workspace
            </p>
          </div>

          <form
            className={styles.form}
            onSubmit={handleSubmit}
          >

            <div className={styles.field}>
              <label>Name</label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter name"
              />
            </div>

            <div className={styles.field}>
              <label>Email</label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter email"
              />
            </div>

            <div className={styles.field}>
              <label>Phone Number</label>

              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
              />
            </div>

            <div className={styles.field}>
              <label>Password</label>

              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter password"
              />
            </div>

            <div className={styles.field}>
              <label>Role</label>

              <select
                name="role"
                value={form.role}
                onChange={handleChange}
              >
                <option value="cashier">
                  Cashier
                </option>

                <option value="admin">
                  Admin
                </option>
              </select>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading
                ? "Creating..."
                : "Create User"}
            </button>

          </form>
        </div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
      />
    </>
  );
}

export default CreateUser;