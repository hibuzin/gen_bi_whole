import styles from "./Onboarding.module.css";
import Toast from "../../components/Toast";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppBar from "../../components/AppBar/AppBar";
import { FaShieldAlt, FaCheckCircle, FaCertificate } from "react-icons/fa";
import loginIcon from "../../assets/loginicon.png";
import { MdVerified } from "react-icons/md";
import { API } from "../../constants/api";

function Onboarding() {
  const [lang, setLang] = useState("en");

  const [form, setForm] = useState({
    CompanyName: "",
    CompanyPhone: "",
    CompanyEmail: "",
    password: "",
    address: "",
    state: "",
    pincode: "",
    city: "",
    gstnumber: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(""), 2500);
      return () => clearTimeout(t);
    }
  }, [message]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const { CompanyName, CompanyPhone, CompanyEmail, password } = form;

    if (!CompanyName || !CompanyPhone || !CompanyEmail || !password) {
      setMessage("Please fill all fields");
      setType("error");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(API.registerSuperAdmin, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(data.message || "Setup completed");
        setType("success");

        // Save user
        localStorage.setItem("user", JSON.stringify(data.data.user || data.data));

        // Save token if backend returns it
        if (data.token) {
          localStorage.setItem("token", data.token);
        } else if (data.data?.token) {
          localStorage.setItem("token", data.data.token);
        }

        localStorage.setItem("isLoggedIn", "true");

        setTimeout(() => {
          navigate("/home", { replace: true });
        }, 1200);
      } else {
        setMessage(data.message || "Failed");
        setType("error");
      }
    } catch (err) {
      setMessage("Server error");
      setType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppBar lang={lang} setLang={setLang} />

      <div className={styles.container}>
        <Toast message={message} type={type} />

        <div className={styles.wrapper}>

          {/* LEFT */}
          <div className={styles.left}>
            <h1>Welcome 👋 to Our Billing</h1>

            <img
              src={loginIcon}
              alt="Billing"
              className={styles.loginImage}
            />
          </div>

          {/* DIVIDER */}
          <div className={styles.dividerWrap}>
            <div className={styles.dividerLine} />
          </div>

          {/* RIGHT */}
          <div className={styles.right}>
            <div className={styles.formCard}>
              <h3>Let's set up your business</h3>
              <p className={styles.topText}>Fill your basic details</p>

              <div className={styles.field}>
                <label>Business Name</label>
                <input
                  type="text"
                  name="CompanyName"
                  value={form.CompanyName}
                  onChange={handleChange}
                  placeholder="Enter business name"
                />
              </div>

              <div className={styles.field}>
                <label>Mobile Number</label>
                <input
                  type="text"
                  name="CompanyPhone"
                  value={form.CompanyPhone}
                  onChange={handleChange}
                  placeholder="Enter mobile number"
                />
              </div>

              <div className={styles.field}>
                <label>Email Address</label>
                <input
                  type="email"
                  name="CompanyEmail"
                  value={form.CompanyEmail}
                  onChange={handleChange}
                  placeholder="Enter email"
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

              <button onClick={handleSubmit} disabled={loading}>
                {loading ? "Setting up..." : "Finish Setup"}
              </button>

              <div className={styles.loginText}>
                Already have an account?{" "}
                <span onClick={() => navigate("/login")}>
                  Login
                </span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default Onboarding;