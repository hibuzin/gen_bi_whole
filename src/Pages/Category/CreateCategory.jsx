import {
  useState,
  useEffect,
  useRef,
} from "react";

import styles from "./CreateCategory.module.css";
import Toast from "../../components/Toast";
import { API } from "../../constants/api";

function CreateCategory() {

  const [form, setForm] = useState({
    name: "",
    hsnCode: "",
    gstRate: "",
  });

  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({
    message: "",
    type: "",
  });

  const nameRef = useRef(null);
  const hsnRef = useRef(null);
  const gstRef = useRef(null);
  const submitRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const showToast = (message, type) => {
    setToast({ message, type });

    setTimeout(() => {
      setToast({
        message: "",
        type: "",
      });
    }, 2500);
  };

  const handleKeyDown = (e, nextRef) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (nextRef?.current) {
        nextRef.current.focus();
      } else {
        handleSubmit(e);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      return showToast(
        "Category name is required",
        "error"
      );
    }

    if (!form.hsnCode.trim()) {
      return showToast(
        "HSN code is required",
        "error"
      );
    }

    if (!form.gstRate) {
      return showToast(
        "GST rate is required",
        "error"
      );
    }

    const token = localStorage.getItem("token");

    try {
      setLoading(true);

      const res = await fetch(
        API.categories,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            name: form.name.trim(),
            hsnCode: form.hsnCode.trim(),
            gstRate: form.gstRate,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            "Failed to create category"
        );
      }

      showToast(
        "Category created successfully",
        "success"
      );

      setForm({
        name: "",
        hsnCode: "",
        gstRate: "",
      });

      nameRef.current?.focus();

    } catch (err) {
      showToast(
        err.message || "Something went wrong",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
      />

      <div className={styles.container}>

        <div className={styles.header}>
          <h2>Create Category</h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className={styles.form}
        >

          <div className={styles.sectionTitle}>
            Category Details
          </div>

          <div className={styles.grid}>

            <div className={styles.field}>
              <label>Category Name</label>

              <input
                ref={nameRef}
                type="text"
                name="name"
                value={form.name}
                placeholder="Enter category name"
                onChange={handleChange}
                onKeyDown={(e) =>
                  handleKeyDown(e, hsnRef)
                }
                required
              />
            </div>

            <div className={styles.field}>
              <label>HSN Code</label>

              <input
                ref={hsnRef}
                type="text"
                name="hsnCode"
                value={form.hsnCode}
                placeholder="Enter HSN code"
                onChange={handleChange}
                onKeyDown={(e) =>
                  handleKeyDown(e, gstRef)
                }
                required
              />
            </div>

            <div className={styles.field}>
              <label>GST Rate</label>

              <select
                ref={gstRef}
                name="gstRate"
                value={form.gstRate}
                onChange={handleChange}
                onKeyDown={(e) =>
                  handleKeyDown(e, submitRef)
                }
                required
              >
                <option value="">
                  Select GST Rate
                </option>

                <option value="none">
                  None
                </option>

                <option value="5">
                  5%
                </option>

                <option value="12">
                  12%
                </option>

                <option value="18">
                  18%
                </option>

                <option value="28">
                  28%
                </option>
              </select>
            </div>

          </div>

          <div className={styles.buttonWrapper}>
            <button
              ref={submitRef}
              type="submit"
              disabled={loading}
              className={styles.btn}
            >
              {loading
                ? "Creating..."
                : "Create Category"}
            </button>
          </div>

        </form>
      </div>
    </>
  );
}

export default CreateCategory;