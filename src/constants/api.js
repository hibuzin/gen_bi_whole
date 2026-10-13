//const BASE_URL = "https://pos-backend-6uh4.onrender.com/api";

const BASE_URL = "http://localhost:5000/api";



export const API = {

  // auth
  login: `${BASE_URL}/auth/login`,
  createUser: `${BASE_URL}/auth/create-user`,
  registerSuperAdmin: `${BASE_URL}/auth/register-super-admin`,
  logout: `${BASE_URL}/auth/logout`,

  // setup
  setstatus: `${BASE_URL}/auth/setup-status`,

  // users
  users: `${BASE_URL}/users`,
  admins: `${BASE_URL}/admins`,
  cashiers: `${BASE_URL}/cashier`,
  adminUsers: `${BASE_URL}/super-admin/admins`,
  cashierUsers: `${BASE_URL}/super-admin/cashiers`,
  updatecashier: `${BASE_URL}/super-admin/cashier`,
  updateadmin: `${BASE_URL}/super-admin`,

  // customers
  customers: `${BASE_URL}/customer/customers`,
  customerSearch: `${BASE_URL}/customer/customers/search`,
  customerBalances: `${BASE_URL}/customer/customer-balances`,
  itemreport: `${BASE_URL}/crm-report/customer-item-wise`,
  customerPurchaseReport: `${BASE_URL}/crm-report/report/customer-purchase-details`,
  customerProductReport: `${BASE_URL}/crm-report/report/product-wise-customer`,
  loyaltypoint: `${BASE_URL}/loyalty/reset-loyalty`,

  // bill
  bill: `${BASE_URL}/bill`,
  billEdit: (billId) => `${BASE_URL}/bill/edit/${billId}`,
  scan: `${BASE_URL}/scan`,
  holdBill: `${BASE_URL}/hold-bill/hold`,
  scanProduct: (barcode) => `${BASE_URL}/scan/scan/${barcode}`,
  billCalculate: `${BASE_URL}/bill/calculate`,
  billDate: `${BASE_URL}/bill/date`,

  // supplier
  createsupplier: `${BASE_URL}/supplier/add`,
  suppliers: `${BASE_URL}/supplier`,
  supplierPurchases: (id) => `${BASE_URL}/supplier/${id}/purchases`,
  supplierProductSummary: (id) => `${BASE_URL}/supplier/${id}/product-wise-summary`,
  supplierbalance: `${BASE_URL}/supplier/supplier-balances`,

  // category
  categories: `${BASE_URL}/category`,

  // products
  products: `${BASE_URL}/productadd`,
  productSearch: `${BASE_URL}/productadd/search`,
  createProduct: `${BASE_URL}/productadd/add`,
  createBulkProduct: `${BASE_URL}/productadd/bulk-add`,
  searchProduct: `${BASE_URL}/productadd/search`,
  billSearchProduct: `${BASE_URL}/bill/search-product`,
  productPriceHistory: `${BASE_URL}/product-price-history/purchase-product`,
  repackBulkProducts: `${BASE_URL}/productadd/product-type?productType=bulk`,
  repackProductsByBulk: (bulkId) => `${BASE_URL}/repack/repack-by-bulk/${bulkId}`,
  createRepack: `${BASE_URL}/repack/create`,
  itemWiseSales: `${BASE_URL}/bill/item-wise`,

  generateBarcode: `${BASE_URL}/barcode-genrate/generate`,

  // purchase
  calculatePurchase: `${BASE_URL}/purchase/calculate`,
  purchase: `${BASE_URL}/purchase`,
  purchaseById: (purchaseId) =>
    `${BASE_URL}/purchase/${purchaseId}`,
  createPurchase: `${BASE_URL}/purchase/purchase`,
  purchaseById: (id) => `${BASE_URL}/purchase/${id}`,
  purchaseItemWiseReport: `${BASE_URL}/purchase/item-wise`,
  purchaseReturnItemWise: `${BASE_URL}/return/purchase-return/item-wise`,
  scanpurchaseBarcode: `${BASE_URL}/scan/scan`,

  // stock
  stock: `${BASE_URL}/stock`,
  stockValue: `${BASE_URL}/stock/stock-value`,
  stockList: `${BASE_URL}/stock/stock`,
  lowStock: `${BASE_URL}/stock/low-stock`,
  outOfStock: `${BASE_URL}/stock/out-of-stock`,
  searchStock: (search = "") => `${BASE_URL}/repack/search?search=${encodeURIComponent(search)}`,
  bulkStock: `${BASE_URL}/stock/bulk`,
  repackStock: `${BASE_URL}/stock/stock-check/repack`,

  //GST
  gst: `${BASE_URL}/gst-reports/purchase-register`,

  //sales
  topselling: `${BASE_URL}/stock/top-selling-products`,
  salesCheck: `${BASE_URL}/bill/sales-check`,
  paymentBase: `${BASE_URL}/bill/payments`,
  salesReturnItemWiseReport: `${BASE_URL}/sales-return/report/item-wise`,
  salesReturnBillWiseReport: `${BASE_URL}/sales-return/report/bill-wise`,

  //return
  purchaseReturn: `${BASE_URL}/return/purchase-return/bill-wise-report`,
  purchaseReturnReport: `${BASE_URL}/return/purchase-return/bill-wise-report`,

  purchaseReturnApprove: (returnId) => `${BASE_URL}/return/purchase-return/${returnId}/approve`,

  purchaseReturnReject: (returnId) => `${BASE_URL}/return/purchase-return/${returnId}/reject`,

  purchaseReturnPost: `${BASE_URL}/return/purchase-return`,

  itemWisePurchaseReturn: `${BASE_URL}/return/purchase-return/item-wise`,

  salesReturn: `${BASE_URL}/sales-return`,

  billWisePurchaseReturn: `${BASE_URL}/return/purchase-return/bill-wise-report`,


  //cash in hand
  cashRegisterOpen: `${BASE_URL}/cash-register/open`,
  cashRegisterCurrent: `${BASE_URL}/cash-register/current`,
  cashRegisterCashOut: `${BASE_URL}/cash-register/cash-out`,
  cashRegisterClose: `${BASE_URL}/cash-register/close`,

  //session handle
  sessionCurrent: `${BASE_URL}/session/current`,
  sessionStart: `${BASE_URL}/session/start`,
  sessionSettle: `${BASE_URL}/session/settle`,
  sessionEnd: `${BASE_URL}/session/end`,
  sessionCashOut: `${BASE_URL}/session/cash-out`,
  sessionHistory: `${BASE_URL}/session/history`,
  sessionDate: `${BASE_URL}/session/date`,

  activeSessions: `${BASE_URL}/session/active`,
  logout: `${BASE_URL}/auth/logout`,

  // offers
  offers: `${BASE_URL}/offers`,

  // profile
  profileme: `${BASE_URL}/profile/me`,
  account: `${BASE_URL}/profile/me`,


  // gst reports
  auditreports: `${BASE_URL}/audit-logs`,
  purchasereports: `${BASE_URL}/audit-logs?module=Purchase`,
  purchaseSummary: `${BASE_URL}/gst-reports/purchase-summary`,
  gstbillreport:`${BASE_URL}/audit-logs/bill/bill-wise`,
  gstpurchasereport:`${BASE_URL}/audit-logs/purchase/bill-wise`,
  itemwise:`${BASE_URL}/bill/itemwise`
};