import styles from "./Login.module.css";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../../components/Toast";
import { API } from "../../constants/api";
import AppBar from "../../components/AppBar/AppBar";
import { FaShieldAlt } from "react-icons/fa";
import loginImage from "../../assets/loginicon.png";
import topRightImage from "../../assets/loginicon1.png";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [lang, setLang] = useState("en");

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(""), 2500);
      return () => clearTimeout(t);
    }
  }, [message]);

  const showToast = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
  };

  const handleKeyDownEmail = (e) => {
    if (e.key === "Enter") passwordRef.current.focus();
  };

  const handleKeyDownPassword = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  //Login fetch 
  const handleLogin = async () => {
    if (!email) {
      showToast("Email is required", "error");
      return;
    }

    if (!password) {
      showToast("Password is required", "error");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(API.login, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      console.log("LOGIN RESPONSE:", data);

      if (!res.ok || !data.success) {
        showToast(
          data.message || "Invalid email or password",
          "error"
        );
        return;
      }

      const token =
        data.token ||
        data.data?.token;

      const user =
        data.user ||
        data.data?.user;

      if (!token) {
        console.error("Token missing:", data);
        showToast("Login failed: Token not received", "error");
        return;
      }

      localStorage.setItem("token", token);

      if (user) {
        localStorage.setItem(
          "user",
          JSON.stringify(user)
        );
      }

      showToast("Login successful!", "success");

      setTimeout(() => {
        navigate("/home", { replace: true });
      }, 1000);

    } catch (error) {
      console.error("LOGIN ERROR:", error);
      showToast(
        "Server error. Try again later",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className={styles.container}>

      {message && (
        <Toast message={message} type={messageType} />
      )}

      {/* LEFT SIDE IMAGE */}
      <div className={styles.imageSection}>
        <img
          src={loginImage}
          alt="Billing"
          className={styles.loginImage}
        />
      </div>

      {/* RIGHT SIDE */}
      <div className={styles.rightSection}>



        {/* LOGIN FORM */}
        <div className={styles.formSection}>
          <div className={styles.formBox}>
            {/*
            <div className={styles.brand}>
              <img
                src={topRightImage}
                alt="Hibuz Billing"
              />
            </div>*/}
            <h1>Login</h1>

            <label className={styles.label}>
              Enter your email
            </label>

            <input
              type="email"
              placeholder="Email"
              value={email}
              ref={emailRef}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDownEmail}
            />

            <label className={styles.label}>
              Enter your password
            </label>

            <input
              type="password"
              placeholder="Password"
              value={password}
              ref={passwordRef}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDownPassword}
            />

            <button
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <p className={styles.signupText}>
              <span onClick={() => navigate("/register")}>
                Forgot password?
              </span>
            </p>
          </div>
        </div>

      </div>

    </div>
  );


}

export default Login;