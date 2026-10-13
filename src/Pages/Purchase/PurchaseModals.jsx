import { FiSearch, FiGrid } from "react-icons/fi";
import AddItemsModal from "./AddItemsModal";
import styles from "./CreatePurchase.module.css";

export default function PurchaseModals({
  showItemModal,
  setShowItemModal,
  showBarcodeModal,
  setShowBarcodeModal,

  products,
  productsLoading,
  handleAddItems,

  itemSearch,
  setItemSearch,
  handleBarcodeSearch,

  scannedItems,
  selectedItems,
  handleQtyChange,
  handleAddToBill,
}) {
  return (
    <>
      {/* NORMAL ADD ITEMS MODAL */}
      {showItemModal && (
        <AddItemsModal
          products={products}
          loading={productsLoading}
          onClose={() => setShowItemModal(false)}
          onAddItems={handleAddItems}
        />
      )}

      {/* BARCODE MODAL */}
      {showBarcodeModal && (
        <div className={styles.addItemsOverlay}>
          <div className={styles.addItemsModal}>
            <div className={styles.addItemsHeader}>
              <h2>Add items to bill</h2>

              <button
                type="button"
                className={styles.closeBtn}
                onClick={() =>
                  setShowBarcodeModal(false)
                }
              >
                ✕
              </button>
            </div>

            <div className={styles.addItemsToolbar}>
              <div className={styles.searchWrapper}>            
                <FiSearch
                  className={styles.searchIcon}
                />

                <input
                  autoFocus
                  type="text"
                  placeholder="Scan or Enter Barcode"
                  className={styles.searchInput}
                  value={itemSearch}
                  onChange={(e) =>
                    setItemSearch(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleBarcodeSearch(itemSearch);
                    }
                  }}
                />

                <FiGrid
                  className={styles.barcodeIcon}
                />
              </div>

              <select
                className={styles.categorySelect}
                defaultValue=""
              >
                <option value="">
                  Select Category
                </option>
              </select>

              <button
                type="button"
                className={styles.createNewBtn}
              >
                Create new item
              </button>
            </div>

            <div
              className={
                styles.addItemsTableWrapper
              }
            >
              <table className={styles.addItemsTable}>
                <thead>
                  <tr>
                    <th>Item name</th>
                    <th>Item code</th>
                    <th>Stock</th>
                    <th>Mrp</th>
                    <th>Sales price</th>
                    <th>Purchase Price</th>
                    <th>Quantity</th>
                  </tr>
                </thead>

                <tbody>
                  {scannedItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className={styles.emptyState}
                      >
                        Scan items to add them to
                        your invoice
                      </td>
                    </tr>
                  ) : (
                    scannedItems.map((item) => (
                      <tr
                        key={
                          item.productId ||
                          item._id ||
                          item.barcode
                        }
                      >
                        <td>
                          {item.productName ||
                            item.name ||
                            ""}
                        </td>

                        <td>
                          {item.barcode ||
                            item.itemCode ||
                            ""}
                        </td>

                        <td>
                          {item.stock != null
                            ? `${Number(
                                item.stock
                              ).toFixed(2)} ${
                                item.unit
                                  ? String(
                                      item.unit
                                    ).toUpperCase()
                                  : "PCS"
                              }`
                            : "-"}
                        </td>

                        <td>
                          {item.mrp ?? 0}
                        </td>

                        <td>
                          {item.sellingPrice ?? 0}
                        </td>

                        <td>
                          {item.costPrice ??
                            item.netcost ??
                            0}
                        </td>

                        <td>
                          <div
                            className={
                              styles.qtyStepper
                            }
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleQtyChange(
                                  item.productId,
                                  -1
                                )
                              }
                            >
                              −
                            </button>

                            <span>
                              {selectedItems[
                                item.productId
                              ]?.qty || 1}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                handleQtyChange(
                                  item.productId,
                                  1
                                )
                              }
                            >
                              +
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.shortcuts}>
              <span>Keyboard shortcuts :</span>

              <span>
                Change quantity{" "}
                <kbd>Enter</kbd>
              </span>

              <span>
                Move between items{" "}
                <kbd>↑</kbd> <kbd>↓</kbd>
              </span>
            </div>

            <div className={styles.addItemsFooter}>
              <span>
                {scannedItems.length} Item(s)
                Selected
              </span>

              <div>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() =>
                    setShowBarcodeModal(false)
                  }
                >
                  Cancel [ESC]
                </button>

                <button
                  type="button"
                  className={styles.addToBillBtn}
                  disabled={
                    scannedItems.length === 0
                  }
                  onClick={handleAddToBill}
                >
                  Add to bill [F7]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}