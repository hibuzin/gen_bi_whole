import { useEffect, useState } from "react";
import styles from "./Offers.module.css";
import { useNavigate } from "react-router-dom";

function Offers() {
  const token = localStorage.getItem("token");

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        API.offers,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load offers");
      }

      setOffers(data.data || []);
    } catch (err) {
      console.error("Fetch offers error:", err);
      setError(err.message || "Failed to load offers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const formatOfferType = (offerType) => {
    if (offerType === "bill") return "Bill Offer";
    if (offerType === "buy_get") return "Buy & Get";
    return offerType || "-";
  };

  const getOfferDetails = (offer) => {
    if (offer.offerType === "buy_get") {
      return `Buy ${offer.buyQty || 0} Get ${offer.freeQty || 0} Free`;
    }

    if (offer.offerType === "bill") {
      const discount =
        offer.discountType === "percentage"
          ? `${offer.discountValue || 0}%`
          : `₹${Number(offer.discountValue || 0).toFixed(2)}`;

      return `Purchase ₹${Number(
        offer.minimumPurchase || 0
      ).toFixed(2)} and get ${discount} discount`;
    }

    return "-";
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";

    return new Date(dateValue).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Offers</h1>
          <p className={styles.subHeading}>
            View and manage available offers
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={fetchOffers}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

          <button
            type="button"
            className={styles.createBtn}
            onClick={() => navigate("/create-offer")}
          >
            + Create offer
          </button>
        </div>
      </div>

      <div className={styles.summaryCard}>
        <span>Total offers</span>
        <strong>{offers.length}</strong>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No</th>
              <th>Offer name</th>
              <th>Offer type</th>
              <th>Minimum purchase</th>
              <th>Discount</th>
              <th>Offer details</th>
              <th>Status</th>
              <th>Created date</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className={styles.emptyState}>
                  Loading offers...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="8" className={styles.errorState}>
                  {error}
                </td>
              </tr>
            ) : offers.length === 0 ? (
              <tr>
                <td colSpan="8" className={styles.emptyState}>
                  No offers found
                </td>
              </tr>
            ) : (
              offers.map((offer, index) => (
                <tr key={offer._id}>
                  <td>{index + 1}</td>

                  <td>
                    <div className={styles.offerName}>
                      {offer.offerName || "-"}
                    </div>
                  </td>

                  <td>
                    <span
                      className={`${styles.typeBadge} ${offer.offerType === "buy_get"
                        ? styles.buyGetBadge
                        : styles.billBadge
                        }`}
                    >
                      {formatOfferType(offer.offerType)}
                    </span>
                  </td>

                  <td>
                    {offer.offerType === "bill"
                      ? `₹${Number(
                        offer.minimumPurchase || 0
                      ).toFixed(2)}`
                      : "-"}
                  </td>

                  <td>
                    {offer.offerType === "bill"
                      ? offer.discountType === "percentage"
                        ? `${offer.discountValue || 0}%`
                        : `₹${Number(
                          offer.discountValue || 0
                        ).toFixed(2)}`
                      : "-"}
                  </td>

                  <td>{getOfferDetails(offer)}</td>

                  <td>
                    <span
                      className={`${styles.statusBadge} ${offer.isActive
                        ? styles.activeStatus
                        : styles.inactiveStatus
                        }`}
                    >
                      {offer.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td>{formatDate(offer.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Offers;