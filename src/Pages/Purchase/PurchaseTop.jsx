import { FiArrowLeft, FiSave } from "react-icons/fi";
import styles from "./CreatePurchase.module.css";

export default function PurchaseTop({
    navigate,
    isEditMode,
    loading,
    handleSubmit,
    form,
    setForm,
}) {
    return (
        <div className={styles.topBar}>
            <div className={styles.topLeft}>
                <div className={styles.topLeft}>
                    <button
                        className={styles.backBtn}
                        onClick={() => navigate(-1)}
                    >
                        <FiArrowLeft />
                    </button>

                    <h2>
                        {isEditMode
                            ? "Edit purchase invoice"
                            : "Create purchase invoice"}
                    </h2>
                </div>
            </div>
            <div className={styles.topRight}>

                <div className={styles.placeOfSupply}>
                    <label htmlFor="placeOfSupply">Place of Supply</label>
                    <input
                        id="placeOfSupply"
                        type="text"
                        value={form.placeOfSupply || ""}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                placeOfSupply: e.target.value,
                            }))
                        }
                        placeholder="Enter place of supply"
                    />
                </div>

                <button
                    className={styles.btnPrimary}
                    onClick={handleSubmit}
                    disabled={loading}
                >

                    {loading
                        ? isEditMode
                            ? "Updating..."
                            : "Saving..."
                        : isEditMode
                            ? "Update"
                            : "Save"}
                </button>
            </div>
        </div>
    );
}