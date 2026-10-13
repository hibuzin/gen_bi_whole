import { useEffect, useState } from "react";
import styles from "./CreatePartialGRN.module.css";
import Toast from "../../components/Toast";

function CreatePartialGRN() {
  const [form, setForm] = useState({
    purchaseId: "",
    items: [
      {
        productId: "",
        qty: "",
        costPrice: "",
      },
    ],
  });

  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({
    message: "",
    type: "",
  });

  const showToast = (message, type) => {
    setToast({ message, type });

    setTimeout(() => {
      setToast({ message: "", type: "" });
    }, 2500);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("http://192.168.31.181:5000/api/purchase/purchase/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setPurchases(data.data || []);
      })
      .catch((err) =>
        console.error("PURCHASE FETCH ERROR:", err)
      );

    fetch("http://192.168.31.181:5000/api/productadd", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.data || []);
      })
      .catch((err) =>
        console.error("PRODUCT FETCH ERROR:", err)
      );
  }, []);

  const handleItemChange = (
    index,
    field,
    value
  ) => {
    const updatedItems = [...form.items];

    updatedItems[index][field] = value;

    setForm({
      ...form,
      items: updatedItems,
    });
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          productId: "",
          qty: "",
          costPrice: "",
        },
      ],
    });
  };

  const removeItem = (index) => {
    if (form.items.length === 1) return;

    const updatedItems = form.items.filter(
      (_, i) => i !== index
    );

    setForm({
      ...form,
      items: updatedItems,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const payload = {
        purchaseId: form.purchaseId,
        items: form.items.map((item) => ({
          productId: item.productId,
          qty: Number(item.qty),
          costPrice: Number(item.costPrice),
        })),
      };

      const res = await fetch(
        "http://192.168.31.181:5000/api/GRN/grn/partial",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Failed to create Partial GRN"
        );
      }

      showToast(
        "Partial GRN created successfully",
        "success"
      );

      setForm({
        purchaseId: "",
        items: [
          {
            productId: "",
            qty: "",
            costPrice: "",
          },
        ],
      });

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
        <div className={styles.card}>

          <div className={styles.header}>
            <h2>Create Partial GRN</h2>
            <p>
              Add partially received stock
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className={styles.form}
          >

            <div className={styles.field}>
              <label>Purchase</label>

              <select
                value={form.purchaseId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    purchaseId: e.target.value,
                  })
                }
                required
              >
                <option value="">
                  Select Purchase
                </option>

                {purchases.map((purchase) => (
                  <option
                    key={purchase._id}
                    value={purchase._id}
                  >
                    {purchase.supplierId?.name ||
                      purchase._id}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.itemsWrap}>
              {form.items.map((item, index) => (
                <div
                  key={index}
                  className={styles.itemCard}
                >

                  <div className={styles.itemTop}>
                    <h4>
                      Item {index + 1}
                    </h4>

                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() =>
                        removeItem(index)
                      }
                    >
                      Remove
                    </button>
                  </div>

                  <div className={styles.itemGrid}>

                    <div className={styles.field}>
                      <label>Product</label>

                      <select
                        value={item.productId}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "productId",
                            e.target.value
                          )
                        }
                        required
                      >
                        <option value="">
                          Select Product
                        </option>

                        {products.map((product) => (
                          <option
                            key={product._id}
                            value={product._id}
                          >
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label>Quantity</label>

                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "qty",
                            e.target.value
                          )
                        }
                        required
                      />
                    </div>

                    <div className={styles.field}>
                      <label>Cost Price</label>

                      <input
                        type="number"
                        value={item.costPrice}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "costPrice",
                            e.target.value
                          )
                        }
                        required
                      />
                    </div>

                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className={styles.addBtn}
              onClick={addItem}
            >
              Add Item
            </button>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitBtn}
            >
              {loading
                ? "Creating..."
                : "Create Partial GRN"}
            </button>

          </form>
        </div>
      </div>
    </>
  );
}

export default CreatePartialGRN;