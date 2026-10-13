import { useState, useEffect, useRef } from "react";
import styles from "./CreateCustomers.module.css";
import Toast from "../../components/Toast";
import { API } from "../../constants/api";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

function CreateCustomer() {

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    panNumber: "",
    address: "",
    state: "",
    city: "",
    pincode: "",
    gstNumber: "",
    bankDetails: {
      accountHolderName: "",
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      branchName: "",
    },
  });

  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({
    message: "",
    type: "",
  });

  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const addressRef = useRef(null);
  const submitRef = useRef(null);
  const gstRef = useRef(null);
  const accountHolderRef = useRef(null);
  const bankNameRef = useRef(null);
  const accountNumberRef = useRef(null);
  const ifscRef = useRef(null);
  const branchRef = useRef(null);
  const stateRef = useRef(null);
  const cityRef = useRef(null);
  const pincodeRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleEnter = (e, nextRef) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (nextRef?.current) {
        nextRef.current.focus();
      } else {
        handleSubmit(e);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (
      [
        "accountHolderName",
        "bankName",
        "accountNumber",
        "ifscCode",
        "branchName",
      ].includes(name)
    ) {
      setForm((prev) => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          [name]: value,
        },
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    try {
      setLoading(true);

      const res = await fetch(API.customers, {
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
          data.message || "Failed to create customer"
        );
      }

      showToast(
        "Customer created successfully",
        "success"
      );

      setForm({
        name: "",
        phone: "",
        panNumber: "",
        email: "",
        address: "",
        state: "",
        city: "",
        pincode: "",
        gstNumber: "",
        bankDetails: {
          accountHolderName: "",
          bankName: "",
          accountNumber: "",
          ifscCode: "",
          branchName: "",
        },
      });

      nameRef.current?.focus();

    } catch (err) {
      showToast(err.message, "error");
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
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate("/customers")}
          >
            <FiArrowLeft size={18} />
          </button>

          <h2>Create customer</h2>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>

          <div className={styles.sectionTitle}>
            General details
          </div>

          <div className={styles.grid}>

            <div className={styles.field}>
              <label>Customer name</label>

              <input
                ref={nameRef}
                type="text"
                name="name"
                value={form.name}
                placeholder="Enter customer name"
                onChange={handleChange}
                onKeyDown={(e) =>
                  handleEnter(e, phoneRef)
                }
                required
              />
            </div>

            <div className={styles.field}>
              <label>Phone number</label>
              <input
                ref={phoneRef}
                type="text"
                name="phone"
                value={form.phone}
                placeholder="Enter phone number"
                onChange={handleChange}
                onKeyDown={(e) =>
                  handleEnter(e, emailRef)
                }
                required
              />
            </div>

            <div className={styles.field}>
              <label>Pan number</label>

              <input
                type="text"
                name="panNumber"
                value={form.panNumber}
                placeholder="Enter pan number"
                onChange={handleChange}
                onKeyDown={(e) => handleEnter(e, emailRef)}
              />
            </div>

            <div className={styles.field}>
              <label>Email address</label>

              <input
                ref={emailRef}
                type="email"
                name="email"
                value={form.email}
                placeholder="Enter email address"
                onChange={handleChange}
                onKeyDown={(e) =>
                  handleEnter(e, gstRef)
                }
              />
            </div>

            <div className={styles.field}>
              <label>Gst number</label>

              <div className={styles.gstWrapper}>
                <input
                  ref={gstRef}
                  type="text"
                  name="gstNumber"
                  value={form.gstNumber}
                  placeholder="Enter gst number"
                  onChange={handleChange}
                  onKeyDown={(e) => handleEnter(e, addressRef)}
                />

                <button
                  type="button"
                  className={styles.gstBtn}
                >
                  Get details
                </button>
              </div>
            </div>

            <div className={styles.sectionTitle}>
              Address details
            </div>

            <div className={styles.field}>
              <label>Address</label>

              <input
                ref={addressRef}
                name="address"
                value={form.address}
                placeholder="Enter address"
                onChange={handleChange}
                onKeyDown={(e) => handleEnter(e, stateRef)}
              />
            </div>

            <div className={styles.field}>
              <label>State</label>
              <input
                ref={stateRef}
                type="text"
                name="state"
                value={form.state}
                placeholder="Enter state"
                onChange={handleChange}
                onKeyDown={(e) => handleEnter(e, cityRef)}
              />
            </div>

            <div className={styles.field}>
              <label>City</label>
              <input
                ref={cityRef}
                type="text"
                name="city"
                value={form.city}
                placeholder="Enter city"
                onChange={handleChange}
                onKeyDown={(e) => handleEnter(e, pincodeRef)}
              />
            </div>

            <div className={styles.field}>
              <label>Pincode</label>
              <input
                ref={pincodeRef}
                type="text"
                name="pincode"
                value={form.pincode}
                placeholder="Enter pincode"
                onChange={handleChange}
                onKeyDown={(e) => handleEnter(e, accountHolderRef)}
              />
            </div>

          </div>

          <div className={styles.sectionTitle}>
            Bank details
          </div>

          <div className={styles.grid}>

            <div className={styles.field}>
              <label>Account holder name</label>

              <input
                ref={accountHolderRef}
                type="text"
                name="accountHolderName"
                value={form.bankDetails.accountHolderName}
                placeholder="Enter account holder name"
                onChange={handleChange}
                onKeyDown={(e) => handleEnter(e, bankNameRef)}
              />
            </div>

            <div className={styles.field}>
              <label>Bank name</label>

              <input
                ref={bankNameRef}
                type="text"
                name="bankName"
                value={form.bankDetails.bankName}
                placeholder="Enter bank name"
                onChange={handleChange}
                onKeyDown={(e) => handleEnter(e, accountNumberRef)}
              />
            </div>

            <div className={styles.field}>
              <label>Account number</label>

              <input
                ref={accountNumberRef}
                type="text"
                name="accountNumber"
                value={form.bankDetails.accountNumber}
                placeholder="Enter account number"
                onChange={handleChange}
                onKeyDown={(e) => handleEnter(e, ifscRef)}
              />
            </div>

            <div className={styles.field}>
              <label>Ifsc code</label>

              <input
                ref={ifscRef}
                type="text"
                name="ifscCode"
                value={form.bankDetails.ifscCode}
                placeholder="Enter ifsc code"
                onChange={handleChange}
                onKeyDown={(e) => handleEnter(e, branchRef)}
              />
            </div>

            <div className={styles.field}>
              <label>Branch name</label>

              <input
                ref={branchRef}
                type="text"
                name="branchName"
                value={form.bankDetails.branchName}
                placeholder="Enter branch name"
                onChange={handleChange}
                onKeyDown={(e) => handleEnter(e, submitRef)}
              />
            </div>

            <div className={styles.buttonField}>
              <button
                ref={submitRef}
                type="submit"
                disabled={loading}
                className={styles.btn}
              >
                {loading
                  ? "Creating..."
                  : "Create customer"}
              </button>
            </div>

          </div>

        </form>

      </div>
    </>
  );
}

export default CreateCustomer;