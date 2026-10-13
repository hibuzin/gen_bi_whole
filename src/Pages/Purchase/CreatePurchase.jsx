import { useState, useEffect, useRef } from "react";
import AppBar from "../../components/AppBar/AppBar";
import styles from "./CreatePurchase.module.css";
import Toast from "../../components/Toast";
import { API } from "../../constants/api";
import { useNavigate, useLocation } from "react-router-dom";
import PurchaseTop from "./PurchaseTop";
import PurchaseHeader from "./PurchaseHeader";
import PurchaseTable from "./PurchaseTable";
import PurchaseSummary from "./PurchaseSummary";
import {
  calculateNewPurchaseTotals as calculateNewPurchaseTotalsLogic,
  calculatePurchase as calculatePurchaseLogic,
  handlePurchaseSubmit,
} from "./PurchaseLogic";


function CreatePurchase() {
  const emptyItem = {
    productId: "",
    productName: "",
    itemCode: "",
    hsnCode: "",
    barcode: "",
    categoryId: "",
    gstRate: "",
    mrp: "",
    qty: "",
    freeQty: "",
    netcost: "",
    costPrice: "",
    retailPrice: "",
    wholesalePrice: "",
    discount: "",
    discountPercent: "",
    discountAmount: "",
    description: "",
    tax: "",
    stock: "",
    unit: localStorage.getItem("defaultUnit") || "pcs",
    unitValue: "",
    lowStockQty: "",
  };

  const [lang, setLang] = useState(
    localStorage.getItem("lang") || "en"
  );
  const firstItemRef = useRef(null);
  const addDays = (dateValue, days) => {
    if (!dateValue) return "";
    const date = new Date(dateValue);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  };
  const formatDateToDDMMYYYY = (dateValue) => {
    if (!dateValue) return "";
    const [year, month, day] = dateValue.split("-");
    return `${day}.${month}.${year}`;
  };

  const [suppliers, setSuppliers] = useState([]);
  const [supplierSearch, setSupplierSearch] =
    useState("");
  const [supplierDetails, setSupplierDetails] =
    useState({
      number: "",
      address: "",
      gstNumber: "",
      city: "",
      state: "",
      pincode: "",
    });
  const createInlineSupplierRef = useRef(null);
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    supplierId: "",
    invoiceNo: "",
    invoiceDate: today,
    grnDate: today,
    invoiceAmount: "",
    dueDate: addDays(today, 7),
    placeOfSupply: "Tamil Nadu",
    supplierBillAmount: "",
    billDiscountPercent: "",
    freightCharge: "",
    packagingCharge: "",
    paymentMethod: "cash",
    bankName: "",
    transactionId: "",
    upiId: "",
    upiTransactionId: "",
    cardType: "",
    cardLast4: "",
    paidAmount: "",
    notes: "",
  });

  const [billItems, setBillItems] = useState(
    Array.from({ length: 300 }, () => ({ ...emptyItem }))
  );
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "" });
  const createInlineProductRef = useRef(null);

  const createInlineProduct = async (item) => {
    if (!createInlineProductRef.current) {
      throw new Error("Product function is not ready");
    }

    return createInlineProductRef.current(item);
  };

  const navigate = useNavigate();
  const location = useLocation();
  const editPurchaseId = location.state?.purchaseId || "";
  const isEditMode =
    location.state?.mode === "edit" && Boolean(editPurchaseId);
  const supplierId = location.state?.supplierId;
  const token = localStorage.getItem("token");

  const [purchaseTotals, setPurchaseTotals] = useState({
    totalAmount: 0,
    totalGrossAmount: 0,
    totalTaxAmount: 0,
    cgst: 0,
    sgst: 0,
    itemsTotal: 0,
    freightCharge: 0,
    packagingCharge: 0,
    billDiscountAmount: 0,
    supplierBillAmount: 0,
    balanceAmount: 0,
  });

  useEffect(() => {
    const loadPageData = async () => {
      if (isEditMode) {
        await fetchPurchaseForEdit();
      }
    };

    loadPageData();
  }, [editPurchaseId]);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 2500);
  };

  // edite purchase
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return "";

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }

    // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
    const manualMatch = String(dateValue).match(
      /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/
    );

    if (manualMatch) {
      const [, day, month, year] = manualMatch;

      return `${year}-${String(month).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
    }

    const parsedDate = new Date(dateValue);

    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const fetchPurchaseForEdit = async () => {
    if (!editPurchaseId) return;

    try {
      setLoading(true);

      const res = await fetch(
        `${API.purchase}/${editPurchaseId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load purchase details"
        );
      }

      const purchase = data.data;

      const resolvedSupplierId =
        purchase.supplierId?._id ||
        purchase.supplierId ||
        purchase.supplier?.id ||
        "";

      setForm((prev) => ({
        ...prev,

        supplierId: String(resolvedSupplierId || ""),

        invoiceNo: purchase.invoiceNo || "",

        invoiceDate:
          formatDateForInput(purchase.invoiceDate) || today,

        grnDate:
          formatDateForInput(purchase.grnDate) || today,

        invoiceAmount:
          purchase.invoiceAmount ?? purchase.totalAmount ?? "",

        placeOfSupply: purchase.placeOfSupply || "",

        dueDate:
          formatDateForInput(
            purchase.DueDate || purchase.dueDate
          ) || addDays(today, 7),

        supplierBillAmount:
          purchase.supplierBillAmount ?? "",

        billDiscountPercent:
          purchase.billDiscountPercent ?? "",

        freightCharge:
          purchase.freightCharge ?? "",

        packagingCharge:
          purchase.packagingCharge ?? "",

        paidAmount:
          purchase.paidAmount ?? "",


        paymentMethod:
          purchase.paymentMethod ||
          purchase.payment?.method ||
          purchase.paymentHistory?.[0]?.paymentType ||
          "cash",

        bankName:
          purchase.details?.bankName ||
          purchase.paymentHistory?.[0]?.details?.bankName ||
          "",

        transactionId:
          purchase.details?.transactionId ||
          purchase.paymentHistory?.[0]?.details?.transactionId ||
          "",

        upiId:
          purchase.details?.upiId ||
          purchase.paymentHistory?.[0]?.details?.upiId ||
          "",

        upiTransactionId:
          purchase.details?.upiTransactionId ||
          purchase.paymentHistory?.[0]?.details?.upiTransactionId ||
          "",

        cardType:
          purchase.details?.cardType ||
          purchase.paymentHistory?.[0]?.details?.cardType ||
          "",

        cardLast4:
          purchase.details?.cardLast4 ||
          purchase.paymentHistory?.[0]?.details?.cardLast4 ||
          "",

        notes: purchase.notes || "",

        notes: purchase.notes || "",
      }));

      setSupplierDetails({
        number:
          purchase.supplierId?.mobile ||
          purchase.supplier?.mobile ||
          "",

        address:
          purchase.supplierId?.address ||
          purchase.supplier?.address ||
          "",

        gstNumber:
          purchase.supplierId?.gstNumber ||
          purchase.supplier?.gstNumber ||
          "",

        city:
          purchase.supplierId?.city ||
          purchase.supplier?.city ||
          "",

        state:
          purchase.supplierId?.state ||
          purchase.supplier?.state ||
          "",

        pincode:
          purchase.supplierId?.pincode ||
          purchase.supplier?.pincode ||
          "",
      });

      const existingItems = Array.isArray(purchase.items)
        ? purchase.items.map((item) => ({
          ...emptyItem,

          productId:
            item.productId?._id ||
            item.productId ||
            "",

          productName:
            item.productName ||
            item.productId?.name ||
            "",

          itemCode:
            item.itemCode ||
            item.barcode ||
            "",

          barcode:
            item.barcode ||
            item.itemCode ||
            "",

          hsnCode:
            item.hsnCode ||
            "",

          categoryId:
            item.categoryId?._id ||
            item.categoryId ||
            "",

          gstRate:
            (
              item.taxPercentage ??
              item.gstRate ??
              item.tax
            ) === "none"
              ? "none"
              : Number(
                item.taxPercentage ??
                item.gstRate ??
                item.tax ??
                0
              ),

          tax:
            (
              item.taxPercentage ??
              item.gstRate ??
              item.tax
            ) === "none"
              ? "none"
              : Number(
                item.taxPercentage ??
                item.gstRate ??
                item.tax ??
                0
              ),
          qty: Number(item.qty || 0),
          freeQty: Number(item.freeQty || 0),

          netcost: Number(
            item.netcost ??
            item.costPrice ??
            item.Rate ??
            0
          ),

          originalNetcost: Number(
            item.netcost ??
            item.costPrice ??
            item.Rate ??
            0
          ),

          costPrice: Number(
            item.netcost ??
            item.costPrice ??
            item.Rate ??
            0
          ),

          purchasePrice: Number(
            item.netcost ??
            item.costPrice ??
            item.Rate ??
            0
          ),

          retailPrice: Number(
            item.retailPrice ?? 0
          ),

          wholesalePrice: Number(
            item.wholesalePrice ?? 0
          ),

          retailProfitAmount: Number(
            item.retailProfitAmount ?? 0
          ),

          wholesaleProfitAmount: Number(
            item.wholesaleProfitAmount ?? 0
          ),

          retailProfitPercent: Number(
            item.retailProfitPercent ?? 0
          ),

          wholesaleProfitPercent: Number(
            item.wholesaleProfitPercent ?? 0
          ),

          retailRoiPercent: Number(
            item.retailRoiPercent ?? 0
          ),

          wholesaleRoiPercent: Number(
            item.wholesaleRoiPercent ?? 0
          ),

          mrp: Number(item.mrp || 0),

          unit: item.unit || "pcs",

          unitValue: Number(
            item.unitValue || 1
          ),

          qtyType:
            item.qtyType || "unit",

          isGstIncluded:
            item.isGstIncluded !== false,

          discountPercent: Number(
            item.discountPercent || 0
          ),

          discountAmount: Number(
            item.discountAmount || 0
          ),

          amount: Number(item.amount || 0),

          totalCostWithGST: Number(
            item.totalCostWithGST ||
            item.netAmount ||
            0
          ),

          taxAmount: Number(
            item.taxAmount || 0
          ),

          rate: Number(
            item.Rate ??
            item.rate ??
            0
          ),

          netAmount: Number(
            item.netAmount || 0
          ),

          totalStockQty: Number(
            item.totalStockQty ||
            Number(item.qty || 0) +
            Number(item.freeQty || 0)
          ),

          receivedQty: Number(
            item.receivedQty ||
            item.totalStockQty ||
            Number(item.qty || 0) +
            Number(item.freeQty || 0)
          ),

          pendingQty: Number(
            item.pendingQty || 0
          ),

          profitAmount: Number(
            item.profitAmount || 0
          ),

          profitPercent: Number(
            item.profitPercent || 0
          ),

          roiPercent: Number(
            item.roiPercent || 0
          ),
        }))
        : [];

      const emptyRowsCount = Math.max(
        300 - existingItems.length,
        0
      );

      const finalRows = [
        ...existingItems,
        ...Array.from(
          { length: emptyRowsCount },
          () => ({ ...emptyItem })
        ),
      ];

      setBillItems(finalRows);

      setPurchaseTotals({
        totalAmount: Number(
          purchase.totalAmount ||
          purchase.grnAmount ||
          0
        ),

        totalGrossAmount: Number(
          purchase.totalGrossAmount || 0
        ),

        totalTaxAmount: Number(
          purchase.totalTaxAmount || 0
        ),

        cgst: Number(
          purchase.cgst ||
          Number(purchase.totalTaxAmount || 0) / 2
        ),

        sgst: Number(
          purchase.sgst ||
          Number(purchase.totalTaxAmount || 0) / 2
        ),

        itemsTotal: Number(
          purchase.grnAmount ||
          purchase.totalAmount ||
          0
        ),

        freightCharge: Number(
          purchase.freightCharge || 0
        ),

        packagingCharge: Number(
          purchase.packagingCharge || 0
        ),

        billDiscountAmount: Number(
          purchase.billDiscountAmount || 0
        ),

        supplierBillAmount: Number(
          purchase.supplierBillAmount || 0
        ),

        balanceAmount: Number(
          purchase.balanceAmount || 0
        ),
      });
    } catch (error) {
      console.error("Purchase edit load error:", error);

      showToast(
        error.message || "Failed to load purchase",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };


  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const updatedForm = {
        ...prev,
        [name]: value,
      };

      if (name === "grnDate") {
        updatedForm.dueDate = addDays(value, 7);
      }

      if (
        name === "freightCharge" ||
        name === "packagingCharge" ||
        name === "billDiscountPercent"
      ) {
        setTimeout(() => {
          const hasInlineItems = billItems.some(
            (item) =>
              !item.productId &&
              String(item.productName || "").trim() &&
              Number(item.qty || 0) > 0
          );

          const hasExistingItems = billItems.some(
            (item) =>
              item.productId &&
              Number(item.qty || 0) > 0
          );

          if (hasInlineItems) {
            calculateNewPurchaseTotals(
              billItems,
              updatedForm
            );
          } else {
            calculatePurchase(
              billItems,
              updatedForm
            );
          }
        }, 0);
      }

      return updatedForm;
    });
  };


  const createInlineSupplier = async () => {
    if (!createInlineSupplierRef.current) {
      throw new Error(
        "Supplier function is not ready"
      );
    }

    return createInlineSupplierRef.current();
  };



  const handleSubmit = async () => {
    await handlePurchaseSubmit({
      form,
      billItems,
      purchaseTotals,
      token,
      isEditMode,
      editPurchaseId,
      navigate,
      showToast,
      setForm,
      setBillItems,
      setLoading,
      emptyItem,
      addDays,
      formatDateToDDMMYYYY,
      createInlineSupplier,
      createInlineProduct,
      calculatePurchase,
      setSuppliers,
      supplierSearch,
      supplierDetails,
    });
  };

  const calculatePurchase = async (
    items = billItems,
    currentForm = form
  ) => {
    return calculatePurchaseLogic({
      items,
      currentForm,
      token,
      setBillItems,
      setPurchaseTotals,
      setForm,
      showToast,
    });
  };

  const calculateNewPurchaseTotals = (
    items,
    currentForm = form
  ) => {
    return calculateNewPurchaseTotalsLogic({
      items,
      currentForm,
      setPurchaseTotals,
      setForm,
    });
  };


  return (
    <>
      <Toast message={toast.message} type={toast.type} />

      <div className={styles.page}>
        <AppBar lang={lang} setLang={setLang} />
        {/* TOP BAR */}
        <PurchaseTop
          navigate={navigate}
          isEditMode={isEditMode}
          loading={loading}
          handleSubmit={handleSubmit}
          form={form}
          setForm={setForm}
        />

        {/* INVOICE BODY */}
        <div className={styles.invoiceBody}>
          {/* HEADER SECTION */}
          <PurchaseHeader
            form={form}
            setForm={setForm}
            handleChange={handleChange}
            purchaseTotals={purchaseTotals}
            token={token}
            supplierId={supplierId}
            showToast={showToast}
            onSuppliersChange={setSuppliers}
            onSupplierSearchChange={setSupplierSearch}
            onSupplierDetailsChange={setSupplierDetails}
            firstItemRef={firstItemRef}
            registerCreateSupplier={(callback) => {
              createInlineSupplierRef.current =
                callback;
            }}
          />

          {/* ITEMS TABLE */}
          <PurchaseTable
            billItems={billItems}
            setBillItems={setBillItems}
            emptyItem={emptyItem}
            form={form}
            token={token}
            showToast={showToast}
            calculatePurchase={calculatePurchase}
            firstItemRef={firstItemRef}
            calculateNewPurchaseTotals={
              calculateNewPurchaseTotals
            }
            registerCreateProduct={(callback) => {
              createInlineProductRef.current =
                callback;
            }}
          />
        </div>

        <PurchaseSummary
          form={form}
          setForm={setForm}
          handleChange={handleChange}
          purchaseTotals={purchaseTotals}
        />
      </div>

    </>
  );
}

export default CreatePurchase;