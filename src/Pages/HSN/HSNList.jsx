import { useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import styles from "./HSNList.module.css";

function HSNList() {
  const [hsnList, setHsnList] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    fetchHSN();
  }, []);

  const fetchHSN = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://192.168.31.181:5000/api/hsn/",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setHsnList(data.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div>
          <h2>HSN Management</h2>
          <p>Manage all HSN codes and GST details</p>
        </div>

        <button
          className={styles.addBtn}
          onClick={() => navigate("/create-hsn")}
        >
          <FaPlus />
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>HSN Code</th>
              <th>Description</th>
              <th>GST %</th>
              <th>CGST</th>
              <th>SGST</th>
              <th>IGST</th>
              <th>CESS</th>
              <th>Category</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className={styles.message}>
                  Loading...
                </td>
              </tr>
            ) : hsnList.length > 0 ? (
              hsnList.map((item) => (
                <tr key={item._id}>
                  <td>{item.hsnCode}</td>
                  <td>{item.description}</td>
                  <td>{item.gstRate}%</td>
                  <td>{item.cgst}%</td>
                  <td>{item.sgst}%</td>
                  <td>{item.igst}%</td>
                  <td>{item.cess}%</td>
                  <td>{item.category}</td>
                  <td>
                    <span
                      className={
                        item.isActive
                          ? styles.active
                          : styles.inactive
                      }
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className={styles.message}>
                  No HSN records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HSNList;