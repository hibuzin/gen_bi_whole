import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import styles from "./CreateOffer.module.css";
import Toast from "../../components/Toast";

function CreateOffer() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [form, setForm] = useState({
    offerName: "",
    minimumPurchase: "",
    discountType: "amount",
    discountValue: "",
  });

  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({
    message: "",
    type: "",
  });

  const showToast = (message, type = "success") => {
    setToast({
      message,
      type,
    });

    setTimeout(() => {
      setToast({
        message: "",
        type: "",
      });
    }, 2500);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!form.offerName.trim()) {
      showToast("Enter offer name", "error");
      return false;
    }

    if (form.minimumPurchase === "") {
      showToast("Enter minimum purchase amount", "error");
      return false;
    }

    if (Number(form.minimumPurchase) < 0) {
      showToast("Minimum purchase cannot be negative", "error");
      return false;
    }

    if (!form.discountType) {
      showToast("Select discount type", "error");
      return false;
    }

    if (form.discountValue === "") {
      showToast("Enter discount value", "error");
      return false;
    }

    if (Number(form.discountValue) <= 0) {
      showToast("Discount value must be greater than 0", "error");
      return false;
    }

    if (
      form.discountType === "percentage" &&
      Number(form.discountValue) > 100
    ) {
      showToast("Percentage discount cannot exceed 100%", "error");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);

      const payload = {
        offerName: form.offerName.trim(),
        minimumPurchase: Number(form.minimumPurchase || 0),
        discountType: form.discountType,
        discountValue: Number(form.discountValue || 0),
      };

      console.log("Create offer payload:", payload);

      const response = await fetch(
        API.offers,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to create offer");
      }

      showToast(
        data.message || "Offer created successfully",
        "success"
      );

      setForm({
        offerName: "",
        minimumPurchase: "",
        discountType: "amount",
        discountValue: "",
      });

      setTimeout(() => {
        navigate("/offers");
      }, 700);
    } catch (error) {
      console.error("Create offer error:", error);

      showToast(
        error.message || "Failed to create offer",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const getDiscountPreview = () => {
    const discountValue = Number(form.discountValue || 0);

    if (!discountValue) return "-";

    if (form.discountType === "percentage") {
      return `${discountValue}%`;
    }

    return `₹${discountValue.toFixed(2)}`;
  };

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
      />

      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => navigate("/offers")}
            >
              <FiArrowLeft />
            </button>

            <div>
              <h1 className={styles.heading}>
                Create offer
              </h1>

              <p className={styles.subHeading}>
                Create a new bill discount offer
              </p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => navigate("/offers")}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              form="createOfferForm"
              className={styles.saveBtn}
              disabled={loading}
            >
              <FiSave />

              {loading ? "Saving..." : "Save offer"}
            </button>
          </div>
        </div>

        <div className={styles.content}>
          <form
            id="createOfferForm"
            className={styles.formCard}
            onSubmit={handleSubmit}
          >
            <div className={styles.cardHeader}>
              <h2>Offer details</h2>

              <p>
                Enter the minimum bill amount and discount
                details.
              </p>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="offerName">
                  Offer name
                </label>

                <input
                  id="offerName"
                  type="text"
                  name="offerName"
                  value={form.offerName}
                  onChange={handleChange}
                  placeholder="Example: Buy ₹1000 get ₹100"
                  autoComplete="off"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="minimumPurchase">
                  Minimum purchase
                </label>

                <div className={styles.inputWithPrefix}>
                  <span>₹</span>

                  <input
                    id="minimumPurchase"
                    type="number"
                    name="minimumPurchase"
                    value={form.minimumPurchase}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="discountType">
                  Discount type
                </label>

                <select
                  id="discountType"
                  name="discountType"
                  value={form.discountType}
                  onChange={handleChange}
                >
                  <option value="amount">
                    Fixed amount
                  </option>

                  <option value="percentage">
                    Percentage
                  </option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="discountValue">
                  Discount value
                </label>

                <div className={styles.inputWithPrefix}>
                  <span>
                    {form.discountType === "percentage"
                      ? "%"
                      : "₹"}
                  </span>

                  <input
                    id="discountValue"
                    type="number"
                    name="discountValue"
                    value={form.discountValue}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0"
                    max={
                      form.discountType === "percentage"
                        ? "100"
                        : undefined
                    }
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </form>

          <div className={styles.previewCard}>
            <div className={styles.previewHeader}>
              Offer preview
            </div>

            <div className={styles.previewBody}>
              <div className={styles.previewIcon}>
                %
              </div>

              <h3>
                {form.offerName.trim() ||
                  "Your offer name"}
              </h3>

              <p>
                Purchase for at least{" "}
                <strong>
                  ₹
                  {Number(
                    form.minimumPurchase || 0
                  ).toFixed(2)}
                </strong>{" "}
                and get{" "}
                <strong>
                  {getDiscountPreview()}
                </strong>{" "}
                discount.
              </p>

              <div className={styles.previewDetails}>
                <div>
                  <span>Offer Type</span>
                  <strong>Bill Offer</strong>
                </div>

                <div>
                  <span>Minimum purchase</span>
                  <strong>
                    ₹
                    {Number(
                      form.minimumPurchase || 0
                    ).toFixed(2)}
                  </strong>
                </div>

                <div>
                  <span>Discount</span>
                  <strong>
                    {getDiscountPreview()}
                  </strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong
                    className={styles.activeStatus}
                  >
                    Active
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default CreateOffer;