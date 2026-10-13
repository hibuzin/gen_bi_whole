import styles from "./Sidebar.module.css";
import { useNavigate, useLocation } from "react-router-dom";
import { FaHome, FaUsers, FaBox, FaChartBar, FaTags, FaCog } from "react-icons/fa";
import { MdPayments, MdInventory } from "react-icons/md";
import { RiMoneyDollarCircleLine, } from "react-icons/ri";
import { API } from "../../constants/api";
import {
  FaTruckLoading,
  FaUserCircle,
  FaChevronRight,
  FaPrint,
  FaHeadset,
  FaShieldAlt,
  FaShoppingCart,
  FaBarcode,
  FaChartLine,
  FaFileAlt,
  FaCreditCard,
  FaUserFriends,
  FaBoxOpen,
} from "react-icons/fa";
import { FaChevronDown } from "react-icons/fa";
import { FaBars } from "react-icons/fa";
import { useState, useEffect } from "react";
import { APP_VERSION } from "../../version";
import { FaSignOutAlt } from "react-icons/fa";

import homeIcon from "../../assets/home.png";
import customerIcon from "../../assets/customer3.png";
import itemsIcon from "../../assets/items.png";
import sidebarTexture from "../../assets/texture4.png";




const getRoleFromToken = () => {
  try {
    const token = localStorage.getItem("token");
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.role;
  } catch {
    return null;
  }
};


function Sidebar({ collapsed, setCollapsed, lang }) {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(null);
  const [settingsMode, setSettingsMode] = useState(false);
  const role = getRoleFromToken();
  const location = useLocation();

  const [business, setBusiness] = useState(() => {
    return JSON.parse(localStorage.getItem("user")) || {};
  });

  const businessName = business.CompanyName || "";
  const phone = business.CompanyPhone || "";
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const updateBusiness = () => {
      const updatedUser =
        JSON.parse(localStorage.getItem("user")) || {};

      setBusiness(updatedUser);
    };

    window.addEventListener("businessUpdated", updateBusiness);

    return () => {
      window.removeEventListener("businessUpdated", updateBusiness);
    };
  }, []);

  const logo =
    localStorage.getItem(
      "businessLogo"
    ) || "";

  const settingsMenu = [
    {
      name: lang === "ta" ? "கணக்கு" : "Account",
      path: "/account",
      icon: <FaUserCircle />,
    },
    {
      name: lang === "ta" ? "வணிகத்தை நிர்வகிக்கவும்" : "Manage Business",
      path: "/managebusiness",
      icon: <FaUserCircle />,
    },
    {
      name: lang === "ta" ? "பயனர்கள் நிர்வாகம்" : "Manage Users",
      path: "/settings/users",
      icon: <FaUsers />,
    },


    {
      divider: true
    },

    {
      name: lang === "ta" ? "வெளியேறு" : "Logout",
      path: "/logout",
      icon: <FaSignOutAlt />,
      logout: true,
    },
  ];

  const menu = [

    {
      name: lang === "ta" ? "முகப்பு பலகம்" : "DASHBOARD",
      path: "/home",
      icon: <img className={styles.homeIcon} src={homeIcon} alt="" />,
    },

    {
      name: lang === "ta" ? "வாடிக்கையாளர்கள்" : "CUSTOMERS",
      path: "/customers",
      icon: <FaUserFriends />,
    },

    {
      name: lang === "ta" ? "பொருட்கள்" : "ITEMS",
      path: "/product",
      icon: <FaBoxOpen />,
    },

    {
      name: lang === "ta" ? "சப்ளையர்கள்" : "SUPPLIERS",
      path: "/supplier",
      icon: <FaTruckLoading />
    },

    {
      name: lang === "ta" ? "கொள்முதல்" : "PURCHASE",
      path: "/purchase",
      icon: <FaShoppingCart />
    },

    {
      name: lang === "ta" ? "கொள்முதல்" : "BARCODE",
      path: "/create-barcode",
      icon: <FaBarcode />
    },

    {
      name: lang === "ta" ? "விற்பனை" : "SALES",
      icon: <FaChartLine />,
      children: [
        { name: lang === "ta" ? "இன்றைய விற்பனை" : "Sales check", path: "/sales" },
        { name: lang === "ta" ? "அதிகம் விற்பனையாகும் பொருட்கள்" : "Top Selling Products", path: "topsellingproduct" },
        { name: lang === "ta" ? "அதிகம் விற்பனையாகும் பொருட்கள்" : "Session Handle", path: "session-management" },
      ],
    },
    /*
    {
      name: lang === "ta" ? "பொருட்கள்" : "REPACK",
      path: "/repack",
      icon: <FaBox />,
    },
    */

    {
      name: lang === "ta" ? "பொருட்கள்" : "REPORTS",
      icon: <FaFileAlt />,
      children: [
        { name: lang === "ta" ? "இன்றைய விற்பனை" : "Item wise reports ", path: "/Bill-itemwise" },
        { name: lang === "ta" ? "அதிகம் விற்பனையாகும் பொருட்கள்" : "Bill wise  reports", path: "/Billwise" },
      ],
    },

    {
      name: lang === "ta" ? "பொருட்கள்" : "PAYMENT",
      path: "/payment",
      icon: <FaCreditCard />,
    },
    {
      name: lang === "ta" ? "சரக்கு" : "STOCKS",
      path: "/stocks",
      icon: <MdInventory />,
    },

    {
      name: lang === "ta" ? "விற்பனை" : "GST",
      icon: <RiMoneyDollarCircleLine />,
      onlyRole: "super_admin",
      children: [
        { name: lang === "ta" ? "இன்றைய விற்பனை" : "purchase report", path: "/Purchase-reports" },
        { name: lang === "ta" ? "அதிகம் விற்பனையாகும் பொருட்கள்" : "sales reports", path: "Bill-reports" },
      ],
    },
    /*
        {
          name: lang === "ta" ? "சலுகைகள்" : "OFFERS",
          path: "/offers",
          icon: <FaTags />
        },
        */
  ];

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(API.logout, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Logout failed");
      }

    } catch (err) {
      console.error(err);
    } finally {
      const defaultUnit = localStorage.getItem("defaultUnit") || "pcs";

      localStorage.clear();
      localStorage.setItem("defaultUnit", defaultUnit);

      navigate("/login", { replace: true });
    }
  };

  return (
    <div
      className={`
    ${styles.sidebar}
    ${collapsed ? styles.collapsed : ""}
    ${settingsMode ? styles.settingsSidebar : ""}
  `}
    >
      {/* TOP FIXED */}

      <div className={styles.topFixed}>

        <div className={styles.topBar}>

          {!collapsed && (
            <div className={styles.businessSection}>



              <div className={styles.billRow}>

                <button
                  className={styles.billBtn}
                  onClick={() => navigate("/posbilling")}
                >
                  <span className={styles.plusIcon}>+</span> Create Bill
                </button>
                {/*
      <button
        className={styles.menuBtn}
        onClick={() => setCollapsed(!collapsed)}
      >
        <FaBars />
      </button>
*/}
              </div>

            </div>
          )}



          {/*
{collapsed && (
  <FaBars
    className={styles.toggleBtn}
    onClick={() => setCollapsed(!collapsed)}
  />
)}
*/}


        </div>

      </div>

      <div className={styles.menuWrapper}>

        <ul className={styles.menu}>
          {!settingsMode ? (
            menu
              .filter(
                item =>
                  item.key !== "settings" &&
                  (
                    !item.onlyRole ||
                    item.onlyRole === role
                  )
              )

              .map((item, index) => (
                <div key={index}>
                  {!collapsed && index === 0 && (
                    <div className={styles.menuHeading}>General</div>
                  )}

                  {!collapsed && item.path === "/purchase" && (
                    <div className={styles.menuHeading}>Sales</div>
                  )}

                  {!collapsed && item.path === "/stocks" && (
                    <div className={styles.menuHeading}>Inventory</div>
                  )}
                  <li
                    className={`${styles.item} ${location.pathname === item.path
                      ? styles.active
                      : ""
                      }`}
                    onClick={() => {
                      if (item.key === "settings") {
                        setSettingsMode(true);
                        navigate("/account");
                      } else if (item.children) {
                        setOpenMenu(openMenu === index ? null : index);
                      } else {
                        navigate(item.path);
                      }
                    }}
                  >
                    <div className={styles.menuItem}>
                      <span className={styles.icon}>{item.icon}</span>

                      {!collapsed && <span className={styles.text}>
                        {item.name}
                      </span>}
                    </div>

                    {!collapsed && item.children && (
                      <span
                        className={`${styles.arrow} ${openMenu === index ? styles.rotate : ""
                          }`}
                      >
                        <FaChevronRight />
                      </span>
                    )}
                  </li>

                  {!collapsed && item.children && openMenu === index && (
                    <div className={styles.subMenu}>
                      {item.children.map((sub, i) => (
                        <li
                          key={i}
                          className={`${styles.subItem} ${location.pathname === sub.path
                            ? styles.active
                            : ""
                            }`}
                          onClick={() => navigate(sub.path)}
                        >
                          {sub.name}
                        </li>
                      ))}
                    </div>
                  )}
                </div>
              ))
          ) : (

            <>
              <li
                className={styles.backItem}
                onClick={() => {
                  setSettingsMode(false);
                  navigate("/home");
                }}
              >
                <span>← Back to Dashboard</span>
              </li>
              {settingsMenu.map((item, index) => {

                if (item.divider) {
                  return <div key={index} className={styles.settingsDivider}></div>;
                }

                return (
                  <li
                    key={index}
                    className={`${styles.item} ${location.pathname === item.path
                      ? styles.active
                      : ""
                      }`}
                    onClick={() => {

                      if (item.logout) {
                        handleLogout();
                        return;
                      }

                      navigate(item.path);
                    }}
                  >
                    <div className={styles.menuItem}>
                      <span className={styles.icon}>
                        {item.icon}
                      </span>

                      {!collapsed && <span>{item.name}</span>}
                    </div>
                  </li>
                );
              })}
            </>
          )}
        </ul>
      </div>

      <div className={styles.bottomSettings}>

        <div
          className={styles.settingsButton}
          onClick={() => setShowLogoutConfirm(true)}
        >
          <div className={styles.menuItem}>
            <span className={styles.icon}>
              <FaSignOutAlt />
            </span>

            {!collapsed && (
              <span className={styles.settingsText}>
                Logout
              </span>
            )}
          </div>
        </div>

      </div>

      {showLogoutConfirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmDialog}>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>

            <div className={styles.confirmActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>

              <button
                className={styles.logoutButton}
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}

export default Sidebar;