import { useState } from "react";
import styles from "./CreateHSN.module.css";

function CreateHSN() {
  const [formData, setFormData] = useState({
    hsnCode: "",
    description: "",
    gstRate: "",
    category: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://192.168.31.181:5000/api/hsn/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            hsnCode: formData.hsnCode,
            description: formData.description,
            gstRate: Number(formData.gstRate),
            category: formData.category,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);

        setFormData({
          hsnCode: "",
          description: "",
          gstRate: "",
          category: "",
        });
      } else {
        setError(data.message || "Failed to create HSN");
      }
    } catch (err) {
      setError("Server error");
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2>Create HSN</h2>
          <p>Add HSN details with GST information</p>
        </div>

        {message && (
          <div className={styles.successBox}>{message}</div>
        )}

        {error && (
          <div className={styles.errorBox}>{error}</div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>HSN Code</label>
            <input
              type="text"
              name="hsnCode"
              placeholder="Enter HSN code"
              value={formData.hsnCode}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <input
              type="text"
              name="description"
              placeholder="Enter description"
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>GST Rate (%)</label>
            <input
              type="number"
              name="gstRate"
              placeholder="Enter GST rate"
              value={formData.gstRate}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Category</label>
            <input
              type="text"
              name="category"
              placeholder="Enter category"
              value={formData.category}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create HSN"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateHSN;