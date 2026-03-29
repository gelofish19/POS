const LEGACY_KEYS = {
  staff: "pos_staff_users",
  services: "pos_services",
  tx: "pos_transactions"
};

const MIGRATION_MARKER = "pos_sqlite_migration_done_v1";
const PRICE_MODE_OVERRIDES_KEY = "pos_price_mode_overrides_v1";
const CATEGORY_STATUS_KEY = "pos_category_status_v1";
const SUBCATEGORY_STATUS_KEY = "pos_subcategory_status_v1";
const SUBSUBCATEGORY_OVERRIDES_KEY = "pos_subsubcategory_overrides_v1";
const DELETED_SERVICE_IDS_KEY = "pos_deleted_service_ids_v1";

const state = {
  staff: [],
  services: [],
  taxonomy: { categories: [], subcategories: {}, subSubcategories: {} },
  currentStaff: null,
  cart: [],
  payment: "cash",
  saleLocked: false,
  lastTransaction: null,
  priceModeOverrides: {},
  categoryStatus: {},
  subcategoryStatus: {},
  subsubcategoryOverrides: {},
  deletedServiceIds: {},
  reports: null,
  transactionsView: [],
  inventory: {
    items: [],
    selectedIds: {},
    page: 1,
    pageSize: 10,
    lastUpdated: "",
    serviceLinks: {},
    serviceProductMap: {}
  }
};

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const appShell = document.querySelector(".app-shell");

const loginScreen = document.getElementById("login-screen");
const dashboardScreen = document.getElementById("dashboard-screen");
const registerScreen = document.getElementById("register-screen");
const inventoryScreen = document.getElementById("inventory-screen");
const staffSelect = document.getElementById("staff-select");
const staffPin = document.getElementById("staff-pin");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const activeStaffName = document.getElementById("active-staff-name");
const activeStaffRole = document.getElementById("active-staff-role");
const dashDate = document.getElementById("dash-date");
const dashTime = document.getElementById("dash-time");
const dashboardTiles = document.getElementById("dashboard-tiles");
const goDashboard = document.getElementById("go-dashboard");
const logoutBtn = document.getElementById("logout-btn");
const todaySummary = document.getElementById("today-summary");
const cashMovementBtn = document.getElementById("cash-movement");
const serviceChips = document.getElementById("service-chips");
const serviceCategoryFilter = document.getElementById("service-category-filter");
const serviceSubcategoryFilter = document.getElementById("service-subcategory-filter");
const serviceSubsubcategoryFilter = document.getElementById("service-subsubcategory-filter");
const serviceBreadcrumb = document.getElementById("service-breadcrumb");
const serviceCategoryList = document.getElementById("service-category-list");
const serviceSubcategoryList = document.getElementById("service-subcategory-list");
const serviceSubsubcategoryList = document.getElementById("service-subsubcategory-list");
const serviceSubcategoryBox = document.getElementById("service-subcategory-box");
const serviceSubsubcategoryBox = document.getElementById("service-subsubcategory-box");
const servicesBackBtn = document.getElementById("services-back");
const saleBody = document.getElementById("sale-body");
const saleTotalQty = document.getElementById("sale-total-qty");
const saleTotalAmount = document.getElementById("sale-total-amount");
const grandTotal = document.getElementById("grand-total");
const grandQty = document.getElementById("grand-qty");
const totalChange = document.getElementById("total-change");
const paymentMethods = document.getElementById("payment-methods");
const paymentQuick = document.querySelector(".payment-quick");
const paymentOptions = Array.from(document.querySelectorAll("[data-payment-option]"));
const referenceBlock = document.getElementById("reference-block");
const paymentReference = document.getElementById("payment-reference");
const cashReceived = document.getElementById("cash-received");
const newSaleBtn = document.getElementById("new-sale");
const completeSaleBtn = document.getElementById("complete-sale");
const checkoutError = document.getElementById("checkout-error");
const checkoutPane = document.getElementById("checkout-pane");
const checkoutOverlay = document.getElementById("checkout-overlay");
const openCheckoutBtn = document.getElementById("open-checkout");
const closeCheckoutBtn = document.getElementById("close-checkout");
const confirmSaleDialog = document.getElementById("confirm-sale-dialog");
const confirmSaleText = document.getElementById("confirm-sale-text");
const confirmSaleNo = document.getElementById("confirm-sale-no");
const confirmSaleYes = document.getElementById("confirm-sale-yes");
const saleResultDialog = document.getElementById("sale-result-dialog");
const saleResultText = document.getElementById("sale-result-text");
const saleResultOk = document.getElementById("sale-result-ok");
const nameEditDialog = document.getElementById("name-edit-dialog");
const nameEditTitle = document.getElementById("name-edit-title");
const nameEditLabel = document.getElementById("name-edit-label");
const nameEditInput = document.getElementById("name-edit-input");
const nameEditCancel = document.getElementById("name-edit-cancel");
const nameEditSave = document.getElementById("name-edit-save");
const confirmActionDialog = document.getElementById("confirm-action-dialog");
const confirmActionTitle = document.getElementById("confirm-action-title");
const confirmActionText = document.getElementById("confirm-action-text");
const confirmActionCancel = document.getElementById("confirm-action-cancel");
const confirmActionOk = document.getElementById("confirm-action-ok");
const toggleModeDialog = document.getElementById("toggle-mode-dialog");
const toggleModeEnable = document.getElementById("toggle-mode-enable");
const toggleModeDisable = document.getElementById("toggle-mode-disable");
const toggleModeEnableAll = document.getElementById("toggle-mode-enable-all");
const toggleModeDisableAll = document.getElementById("toggle-mode-disable-all");
const toggleModeCancel = document.getElementById("toggle-mode-cancel");
const cashMovementDialog = document.getElementById("cash-movement-dialog");
const cashMovementIn = document.getElementById("cash-movement-in");
const cashMovementOut = document.getElementById("cash-movement-out");
const cashMovementCancel = document.getElementById("cash-movement-cancel");
const serviceEditDialog = document.getElementById("service-edit-dialog");
const serviceEditTitle = serviceEditDialog ? serviceEditDialog.querySelector("h3") : null;
const serviceEditName = document.getElementById("service-edit-name");
const serviceEditPriceLabel = document.querySelector("label[for='service-edit-price']");
const serviceEditPrice = document.getElementById("service-edit-price");
const serviceEditPriceMode = document.getElementById("service-edit-price-mode");
const serviceEditCancel = document.getElementById("service-edit-cancel");
const serviceEditSave = document.getElementById("service-edit-save");
const serviceAmountDialog = document.getElementById("service-amount-dialog");
const serviceAmountName = document.getElementById("service-amount-name");
const serviceAmountInput = document.getElementById("service-amount-input");
const serviceAmountCancel = document.getElementById("service-amount-cancel");
const serviceAmountSave = document.getElementById("service-amount-save");
const subcategoryTransferDialog = document.getElementById("subcategory-transfer-dialog");
const subcategoryTransferCategory = document.getElementById("subcategory-transfer-category");
const subcategoryTransferName = document.getElementById("subcategory-transfer-name");
const subcategoryTransferCancel = document.getElementById("subcategory-transfer-cancel");
const subcategoryTransferSave = document.getElementById("subcategory-transfer-save");
const serviceTransferDialog = document.getElementById("service-transfer-dialog");
const serviceTransferCategory = document.getElementById("service-transfer-category");
const serviceTransferSubcategory = document.getElementById("service-transfer-subcategory");
const serviceTransferCancel = document.getElementById("service-transfer-cancel");
const serviceTransferSave = document.getElementById("service-transfer-save");
const reportsDialog = document.getElementById("reports-dialog");
const reportsRangePicker = document.getElementById("reports-range-picker");
const reportsRangeOpen = document.getElementById("reports-range-open");
const reportsRangeMainText = document.getElementById("reports-range-main-text");
const reportsPresetToday = document.getElementById("reports-preset-today");
const reportsPresetYesterday = document.getElementById("reports-preset-yesterday");
const reportsPresetLast7 = document.getElementById("reports-preset-last7");
const reportsPresetMonth = document.getElementById("reports-preset-month");
const reportsExportType = document.getElementById("reports-export-type");
const reportsExportCsvBtn = document.getElementById("reports-export-csv");
const reportsPrintSummaryBtn = document.getElementById("reports-print-summary");
const reportsCloseBtn = document.getElementById("reports-close");
const reportsError = document.getElementById("reports-error");
const reportsLastUpdated = document.getElementById("reports-last-updated");
const reportsTotalSales = document.getElementById("reports-total-sales");
const reportsTransactionCount = document.getElementById("reports-transaction-count");
const reportsCashInTotal = document.getElementById("reports-cash-in-total");
const reportsCashOutTotal = document.getElementById("reports-cash-out-total");
const reportsNetCash = document.getElementById("reports-net-cash");
const reportsValidation = document.getElementById("reports-validation");
const reportsServiceBody = document.getElementById("reports-service-body");
const reportsTopBody = document.getElementById("reports-top-body");
const reportsPaymentBody = document.getElementById("reports-payment-body");
const reportsCashBody = document.getElementById("reports-cash-body");
const transactionsDialog = document.getElementById("transactions-dialog");
const transactionsRangePicker = document.getElementById("transactions-range-picker");
const transactionsRangeOpen = document.getElementById("transactions-range-open");
const transactionsRangeMainText = document.getElementById("transactions-range-main-text");
const transactionsReferenceSearch = document.getElementById("transactions-reference-search");
const transactionsPaymentFilter = document.getElementById("transactions-payment-filter");
const transactionsExportType = document.getElementById("transactions-export-type");
const transactionsPrintBtn = document.getElementById("transactions-print");
const transactionsPresetToday = document.getElementById("transactions-preset-today");
const transactionsPresetYesterday = document.getElementById("transactions-preset-yesterday");
const transactionsPresetLast7 = document.getElementById("transactions-preset-last7");
const transactionsPresetMonth = document.getElementById("transactions-preset-month");
const transactionsSelectAction = document.getElementById("transactions-select-action");
const transactionsSelectTrigger = document.getElementById("transactions-select-trigger");
const transactionsSelectMenu = document.getElementById("transactions-select-menu");
const transactionsCloseBtn = document.getElementById("transactions-close");
const transactionsError = document.getElementById("transactions-error");
const transactionsLastUpdated = document.getElementById("transactions-last-updated");
const transactionsBody = document.getElementById("transactions-body");
const transactionsSelectAll = document.getElementById("transactions-select-all");
const transactionsSelectedCount = document.getElementById("transactions-selected-count");
const transactionsPrevBtn = document.getElementById("transactions-prev");
const transactionsNextBtn = document.getElementById("transactions-next");
const transactionsPageLabel = document.getElementById("transactions-page-label");
const transactionsPageSize = document.getElementById("transactions-page-size");
const transactionItemsDialog = document.getElementById("transaction-items-dialog");
const transactionItemsTitle = document.getElementById("transaction-items-title");
const txDetailDate = document.getElementById("tx-detail-date");
const txDetailTime = document.getElementById("tx-detail-time");
const txDetailStaff = document.getElementById("tx-detail-staff");
const txDetailPayment = document.getElementById("tx-detail-payment");
const txDetailReference = document.getElementById("tx-detail-reference");
const txDetailQty = document.getElementById("tx-detail-qty");
const txDetailChange = document.getElementById("tx-detail-change");
const txDetailTotal = document.getElementById("tx-detail-total");
const transactionItemsBody = document.getElementById("transaction-items-body");
const transactionItemsClose = document.getElementById("transaction-items-close");
const dateRangeDialog = document.getElementById("date-range-dialog");
const dateRangeTitle = document.getElementById("date-range-title");
const dateRangeMonthLabel = document.getElementById("date-range-month-label");
const dateRangeGrid = document.getElementById("date-range-grid");
const dateRangePreview = document.getElementById("date-range-preview");
const dateRangePrev = document.getElementById("date-range-prev");
const dateRangeNext = document.getElementById("date-range-next");
const dateRangePresetToday = document.getElementById("date-range-preset-today");
const dateRangePresetYesterday = document.getElementById("date-range-preset-yesterday");
const dateRangePresetLast7 = document.getElementById("date-range-preset-last7");
const dateRangePresetMonth = document.getElementById("date-range-preset-month");
const dateRangeToday = document.getElementById("date-range-today");
const dateRangeApply = document.getElementById("date-range-apply");
const dateRangeCancel = document.getElementById("date-range-cancel");
const servicesDialog = document.getElementById("services-dialog");
const servicesAdminList = document.getElementById("services-admin-list");
const adminFilterCategory = document.getElementById("admin-filter-category");
const adminFilterSubcategory = document.getElementById("admin-filter-subcategory");
const adminFilterSubsubcategory = document.getElementById("admin-filter-subsubcategory");
const categoryList = document.getElementById("category-list");
const subcategoryList = document.getElementById("subcategory-list");
const subsubcategoryList = document.getElementById("subsubcategory-list");
const adminBreadcrumb = document.getElementById("admin-breadcrumb");
const sectionCategories = document.getElementById("section-categories");
const sectionSubcategories = document.getElementById("section-subcategories");
const sectionSubsubcategories = document.getElementById("section-subsubcategories");
const sectionServices = document.getElementById("section-services");
const newServiceName = document.getElementById("new-service-name");
const newServiceCategory = document.getElementById("new-service-category");
const newServiceSubcategory = document.getElementById("new-service-subcategory");
const newServicePrice = document.getElementById("new-service-price");
const addServiceBtn = document.getElementById("add-service");
const servicesAdminToggleAllBtn = document.getElementById("services-admin-toggle-all");
const servicesAdminBackBtn = document.getElementById("services-admin-back");
const servicesAdminActionAddBtn = document.getElementById("services-admin-action-add");
const servicesAdminActionEditBtn = document.getElementById("services-admin-action-edit");
const servicesAdminActionDeleteBtn = document.getElementById("services-admin-action-delete");
const servicesAdminActionTransferBtn = document.getElementById("services-admin-action-transfer");
const servicesAdminActionToggleBtn = document.getElementById("services-admin-action-toggle");
const servicesAdminSelectAllBtn = document.getElementById("services-admin-select-all");
const servicesAdminSelectedCount = document.getElementById("services-admin-selected-count");
const servicesAdminError = document.getElementById("services-admin-error");
const manageServicesBtn = document.getElementById("manage-services");
const inventorySideDashboard = document.getElementById("inventory-side-dashboard");
const inventorySideRegister = document.getElementById("inventory-side-register");
const inventorySideReports = document.getElementById("inventory-side-reports");
const inventorySideTransactions = document.getElementById("inventory-side-transactions");
const inventorySideLogout = document.getElementById("inventory-side-logout");
const inventoryLastUpdated = document.getElementById("inventory-last-updated");
const inventorySearch = document.getElementById("inventory-search");
const inventoryCategoryFilter = document.getElementById("inventory-category-filter");
const inventoryStatusFilter = document.getElementById("inventory-status-filter");
const inventorySort = document.getElementById("inventory-sort");
const inventoryRefresh = document.getElementById("inventory-refresh");
const inventoryNewName = document.getElementById("inventory-new-name");
const inventoryNewSku = document.getElementById("inventory-new-sku");
const inventoryNewCategory = document.getElementById("inventory-new-category");
const inventoryNewUnit = document.getElementById("inventory-new-unit");
const inventoryNewCost = document.getElementById("inventory-new-cost");
const inventoryNewPrice = document.getElementById("inventory-new-price");
const inventoryNewStock = document.getElementById("inventory-new-stock");
const inventoryNewReorder = document.getElementById("inventory-new-reorder");
const inventoryNewSupplier = document.getElementById("inventory-new-supplier");
const inventoryNewLinkedService = document.getElementById("inventory-new-linked-service");
const inventoryNewActive = document.getElementById("inventory-new-active");
const inventoryAddBtn = document.getElementById("inventory-add-btn");
const inventoryError = document.getElementById("inventory-error");
const inventorySuccess = document.getElementById("inventory-success");
const inventorySelectedCount = document.getElementById("inventory-selected-count");
const inventorySelectedAction = document.getElementById("inventory-selected-action");
const inventoryApplyAction = document.getElementById("inventory-apply-action");
const inventorySelectAll = document.getElementById("inventory-select-all");
const inventoryBody = document.getElementById("inventory-body");
const inventoryPageSize = document.getElementById("inventory-page-size");
const inventoryPrev = document.getElementById("inventory-prev");
const inventoryNext = document.getElementById("inventory-next");
const inventoryPageLabel = document.getElementById("inventory-page-label");
const inventoryAdjustDialog = document.getElementById("inventory-adjust-dialog");
const inventoryAdjustType = document.getElementById("inventory-adjust-type");
const inventoryAdjustQty = document.getElementById("inventory-adjust-qty");
const inventoryAdjustNote = document.getElementById("inventory-adjust-note");
const inventoryAdjustCancel = document.getElementById("inventory-adjust-cancel");
const inventoryAdjustApply = document.getElementById("inventory-adjust-apply");
let confirmSaleResolver = null;
let adminStep = 1;
let nameEditResolver = null;
let nameEditCancelValue = null;
let confirmActionResolver = null;
let toggleModeResolver = null;
let cashMovementResolver = null;
let serviceEditResolver = null;
let subcategoryTransferResolver = null;
let serviceTransferResolver = null;
let serviceAmountResolver = null;
let selectedManageCategory = "";
let selectedManageSubcategory = "";
let selectedManageSubsubcategory = "";
let selectedManageServiceId = "";
let selectedManageServiceIds = {};
let manageSelectMode = false;
let printCatalogSynced = false;
let pendingServiceDeleteBatch = null;
let reportsRangeStart = "";
let reportsRangeEnd = "";
let reportsRangeAnchor = "";
let transactionsRangeStart = "";
let transactionsRangeEnd = "";
let transactionsRangeAnchor = "";
let transactionsSearchTimer = null;
let inventoryAdjustResolver = null;
let transactionsPage = 1;
let transactionsSelectedIds = {};
let transactionsPageSizeValue = 10;
let transactionsSelectMode = false;
let dateRangeContext = "";
let dateRangeViewMonth = "";
let dateRangeTempStart = "";
let dateRangeTempEnd = "";
let dateRangeTempAnchor = "";

function taxonomySubKey(category, subcategory) {
  return `${String(category || "").trim()}::${String(subcategory || "").trim()}`;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((v) => String(v).trim()))].sort((a, b) => a.localeCompare(b));
}

function normalizeCategory(value) {
  const raw = String(value || "").trim();
  return raw.toLowerCase() === "eloading" ? "Load" : raw;
}

function isVisibleCategory(value) {
  return String(value || "").trim().toLowerCase() !== "uncategorized";
}

function inferLoadNetwork(value) {
  const text = String(value || "").trim();
  const lowered = text.toLowerCase();
  if (lowered.includes("smart")) return "Smart";
  if (lowered.includes("globe")) return "Globe";
  if (lowered.includes("dito")) return "DITO";
  if (lowered.includes("gomo")) return "GOMO";
  if (lowered.includes("tm")) return "TM";
  if (lowered.includes("tnt")) return "TNT";
  if (lowered.includes("sun")) return "Sun";
  return "Load";
}

function normalizedSubcategoryFor(category, subcategory, serviceName = "") {
  const cat = normalizeCategory(category);
  if (cat !== "Load") {
    return subcategory && String(subcategory).trim() ? String(subcategory).trim() : "General";
  }
  const raw = String(subcategory || "").trim();
  if (!raw) return inferLoadNetwork(serviceName);
  const beforeDash = raw.includes("-") ? raw.split("-")[0].trim() : raw;
  return inferLoadNetwork(beforeDash || raw);
}

function normalizedSubsubcategoryFor(category, subcategory, subsubcategory, serviceName = "") {
  const cat = normalizeCategory(category);
  if (cat !== "Load") {
    return subsubcategory && String(subsubcategory).trim() ? String(subsubcategory).trim() : "";
  }
  const rawSubSub = String(subsubcategory || "").trim();
  if (rawSubSub) return rawSubSub;
  const rawSub = String(subcategory || "").trim();
  if (rawSub.includes("-")) {
    const second = rawSub.split("-")[1] || "";
    return second.trim();
  }
  const lowered = String(serviceName || "").toLowerCase();
  if (/(promo|magic|go\+|unli|level-up|no expiry|data\+|surf)/i.test(lowered)) return "Promo";
  return "Regular";
}

function loadSubsubcategoryOverrides() {
  try {
    const raw = localStorage.getItem(SUBSUBCATEGORY_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out = {};
    for (const [key, list] of Object.entries(parsed)) {
      if (!key || !Array.isArray(list)) continue;
      out[key] = uniqueSorted(list);
    }
    return out;
  } catch {
    return {};
  }
}

function saveSubsubcategoryOverrides() {
  localStorage.setItem(SUBSUBCATEGORY_OVERRIDES_KEY, JSON.stringify(state.subsubcategoryOverrides));
}

function isRouteMissingError(error) {
  return String(error?.message || "").trim().toLowerCase().includes("not found");
}

function loadDeletedServiceIds() {
  try {
    const raw = localStorage.getItem(DELETED_SERVICE_IDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveDeletedServiceIds() {
  localStorage.setItem(DELETED_SERVICE_IDS_KEY, JSON.stringify(state.deletedServiceIds));
}

function addLocalSubsubcategory(category, subcategory, name) {
  const key = taxonomySubKey(category, subcategory);
  const current = Array.isArray(state.subsubcategoryOverrides[key]) ? state.subsubcategoryOverrides[key] : [];
  state.subsubcategoryOverrides[key] = uniqueSorted(current.concat(String(name || "").trim()));
  saveSubsubcategoryOverrides();
}

function renameLocalSubsubcategory(category, subcategory, oldName, newName) {
  const key = taxonomySubKey(category, subcategory);
  const current = Array.isArray(state.subsubcategoryOverrides[key]) ? state.subsubcategoryOverrides[key] : [];
  state.subsubcategoryOverrides[key] = uniqueSorted(current.map((s) => (s === oldName ? newName : s)));
  saveSubsubcategoryOverrides();
}

function deleteLocalSubsubcategory(category, subcategory, name) {
  const key = taxonomySubKey(category, subcategory);
  const current = Array.isArray(state.subsubcategoryOverrides[key]) ? state.subsubcategoryOverrides[key] : [];
  state.subsubcategoryOverrides[key] = uniqueSorted(current.filter((s) => s !== name));
  saveSubsubcategoryOverrides();
}

function sortSubcategoriesForCategory(category, values) {
  const clean = [...new Set((values || []).map((v) => String(v || "").trim()).filter(Boolean))];
  if (normalizeCategory(category) !== "Load") {
    return clean.sort((a, b) => a.localeCompare(b));
  }
  return uniqueSorted(clean.map((v) => normalizedSubcategoryFor("Load", v)));
}

function iconSvg(kind) {
  if (kind === "add") {
    return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" fill="currentColor"></path></svg>`;
  }
  if (kind === "edit") {
    return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M4 17.25V20h2.75L17.8 8.95l-2.75-2.75L4 17.25Zm14.7-9.04a1 1 0 0 0 0-1.41l-1.5-1.5a1 1 0 0 0-1.41 0l-1.17 1.17 2.75 2.75 1.33-1.01Z" fill="currentColor"></path></svg>`;
  }
  if (kind === "toggle") {
    return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5h8a7 7 0 0 1 0 14H8A7 7 0 0 1 8 5Zm0 2a5 5 0 1 0 0 10h8a5 5 0 0 0 0-10H8Zm0 1a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" fill="currentColor"></path></svg>`;
  }
  if (kind === "move") {
    return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M13 5h6v6h-2V8.41l-5.29 5.3-1.42-1.42L15.59 7H13V5ZM5 6h5v2H7v9h9v-3h2v5H5V6Z" fill="currentColor"></path></svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Z" fill="currentColor"></path></svg>`;
}

function mergedTaxonomyLocal(services, taxonomy) {
  const categories = new Set(
    uniqueSorted((taxonomy?.categories || []).concat(services.map((s) => normalizeCategory(s.category))).map((c) => normalizeCategory(c)))
      .filter(isVisibleCategory)
  );
  const subcategories = {};
  const subSubcategories = {};
  for (const category of categories) {
    const fromTaxRaw = []
      .concat(Array.isArray(taxonomy?.subcategories?.[category]) ? taxonomy.subcategories[category] : [])
      .concat(Array.isArray(taxonomy?.subcategories?.Eloading) && category === "Load" ? taxonomy.subcategories.Eloading : []);
    const fromSvc = services
      .filter((s) => normalizeCategory(s.category) === category)
      .map((s) => normalizedSubcategoryFor(category, s.subcategory, s.name));
    const mergedSubs = sortSubcategoriesForCategory(category, fromTaxRaw.concat(fromSvc));
    subcategories[category] = mergedSubs;
    for (const sub of mergedSubs) {
      const key = taxonomySubKey(category, sub);
      const fromTaxSubSub = Array.isArray(taxonomy?.subSubcategories?.[key]) ? taxonomy.subSubcategories[key] : [];
      const fromLocalSubSub = Array.isArray(state.subsubcategoryOverrides?.[key]) ? state.subsubcategoryOverrides[key] : [];
      const fromSvcSubSub = services
        .filter((s) => normalizeCategory(s.category) === category)
        .filter((s) => normalizedSubcategoryFor(category, s.subcategory, s.name) === sub)
        .map((s) => normalizedSubsubcategoryFor(category, s.subcategory, s.subSubcategory, s.name))
        .filter(Boolean);
      subSubcategories[key] = uniqueSorted(fromTaxSubSub.concat(fromLocalSubSub, fromSvcSubSub));
    }
  }
  return { categories: [...categories].sort((a, b) => a.localeCompare(b)), subcategories, subSubcategories };
}

function renderAdminBreadcrumb() {
  const category = adminFilterCategory.value || selectedManageCategory || "";
  const subcategory = adminFilterSubcategory.value || selectedManageSubcategory || "";
  const subsubcategory = adminFilterSubsubcategory.value || selectedManageSubsubcategory || "";
  const crumbs = [];
  if (category) crumbs.push({ step: 1, value: category });
  if (subcategory) crumbs.push({ step: 2, value: subcategory });
  if (subsubcategory) crumbs.push({ step: 3, value: subsubcategory });

  const hasSelected = crumbs.length > 0;
  adminBreadcrumb.innerHTML = hasSelected
    ? crumbs.map((c, idx) => {
      const active = idx === crumbs.length - 1;
      return `<button type="button" class="crumb ${active ? "active" : ""}" data-step="${c.step}">${escapeHtml(c.value)}</button>`;
    }).join(`<span class="crumb-sep">/</span>`)
    : "";
}

function setAdminStep(step) {
  adminStep = step;
  if (step !== 4) {
    selectedManageServiceId = "";
    selectedManageServiceIds = {};
    manageSelectMode = false;
  }
  sectionCategories.classList.toggle("hidden", step !== 1);
  sectionSubcategories.classList.toggle("hidden", step !== 2);
  sectionSubsubcategories.classList.toggle("hidden", step !== 3);
  sectionServices.classList.toggle("hidden", step !== 4);
  renderAdminBreadcrumb();
  renderAdminActionState();
}

function getSelectedManagedService() {
  if (!selectedManageServiceId) return null;
  return state.services.find((s) => String(s.id) === String(selectedManageServiceId)) || null;
}

function selectedServiceIdsInView() {
  const visibleIds = new Set(
    [...servicesAdminList.querySelectorAll(".service-list-item[data-id]")]
      .map((el) => String(el.dataset.id || ""))
      .filter(Boolean)
  );
  return Object.keys(selectedManageServiceIds).filter((id) => selectedManageServiceIds[id] && visibleIds.has(id));
}

function selectedServiceRowsInView() {
  const ids = new Set(selectedServiceIdsInView());
  if (ids.size === 0) return [];
  return [...servicesAdminList.querySelectorAll(".service-list-item[data-id]")].filter((row) =>
    ids.has(String(row.dataset.id || ""))
  );
}

function updateSelectedCount() {
  if (!servicesAdminSelectedCount) return;
  if (adminStep !== 4) {
    servicesAdminSelectedCount.classList.add("hidden");
    return;
  }
  const count = selectedServiceIdsInView().length;
  servicesAdminSelectedCount.textContent = `Selected: ${count}`;
  servicesAdminSelectedCount.classList.remove("hidden");
}

function exitServiceSelectionMode() {
  manageSelectMode = false;
  selectedManageServiceIds = {};
}

function getToastContainer() {
  let container = document.getElementById("app-toast-container");
  if (container) return container;
  container = document.createElement("div");
  container.id = "app-toast-container";
  container.className = "app-toast-container";
  document.body.appendChild(container);
  return container;
}

function showToast(message, options = {}) {
  const { duration = 2200, actionText = "", onAction = null } = options;
  const container = getToastContainer();
  const toast = document.createElement("div");
  toast.className = "app-toast";
  const text = document.createElement("span");
  text.textContent = message;
  toast.appendChild(text);
  if (actionText && typeof onAction === "function") {
    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.textContent = actionText;
    actionBtn.addEventListener("click", () => {
      onAction();
      toast.remove();
    });
    toast.appendChild(actionBtn);
  }
  container.appendChild(toast);
  if (duration > 0) {
    setTimeout(() => toast.remove(), duration);
  }
  return toast;
}

async function commitPendingServiceDelete(batch) {
  if (!batch || batch.committed) return;
  batch.committed = true;
  if (pendingServiceDeleteBatch === batch) pendingServiceDeleteBatch = null;
  clearTimeout(batch.timer);
  const failedIds = [];
  for (const id of batch.ids) {
    try {
      await api(`/api/services/${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (error) {
      if (!isRouteMissingError(error)) {
        failedIds.push(id);
      }
    }
  }
  if (failedIds.length > 0) {
    for (const id of failedIds) delete state.deletedServiceIds[id];
    saveDeletedServiceIds();
    showToast(`Failed to delete ${failedIds.length} service(s).`);
  } else {
    showToast(`Deleted ${batch.ids.length} service(s).`);
  }
  await refreshServices();
  renderServiceAdmin();
}

async function finalizePendingDeleteNow() {
  if (!pendingServiceDeleteBatch) return;
  const batch = pendingServiceDeleteBatch;
  pendingServiceDeleteBatch = null;
  await commitPendingServiceDelete(batch);
}

function undoPendingDelete(batch) {
  if (!batch || batch.committed) return;
  if (pendingServiceDeleteBatch !== batch) return;
  clearTimeout(batch.timer);
  pendingServiceDeleteBatch = null;
  for (const id of batch.ids) delete state.deletedServiceIds[id];
  saveDeletedServiceIds();
  showToast("Delete undone.");
  refreshServices().then(() => renderServiceAdmin());
}

async function queueServiceDeleteWithUndo(ids) {
  await finalizePendingDeleteNow();
  const clean = [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))];
  if (clean.length === 0) return;
  for (const id of clean) state.deletedServiceIds[id] = true;
  saveDeletedServiceIds();
  selectedManageServiceId = "";
  exitServiceSelectionMode();
  await refreshServices();
  renderServiceAdmin();
  const batch = {
    ids: clean,
    committed: false,
    timer: null
  };
  batch.timer = setTimeout(() => {
    commitPendingServiceDelete(batch);
  }, 5000);
  pendingServiceDeleteBatch = batch;
  showToast(`${clean.length} service(s) marked for delete.`, {
    duration: 5000,
    actionText: "Undo",
    onAction: () => undoPendingDelete(batch)
  });
}

function renderAdminActionState() {
  if (!servicesAdminActionAddBtn) return;
  const hasCategory = Boolean(selectedManageCategory);
  const hasSubcategory = Boolean(selectedManageSubcategory);
  const hasSubsubcategory = Boolean(selectedManageSubsubcategory);
  const hasService = Boolean(getSelectedManagedService());

  servicesAdminActionAddBtn.disabled = !(adminStep >= 1);
  servicesAdminActionEditBtn.disabled = !(
    (adminStep === 1 && hasCategory)
    || (adminStep === 2 && hasSubcategory)
    || (adminStep === 3 && hasSubsubcategory)
    || (adminStep === 4 && hasService)
  );
  servicesAdminActionDeleteBtn.disabled = servicesAdminActionEditBtn.disabled;
  servicesAdminActionTransferBtn.disabled = !(
    (adminStep === 2 && hasSubcategory)
    || (adminStep === 4 && hasService)
  );
  servicesAdminActionToggleBtn.disabled = !(
    (adminStep === 1 && hasCategory)
    || (adminStep === 2 && hasSubcategory)
    || (adminStep === 4 && hasService)
  );
  updateSelectedCount();
}

function renderTaxonomyManagers() {
  const categories = (state.taxonomy.categories || []).filter(isVisibleCategory);
  if (!categories.includes(selectedManageCategory)) {
    selectedManageCategory = "";
    selectedManageSubcategory = "";
    selectedManageSubsubcategory = "";
  }

  const activeCategory = selectedManageCategory;
  const categoryItems = categories.map((c) => {
    const enabled = isCategoryEnabled(c);
    return `<div class="list-item draggable-item ${c === activeCategory ? "active" : ""} ${enabled ? "" : "inactive"}" data-cat="${escapeAttr(c)}" draggable="true">
      <button type="button" class="list-chip" data-cat="${escapeAttr(c)}">${escapeHtml(c)}</button>
      <div class="item-actions">
        <button type="button" class="icon-action ${enabled ? "delete" : "edit"}" data-act="toggle" data-cat="${escapeAttr(c)}" title="${enabled ? "Disable category" : "Enable category"}" aria-label="${enabled ? "Disable category" : "Enable category"}">${iconSvg("toggle")}</button>
        <button type="button" class="icon-action edit" data-act="edit" data-cat="${escapeAttr(c)}" title="Edit category" aria-label="Edit category">${iconSvg("edit")}</button>
        <button type="button" class="icon-action delete" data-act="delete" data-cat="${escapeAttr(c)}" title="Delete category" aria-label="Delete category">${iconSvg("delete")}</button>
      </div>
    </div>`;
  }).join("");
  categoryList.innerHTML = categoryItems || `<p class="admin-empty">No categories yet.</p>`;

  const subListCategory = selectedManageCategory;
  const subList = subListCategory ? (state.taxonomy.subcategories?.[subListCategory] || []) : [];
  if (!subList.includes(selectedManageSubcategory)) {
    selectedManageSubcategory = "";
    selectedManageSubsubcategory = "";
  }
  if (!subListCategory) {
    subcategoryList.innerHTML = `<p class="admin-empty">Choose a category to view subcategories.</p>`;
  } else {
    const subItems = subList.map((s) => {
      const enabled = isSubcategoryEnabled(subListCategory, s);
      return `<div class="list-item draggable-item ${s === selectedManageSubcategory ? "active" : ""} ${enabled ? "" : "inactive"}" data-sub="${escapeAttr(s)}" draggable="true">
        <button type="button" class="list-chip" data-sub="${escapeAttr(s)}">${escapeHtml(s)}</button>
        <div class="item-actions">
          <button type="button" class="icon-action ${enabled ? "delete" : "edit"}" data-act="toggle" data-sub="${escapeAttr(s)}" title="${enabled ? "Disable subcategory" : "Enable subcategory"}" aria-label="${enabled ? "Disable subcategory" : "Enable subcategory"}">${iconSvg("toggle")}</button>
          <button type="button" class="icon-action edit" data-act="transfer" data-sub="${escapeAttr(s)}" title="Transfer subcategory" aria-label="Transfer subcategory">${iconSvg("move")}</button>
          <button type="button" class="icon-action edit" data-act="edit" data-sub="${escapeAttr(s)}" title="Edit subcategory" aria-label="Edit subcategory">${iconSvg("edit")}</button>
          <button type="button" class="icon-action delete" data-act="delete" data-sub="${escapeAttr(s)}" title="Delete subcategory" aria-label="Delete subcategory">${iconSvg("delete")}</button>
        </div>
      </div>`;
    }).join("");
    subcategoryList.innerHTML = subItems || `<p class="admin-empty">No subcategories yet.</p>`;
  }

  const parentCategory = selectedManageCategory;
  const parentSubcategory = selectedManageSubcategory;
  const subSubKey = taxonomySubKey(parentCategory, parentSubcategory);
  const subSubList = parentCategory && parentSubcategory
    ? (state.taxonomy.subSubcategories?.[subSubKey] || [])
    : [];
  if (!subSubList.includes(selectedManageSubsubcategory)) {
    selectedManageSubsubcategory = "";
  }
  if (!parentCategory || !parentSubcategory) {
    subsubcategoryList.innerHTML = `<p class="admin-empty">Choose a subcategory to view child subcategories.</p>`;
  } else {
    const continueToServices = `<div class="list-item add-item"><button type="button" class="list-chip add-new-chip" data-open-services="true">Continue to Services</button></div>`;
    const subSubItems = subSubList.map((s) => (
      `<div class="list-item draggable-item ${s === selectedManageSubsubcategory ? "active" : ""}" data-subsub="${escapeAttr(s)}" draggable="true">
        <button type="button" class="list-chip" data-subsub="${escapeAttr(s)}">${escapeHtml(s)}</button>
        <div class="item-actions">
          <button type="button" class="icon-action edit" data-act="edit" data-subsub="${escapeAttr(s)}" title="Edit child subcategory" aria-label="Edit child subcategory">${iconSvg("edit")}</button>
          <button type="button" class="icon-action delete" data-act="delete" data-subsub="${escapeAttr(s)}" title="Delete child subcategory" aria-label="Delete child subcategory">${iconSvg("delete")}</button>
        </div>
      </div>`
    )).join("");
    subsubcategoryList.innerHTML = continueToServices + (subSubItems || `<p class="admin-empty">No child subcategories yet.</p>`);
  }
  renderAdminBreadcrumb();
}

function populateAdminFilters() {
  const selectedCategory = adminFilterCategory.value;
  const selectedSubcategory = adminFilterSubcategory.value;
  const selectedSubsubcategory = adminFilterSubsubcategory.value;
  const categories = (state.taxonomy.categories || []).filter(isVisibleCategory);

  adminFilterCategory.innerHTML = [
    `<option value="">Select category first</option>`,
    ...categories.map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`)
  ].join("");
  if (categories.includes(selectedCategory)) {
    adminFilterCategory.value = selectedCategory;
  }

  const category = adminFilterCategory.value;
  const subcategories = category ? (state.taxonomy.subcategories?.[category] || []) : [];
  adminFilterSubcategory.disabled = !category;
  adminFilterSubcategory.innerHTML = [
    `<option value="">Select subcategory</option>`,
    ...subcategories.map((s) => `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`)
  ].join("");
  if (category && subcategories.includes(selectedSubcategory)) {
    adminFilterSubcategory.value = selectedSubcategory;
  }

  const subcategory = adminFilterSubcategory.value;
  const subSubKey = taxonomySubKey(category, subcategory);
  const subSubcategories = (category && subcategory) ? (state.taxonomy.subSubcategories?.[subSubKey] || []) : [];
  adminFilterSubsubcategory.disabled = !category || !subcategory;
  adminFilterSubsubcategory.innerHTML = [
    `<option value="">Select child subcategory</option>`,
    ...subSubcategories.map((s) => `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`)
  ].join("");
  if (category && subcategory && subSubcategories.includes(selectedSubsubcategory)) {
    adminFilterSubsubcategory.value = selectedSubsubcategory;
  }
}

function cartTotal() {
  return state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function paymentLabel(value) {
  if (value === "cash") return "Cash";
  if (value === "gcash") return "GCash";
  if (value === "bank") return "Bank Transfer";
  return "Cash";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const rawError = String(payload.error || `Request failed (${response.status}).`).trim();
    const normalizedError = rawError.toLowerCase() === "not found." ? "Item not found." : rawError;
    throw new Error(normalizedError);
  }
  return payload;
}

function todayLocalKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateKeyFromDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysToDateKey(dateKey, days) {
  const [y, m, d] = String(dateKey || todayLocalKey()).split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + Number(days || 0));
  return dateKeyFromDate(dt);
}

function monthStartFromDateKey(dateKey) {
  const [y, m] = String(dateKey || todayLocalKey()).split("-").map(Number);
  return `${y}-${String(m || 1).padStart(2, "0")}-01`;
}

function monthKeyFromDateKey(dateKey) {
  const [y, m] = String(dateKey || todayLocalKey()).split("-").map(Number);
  return `${y}-${String(m || 1).padStart(2, "0")}`;
}

function dateFromDateKey(dateKey) {
  const [y, m, d] = String(dateKey || todayLocalKey()).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((line) => line.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function parseLegacy(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function attemptLegacyMigration() {
  if (localStorage.getItem(MIGRATION_MARKER) === "1") return;

  const staffUsers = parseLegacy(LEGACY_KEYS.staff);
  const services = parseLegacy(LEGACY_KEYS.services);
  const transactions = parseLegacy(LEGACY_KEYS.tx);
  const hasLegacy = [staffUsers, services, transactions].some((arr) => Array.isArray(arr) && arr.length > 0);

  if (!hasLegacy) {
    localStorage.setItem(MIGRATION_MARKER, "1");
    return;
  }

  await api("/api/migrations/localstorage", {
    method: "POST",
    body: JSON.stringify({
      pos_staff_users: staffUsers,
      pos_services: services,
      pos_transactions: transactions
    })
  });

  localStorage.setItem(MIGRATION_MARKER, "1");
  localStorage.removeItem(LEGACY_KEYS.staff);
  localStorage.removeItem(LEGACY_KEYS.services);
  localStorage.removeItem(LEGACY_KEYS.tx);
}

function renderStaffSelect() {
  staffSelect.innerHTML = state.staff
    .map((s) => `<option value="${s.id}">${escapeHtml(s.username)} (${escapeHtml(s.role)})</option>`)
    .join("");
}

function setScreen(name) {
  appShell.classList.toggle("login-mode", name === "login");
  loginScreen.classList.toggle("hidden", name !== "login");
  dashboardScreen.classList.toggle("hidden", name !== "dashboard");
  registerScreen.classList.toggle("hidden", name !== "register");
  if (inventoryScreen) inventoryScreen.classList.toggle("hidden", name !== "inventory");
  if (name !== "register") closeCheckoutPopup();
}

function updateClock() {
  const now = new Date();
  dashDate.textContent = now.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" });
  dashTime.textContent = now.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

async function refreshSummary() {
  const summary = await api("/api/dashboard/today-summary");
  if (todaySummary) {
    todaySummary.textContent = `Today Sales: ${peso.format(summary.totalSales || 0)}`;
  }
}

function inventoryNowLabel() {
  return new Date().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function toSafeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function inventorySelectedIds() {
  return Object.keys(state.inventory.selectedIds || {}).filter((id) => state.inventory.selectedIds[id]);
}

function setInventoryMessage(type, message) {
  if (inventoryError) inventoryError.textContent = type === "error" ? message : "";
  if (inventorySuccess) inventorySuccess.textContent = type === "success" ? message : "";
}

function clearInventoryMessage() {
  setInventoryMessage("error", "");
  setInventoryMessage("success", "");
}

function updateInventorySelectedCount() {
  if (!inventorySelectedCount) return;
  inventorySelectedCount.textContent = `${inventorySelectedIds().length} selected`;
}

function inventoryServiceOptionsHtml(selectedId = "") {
  const options = [`<option value="">(No linked service)</option>`];
  for (const service of state.services) {
    options.push(
      `<option value="${escapeAttr(service.id)}" ${String(selectedId || "") === String(service.id) ? "selected" : ""}>${escapeHtml(service.name)}</option>`
    );
  }
  return options.join("");
}

function populateInventoryFilters() {
  if (!inventoryCategoryFilter) return;
  const categories = [...new Set((state.inventory.items || []).map((item) => String(item.category || "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
  const selected = inventoryCategoryFilter.value || "";
  inventoryCategoryFilter.innerHTML = [
    `<option value="">All categories</option>`,
    ...categories.map((cat) => `<option value="${escapeAttr(cat)}">${escapeHtml(cat)}</option>`)
  ].join("");
  if (selected && categories.includes(selected)) inventoryCategoryFilter.value = selected;
}

function ensureInventoryNewLinkedServiceOptions() {
  if (!inventoryNewLinkedService) return;
  const selected = inventoryNewLinkedService.value || "";
  inventoryNewLinkedService.innerHTML = inventoryServiceOptionsHtml(selected);
}

async function refreshInventoryLinkSummary(sourceItems = null) {
  try {
    let items = sourceItems;
    if (!Array.isArray(items)) {
      const payload = await api("/api/inventory");
      items = Array.isArray(payload.items) ? payload.items : [];
    }
    const counts = {};
    const productMap = {};
    for (const item of (items || [])) {
      const linkedServiceId = String(item.linked_service_id || "").trim();
      if (!linkedServiceId) continue;
      counts[linkedServiceId] = (counts[linkedServiceId] || 0) + 1;
      if (!Array.isArray(productMap[linkedServiceId])) productMap[linkedServiceId] = [];
      productMap[linkedServiceId].push(String(item.id));
    }
    state.inventory.serviceLinks = counts;
    state.inventory.serviceProductMap = productMap;
  } catch {
    state.inventory.serviceLinks = {};
    state.inventory.serviceProductMap = {};
  }
}

async function refreshInventoryData() {
  const payload = await api("/api/inventory");
  state.inventory.items = Array.isArray(payload.items) ? payload.items : [];
  const validIds = new Set(state.inventory.items.map((item) => String(item.id)));
  for (const id of Object.keys(state.inventory.selectedIds || {})) {
    if (!validIds.has(id)) delete state.inventory.selectedIds[id];
  }
  state.inventory.lastUpdated = new Date().toISOString();
  if (inventoryLastUpdated) inventoryLastUpdated.textContent = `Last updated: ${inventoryNowLabel()}`;
  populateInventoryFilters();
  ensureInventoryNewLinkedServiceOptions();
  await refreshInventoryLinkSummary(state.inventory.items);
  renderInventoryTable();
}

function getFilteredInventoryItems() {
  const search = String(inventorySearch?.value || "").trim().toLowerCase();
  const category = String(inventoryCategoryFilter?.value || "").trim();
  const status = String(inventoryStatusFilter?.value || "").trim();
  const sort = String(inventorySort?.value || "name_asc").trim();
  let list = [...(state.inventory.items || [])];

  if (search) {
    list = list.filter((item) => {
      const hay = [
        item.product_name,
        item.sku,
        item.category,
        item.supplier
      ]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      return hay.includes(search);
    });
  }
  if (category) {
    list = list.filter((item) => String(item.category || "") === category);
  }
  if (status === "low") {
    list = list.filter((item) => toSafeNumber(item.stock_qty) <= toSafeNumber(item.reorder_level));
  } else if (status === "active") {
    list = list.filter((item) => Boolean(item.is_active));
  } else if (status === "inactive") {
    list = list.filter((item) => !Boolean(item.is_active));
  }

  const sorters = {
    name_asc: (a, b) => String(a.product_name || "").localeCompare(String(b.product_name || "")),
    name_desc: (a, b) => String(b.product_name || "").localeCompare(String(a.product_name || "")),
    stock_asc: (a, b) => toSafeNumber(a.stock_qty) - toSafeNumber(b.stock_qty),
    stock_desc: (a, b) => toSafeNumber(b.stock_qty) - toSafeNumber(a.stock_qty),
    updated_desc: (a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || ""))
  };
  list.sort(sorters[sort] || sorters.name_asc);
  return list;
}

function inventoryLinkedServiceName(serviceId) {
  if (!serviceId) return "";
  const matched = state.services.find((s) => String(s.id) === String(serviceId));
  return matched ? matched.name : "";
}

function inventoryServiceSelectCell(product) {
  return `<select class="inventory-cell-input" data-inventory-id="${escapeAttr(product.id)}" data-field="linked_service_id">
    ${inventoryServiceOptionsHtml(product.linked_service_id || "")}
  </select>`;
}

function renderInventoryTable() {
  if (!inventoryBody) return;
  const filtered = getFilteredInventoryItems();
  if (inventorySelectAll) {
    const visibleIds = filtered.map((item) => String(item.id));
    inventorySelectAll.checked = visibleIds.length > 0 && visibleIds.every((id) => Boolean(state.inventory.selectedIds[id]));
  }
  const pageSize = Math.max(1, toSafeNumber(state.inventory.pageSize, 10));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (state.inventory.page > totalPages) state.inventory.page = totalPages;
  if (state.inventory.page < 1) state.inventory.page = 1;
  const offset = (state.inventory.page - 1) * pageSize;
  const pageItems = filtered.slice(offset, offset + pageSize);

  if (inventoryPageLabel) {
    inventoryPageLabel.textContent = `Page ${state.inventory.page} of ${totalPages}`;
  }
  if (inventoryPrev) inventoryPrev.disabled = state.inventory.page <= 1;
  if (inventoryNext) inventoryNext.disabled = state.inventory.page >= totalPages;

  const html = pageItems.map((item) => {
    const low = toSafeNumber(item.stock_qty) <= toSafeNumber(item.reorder_level);
    const inactive = !Boolean(item.is_active);
    const rowClass = [low ? "inventory-row-low-stock" : "", inactive ? "inventory-row-inactive" : ""].filter(Boolean).join(" ");
    const selected = Boolean(state.inventory.selectedIds[item.id]);
    return `<tr class="${rowClass}" data-inventory-row-id="${escapeAttr(item.id)}">
      <td><input type="checkbox" class="inventory-select-item" data-id="${escapeAttr(item.id)}" ${selected ? "checked" : ""}></td>
      <td><input class="inventory-cell-input" data-inventory-id="${escapeAttr(item.id)}" data-field="product_name" value="${escapeAttr(item.product_name || "")}"></td>
      <td><input class="inventory-cell-input" data-inventory-id="${escapeAttr(item.id)}" data-field="sku" value="${escapeAttr(item.sku || "")}"></td>
      <td><input class="inventory-cell-input" data-inventory-id="${escapeAttr(item.id)}" data-field="category" value="${escapeAttr(item.category || "")}"></td>
      <td><input class="inventory-cell-input" data-inventory-id="${escapeAttr(item.id)}" data-field="unit" value="${escapeAttr(item.unit || "")}"></td>
      <td><input class="inventory-cell-input" type="number" step="0.01" min="0" data-inventory-id="${escapeAttr(item.id)}" data-field="stock_qty" value="${escapeAttr(item.stock_qty)}"></td>
      <td><input class="inventory-cell-input" type="number" step="0.01" min="0" data-inventory-id="${escapeAttr(item.id)}" data-field="reorder_level" value="${escapeAttr(item.reorder_level)}"></td>
      <td><input class="inventory-cell-input" type="number" step="0.01" min="0" data-inventory-id="${escapeAttr(item.id)}" data-field="actual_cost" value="${escapeAttr(item.actual_cost)}"></td>
      <td><input class="inventory-cell-input" type="number" step="0.01" min="0" data-inventory-id="${escapeAttr(item.id)}" data-field="selling_price" value="${escapeAttr(item.selling_price)}"></td>
      <td class="num-col inventory-cell-profit">${peso.format(toSafeNumber(item.gross_profit_per_unit))}</td>
      <td class="num-col inventory-cell-value">${peso.format(toSafeNumber(item.inventory_value))}</td>
      <td><input class="inventory-cell-input" data-inventory-id="${escapeAttr(item.id)}" data-field="supplier" value="${escapeAttr(item.supplier || "")}"></td>
      <td>${inventoryServiceSelectCell(item)}</td>
      <td>
        <select class="inventory-cell-input" data-inventory-id="${escapeAttr(item.id)}" data-field="is_active">
          <option value="1" ${item.is_active ? "selected" : ""}>Enabled</option>
          <option value="0" ${item.is_active ? "" : "selected"}>Disabled</option>
        </select>
      </td>
      <td><button type="button" class="btn ghost small inventory-delete-btn" data-id="${escapeAttr(item.id)}">Delete</button></td>
    </tr>`;
  }).join("");

  inventoryBody.innerHTML = rowOrEmpty(html, 15, "No inventory items found.");
  updateInventorySelectedCount();
}

async function saveInventoryCell(id, field, rawValue) {
  const payload = {};
  if (["actual_cost", "selling_price", "stock_qty", "reorder_level"].includes(field)) {
    const num = Number(rawValue);
    if (!Number.isFinite(num) || num < 0) {
      throw new Error("Numeric fields must have valid non-negative values.");
    }
    payload[field] = num;
  } else if (field === "is_active") {
    payload[field] = String(rawValue) === "1";
  } else if (field === "linked_service_id") {
    payload[field] = String(rawValue || "").trim() || null;
  } else {
    payload[field] = String(rawValue || "").trim();
  }
  const result = await api(`/api/inventory/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  const updated = result.item || null;
  if (updated) {
    const idx = state.inventory.items.findIndex((item) => String(item.id) === String(updated.id));
    if (idx >= 0) state.inventory.items[idx] = updated;
    else state.inventory.items.unshift(updated);
  }
  renderInventoryTable();
}

function resetInventoryNewRow() {
  if (inventoryNewName) inventoryNewName.value = "";
  if (inventoryNewSku) inventoryNewSku.value = "";
  if (inventoryNewCategory) inventoryNewCategory.value = "";
  if (inventoryNewUnit) inventoryNewUnit.value = "";
  if (inventoryNewCost) inventoryNewCost.value = "";
  if (inventoryNewPrice) inventoryNewPrice.value = "";
  if (inventoryNewStock) inventoryNewStock.value = "";
  if (inventoryNewReorder) inventoryNewReorder.value = "";
  if (inventoryNewSupplier) inventoryNewSupplier.value = "";
  if (inventoryNewLinkedService) inventoryNewLinkedService.value = "";
  if (inventoryNewActive) inventoryNewActive.value = "1";
}

async function createInventoryProduct() {
  clearInventoryMessage();
  const productName = String(inventoryNewName?.value || "").trim();
  if (!productName) {
    setInventoryMessage("error", "Product name is required.");
    return;
  }
  const payload = {
    product_name: productName,
    sku: String(inventoryNewSku?.value || "").trim(),
    category: String(inventoryNewCategory?.value || "").trim(),
    unit: String(inventoryNewUnit?.value || "").trim(),
    actual_cost: toSafeNumber(inventoryNewCost?.value, 0),
    selling_price: toSafeNumber(inventoryNewPrice?.value, 0),
    stock_qty: toSafeNumber(inventoryNewStock?.value, 0),
    reorder_level: toSafeNumber(inventoryNewReorder?.value, 0),
    supplier: String(inventoryNewSupplier?.value || "").trim(),
    linked_service_id: String(inventoryNewLinkedService?.value || "").trim() || null,
    is_active: String(inventoryNewActive?.value || "1") === "1"
  };
  try {
    const result = await api("/api/inventory", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    if (result.item) {
      state.inventory.items.unshift(result.item);
    }
    resetInventoryNewRow();
    setInventoryMessage("success", "Product added.");
    populateInventoryFilters();
    renderInventoryTable();
    await refreshInventoryLinkSummary();
  } catch (error) {
    setInventoryMessage("error", error.message);
  }
}

async function deleteInventoryProduct(id) {
  const ok = await askActionConfirm("Delete Product", "Delete this product?");
  if (!ok) return;
  await api(`/api/inventory/${encodeURIComponent(id)}`, { method: "DELETE" });
  state.inventory.items = state.inventory.items.filter((item) => String(item.id) !== String(id));
  delete state.inventory.selectedIds[id];
  renderInventoryTable();
  await refreshInventoryLinkSummary();
}

async function askInventoryAdjust(selectedIds) {
  if (!inventoryAdjustDialog || selectedIds.length === 0) return null;
  inventoryAdjustQty.value = "1";
  inventoryAdjustNote.value = "";
  inventoryAdjustType.value = "+";
  if (inventoryAdjustDialog.open) inventoryAdjustDialog.close();
  inventoryAdjustDialog.showModal();
  return new Promise((resolve) => {
    inventoryAdjustResolver = resolve;
  });
}

function resolveInventoryAdjust(result) {
  if (!inventoryAdjustResolver) return;
  const resolver = inventoryAdjustResolver;
  inventoryAdjustResolver = null;
  if (inventoryAdjustDialog?.open) inventoryAdjustDialog.close();
  resolver(result);
}

async function applyInventorySelectedAction() {
  const action = String(inventorySelectedAction?.value || "").trim();
  const ids = inventorySelectedIds();
  if (!action || ids.length === 0) {
    setInventoryMessage("error", "Select products and an action first.");
    return;
  }
  clearInventoryMessage();
  try {
    if (action === "enable" || action === "disable") {
      const next = action === "enable";
      for (const id of ids) {
        await api(`/api/inventory/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: next })
        });
      }
      setInventoryMessage("success", `${action === "enable" ? "Enabled" : "Disabled"} ${ids.length} product(s).`);
    } else if (action === "delete") {
      const ok = await askActionConfirm("Delete Selected", `Delete ${ids.length} selected products?`);
      if (!ok) return;
      for (const id of ids) {
        await api(`/api/inventory/${encodeURIComponent(id)}`, { method: "DELETE" });
      }
      setInventoryMessage("success", `Deleted ${ids.length} product(s).`);
    } else if (action === "move") {
      const targetCategory = window.prompt("Move selected products to category:", "") || "";
      const category = targetCategory.trim();
      if (!category) return;
      for (const id of ids) {
        await api(`/api/inventory/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify({ category })
        });
      }
      setInventoryMessage("success", `Moved ${ids.length} product(s) to ${category}.`);
    } else if (action === "adjust") {
      const adjusted = await askInventoryAdjust(ids);
      if (!adjusted) return;
      await api("/api/inventory/bulk-stock-adjust", {
        method: "PATCH",
        body: JSON.stringify({
          ids,
          delta: adjusted.delta,
          note: adjusted.note,
          changedByStaffId: state.currentStaff?.id || "system"
        })
      });
      setInventoryMessage("success", `Stock adjusted for ${ids.length} product(s).`);
    }

    state.inventory.selectedIds = {};
    if (inventorySelectAll) inventorySelectAll.checked = false;
    await refreshInventoryData();
  } catch (error) {
    setInventoryMessage("error", error.message);
  }
}

async function openInventoryScreen() {
  setScreen("inventory");
  clearInventoryMessage();
  if (inventoryPageSize) {
    state.inventory.pageSize = toSafeNumber(inventoryPageSize.value, 10);
  }
  ensureInventoryNewLinkedServiceOptions();
  await refreshInventoryData();
}

function rowOrEmpty(html, colSpan, emptyText) {
  return html || `<tr><td colspan="${colSpan}" class="muted-cell">${escapeHtml(emptyText)}</td></tr>`;
}

function setReportsDateDefaults() {
  const today = todayLocalKey();
  if (!reportsRangeStart) reportsRangeStart = today;
  if (!reportsRangeEnd) reportsRangeEnd = today;
  if (reportsRangePicker && !reportsRangePicker.value) {
    reportsRangePicker.value = reportsRangeStart;
  }
  updateReportsRangeSummary();
}

function updateReportsRangeSummary() {
  const text = reportsRangeAnchor
    ? `${reportsRangeStart || "-"} -> ...`
    : `${reportsRangeStart || "-"} -> ${reportsRangeEnd || "-"}`;
  if (reportsRangeMainText) reportsRangeMainText.textContent = text;
}

function applyReportsRangeSelection(dateValue) {
  const selected = String(dateValue || "").trim() || todayLocalKey();
  if (!reportsRangeAnchor) {
    reportsRangeAnchor = selected;
    reportsRangeStart = selected;
    reportsRangeEnd = selected;
  } else {
    reportsRangeStart = reportsRangeAnchor <= selected ? reportsRangeAnchor : selected;
    reportsRangeEnd = reportsRangeAnchor <= selected ? selected : reportsRangeAnchor;
    reportsRangeAnchor = "";
  }
  updateReportsRangeSummary();
}

function setReportsPreset(preset) {
  const today = todayLocalKey();
  reportsRangeAnchor = "";
  if (preset === "today") {
    reportsRangeStart = today;
    reportsRangeEnd = today;
  } else if (preset === "yesterday") {
    const y = addDaysToDateKey(today, -1);
    reportsRangeStart = y;
    reportsRangeEnd = y;
  } else if (preset === "last7") {
    reportsRangeStart = addDaysToDateKey(today, -6);
    reportsRangeEnd = today;
  } else if (preset === "month") {
    reportsRangeStart = monthStartFromDateKey(today);
    reportsRangeEnd = today;
  }
  if (reportsRangePicker) reportsRangePicker.value = reportsRangeEnd;
  updateReportsRangeSummary();
}

function exportReportsCsv() {
  if (!state.reports) {
    showToast("Load reports first.");
    return;
  }
  const report = state.reports;
  const rows = [];
  rows.push(["Reports Summary"]);
  rows.push(["Start Date", report.range?.startDate || ""]);
  rows.push(["End Date", report.range?.endDate || ""]);
  rows.push(["Total Sales", Number(report.totals?.totalSales || 0)]);
  rows.push(["Transactions", Number(report.totals?.transactionCount || 0)]);
  rows.push(["Cash In", Number(report.cashMovements?.cashIn?.total || 0)]);
  rows.push(["Cash Out", Number(report.cashMovements?.cashOut?.total || 0)]);
  rows.push(["Net Cash Movement", Number(report.cashMovements?.net || 0)]);
  rows.push([]);
  rows.push(["Sales By Service"]);
  rows.push(["Service", "Qty", "Sales"]);
  for (const row of report.salesByService || []) {
    rows.push([row.serviceName || "", Number(row.qty || 0), Number(row.sales || 0)]);
  }
  rows.push([]);
  rows.push(["Payment Breakdown"]);
  rows.push(["Payment", "Tx Count", "Sales"]);
  for (const row of report.paymentBreakdown || []) {
    rows.push([row.paymentMethod || "", Number(row.transactionCount || 0), Number(row.sales || 0)]);
  }
  rows.push([]);
  rows.push(["Cash In / Out Log"]);
  rows.push(["Date", "Time", "Type", "Amount", "Note"]);
  for (const row of report.cashMovementEntries || []) {
    rows.push([row.date || "", row.time || "", row.type || "", Number(row.amount || 0), row.note || ""]);
  }
  downloadCsv(`reports_${report.range?.startDate || todayLocalKey()}_${report.range?.endDate || todayLocalKey()}.csv`, rows);
}

function exportReportsPdf() {
  if (!state.reports) {
    showToast("Load reports first.");
    return;
  }
  const report = state.reports;

  const pad = (text, len) => {
    const raw = String(text || "");
    if (raw.length >= len) return raw.slice(0, len);
    return `${raw}${" ".repeat(len - raw.length)}`;
  };
  const line = (cols) => cols.join(" | ");
  const textLines = [
    "Reports Summary",
    `Range: ${report.range?.startDate || "-"} to ${report.range?.endDate || "-"}`,
    `Exported: ${new Date().toLocaleString("en-PH")}`,
    "",
    `Total Sales: ${peso.format(Number(report.totals?.totalSales || 0))}`,
    `Transactions: ${Number(report.totals?.transactionCount || 0)}`,
    `Cash In: ${peso.format(Number(report.cashMovements?.cashIn?.total || 0))}`,
    `Cash Out: ${peso.format(Number(report.cashMovements?.cashOut?.total || 0))}`,
    `Net Cash: ${peso.format(Number(report.cashMovements?.net || 0))}`,
    "",
    "Sales By Service",
    line([pad("Service", 26), pad("Qty", 5), pad("Sales", 12)]),
    "-".repeat(52),
    ...((report.salesByService || []).length
      ? (report.salesByService || []).map((row) => line([
        pad(row.serviceName || "", 26),
        pad(Number(row.qty || 0), 5),
        pad(peso.format(Number(row.sales || 0)), 12)
      ]))
      : ["No service sales"]),
    "",
    "Top Services",
    line([pad("#", 3), pad("Service", 26), pad("Sales", 12)]),
    "-".repeat(47),
    ...((report.topServices || []).length
      ? (report.topServices || []).map((row, idx) => line([
        pad(idx + 1, 3),
        pad(row.serviceName || "", 26),
        pad(peso.format(Number(row.sales || 0)), 12)
      ]))
      : ["No top services"]),
    "",
    "Payment Breakdown",
    line([pad("Payment", 18), pad("Tx Count", 9), pad("Sales", 12)]),
    "-".repeat(47),
    ...((report.paymentBreakdown || []).length
      ? (report.paymentBreakdown || []).map((row) => line([
        pad(row.paymentMethod || "", 18),
        pad(Number(row.transactionCount || 0), 9),
        pad(peso.format(Number(row.sales || 0)), 12)
      ]))
      : ["No payment records"])
  ];

  const escapePdfText = (text) => String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

  const buildSimplePdf = (lines) => {
    const pageWidth = 612;
    const pageHeight = 792;
    const left = 36;
    const top = 760;
    const lineHeight = 14;
    const contentParts = ["BT", "/F1 10 Tf"];
    lines.forEach((ln, i) => {
      const y = top - (i * lineHeight);
      if (y < 36) return;
      contentParts.push(`${left} ${y} Td (${escapePdfText(ln)}) Tj`);
      contentParts.push(`${-left} ${-y} Td`);
    });
    contentParts.push("ET");
    const stream = contentParts.join("\n");

    let pdf = "%PDF-1.4\n";
    const offsets = [];
    const addObj = (id, body) => {
      offsets[id] = pdf.length;
      pdf += `${id} 0 obj\n${body}\nendobj\n`;
    };

    addObj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    addObj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    addObj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`);
    addObj(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    addObj(5, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);

    const xrefStart = pdf.length;
    pdf += "xref\n0 6\n0000000000 65535 f \n";
    for (let i = 1; i <= 5; i += 1) {
      pdf += `${String(offsets[i] || 0).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return pdf;
  };

  const pdfText = buildSimplePdf(textLines);
  const blob = new Blob([pdfText], { type: "application/pdf" });
  const fileName = `reports_${report.range?.startDate || todayLocalKey()}_${report.range?.endDate || todayLocalKey()}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("PDF downloaded.");
}

function printReportsSummary() {
  if (!state.reports) {
    showToast("Load reports first.");
    return;
  }
  const report = state.reports;
  const html = `<!doctype html>
  <html><head><meta charset="utf-8"><title>Reports Summary</title>
  <style>
  body{font-family:Segoe UI,Tahoma,sans-serif;padding:20px;color:#193243}
  h1{font-size:20px;margin:0 0 6px} h2{font-size:14px;margin:18px 0 8px}
  .meta{margin:0 0 12px;color:#3d5b6f} table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #c4d3de;padding:6px 8px;font-size:12px} th{text-align:left;background:#e8f1f7}
  .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  </style></head><body>
  <h1>Reports Summary</h1>
  <p class="meta">Range: ${report.range?.startDate || "-"} to ${report.range?.endDate || "-"} | Printed: ${new Date().toLocaleString("en-PH")}</p>
  <div class="grid">
    <table><tbody>
      <tr><th>Total Sales</th><td>${peso.format(Number(report.totals?.totalSales || 0))}</td></tr>
      <tr><th>Transactions</th><td>${Number(report.totals?.transactionCount || 0)}</td></tr>
      <tr><th>Cash In</th><td>${peso.format(Number(report.cashMovements?.cashIn?.total || 0))}</td></tr>
      <tr><th>Cash Out</th><td>${peso.format(Number(report.cashMovements?.cashOut?.total || 0))}</td></tr>
      <tr><th>Net Cash</th><td>${peso.format(Number(report.cashMovements?.net || 0))}</td></tr>
    </tbody></table>
  </div>
  <h2>Top Services</h2>
  <table><thead><tr><th>#</th><th>Service</th><th>Sales</th></tr></thead><tbody>
  ${(report.topServices || []).map((row, idx) => `<tr><td>${idx + 1}</td><td>${escapeHtml(row.serviceName || "")}</td><td>${peso.format(Number(row.sales || 0))}</td></tr>`).join("") || `<tr><td colspan="3">No records</td></tr>`}
  </tbody></table>
  <h2>Payment Breakdown</h2>
  <table><thead><tr><th>Payment</th><th>Tx Count</th><th>Sales</th></tr></thead><tbody>
  ${(report.paymentBreakdown || []).map((row) => `<tr><td>${escapeHtml(row.paymentMethod || "")}</td><td>${Number(row.transactionCount || 0)}</td><td>${peso.format(Number(row.sales || 0))}</td></tr>`).join("") || `<tr><td colspan="3">No records</td></tr>`}
  </tbody></table>
  </body></html>`;

  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    showToast("Unable to open print dialog.");
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  frame.onload = () => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 1000);
  };
}

function renderReports(payload) {
  if (!payload) return;
  state.reports = payload;

  const totals = payload.totals || {};
  const cashMovements = payload.cashMovements || {};
  const cashIn = cashMovements.cashIn || {};
  const cashOut = cashMovements.cashOut || {};
  const validation = payload.validation || {};

  if (reportsTotalSales) reportsTotalSales.textContent = peso.format(Number(totals.totalSales || 0));
  if (reportsTransactionCount) reportsTransactionCount.textContent = `${Number(totals.transactionCount || 0)} transaction(s)`;
  if (reportsCashInTotal) reportsCashInTotal.textContent = peso.format(Number(cashIn.total || 0));
  if (reportsCashOutTotal) reportsCashOutTotal.textContent = peso.format(Number(cashOut.total || 0));
  if (reportsNetCash) reportsNetCash.textContent = peso.format(Number(cashMovements.net || 0));
  if (reportsValidation) {
    reportsValidation.textContent = validation.ok
      ? "Validation OK: report totals match transactions and cash movement math."
      : `Validation issue: ${(validation.errors || []).join(" | ")}`;
    reportsValidation.classList.toggle("error", !validation.ok);
    reportsValidation.classList.toggle("success", Boolean(validation.ok));
  }

  if (reportsServiceBody) {
    reportsServiceBody.innerHTML = rowOrEmpty(
      (payload.salesByService || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.serviceName || "")}</td>
          <td class="num-col">${Number(row.qty || 0)}</td>
          <td class="num-col">${peso.format(Number(row.sales || 0))}</td>
        </tr>
      `).join(""),
      3,
      "No service sales in this date range."
    );
  }

  if (reportsTopBody) {
    reportsTopBody.innerHTML = rowOrEmpty(
      (payload.topServices || []).map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.serviceName || "")}</td>
          <td class="num-col">${peso.format(Number(row.sales || 0))}</td>
        </tr>
      `).join(""),
      3,
      "No top services yet."
    );
  }

  if (reportsPaymentBody) {
    reportsPaymentBody.innerHTML = rowOrEmpty(
      (payload.paymentBreakdown || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.paymentMethod || "")}</td>
          <td class="num-col">${Number(row.transactionCount || 0)}</td>
          <td class="num-col">${peso.format(Number(row.sales || 0))}</td>
        </tr>
      `).join(""),
      3,
      "No payments in this date range."
    );
  }

  if (reportsCashBody) {
    reportsCashBody.innerHTML = rowOrEmpty(
      (payload.cashMovementEntries || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.date || "")} ${escapeHtml(row.time || "")}</td>
          <td>${row.type === "in" ? "Cash In" : "Cash Out"}</td>
          <td class="num-col">${peso.format(Number(row.amount || 0))}</td>
          <td>${escapeHtml(row.note || "-")}</td>
        </tr>
      `).join(""),
      4,
      "No cash movement entries in this date range."
    );
  }

}

async function refreshReports() {
  if (reportsError) reportsError.textContent = "";
  const startDate = reportsRangeStart || todayLocalKey();
  const endDate = reportsRangeEnd || startDate;
  if (startDate > endDate) {
    if (reportsError) reportsError.textContent = "Start date must be on or before end date.";
    return;
  }
  const payload = await api(`/api/reports?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
  renderReports(payload);
  setLastUpdatedLabel(reportsLastUpdated);
}

async function openReportsDialog() {
  if (!reportsDialog) return;
  setReportsDateDefaults();
  await refreshReports();
  reportsDialog.showModal();
}

function setTransactionsDateDefaults() {
  const today = todayLocalKey();
  if (!transactionsRangeStart) transactionsRangeStart = today;
  if (!transactionsRangeEnd) transactionsRangeEnd = today;
  if (transactionsRangePicker && !transactionsRangePicker.value) {
    transactionsRangePicker.value = transactionsRangeStart;
  }
  if (transactionsRangeAnchor === null || transactionsRangeAnchor === undefined) transactionsRangeAnchor = "";
  updateTransactionsRangeSummary();
}

function updateTransactionsRangeSummary() {
  const text = transactionsRangeAnchor
    ? `${transactionsRangeStart || "-"} -> ...`
    : `${transactionsRangeStart || "-"} -> ${transactionsRangeEnd || "-"}`;
  if (transactionsRangeMainText) transactionsRangeMainText.textContent = text;
}

function applyTransactionsRangeSelection(dateValue) {
  const selected = String(dateValue || "").trim() || todayLocalKey();
  if (!transactionsRangeAnchor) {
    transactionsRangeAnchor = selected;
    transactionsRangeStart = selected;
    transactionsRangeEnd = selected;
  } else {
    transactionsRangeStart = transactionsRangeAnchor <= selected ? transactionsRangeAnchor : selected;
    transactionsRangeEnd = transactionsRangeAnchor <= selected ? selected : transactionsRangeAnchor;
    transactionsRangeAnchor = "";
  }
  updateTransactionsRangeSummary();
}

function setTransactionsPreset(preset) {
  const today = todayLocalKey();
  transactionsRangeAnchor = "";
  if (preset === "today") {
    transactionsRangeStart = today;
    transactionsRangeEnd = today;
  } else if (preset === "yesterday") {
    const y = addDaysToDateKey(today, -1);
    transactionsRangeStart = y;
    transactionsRangeEnd = y;
  } else if (preset === "last7") {
    transactionsRangeStart = addDaysToDateKey(today, -6);
    transactionsRangeEnd = today;
  } else if (preset === "month") {
    transactionsRangeStart = monthStartFromDateKey(today);
    transactionsRangeEnd = today;
  }
  if (transactionsRangePicker) transactionsRangePicker.value = transactionsRangeEnd;
  updateTransactionsRangeSummary();
}

function shiftMonthKey(monthKey, delta) {
  const [y, m] = String(monthKey || monthKeyFromDateKey(todayLocalKey())).split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, 1);
  dt.setMonth(dt.getMonth() + Number(delta || 0));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function renderDateRangeDialog() {
  if (!dateRangeGrid) return;
  const [year, month] = String(dateRangeViewMonth || monthKeyFromDateKey(todayLocalKey())).split("-").map(Number);
  const first = new Date(year, (month || 1) - 1, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month || 1, 0).getDate();
  if (dateRangeMonthLabel) {
    dateRangeMonthLabel.textContent = first.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
  }
  if (dateRangePreview) {
    const preview = dateRangeTempAnchor
      ? `${dateRangeTempStart || "-"} -> ...`
      : `${dateRangeTempStart || "-"} -> ${dateRangeTempEnd || "-"}`;
    dateRangePreview.textContent = preview;
  }

  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) {
    cells.push(`<button type="button" class="date-cell muted" disabled></button>`);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const inRange = dateRangeTempStart && dateRangeTempEnd && dateKey >= dateRangeTempStart && dateKey <= dateRangeTempEnd;
    const isStart = dateKey === dateRangeTempStart;
    const isEnd = dateKey === dateRangeTempEnd;
    const classes = ["date-cell"];
    if (inRange) classes.push("in-range");
    if (isStart || isEnd) classes.push("edge");
    cells.push(`<button type="button" class="${classes.join(" ")}" data-date-key="${dateKey}">${day}</button>`);
  }
  while (cells.length % 7 !== 0) {
    cells.push(`<button type="button" class="date-cell muted" disabled></button>`);
  }
  dateRangeGrid.innerHTML = cells.join("");
}

function setDateRangeTempPreset(preset) {
  const today = todayLocalKey();
  dateRangeTempAnchor = "";
  if (preset === "today") {
    dateRangeTempStart = today;
    dateRangeTempEnd = today;
  } else if (preset === "yesterday") {
    const y = addDaysToDateKey(today, -1);
    dateRangeTempStart = y;
    dateRangeTempEnd = y;
  } else if (preset === "last7") {
    dateRangeTempStart = addDaysToDateKey(today, -6);
    dateRangeTempEnd = today;
  } else if (preset === "month") {
    dateRangeTempStart = monthStartFromDateKey(today);
    dateRangeTempEnd = today;
  }
  dateRangeViewMonth = monthKeyFromDateKey(dateRangeTempEnd || today);
  renderDateRangeDialog();
}

function openDateRangeDialog(context) {
  if (!dateRangeDialog) return;
  dateRangeContext = context;
  if (context === "reports") {
    dateRangeTempStart = reportsRangeStart || todayLocalKey();
    dateRangeTempEnd = reportsRangeEnd || dateRangeTempStart;
    dateRangeTempAnchor = reportsRangeAnchor || "";
    dateRangeViewMonth = monthKeyFromDateKey(dateRangeTempEnd || todayLocalKey());
    if (dateRangeTitle) dateRangeTitle.textContent = "Reports Date Range";
  } else {
    dateRangeTempStart = transactionsRangeStart || todayLocalKey();
    dateRangeTempEnd = transactionsRangeEnd || dateRangeTempStart;
    dateRangeTempAnchor = transactionsRangeAnchor || "";
    dateRangeViewMonth = monthKeyFromDateKey(dateRangeTempEnd || todayLocalKey());
    if (dateRangeTitle) dateRangeTitle.textContent = "Transactions Date Range";
  }
  renderDateRangeDialog();
  dateRangeDialog.showModal();
}

async function applyDateRangeDialog() {
  if (dateRangeContext === "reports") {
    reportsRangeStart = dateRangeTempStart || todayLocalKey();
    reportsRangeEnd = dateRangeTempEnd || reportsRangeStart;
    reportsRangeAnchor = dateRangeTempAnchor || "";
    updateReportsRangeSummary();
    if (reportsRangePicker) reportsRangePicker.value = reportsRangeEnd;
    await refreshReports();
  } else {
    transactionsRangeStart = dateRangeTempStart || todayLocalKey();
    transactionsRangeEnd = dateRangeTempEnd || transactionsRangeStart;
    transactionsRangeAnchor = dateRangeTempAnchor || "";
    updateTransactionsRangeSummary();
    if (transactionsRangePicker) transactionsRangePicker.value = transactionsRangeEnd;
    transactionsPage = 1;
    transactionsSelectedIds = {};
    await refreshTransactions();
  }
  if (dateRangeDialog?.open) dateRangeDialog.close();
}

function exportTransactionsCsv() {
  const rows = [];
  rows.push(["Transactions"]);
  rows.push(["Date", "Time", "Staff", "Payment", "Status", "Total Qty", "Total Sale", "Reference #"]);
  for (const tx of state.transactionsView || []) {
    const qty = (Array.isArray(tx.items) ? tx.items : []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
    rows.push([
      tx.date || "",
      formatTimeAmPm(tx.time || ""),
      tx.staffName || tx.staffId || "",
      tx.payment || "",
      tx.isDeleted ? "Deleted" : "Active",
      qty,
      Number(tx.total || 0),
      tx.referenceNumber || ""
    ]);
  }
  downloadCsv(`transactions_${transactionsRangeStart || todayLocalKey()}_${transactionsRangeEnd || todayLocalKey()}.csv`, rows);
}

function exportTransactionsPdf() {
  const rows = (state.transactionsView || []).map((tx) => {
    const qty = (Array.isArray(tx.items) ? tx.items : []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
    return {
      date: tx.date || "",
      time: formatTimeAmPm(tx.time || ""),
      staff: tx.staffName || tx.staffId || "",
      payment: tx.payment || "",
      status: tx.isDeleted ? "Deleted" : "Active",
      qty,
      total: peso.format(Number(tx.total || 0)),
      reference: tx.referenceNumber || ""
    };
  });

  const pad = (text, len) => {
    const raw = String(text || "");
    if (raw.length >= len) return raw.slice(0, len);
    return `${raw}${" ".repeat(len - raw.length)}`;
  };
  const line = (cols) => cols.join(" | ");
  const textLines = [
    "Transactions",
    `Range: ${transactionsRangeStart || "-"} to ${transactionsRangeEnd || "-"}`,
    `Exported: ${new Date().toLocaleString("en-PH")}`,
    "",
    line([
      pad("Date", 10),
      pad("Time", 8),
      pad("Staff", 12),
      pad("Payment", 13),
      pad("Status", 7),
      pad("Qty", 4),
      pad("Total", 11),
      pad("Reference #", 20)
    ]),
    "-".repeat(100),
    ...(rows.length
      ? rows.map((r) => line([
        pad(r.date, 10),
        pad(r.time, 8),
        pad(r.staff, 12),
        pad(r.payment, 13),
        pad(r.status, 7),
        pad(r.qty, 4),
        pad(r.total, 11),
        pad(r.reference, 20)
      ]))
      : ["No records"])
  ];

  const escapePdfText = (text) => String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

  const buildSimplePdf = (lines) => {
    const pageWidth = 612;
    const pageHeight = 792;
    const left = 36;
    const top = 760;
    const lineHeight = 14;
    const contentParts = ["BT", "/F1 10 Tf"];
    lines.forEach((ln, i) => {
      const y = top - (i * lineHeight);
      if (y < 36) return;
      contentParts.push(`${left} ${y} Td (${escapePdfText(ln)}) Tj`);
      contentParts.push(`${-left} ${-y} Td`);
    });
    contentParts.push("ET");
    const stream = contentParts.join("\n");

    let pdf = "%PDF-1.4\n";
    const offsets = [];
    const addObj = (id, body) => {
      offsets[id] = pdf.length;
      pdf += `${id} 0 obj\n${body}\nendobj\n`;
    };

    addObj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    addObj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    addObj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`);
    addObj(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    addObj(5, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);

    const xrefStart = pdf.length;
    pdf += "xref\n0 6\n0000000000 65535 f \n";
    for (let i = 1; i <= 5; i += 1) {
      pdf += `${String(offsets[i] || 0).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return pdf;
  };

  const pdfText = buildSimplePdf(textLines);
  const blob = new Blob([pdfText], { type: "application/pdf" });
  const fileName = `transactions_${transactionsRangeStart || todayLocalKey()}_${transactionsRangeEnd || todayLocalKey()}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("PDF downloaded.");
}

function printTransactionsDirect() {
  const rowsHtml = (state.transactionsView || []).map((tx) => {
    const qty = (Array.isArray(tx.items) ? tx.items : []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
    return `<tr>
      <td>${escapeHtml(tx.date || "")}</td>
      <td>${escapeHtml(formatTimeAmPm(tx.time || ""))}</td>
      <td>${escapeHtml(tx.staffName || tx.staffId || "")}</td>
      <td>${escapeHtml(tx.payment || "")}</td>
      <td>${escapeHtml(tx.isDeleted ? "Deleted" : "Active")}</td>
      <td style="text-align:right;">${qty}</td>
      <td style="text-align:right;">${peso.format(Number(tx.total || 0))}</td>
      <td>${escapeHtml(tx.referenceNumber || "")}</td>
    </tr>`;
  }).join("");

  const html = `<!doctype html>
  <html><head><meta charset="utf-8"><title>Transactions</title>
  <style>
  body{font-family:Segoe UI,Tahoma,sans-serif;padding:20px;color:#193243}
  h1{font-size:20px;margin:0 0 6px}
  .meta{margin:0 0 12px;color:#3d5b6f}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #c4d3de;padding:6px 8px;font-size:12px}
  th{text-align:left;background:#e8f1f7}
  </style></head><body>
  <h1>Transactions</h1>
  <p class="meta">Range: ${transactionsRangeStart || "-"} to ${transactionsRangeEnd || "-"} | Printed: ${new Date().toLocaleString("en-PH")}</p>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Time</th><th>Staff</th><th>Payment</th><th>Status</th><th>Total Qty</th><th>Total Sale</th><th>Reference #</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="8">No records</td></tr>`}
    </tbody>
  </table>
  </body></html>`;

  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    showToast("Unable to open print dialog.");
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  frame.onload = () => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 1000);
  };
}

function pruneSelectedTransactions() {
  const visibleIds = new Set(state.transactionsView.map((tx) => String(tx.id || "")));
  for (const key of Object.keys(transactionsSelectedIds)) {
    if (!visibleIds.has(key)) delete transactionsSelectedIds[key];
  }
}

function transactionPageCount() {
  return Math.max(1, Math.ceil(state.transactionsView.length / transactionsPageSizeValue));
}

function pageRowsForTransactions() {
  const pageCount = transactionPageCount();
  if (transactionsPage > pageCount) transactionsPage = pageCount;
  if (transactionsPage < 1) transactionsPage = 1;
  const start = (transactionsPage - 1) * transactionsPageSizeValue;
  return state.transactionsView.slice(start, start + transactionsPageSizeValue);
}

function updateTransactionsPagerUi() {
  const pageCount = transactionPageCount();
  if (transactionsPageLabel) {
    transactionsPageLabel.textContent = `Page ${transactionsPage} of ${pageCount}`;
  }
  if (transactionsPrevBtn) transactionsPrevBtn.disabled = transactionsPage <= 1;
  if (transactionsNextBtn) transactionsNextBtn.disabled = transactionsPage >= pageCount;
}

function syncTransactionsSelectDropup() {
  if (!transactionsSelectMenu || !transactionsSelectAction) return;
  const optionMap = {
    cancel: transactionsSelectAction.querySelector("option[value='cancel']"),
    delete: transactionsSelectAction.querySelector("option[value='delete']"),
    restore: transactionsSelectAction.querySelector("option[value='restore']")
  };
  const buttons = transactionsSelectMenu.querySelectorAll(".select-dropup-item[data-action]");
  for (const btn of buttons) {
    const action = String(btn.dataset.action || "");
    const option = optionMap[action];
    btn.disabled = !option || option.disabled;
  }
}

function updateTransactionsSelectionUi(pageRows = []) {
  const selectedTotal = Object.keys(transactionsSelectedIds).length;
  const selectedRows = state.transactionsView.filter((row) => transactionsSelectedIds[String(row.id || "")]);
  const hasSelectedActive = selectedRows.some((row) => !row.isDeleted);
  const hasSelectedDeleted = selectedRows.some((row) => row.isDeleted);
  if (transactionsSelectedCount) {
    transactionsSelectedCount.textContent = `${selectedTotal} selected`;
  }
  if (transactionsSelectAction) {
    const cancelOpt = transactionsSelectAction.querySelector("option[value='cancel']");
    const deleteOpt = transactionsSelectAction.querySelector("option[value='delete']");
    const restoreOpt = transactionsSelectAction.querySelector("option[value='restore']");
    if (cancelOpt) cancelOpt.disabled = !transactionsSelectMode;
    if (deleteOpt) deleteOpt.disabled = !transactionsSelectMode || !hasSelectedActive;
    if (restoreOpt) restoreOpt.disabled = !transactionsSelectMode || !hasSelectedDeleted;
    transactionsSelectAction.value = "";
  }
  syncTransactionsSelectDropup();
  if (transactionsDialog) {
    transactionsDialog.classList.toggle("transactions-select-mode", transactionsSelectMode);
  }
  if (!transactionsSelectAll) return;
  const pageIds = pageRows.map((row) => String(row.id || "")).filter(Boolean);
  const selectedOnPage = pageIds.filter((id) => Boolean(transactionsSelectedIds[id])).length;
  transactionsSelectAll.checked = pageIds.length > 0 && selectedOnPage === pageIds.length;
  transactionsSelectAll.indeterminate = selectedOnPage > 0 && selectedOnPage < pageIds.length;
}

function renderTransactionsTable(transactions = []) {
  state.transactionsView = Array.isArray(transactions) ? transactions : [];
  pruneSelectedTransactions();
  const pageRows = pageRowsForTransactions();
  if (!transactionsBody) return;
  transactionsBody.innerHTML = rowOrEmpty(
    pageRows.map((tx) => {
      const qty = (Array.isArray(tx.items) ? tx.items : []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
      const txId = String(tx.id || "");
      const checked = transactionsSelectedIds[txId] ? "checked" : "";
      return `
      <tr class="transaction-row ${tx.isDeleted ? "transaction-row-deleted" : ""}" data-tx-id="${escapeAttr(tx.id || "")}">
        <td class="sel-col">
          <input type="checkbox" class="transaction-select" data-tx-id="${escapeAttr(tx.id || "")}" ${checked} aria-label="Select transaction">
        </td>
        <td>${escapeHtml(tx.date || "")}</td>
        <td>${escapeHtml(formatTimeAmPm(tx.time || ""))}</td>
        <td>${escapeHtml(tx.staffName || tx.staffId || "")}</td>
        <td>${escapeHtml(tx.payment || "")}${tx.isDeleted ? ` <span class="tx-state-pill">Deleted</span>` : ""}</td>
        <td class="num-col">${qty}</td>
        <td class="num-col">${peso.format(Number(tx.total || 0))}</td>
      </tr>
    `;
    }).join(""),
    8,
    "No transactions in this date range."
  );
  updateTransactionsPagerUi();
  updateTransactionsSelectionUi(pageRows);
}

async function deleteSelectedTransactions() {
  const ids = Object.keys(transactionsSelectedIds).filter((id) => Boolean(transactionsSelectedIds[id]));
  const activeIds = ids.filter((id) => {
    const row = state.transactionsView.find((tx) => String(tx.id || "") === id);
    return row && !row.isDeleted;
  });
  if (activeIds.length === 0) {
    showToast("Select active transactions to delete.");
    return;
  }
  if (activeIds.length === 0) {
    showToast("Select at least one transaction.");
    return;
  }
  const ok = await askActionConfirm(
    "Delete Transactions",
    `Delete ${activeIds.length} selected transaction(s) in range ${transactionsRangeStart || "-"} to ${transactionsRangeEnd || "-"}?`
  );
  if (!ok) return;

  let deleted = 0;
  try {
    const payload = await api("/api/transactions/delete-batch", {
      method: "POST",
      body: JSON.stringify({ ids: activeIds, staffId: state.currentStaff?.id || "" })
    });
    deleted = Number(payload.deletedCount || 0);
  } catch (error) {
    const msg = String(error?.message || "").toLowerCase();
    const canFallback = msg.includes("not found");
    if (!canFallback) throw error;

    for (const id of activeIds) {
      try {
        await api(`/api/transactions/${encodeURIComponent(id)}?staffId=${encodeURIComponent(state.currentStaff?.id || "")}`, { method: "DELETE" });
        deleted += 1;
      } catch (innerError) {
        const innerMsg = String(innerError?.message || "").toLowerCase();
        if (!innerMsg.includes("not found")) throw innerError;
      }
    }
  }

  transactionsSelectedIds = {};
  await refreshTransactions();
  if (deleted > 0) {
    showToast(`Deleted ${deleted} transaction(s).`);
    return;
  }
  throw new Error("No transactions were deleted. Please restart the app and try again.");
}

async function restoreSelectedTransactions() {
  const ids = Object.keys(transactionsSelectedIds).filter((id) => Boolean(transactionsSelectedIds[id]));
  const deletedIds = ids.filter((id) => {
    const row = state.transactionsView.find((tx) => String(tx.id || "") === id);
    return row && row.isDeleted;
  });
  if (deletedIds.length === 0) {
    showToast("Select deleted transactions to restore.");
    return;
  }
  const ok = await askActionConfirm(
    "Restore Transactions",
    `Restore ${deletedIds.length} selected transaction(s) in range ${transactionsRangeStart || "-"} to ${transactionsRangeEnd || "-"}?`
  );
  if (!ok) return;
  const payload = await api("/api/transactions/restore-batch", {
    method: "POST",
    body: JSON.stringify({ ids: deletedIds, staffId: state.currentStaff?.id || "" })
  });
  const restored = Number(payload.restoredCount || 0);
  transactionsSelectedIds = {};
  await refreshTransactions();
  showToast(`Restored ${restored} transaction(s).`);
}

function formatLastUpdatedLabel() {
  return new Date().toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function setLastUpdatedLabel(el) {
  if (!el) return;
  el.textContent = `Last updated: ${formatLastUpdatedLabel()}`;
}

function formatTimeAmPm(timeText) {
  const raw = String(timeText || "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return raw;
  const hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${suffix}`;
}

function openTransactionItems(txId) {
  const tx = state.transactionsView.find((row) => String(row.id || "") === String(txId || ""));
  if (!tx || !transactionItemsDialog) return;
  const items = Array.isArray(tx.items) ? tx.items : [];
  const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const staffName = tx.staffName || tx.staffId || "-";
  const timeAmPm = formatTimeAmPm(tx.time);
  const changeText = tx.change === null || tx.change === undefined
    ? "-"
    : peso.format(Number(tx.change || 0));
  const totalText = peso.format(Number(tx.total || 0));
  const referenceText = String(tx.referenceNumber || "").trim() || "-";
  if (transactionItemsTitle) {
    transactionItemsTitle.textContent = "Purchased Services";
  }
  if (txDetailDate) txDetailDate.textContent = tx.date || "-";
  if (txDetailTime) txDetailTime.textContent = timeAmPm || "-";
  if (txDetailStaff) txDetailStaff.textContent = staffName;
  if (txDetailPayment) txDetailPayment.textContent = tx.payment || "-";
  if (txDetailReference) txDetailReference.textContent = referenceText;
  if (txDetailQty) txDetailQty.textContent = String(totalQty);
  if (txDetailChange) txDetailChange.textContent = changeText;
  if (txDetailTotal) txDetailTotal.textContent = totalText;
  if (transactionItemsBody) {
    transactionItemsBody.innerHTML = rowOrEmpty(
      items.map((item) => `
        <tr>
          <td>${escapeHtml(item.name || "")}</td>
          <td class="num-col">${Number(item.qty || 0)}</td>
          <td class="num-col">${peso.format(Number(item.price || 0))}</td>
          <td class="num-col">${peso.format(Number(item.lineTotal || 0))}</td>
        </tr>
      `).join(""),
      4,
      "No items found for this transaction."
    );
  }
  transactionItemsDialog.showModal();
}

async function refreshTransactions() {
  if (transactionsError) transactionsError.textContent = "";
  const startDate = transactionsRangeStart || todayLocalKey();
  const endDate = transactionsRangeEnd || startDate;
  const reference = transactionsReferenceSearch ? transactionsReferenceSearch.value.trim() : "";
  const paymentMethod = transactionsPaymentFilter ? transactionsPaymentFilter.value.trim() : "";
  if (startDate > endDate) {
    if (transactionsError) transactionsError.textContent = "Start date must be on or before end date.";
    return;
  }
  const params = new URLSearchParams();
  params.set("startDate", startDate);
  params.set("endDate", endDate);
  if (reference) params.set("reference", reference);
  if (paymentMethod) params.set("paymentMethod", paymentMethod);
  params.set("status", "all");
  const path = `/api/transactions?${params.toString()}`;
  const payload = await api(path);
  let rows = Array.isArray(payload.transactions) ? payload.transactions : [];
  if (reference) {
    const needle = reference.toLowerCase();
    rows = rows.filter((tx) => String(tx.referenceNumber || "").toLowerCase().includes(needle));
  }
  if (paymentMethod) {
    const paymentNeedle = paymentMethod.toLowerCase();
    rows = rows.filter((tx) => String(tx.payment || "").trim().toLowerCase() === paymentNeedle);
  }
  renderTransactionsTable(rows);
  setLastUpdatedLabel(transactionsLastUpdated);
}

async function openTransactionsDialog() {
  if (!transactionsDialog) return;
  if (transactionsPageSize) {
    const next = Number(transactionsPageSize.value || 10);
    transactionsPageSizeValue = Number.isFinite(next) && next > 0 ? Math.min(100, Math.floor(next)) : 10;
  }
  transactionsPage = 1;
  transactionsSelectedIds = {};
  transactionsSelectMode = false;
  setTransactionsDateDefaults();
  await refreshTransactions();
  transactionsDialog.showModal();
}

async function logCashMovement(type) {
  if (!state.currentStaff?.id) return;
  const BACK = "__cash_type_back__";
  let movementType = type;

  while (movementType) {
    const title = movementType === "in" ? "Cash In" : "Cash Out";
    const amountInput = await askNameEdit(title, "Amount", "", {
      type: "number",
      inputMode: "decimal",
      min: "0.01",
      step: "0.01",
      placeholder: "0.00",
      cancelLabel: "Back",
      cancelValue: BACK,
      saveLabel: "Save"
    });
    if (amountInput === BACK) {
      movementType = await askCashMovementChoice();
      continue;
    }
    if (amountInput === null) return;

    const amount = Number(String(amountInput || "").trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Amount must be a positive number.");
      continue;
    }

    const noteInput = await askNameEdit(title, "Note (optional)", "", {
      type: "text",
      placeholder: "e.g. Opening fund"
    });
    if (noteInput === null) return;
    const note = String(noteInput || "").trim();

    await api("/api/cash-movements", {
      method: "POST",
      body: JSON.stringify({
        staffId: state.currentStaff.id,
        type: movementType,
        amount,
        note
      })
    });

    showToast(`${title} saved.`);
    return;
  }
}

function renderServices() {
  const allServices = state.services;
  const selectedCategory = serviceCategoryFilter.value;
  const selectedSubcategory = serviceSubcategoryFilter.value;
  const selectedSubsubcategory = serviceSubsubcategoryFilter.value;

  const categories = uniqueSorted((state.taxonomy.categories || []).concat(allServices.map((s) => normalizeCategory(s.category))).map((c) => normalizeCategory(c)))
    .filter(isVisibleCategory)
    .filter((c) => isCategoryEnabled(c));
  serviceCategoryFilter.innerHTML = [
    `<option value="">Select category</option>`,
    ...categories.map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`)
  ].join("");
  if (categories.includes(selectedCategory)) {
    serviceCategoryFilter.value = selectedCategory;
  }

  const subcategories = selectedCategory
    ? sortSubcategoriesForCategory(
      selectedCategory,
      ((state.taxonomy.subcategories && state.taxonomy.subcategories[selectedCategory]) || []).concat(
        allServices
          .filter((s) => normalizeCategory(s.category) === selectedCategory)
          .map((s) => normalizedSubcategoryFor(selectedCategory, s.subcategory, s.name))
      )
    )
    : [];
  const visibleSubcategories = selectedCategory
    ? subcategories.filter((s) => isSubcategoryEnabled(selectedCategory, s))
    : [];
  serviceSubcategoryFilter.disabled = !selectedCategory;
  serviceSubcategoryFilter.innerHTML = [
    `<option value="">Select subcategory</option>`,
    ...visibleSubcategories.map((s) => `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`)
  ].join("");
  if (visibleSubcategories.includes(selectedSubcategory)) {
    serviceSubcategoryFilter.value = selectedSubcategory;
  }

  const currentCategory = serviceCategoryFilter.value;
  const currentSubcategory = serviceSubcategoryFilter.value;
  const subSubKey = taxonomySubKey(currentCategory, currentSubcategory);
  const subSubcategories = (currentCategory && currentSubcategory)
    ? uniqueSorted(
      ((state.taxonomy.subSubcategories && state.taxonomy.subSubcategories[subSubKey]) || []).concat(
        allServices
          .filter((s) => normalizeCategory(s.category) === currentCategory)
          .filter((s) => normalizedSubcategoryFor(currentCategory, s.subcategory, s.name) === currentSubcategory)
          .map((s) => normalizedSubsubcategoryFor(currentCategory, s.subcategory, s.subSubcategory, s.name))
          .filter(Boolean)
      )
    )
    : [];
  serviceSubsubcategoryFilter.disabled = !currentCategory || !currentSubcategory;
  serviceSubsubcategoryFilter.innerHTML = [
    `<option value="">Select child subcategory</option>`,
    ...subSubcategories.map((s) => `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`)
  ].join("");
  if (subSubcategories.includes(selectedSubsubcategory)) {
    serviceSubsubcategoryFilter.value = selectedSubsubcategory;
  }

  const currentSubsubcategory = serviceSubsubcategoryFilter.value;
  const crumbs = [];
  if (currentCategory) {
    crumbs.push(`<button type="button" class="crumb" data-service-step="category">${escapeHtml(currentCategory)}</button>`);
  }
  if (currentSubcategory) {
    crumbs.push(`<button type="button" class="crumb" data-service-step="subcategory">${escapeHtml(currentSubcategory)}</button>`);
  }
  if (currentSubsubcategory) {
    crumbs.push(`<button type="button" class="crumb active" data-service-step="subsubcategory">${escapeHtml(currentSubsubcategory)}</button>`);
  } else if (crumbs.length > 0) {
    crumbs[crumbs.length - 1] = crumbs[crumbs.length - 1].replace('class="crumb"', 'class="crumb active"');
  }
  serviceBreadcrumb.innerHTML = crumbs.join(`<span class="crumb-sep">/</span>`);

  if (servicesBackBtn) {
    servicesBackBtn.disabled = !currentCategory && !currentSubcategory && !currentSubsubcategory;
  }

  serviceCategoryList.innerHTML = categories.length === 0
    ? `<p class="admin-empty">No categories available.</p>`
    : categories.map((c) => (
      `<div class="list-item ${c === currentCategory ? "active" : ""}">
        <button type="button" class="list-chip" data-service-cat="${escapeAttr(c)}">${escapeHtml(c)}</button>
      </div>`
    )).join("");

  const isCategoryStep = !currentCategory;
  const isSubcategoryStep = !!currentCategory && !currentSubcategory;
  const needsSubsubcategory = !!currentCategory && !!currentSubcategory && subSubcategories.length > 0;
  const isSubsubcategoryStep = needsSubsubcategory && !currentSubsubcategory;
  const isServicesStep = !!currentCategory && !!currentSubcategory && (!needsSubsubcategory || !!currentSubsubcategory);

  const serviceCategoryBox = document.getElementById("service-category-box");
  serviceCategoryBox.classList.toggle("hidden", !isCategoryStep);
  serviceSubcategoryBox.classList.toggle("hidden", !isSubcategoryStep);
  serviceSubsubcategoryBox.classList.toggle("hidden", !isSubsubcategoryStep);

  serviceSubcategoryList.innerHTML = !currentCategory
    ? ""
    : visibleSubcategories.length === 0
      ? `<p class="admin-empty">No subcategories available.</p>`
      : visibleSubcategories.map((s) => (
        `<div class="list-item ${s === currentSubcategory ? "active" : ""}">
          <button type="button" class="list-chip" data-service-sub="${escapeAttr(s)}">${escapeHtml(s)}</button>
        </div>`
      )).join("");

  serviceSubsubcategoryList.innerHTML = !currentCategory || !currentSubcategory
    ? ""
    : subSubcategories.length === 0
      ? `<p class="admin-empty">No child subcategories available.</p>`
      : subSubcategories.map((s) => (
        `<div class="list-item ${s === currentSubsubcategory ? "active" : ""}">
          <button type="button" class="list-chip" data-service-subsub="${escapeAttr(s)}">${escapeHtml(s)}</button>
        </div>`
      )).join("");

  if (isServicesStep) {
    serviceCategoryBox.classList.add("hidden");
    serviceSubcategoryBox.classList.add("hidden");
    serviceSubsubcategoryBox.classList.add("hidden");
  }

  if (!serviceCategoryFilter.value) {
    serviceChips.innerHTML = "";
    return;
  }
  if (!serviceSubcategoryFilter.value) {
    serviceChips.innerHTML = "";
    return;
  }
  if (subSubcategories.length > 0 && !serviceSubsubcategoryFilter.value) {
    serviceChips.innerHTML = "";
    return;
  }

  const filtered = allServices.filter((s) => {
    const sub = normalizedSubcategoryFor(s.category, s.subcategory, s.name);
    const subSub = normalizedSubsubcategoryFor(s.category, s.subcategory, s.subSubcategory, s.name);
    const requiresSubSub = subSubcategories.length > 0;
    if (requiresSubSub) {
      return normalizeCategory(s.category) === serviceCategoryFilter.value
        && sub === serviceSubcategoryFilter.value
        && subSub === serviceSubsubcategoryFilter.value;
    }
    return normalizeCategory(s.category) === serviceCategoryFilter.value && sub === serviceSubcategoryFilter.value;
  });

  if (filtered.length === 0) {
    serviceChips.innerHTML = `<p class="service-empty">No offers in this selection.</p>`;
    return;
  }

  serviceChips.innerHTML = filtered
    .map((s) => {
      const linkedCount = Number(state.inventory.serviceLinks?.[String(s.id)] || 0);
      return `<button class="service-btn ${s.active ? "" : "inactive"}" data-id="${s.id}" ${s.active ? "" : "disabled"}>
        <span class="service-btn-name">${escapeHtml(s.name)}</span>
        ${linkedCount > 0 ? `<span class="service-btn-link">Linked: ${linkedCount}</span>` : ""}
        ${getServicePriceMode(s) === "ask" ? "" : `<span class="service-btn-price">${peso.format(s.price)}</span>`}
      </button>`;
    })
    .join("");
}

function renderCart() {
  if (state.cart.length === 0) {
    saleBody.innerHTML = `<tr><td colspan="5" class="muted-cell">No items in cart.</td></tr>`;
    saleTotalQty.textContent = "0 item(s)";
    saleTotalAmount.textContent = "PHP 0.00";
    grandTotal.textContent = "PHP 0.00";
    grandQty.textContent = "0 item(s)";
    totalChange.textContent = "PHP 0.00";
    completeSaleBtn.disabled = false;
    return;
  }
  saleBody.innerHTML = state.cart
    .map((item) => (
      `<tr>
        <td>${escapeHtml(item.name)}</td>
        <td class="num-col">${item.qty}</td>
        <td class="num-col">${peso.format(item.price)}</td>
        <td class="num-col">${peso.format(item.qty * item.price)}</td>
        <td class="action-col">
          <button type="button" class="btn ghost small delete-line icon-btn" data-id="${item.lineKey || item.id}" aria-label="Delete item" title="Delete item" ${state.saleLocked ? "disabled" : ""}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
              <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Z" fill="currentColor"></path>
            </svg>
          </button>
        </td>
      </tr>`
    ))
    .join("");
  const count = state.cart.reduce((n, i) => n + i.qty, 0);
  saleTotalQty.textContent = `${count} item(s)`;
  saleTotalAmount.textContent = peso.format(cartTotal());
  grandQty.textContent = `${count} item(s)`;
  grandTotal.textContent = peso.format(cartTotal());
  if (["gcash", "bank"].includes(state.payment) && paymentReference.value.trim()) {
    cashReceived.value = cartTotal().toFixed(2);
  }
  updateTotalChange();
  completeSaleBtn.disabled = state.saleLocked;
}

async function addToCart(serviceId) {
  if (state.saleLocked) return;
  const s = state.services.find((x) => x.id === serviceId && x.active);
  if (!s) return;
  let unitPrice = Number(s.price);
  if (getServicePriceMode(s) === "ask") {
    const picked = await askServiceAmount(s.name, unitPrice);
    if (picked === null) return;
    const parsed = Number(picked);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    unitPrice = parsed;
  }
  const lineKey = getServicePriceMode(s) === "ask"
    ? `${s.id}@${unitPrice.toFixed(2)}`
    : s.id;
  const existing = state.cart.find((x) => (x.lineKey || x.id) === lineKey);
  if (existing) existing.qty += 1;
  else state.cart.push({ lineKey, id: s.id, name: s.name, price: unitPrice, qty: 1 });
  renderCart();
}

function deleteCartItem(lineKey) {
  if (state.saleLocked) return;
  state.cart = state.cart.filter((item) => (item.lineKey || item.id) !== lineKey);
  renderCart();
}

function setPayment(method) {
  state.payment = method;
  paymentMethods.value = method;
  paymentOptions.forEach((btn) => btn.classList.toggle("active", btn.dataset.paymentOption === method));
  referenceBlock.classList.toggle("hidden", !["gcash", "bank"].includes(method));
  if (!["gcash", "bank"].includes(method)) paymentReference.value = "";
  if (["gcash", "bank"].includes(method) && paymentReference.value.trim()) {
    cashReceived.value = cartTotal().toFixed(2);
  }
  updateTotalChange();
}

function openCheckoutPopup() {
  checkoutPane.classList.remove("hidden");
  checkoutOverlay.classList.remove("hidden");
}

function closeCheckoutPopup() {
  checkoutPane.classList.add("hidden");
  checkoutOverlay.classList.add("hidden");
}

function updateTotalChange() {
  const total = cartTotal();
  const received = Number(cashReceived.value || 0);
  const change = received - total;
  totalChange.textContent = peso.format(change);
  updateCashReceivedState();
}

function updateCashReceivedState() {
  const raw = cashReceived.value.trim();
  cashReceived.classList.remove("cash-insufficient", "cash-exact", "cash-over");
  if (!raw) return;

  const total = cartTotal();
  const received = Number(raw);
  if (!Number.isFinite(received)) return;

  const diff = received - total;
  if (diff < -0.0001) {
    cashReceived.classList.add("cash-insufficient");
    return;
  }
  if (Math.abs(diff) <= 0.0001) {
    cashReceived.classList.add("cash-exact");
    return;
  }
  cashReceived.classList.add("cash-over");
}

function maybeAutofillReceivedFromReference() {
  if (!["gcash", "bank"].includes(state.payment)) return;
  if (paymentReference.value.trim()) cashReceived.value = cartTotal().toFixed(2);
  updateTotalChange();
}

function askSaleConfirmation() {
  return new Promise((resolve) => {
    confirmSaleResolver = resolve;
    confirmSaleText.textContent = `Proceed with sale total of ${peso.format(cartTotal())}?`;
    confirmSaleDialog.showModal();
  });
}

function resolveSaleConfirmation(value) {
  if (confirmSaleResolver) confirmSaleResolver(value);
  confirmSaleResolver = null;
  if (confirmSaleDialog.open) confirmSaleDialog.close();
}

function showSaleCompletePopup() {
  saleResultText.textContent = "Sale completed. Review the last transaction, then click New Sale for the next one.";
  saleResultDialog.showModal();
}

function askNameEdit(title, label, initialValue, options = {}) {
  return new Promise((resolve) => {
    nameEditResolver = resolve;
    nameEditCancelValue = Object.prototype.hasOwnProperty.call(options, "cancelValue") ? options.cancelValue : null;
    nameEditTitle.textContent = title;
    nameEditLabel.textContent = label;
    nameEditInput.value = initialValue || "";
    if (nameEditCancel) nameEditCancel.textContent = options.cancelLabel || "Cancel";
    if (nameEditSave) nameEditSave.textContent = options.saveLabel || "Save";
    nameEditInput.type = options.type || "text";
    nameEditInput.placeholder = options.placeholder || "Enter value";
    nameEditInput.inputMode = options.inputMode || "";
    if (options.step !== undefined) {
      nameEditInput.step = String(options.step);
    } else {
      nameEditInput.removeAttribute("step");
    }
    if (options.min !== undefined) {
      nameEditInput.min = String(options.min);
    } else {
      nameEditInput.removeAttribute("min");
    }
    nameEditDialog.showModal();
    nameEditInput.focus();
    nameEditInput.select();
  });
}

function resolveNameEdit(value) {
  if (nameEditResolver) nameEditResolver(value);
  nameEditResolver = null;
  nameEditCancelValue = null;
  nameEditInput.type = "text";
  nameEditInput.placeholder = "Enter value";
  nameEditInput.inputMode = "";
  nameEditInput.removeAttribute("step");
  nameEditInput.removeAttribute("min");
  if (nameEditCancel) nameEditCancel.textContent = "Cancel";
  if (nameEditSave) nameEditSave.textContent = "Save";
  if (nameEditDialog.open) nameEditDialog.close();
}

function askActionConfirm(title, text) {
  return new Promise((resolve) => {
    confirmActionResolver = resolve;
    confirmActionTitle.textContent = title;
    confirmActionText.textContent = text;
    confirmActionDialog.showModal();
  });
}

function resolveActionConfirm(value) {
  if (confirmActionResolver) confirmActionResolver(value);
  confirmActionResolver = null;
  if (confirmActionDialog.open) confirmActionDialog.close();
}

function askToggleMode() {
  return new Promise((resolve) => {
    toggleModeResolver = resolve;
    if (toggleModeDialog) toggleModeDialog.showModal();
  });
}

function resolveToggleMode(value) {
  if (toggleModeResolver) toggleModeResolver(value);
  toggleModeResolver = null;
  if (toggleModeDialog?.open) toggleModeDialog.close();
}

function askCashMovementChoice() {
  return new Promise((resolve) => {
    cashMovementResolver = resolve;
    if (cashMovementDialog) cashMovementDialog.showModal();
  });
}

function resolveCashMovementChoice(value) {
  if (cashMovementResolver) cashMovementResolver(value);
  cashMovementResolver = null;
  if (cashMovementDialog?.open) cashMovementDialog.close();
}

function askServiceEdit(name, price, title = "Edit Service", priceMode = "fixed") {
  return new Promise((resolve) => {
    serviceEditResolver = resolve;
    if (serviceEditTitle) serviceEditTitle.textContent = title;
    serviceEditName.value = name || "";
    serviceEditPrice.value = Number.isFinite(Number(price)) ? String(price) : "";
    if (serviceEditPriceMode) serviceEditPriceMode.value = priceMode === "ask" ? "ask" : "fixed";
    syncServiceEditPriceVisibility();
    serviceEditDialog.showModal();
    if (serviceEditPriceMode && serviceEditPriceMode.value === "ask") {
      serviceEditPrice.blur();
    }
    serviceEditName.focus();
    serviceEditName.select();
  });
}

function syncServiceEditPriceVisibility() {
  if (!serviceEditPriceMode || !serviceEditPrice) return;
  const isManual = serviceEditPriceMode.value === "ask";
  if (serviceEditPriceLabel) serviceEditPriceLabel.classList.toggle("hidden", isManual);
  serviceEditPrice.classList.toggle("hidden", isManual);
  if (isManual && (!serviceEditPrice.value || Number(serviceEditPrice.value) <= 0)) {
    serviceEditPrice.value = "1";
  }
}

function askServiceAmount(name, defaultPrice) {
  return new Promise((resolve) => {
    serviceAmountResolver = resolve;
    if (serviceAmountName) serviceAmountName.textContent = name || "Service";
    if (serviceAmountInput) {
      serviceAmountInput.value = Number.isFinite(Number(defaultPrice)) ? String(defaultPrice) : "";
    }
    serviceAmountDialog.showModal();
    serviceAmountInput.focus();
    serviceAmountInput.select();
  });
}

function resolveServiceAmount(value) {
  if (serviceAmountResolver) serviceAmountResolver(value);
  serviceAmountResolver = null;
  if (serviceAmountDialog.open) serviceAmountDialog.close();
}

function resolveServiceEdit(value) {
  if (serviceEditResolver) serviceEditResolver(value);
  serviceEditResolver = null;
  if (serviceEditDialog.open) serviceEditDialog.close();
}

function askSubcategoryTransfer(fromCategory, fromSubcategory) {
  return new Promise((resolve) => {
    subcategoryTransferResolver = resolve;
    const categories = state.taxonomy.categories || [];
    subcategoryTransferCategory.innerHTML = categories
      .map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`)
      .join("");
    const fallback = categories.find((c) => c !== fromCategory) || fromCategory || "";
    subcategoryTransferCategory.value = fallback;
    subcategoryTransferName.value = fromSubcategory || "";
    subcategoryTransferDialog.showModal();
    subcategoryTransferName.focus();
    subcategoryTransferName.select();
  });
}

function resolveSubcategoryTransfer(value) {
  if (subcategoryTransferResolver) subcategoryTransferResolver(value);
  subcategoryTransferResolver = null;
  if (subcategoryTransferDialog.open) subcategoryTransferDialog.close();
}

function syncServiceTransferSubcategories() {
  const category = serviceTransferCategory.value;
  const list = category ? (state.taxonomy.subcategories?.[category] || []) : [];
  serviceTransferSubcategory.innerHTML = list.map((s) => `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`).join("");
  if (!list.includes(serviceTransferSubcategory.value)) {
    serviceTransferSubcategory.value = list[0] || "";
  }
}

function askServiceTransfer(currentCategory, currentSubcategory) {
  return new Promise((resolve) => {
    serviceTransferResolver = resolve;
    const categories = state.taxonomy.categories || [];
    serviceTransferCategory.innerHTML = categories
      .map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`)
      .join("");
    serviceTransferCategory.value = currentCategory || categories[0] || "";
    syncServiceTransferSubcategories();
    if (currentSubcategory && (state.taxonomy.subcategories?.[serviceTransferCategory.value] || []).includes(currentSubcategory)) {
      serviceTransferSubcategory.value = currentSubcategory;
    }
    serviceTransferDialog.showModal();
  });
}

function resolveServiceTransfer(value) {
  if (serviceTransferResolver) serviceTransferResolver(value);
  serviceTransferResolver = null;
  if (serviceTransferDialog.open) serviceTransferDialog.close();
}

async function refreshServices() {
  const payload = await api("/api/services");
  state.services = Array.isArray(payload.services) ? payload.services : [];
  state.services = state.services.filter((s) => !state.deletedServiceIds[String(s.id || "")]);
  state.services = state.services.map((s) => {
    const mode = getServicePriceMode(s);
    return { ...s, priceMode: mode };
  });
  state.taxonomy = mergedTaxonomyLocal(state.services, payload.taxonomy || {});
  renderServices();
  renderTaxonomyManagers();
  await refreshInventoryLinkSummary();
}

async function ensurePrintCatalogFromClient() {
  if (printCatalogSynced) return;
  if (!state.currentStaff?.id) return;

  const printCatalog = [
    ["Document/Text Only", "Black & White", "Short", 3, "fixed"],
    ["Document/Text Only", "Black & White", "A4", 4, "fixed"],
    ["Document/Text Only", "Black & White", "Long", 5, "fixed"],
    ["Document/Text Only", "Colored", "Short", 5, "fixed"],
    ["Document/Text Only", "Colored", "A4", 6, "fixed"],
    ["Document/Text Only", "Colored", "Long", 10, "fixed"],
    ["Text With Picture", "Black & White", "Short", 5, "fixed"],
    ["Text With Picture", "Black & White", "A4", 6, "fixed"],
    ["Text With Picture", "Black & White", "Long", 7, "fixed"],
    ["Text With Picture", "Colored", "Short (Range 7-15)", 7, "ask"],
    ["Text With Picture", "Colored", "A4 (Range 10-20)", 10, "ask"],
    ["Text With Picture", "Colored", "Long (Range 15-25)", 15, "ask"],
    ["Picture/Image Only", "Black & White", "Short", 10, "fixed"],
    ["Picture/Image Only", "Black & White", "A4", 15, "fixed"],
    ["Picture/Image Only", "Black & White", "Long", 20, "fixed"],
    ["Picture/Image Only", "Partially Colored", "Short", 15, "fixed"],
    ["Picture/Image Only", "Partially Colored", "A4", 20, "fixed"],
    ["Picture/Image Only", "Partially Colored", "Long", 25, "fixed"],
    ["Picture/Image Only", "Full Colored", "Short", 20, "fixed"],
    ["Picture/Image Only", "Full Colored", "A4", 25, "fixed"],
    ["Picture/Image Only", "Full Colored", "Long", 30, "fixed"],
    ["Photocopy", "Black & White", "Short", 3, "fixed"],
    ["Photocopy", "Black & White", "A4", 4, "fixed"],
    ["Photocopy", "Black & White", "Long", 5, "fixed"],
    ["Photocopy", "Black & White", "B2B Add-on", 2, "fixed"],
    ["Photocopy", "Partially Colored", "Short", 5, "fixed"],
    ["Photocopy", "Partially Colored", "A4", 6, "fixed"],
    ["Photocopy", "Partially Colored", "Long", 7, "fixed"],
    ["Photocopy", "Partially Colored", "B2B Add-on", 3, "fixed"],
    ["Photocopy", "Full Colored", "Short", 8, "fixed"],
    ["Photocopy", "Full Colored", "A4", 9, "fixed"],
    ["Photocopy", "Full Colored", "Long", 10, "fixed"],
    ["Photocopy", "Full Colored", "B2B Add-on", 5, "fixed"],
    ["Rush ID Picture", "Singles", "1x1 (8 pcs)", 30, "fixed"],
    ["Rush ID Picture", "Singles", "2x2 (6 pcs)", 40, "fixed"],
    ["Rush ID Picture", "Singles", "Passport Size (4 pcs)", 30, "fixed"],
    ["Rush ID Picture", "Packages", "Package 1", 40, "fixed"],
    ["Rush ID Picture", "Packages", "Package 2", 50, "fixed"],
    ["Rush ID Picture", "Packages", "Package 3", 60, "fixed"],
    ["Photo Printing", "Sizes", "Wallet/2r (2.5 x 3.5)", 7, "fixed"],
    ["Photo Printing", "Sizes", "3r (3.5 x 5)", 10, "fixed"],
    ["Photo Printing", "Sizes", "4r (4 x 6)", 15, "fixed"],
    ["Photo Printing", "Sizes", "5r (5 x 7)", 20, "fixed"],
    ["Photo Printing", "Sizes", "8r (8 x 10)", 40, "fixed"],
    ["Photo Printing", "Sizes", "A4 (8.3 x 11.7)", 50, "fixed"],
    ["Scan", "General", "Up to A4 size (per page)", 10, "fixed"],
    ["Sticker", "General", "A4 Sticker", 50, "fixed"],
    ["Sticker", "General", "Cold Laminate Add-on", 10, "fixed"],
    ["Laminate", "General", "ID Size", 20, "fixed"],
    ["Laminate", "General", "3r", 30, "fixed"],
    ["Laminate", "General", "4r", 35, "fixed"],
    ["Laminate", "General", "5r", 40, "fixed"],
    ["Laminate", "General", "A4", 50, "fixed"],
    ["Other Services", "Customized Items", "Tracing Pads", 10, "ask"],
    ["Other Services", "Customized Items", "Cursive Pad", 10, "ask"],
    ["Other Services", "Customized Items", "Notepads", 10, "ask"],
    ["Other Services", "Invitations", "Wedding Invitation", 10, "ask"],
    ["Other Services", "Invitations", "Baptismal Invitation", 10, "ask"],
    ["Other Services", "Invitations", "Birthday Invitation", 10, "ask"],
    ["Other Services", "General", "Calling Card", 10, "ask"],
    ["Other Services", "General", "Sticker (Custom)", 10, "ask"],
    ["Other Services", "General", "Mini Calendar / Desk Calendar", 10, "ask"],
    ["Other Services", "General", "Resume", 10, "ask"],
    ["Other Services", "General", "Typing Jobs", 10, "ask"],
    ["Other Services", "General", "Tarpaulin & Flyers Layout", 10, "ask"],
    ["Other Services", "General", "Research / Editing", 10, "ask"]
  ];

  const keyOf = (name, sub, subsub) => `${String(name || "").trim().toLowerCase()}|${String(sub || "").trim().toLowerCase()}|${String(subsub || "").trim().toLowerCase()}`;
  const existing = new Set(
    state.services
      .filter((s) => normalizeCategory(s.category) === "Print")
      .map((s) => keyOf(s.name, s.subcategory, s.subSubcategory))
  );

  const missing = printCatalog.filter(([sub, subsub, name]) => !existing.has(keyOf(name, sub, subsub)));
  if (missing.length === 0) {
    printCatalogSynced = true;
    return;
  }

  for (const [sub, subsub, name, price, mode] of missing) {
    try {
      await api("/api/services", {
        method: "POST",
        body: JSON.stringify({
          name,
          category: "Print",
          subcategory: sub,
          subSubcategory: subsub,
          price,
          priceMode: mode,
          changedByStaffId: state.currentStaff.id
        })
      });
    } catch {
      // Skip duplicates or validation mismatches from older API variants.
    }
  }

  await refreshServices();
  printCatalogSynced = true;
}

async function completeSale() {
  checkoutError.textContent = "";
  if (state.saleLocked) {
    checkoutError.textContent = "Last sale is retained for review. Click New Sale to start next transaction.";
    return;
  }
  const total = cartTotal();
  if (total <= 0) {
    checkoutError.textContent = "Add items before completing sale.";
    return;
  }

  try {
    let received = null;
    if (state.payment === "cash") {
      received = Number(cashReceived.value || 0);
      if (!Number.isFinite(received) || received < total) {
        checkoutError.textContent = "Cash received is not enough.";
        return;
      }
    }
    if (["gcash", "bank"].includes(state.payment) && !paymentReference.value.trim()) {
      checkoutError.textContent = "Reference number is required for this payment method.";
      return;
    }

    const confirmed = await askSaleConfirmation();
    if (!confirmed) return;

    const payload = await api("/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        staffId: state.currentStaff.id,
        paymentMethod: paymentLabel(state.payment),
        referenceNumber: paymentReference.value.trim(),
        items: state.cart.map((i) => ({
          id: i.id,
          name: i.name,
          qty: i.qty,
          price: i.price,
          inventoryProductId: Array.isArray(state.inventory.serviceProductMap?.[String(i.id)])
            ? state.inventory.serviceProductMap[String(i.id)][0] || null
            : null
        })),
        customer: {
          name: "",
          phone: ""
        },
        cashReceived: received
      })
    });

    state.lastTransaction = payload.transaction || null;
    state.saleLocked = true;
    renderCart();
    await refreshSummary();
    closeCheckoutPopup();
    showSaleCompletePopup();
  } catch (error) {
    checkoutError.textContent = error.message;
  }
}

function renderServiceAdmin() {
  servicesAdminError.textContent = "";
  populateAdminFilters();
  renderTaxonomyManagers();
  renderAdminActionState();
  servicesAdminList.classList.add("services-boxes");
  servicesAdminList.classList.toggle("select-mode", adminStep === 4 && manageSelectMode);
  const setBulkState = (disabled, label = "Enable All") => {
    if (!servicesAdminToggleAllBtn) return;
    servicesAdminToggleAllBtn.disabled = disabled;
    servicesAdminToggleAllBtn.textContent = label;
    servicesAdminToggleAllBtn.dataset.nextActive = label === "Disable All" ? "false" : "true";
  };
  const category = adminFilterCategory.value;
  const subcategory = adminFilterSubcategory.value;
  const subsubcategory = adminFilterSubsubcategory.value;
  if (servicesAdminBackBtn) {
    servicesAdminBackBtn.disabled = !category && !subcategory && !subsubcategory;
  }

  if (!category) {
    setBulkState(true, "Enable All");
    servicesAdminList.innerHTML = `<p class="admin-empty">Select a category first.</p>`;
    updateSelectedCount();
    return;
  }

  if (!subcategory) {
    setBulkState(true, "Enable All");
    servicesAdminList.innerHTML = `<p class="admin-empty">Select a subcategory to load services.</p>`;
    updateSelectedCount();
    return;
  }

  const subSubKey = taxonomySubKey(category, subcategory);
  const availableSubSub = state.taxonomy.subSubcategories?.[subSubKey] || [];
  if (availableSubSub.length > 0 && !subsubcategory) {
    setBulkState(true, "Enable All");
    servicesAdminList.innerHTML = `<p class="admin-empty">Select a child subcategory to load services.</p>`;
    updateSelectedCount();
    return;
  }

  const filtered = state.services.filter((s) => {
    const rowCategory = normalizeCategory(s.category);
    const rowSub = normalizedSubcategoryFor(s.category, s.subcategory, s.name);
    const rowSubSub = normalizedSubsubcategoryFor(s.category, s.subcategory, s.subSubcategory, s.name);
    if (availableSubSub.length > 0) {
      return rowCategory === category && rowSub === subcategory && rowSubSub === subsubcategory;
    }
    return rowCategory === category && rowSub === subcategory;
  });

  if (filtered.length === 0) {
    setBulkState(true, "Enable All");
    selectedManageServiceIds = {};
    servicesAdminList.innerHTML = `<p class="admin-empty">No services found for this selection.</p>`;
    updateSelectedCount();
    return;
  }
  servicesAdminList.classList.toggle("select-mode", adminStep === 4 && manageSelectMode);
  const allActive = filtered.every((s) => Boolean(s.active));
  setBulkState(false, allActive ? "Disable All" : "Enable All");

  const serviceItems = filtered
    .map((s) => {
      const linkedCount = Number(state.inventory.serviceLinks?.[String(s.id)] || 0);
      return (
      `<div class="list-item service-list-item draggable-item ${s.active ? "" : "inactive"} ${String(selectedManageServiceId) === String(s.id) ? "active" : ""} ${selectedManageServiceIds[String(s.id)] ? "selected" : ""}" data-id="${s.id}" data-category="${escapeAttr(s.category)}" data-subcategory="${escapeAttr(s.subcategory || "")}" data-subsubcategory="${escapeAttr(s.subSubcategory || "")}" data-name="${escapeAttr(s.name)}" data-price="${s.price}" data-price-mode="${escapeAttr(getServicePriceMode(s))}" draggable="true">
        <span class="service-select-wrap">
          <input class="service-select-checkbox" type="checkbox" data-service-select-id="${s.id}" ${selectedManageServiceIds[String(s.id)] ? "checked" : ""} aria-label="Select ${escapeAttr(s.name)}">
        </span>
        <button type="button" class="list-chip service-chip" data-service-id="${s.id}">
          <span class="service-chip-name">${escapeHtml(s.name)}</span>
          ${getServicePriceMode(s) === "ask" ? "" : `<span class="service-chip-meta">${peso.format(s.price)}</span>`}
          ${linkedCount > 0 ? `<span class="inventory-service-link-badge">${linkedCount} linked</span>` : ""}
        </button>
      </div>`
    );
    })
    .join("");
  servicesAdminList.innerHTML = serviceItems;
  updateSelectedCount();
}

function getCurrentManagedServices() {
  const category = adminFilterCategory.value;
  const subcategory = adminFilterSubcategory.value;
  const subsubcategory = adminFilterSubsubcategory.value;
  if (!category || !subcategory) return [];
  const subSubKey = taxonomySubKey(category, subcategory);
  const availableSubSub = state.taxonomy.subSubcategories?.[subSubKey] || [];
  return state.services.filter((s) => {
    const rowCategory = normalizeCategory(s.category);
    const rowSub = normalizedSubcategoryFor(s.category, s.subcategory, s.name);
    const rowSubSub = normalizedSubsubcategoryFor(s.category, s.subcategory, s.subSubcategory, s.name);
    if (availableSubSub.length > 0) return rowCategory === category && rowSub === subcategory && rowSubSub === subsubcategory;
    return rowCategory === category && rowSub === subcategory;
  });
}

async function setAllServicesActive(nextActive) {
  servicesAdminError.textContent = "";
  const scopedServices = getCurrentManagedServices();
  const ids = scopedServices.map((s) => String(s.id || "")).filter(Boolean);
  if (ids.length === 0) {
    servicesAdminError.textContent = "No services found for this selection.";
    return;
  }
  try {
    await api("/api/services/toggle-active-bulk", {
      method: "PATCH",
      body: JSON.stringify({
        ids,
        active: Boolean(nextActive),
        changedByStaffId: state.currentStaff?.id || "system"
      })
    });
  } catch (error) {
    const failed = [];
    for (const id of ids) {
      try {
        await api(`/api/services/${encodeURIComponent(id)}/toggle-active`, {
          method: "PATCH",
          body: JSON.stringify({
            active: Boolean(nextActive),
            changedByStaffId: state.currentStaff?.id || "system"
          })
        });
      } catch (inner) {
        if (!String(inner.message || "").toLowerCase().includes("service not found")) {
          failed.push(inner);
        }
      }
    }
    if (failed.length > 0) {
      throw failed[0];
    }
  }
  await refreshServices();
  renderServiceAdmin();
}

function setAllCategoriesEnabled(nextEnabled) {
  const categories = (state.taxonomy.categories || []).filter(isVisibleCategory);
  for (const category of categories) {
    setCategoryEnabled(category, nextEnabled);
  }
  renderServices();
  renderServiceAdmin();
}

function setAllSubcategoriesEnabled(category, nextEnabled) {
  if (!category) return;
  const subs = state.taxonomy.subcategories?.[category] || [];
  for (const sub of subs) {
    setSubcategoryEnabled(category, sub, nextEnabled);
  }
  renderServices();
  renderServiceAdmin();
}

async function editServiceFromBox(row) {
  const id = row.dataset.id || "";
  const category = (row.dataset.category || "").trim();
  const subcategory = (row.dataset.subcategory || "").trim();
  const subsubcategory = (row.dataset.subsubcategory || "").trim();
  const currentName = (row.dataset.name || "").trim();
  const currentPrice = Number(row.dataset.price || 0);
  const currentPriceMode = String(row.dataset.priceMode || "fixed").trim();
  if (!id || !category) return;

  const edited = await askServiceEdit(currentName, currentPrice, "Edit Service", currentPriceMode);
  if (!edited) return;
  const nextName = String(edited.name || "").trim();
  const nextPriceMode = String(edited.priceMode || "fixed").trim() === "ask" ? "ask" : "fixed";
  const nextPriceRaw = Number(edited.price);
  const nextPrice = (nextPriceMode === "ask" && (!Number.isFinite(nextPriceRaw) || nextPriceRaw <= 0))
    ? (Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : 1)
    : nextPriceRaw;
  if (!nextName) return;
  if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
    servicesAdminError.textContent = "Price must be a positive number.";
    return;
  }

  await api(`/api/services/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      category,
      subcategory,
      subSubcategory: subsubcategory,
      name: nextName.trim(),
      price: nextPrice,
      priceMode: nextPriceMode,
      changedByStaffId: state.currentStaff?.id || "system"
    })
  });
  setPriceModeOverride(id, nextPriceMode);
}

async function addServiceFromBox() {
  servicesAdminError.textContent = "";
  const category = String(adminFilterCategory.value || "").trim();
  const subcategory = String(adminFilterSubcategory.value || "").trim();
  const subsubcategory = String(adminFilterSubsubcategory.value || "").trim();
  const subSubKey = taxonomySubKey(category, subcategory);
  const availableSubSub = state.taxonomy.subSubcategories?.[subSubKey] || [];
  if (!category || !subcategory || (availableSubSub.length > 0 && !subsubcategory)) {
    servicesAdminError.textContent = "Choose category/subcategory first.";
    return;
  }

  const created = await askServiceEdit("", "", "Add Service", "fixed");
  if (!created) return;
  const name = String(created.name || "").trim();
  const priceMode = String(created.priceMode || "fixed").trim() === "ask" ? "ask" : "fixed";
  const rawPrice = Number(created.price);
  const price = (priceMode === "ask" && (!Number.isFinite(rawPrice) || rawPrice <= 0)) ? 1 : rawPrice;
  if (!name) {
    servicesAdminError.textContent = "Service name is required.";
    return;
  }
  if (!Number.isFinite(price) || price <= 0) {
    servicesAdminError.textContent = "Price must be a positive number.";
    return;
  }

  const createdPayload = await api("/api/services", {
    method: "POST",
    body: JSON.stringify({
      name,
      category,
      subcategory,
      subSubcategory: subsubcategory,
      price,
      priceMode,
      changedByStaffId: state.currentStaff?.id || "system"
    })
  });
  if (createdPayload?.service?.id) {
    setPriceModeOverride(createdPayload.service.id, priceMode);
  }
}

async function transferSubcategory(fromCategory, fromSubcategory) {
  servicesAdminError.textContent = "";
  const picked = await askSubcategoryTransfer(fromCategory, fromSubcategory);
  if (!picked) return;
  const toCategory = String(picked.toCategory || "").trim();
  const toSubcategory = String(picked.toSubcategory || "").trim();
  if (!toCategory || !toSubcategory) {
    servicesAdminError.textContent = "Target category and subcategory are required.";
    return;
  }
  if (fromCategory === toCategory && fromSubcategory === toSubcategory) return;

  await api("/api/services/taxonomy/subcategory/transfer", {
    method: "PATCH",
    body: JSON.stringify({
      fromCategory,
      fromSubcategory,
      toCategory,
      toSubcategory
    })
  });
  const fromKey = taxonomySubStatusKey(fromCategory, fromSubcategory);
  const toKey = taxonomySubStatusKey(toCategory, toSubcategory);
  if (Object.prototype.hasOwnProperty.call(state.subcategoryStatus, fromKey)) {
    state.subcategoryStatus[toKey] = state.subcategoryStatus[fromKey];
    delete state.subcategoryStatus[fromKey];
    saveSubcategoryStatus();
  }

  selectedManageCategory = toCategory;
  selectedManageSubcategory = toSubcategory;
  selectedManageSubsubcategory = "";
  adminFilterCategory.value = toCategory;
  adminFilterSubcategory.value = toSubcategory;
  adminFilterSubsubcategory.value = "";
}

async function transferService(row) {
  servicesAdminError.textContent = "";
  const id = row.dataset.id || "";
  if (!id) return;
  const currentCategory = String(row.dataset.category || "").trim();
  const currentSubcategory = String(row.dataset.subcategory || "").trim();
  const currentSubsubcategory = String(row.dataset.subsubcategory || "").trim();
  const picked = await askServiceTransfer(currentCategory, currentSubcategory);
  if (!picked) return;
  const category = String(picked.category || "").trim();
  const subcategory = String(picked.subcategory || "").trim();
  if (!category || !subcategory) {
    servicesAdminError.textContent = "Target category and subcategory are required.";
    return;
  }

  await api(`/api/services/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      category,
      subcategory,
      subSubcategory: currentSubsubcategory,
      changedByStaffId: state.currentStaff?.id || "system"
    })
  });

  selectedManageCategory = category;
  selectedManageSubcategory = subcategory;
  selectedManageSubsubcategory = "";
  adminFilterCategory.value = category;
  adminFilterSubcategory.value = subcategory;
  adminFilterSubsubcategory.value = "";
}

async function addCategory(nameParam) {
  servicesAdminError.textContent = "";
  const name = String(nameParam || selectedManageCategory || "").trim();
  if (!name) {
    servicesAdminError.textContent = "Enter category name.";
    return;
  }
  try {
    await api("/api/services/taxonomy/category", { method: "POST", body: JSON.stringify({ name }) });
    selectedManageCategory = "";
    selectedManageSubcategory = "";
    selectedManageSubsubcategory = "";
    await refreshServices();
    renderServiceAdmin();
  } catch (error) {
    servicesAdminError.textContent = error.message;
  }
}

async function renameCategory(oldNameParam, newNameParam) {
  servicesAdminError.textContent = "";
  const oldName = String(oldNameParam || selectedManageCategory || "").trim();
  const newName = String(newNameParam || "").trim();
  if (!oldName || !newName) {
    servicesAdminError.textContent = "Select a category and enter a new name.";
    return;
  }
  try {
    await api("/api/services/taxonomy/category", { method: "PATCH", body: JSON.stringify({ oldName, newName }) });
    if (Object.prototype.hasOwnProperty.call(state.categoryStatus, oldName)) {
      state.categoryStatus[newName] = state.categoryStatus[oldName];
      delete state.categoryStatus[oldName];
      saveCategoryStatus();
    }
    selectedManageCategory = newName;
    selectedManageSubsubcategory = "";
    await refreshServices();
    renderServiceAdmin();
  } catch (error) {
    servicesAdminError.textContent = error.message;
  }
}

async function deleteCategory(nameParam) {
  servicesAdminError.textContent = "";
  const name = String(nameParam || selectedManageCategory || "").trim();
  if (!name) {
    servicesAdminError.textContent = "Select category to delete.";
    return;
  }
  try {
    await api("/api/services/taxonomy/category", { method: "DELETE", body: JSON.stringify({ name }) });
    delete state.categoryStatus[name];
    saveCategoryStatus();
    if (selectedManageCategory === name) {
      selectedManageCategory = "";
      selectedManageSubcategory = "";
      selectedManageSubsubcategory = "";
    }
    await refreshServices();
    renderServiceAdmin();
  } catch (error) {
    servicesAdminError.textContent = error.message;
  }
}

async function addSubcategory(categoryParam, nameParam) {
  servicesAdminError.textContent = "";
  const category = String(categoryParam || selectedManageCategory || "").trim();
  const name = String(nameParam || "").trim();
  if (!category || !name) {
    servicesAdminError.textContent = "Choose category and enter subcategory name.";
    return;
  }
  try {
    await api("/api/services/taxonomy/subcategory", { method: "POST", body: JSON.stringify({ category, name }) });
    await refreshServices();
    selectedManageCategory = category;
    selectedManageSubcategory = name;
    selectedManageSubsubcategory = "";
    renderServiceAdmin();
  } catch (error) {
    servicesAdminError.textContent = error.message;
  }
}

async function renameSubcategory(categoryParam, oldNameParam, newNameParam) {
  servicesAdminError.textContent = "";
  const category = String(categoryParam || selectedManageCategory || "").trim();
  const oldName = String(oldNameParam || selectedManageSubcategory || "").trim();
  const newName = String(newNameParam || "").trim();
  if (!category || !oldName || !newName) {
    servicesAdminError.textContent = "Choose category/subcategory and enter new name.";
    return;
  }
  try {
    await api("/api/services/taxonomy/subcategory", { method: "PATCH", body: JSON.stringify({ category, oldName, newName }) });
    const oldKey = taxonomySubStatusKey(category, oldName);
    const newKey = taxonomySubStatusKey(category, newName);
    if (Object.prototype.hasOwnProperty.call(state.subcategoryStatus, oldKey)) {
      state.subcategoryStatus[newKey] = state.subcategoryStatus[oldKey];
      delete state.subcategoryStatus[oldKey];
      saveSubcategoryStatus();
    }
    await refreshServices();
    selectedManageCategory = category;
    selectedManageSubcategory = newName;
    selectedManageSubsubcategory = "";
    renderServiceAdmin();
  } catch (error) {
    servicesAdminError.textContent = error.message;
  }
}

async function deleteSubcategory(categoryParam, nameParam) {
  servicesAdminError.textContent = "";
  const category = String(categoryParam || selectedManageCategory || "").trim();
  const name = String(nameParam || selectedManageSubcategory || "").trim();
  if (!category || !name) {
    servicesAdminError.textContent = "Choose category and subcategory to delete.";
    return;
  }
  try {
    await api("/api/services/taxonomy/subcategory", { method: "DELETE", body: JSON.stringify({ category, name }) });
    delete state.subcategoryStatus[taxonomySubStatusKey(category, name)];
    saveSubcategoryStatus();
    if (selectedManageSubcategory === name) {
      selectedManageSubcategory = "";
      selectedManageSubsubcategory = "";
    }
    await refreshServices();
    selectedManageCategory = category;
    renderServiceAdmin();
  } catch (error) {
    servicesAdminError.textContent = error.message;
  }
}

async function addSubsubcategory(categoryParam, subcategoryParam, nameParam) {
  servicesAdminError.textContent = "";
  const category = String(categoryParam || selectedManageCategory || "").trim();
  const subcategory = String(subcategoryParam || selectedManageSubcategory || "").trim();
  const name = String(nameParam || "").trim();
  if (!category || !subcategory || !name) {
    servicesAdminError.textContent = "Choose category/subcategory and enter child subcategory name.";
    return;
  }
  try {
    await api("/api/services/taxonomy/subsubcategory", { method: "POST", body: JSON.stringify({ category, subcategory, name }) });
  } catch (error) {
    if (isRouteMissingError(error)) {
      addLocalSubsubcategory(category, subcategory, name);
    } else {
      servicesAdminError.textContent = error.message;
      return;
    }
  }
  await refreshServices();
  selectedManageCategory = category;
  selectedManageSubcategory = subcategory;
  selectedManageSubsubcategory = name;
  renderServiceAdmin();
}

async function renameSubsubcategory(categoryParam, subcategoryParam, oldNameParam, newNameParam) {
  servicesAdminError.textContent = "";
  const category = String(categoryParam || selectedManageCategory || "").trim();
  const subcategory = String(subcategoryParam || selectedManageSubcategory || "").trim();
  const oldName = String(oldNameParam || selectedManageSubsubcategory || "").trim();
  const newName = String(newNameParam || "").trim();
  if (!category || !subcategory || !oldName || !newName) {
    servicesAdminError.textContent = "Choose child subcategory and enter a new name.";
    return;
  }
  try {
    await api("/api/services/taxonomy/subsubcategory", { method: "PATCH", body: JSON.stringify({ category, subcategory, oldName, newName }) });
  } catch (error) {
    if (isRouteMissingError(error)) {
      renameLocalSubsubcategory(category, subcategory, oldName, newName);
    } else {
      servicesAdminError.textContent = error.message;
      return;
    }
  }
  await refreshServices();
  selectedManageCategory = category;
  selectedManageSubcategory = subcategory;
  selectedManageSubsubcategory = newName;
  renderServiceAdmin();
}

async function deleteSubsubcategory(categoryParam, subcategoryParam, nameParam) {
  servicesAdminError.textContent = "";
  const category = String(categoryParam || selectedManageCategory || "").trim();
  const subcategory = String(subcategoryParam || selectedManageSubcategory || "").trim();
  const name = String(nameParam || selectedManageSubsubcategory || "").trim();
  if (!category || !subcategory || !name) {
    servicesAdminError.textContent = "Choose child subcategory to delete.";
    return;
  }
  try {
    await api("/api/services/taxonomy/subsubcategory", { method: "DELETE", body: JSON.stringify({ category, subcategory, name }) });
  } catch (error) {
    if (isRouteMissingError(error)) {
      deleteLocalSubsubcategory(category, subcategory, name);
    } else {
      servicesAdminError.textContent = error.message;
      return;
    }
  }
  if (selectedManageSubsubcategory === name) {
    selectedManageSubsubcategory = "";
  }
  await refreshServices();
  selectedManageCategory = category;
  selectedManageSubcategory = subcategory;
  renderServiceAdmin();
}

async function addService() {
  servicesAdminError.textContent = "";
  const name = newServiceName.value.trim();
  const category = newServiceCategory.value.trim();
  const subcategory = newServiceSubcategory.value.trim();
  const price = Number(newServicePrice.value);
  if (!name || !category || !Number.isFinite(price) || price <= 0) {
    servicesAdminError.textContent = "Please enter valid service details.";
    return;
  }

  try {
    await api("/api/services", {
      method: "POST",
      body: JSON.stringify({
        name,
        category,
        subcategory,
        price,
        changedByStaffId: state.currentStaff?.id || "system"
      })
    });
    newServiceName.value = "";
    newServiceCategory.value = "";
    newServiceSubcategory.value = "";
    newServicePrice.value = "";
    await refreshServices();
    renderServiceAdmin();
  } catch (error) {
    servicesAdminError.textContent = error.message;
  }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function normalizePriceMode(value) {
  return String(value || "").trim().toLowerCase() === "ask" ? "ask" : "fixed";
}

function loadCategoryStatus() {
  try {
    const raw = localStorage.getItem(CATEGORY_STATUS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out = {};
    for (const [k, v] of Object.entries(parsed)) {
      const name = String(k || "").trim();
      if (!name) continue;
      out[name] = Boolean(v);
    }
    return out;
  } catch {
    return {};
  }
}

function saveCategoryStatus() {
  try {
    localStorage.setItem(CATEGORY_STATUS_KEY, JSON.stringify(state.categoryStatus || {}));
  } catch {
    // ignore storage errors
  }
}

function isCategoryEnabled(category) {
  const key = String(category || "").trim();
  if (!key) return true;
  if (!Object.prototype.hasOwnProperty.call(state.categoryStatus || {}, key)) return true;
  return Boolean(state.categoryStatus[key]);
}

function setCategoryEnabled(category, enabled) {
  const key = String(category || "").trim();
  if (!key) return;
  state.categoryStatus[key] = Boolean(enabled);
  saveCategoryStatus();
}

function taxonomySubStatusKey(category, subcategory) {
  return `${String(category || "").trim()}::${String(subcategory || "").trim()}`;
}

function loadSubcategoryStatus() {
  try {
    const raw = localStorage.getItem(SUBCATEGORY_STATUS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out = {};
    for (const [k, v] of Object.entries(parsed)) {
      const key = String(k || "").trim();
      if (!key) continue;
      out[key] = Boolean(v);
    }
    return out;
  } catch {
    return {};
  }
}

function saveSubcategoryStatus() {
  try {
    localStorage.setItem(SUBCATEGORY_STATUS_KEY, JSON.stringify(state.subcategoryStatus || {}));
  } catch {
    // ignore storage errors
  }
}

function isSubcategoryEnabled(category, subcategory) {
  const key = taxonomySubStatusKey(category, subcategory);
  if (!key || key === "::") return true;
  if (!Object.prototype.hasOwnProperty.call(state.subcategoryStatus || {}, key)) return true;
  return Boolean(state.subcategoryStatus[key]);
}

function setSubcategoryEnabled(category, subcategory, enabled) {
  const key = taxonomySubStatusKey(category, subcategory);
  if (!key || key === "::") return;
  state.subcategoryStatus[key] = Boolean(enabled);
  saveSubcategoryStatus();
}

function loadPriceModeOverrides() {
  try {
    const raw = localStorage.getItem(PRICE_MODE_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out = {};
    for (const [k, v] of Object.entries(parsed)) {
      const id = String(k || "").trim();
      if (!id) continue;
      out[id] = normalizePriceMode(v);
    }
    return out;
  } catch {
    return {};
  }
}

function savePriceModeOverrides() {
  try {
    localStorage.setItem(PRICE_MODE_OVERRIDES_KEY, JSON.stringify(state.priceModeOverrides || {}));
  } catch {
    // ignore storage errors
  }
}

function setPriceModeOverride(serviceId, priceMode) {
  const id = String(serviceId || "").trim();
  if (!id) return;
  state.priceModeOverrides[id] = normalizePriceMode(priceMode);
  savePriceModeOverrides();
}

function getServicePriceMode(service) {
  const id = String(service?.id || "").trim();
  const fromService = normalizePriceMode(service?.priceMode);
  if (id && state.priceModeOverrides?.[id]) return normalizePriceMode(state.priceModeOverrides[id]);
  return fromService;
}

function attachDragReorder(container, selector, commit) {
  let dragging = null;

  container.addEventListener("dragstart", (e) => {
    const item = e.target.closest(selector);
    if (!item) return;
    dragging = item;
    item.classList.add("dragging");
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "reorder");
    }
  });

  container.addEventListener("dragover", (e) => {
    if (!dragging) return;
    e.preventDefault();
    const target = e.target.closest(selector);
    if (!target || target === dragging) return;
    const rect = target.getBoundingClientRect();
    const insertAfter = e.clientY > rect.top + rect.height / 2;
    if (insertAfter) {
      target.parentNode.insertBefore(dragging, target.nextSibling);
    } else {
      target.parentNode.insertBefore(dragging, target);
    }
  });

  const finish = async () => {
    if (!dragging) return;
    dragging.classList.remove("dragging");
    dragging = null;
    await commit();
  };

  container.addEventListener("drop", async (e) => {
    if (!dragging) return;
    e.preventDefault();
    await finish();
  });

  container.addEventListener("dragend", async () => {
    await finish();
  });
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  try {
    const payload = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        staffId: staffSelect.value,
        pin: staffPin.value.trim()
      })
    });
    state.currentStaff = payload.staff;
    activeStaffName.textContent = payload.staff.name;
    activeStaffRole.textContent = payload.staff.role;
    staffPin.value = "";
    setScreen("dashboard");
    updateClock();
    await refreshSummary();
  } catch (error) {
    loginError.textContent = error.message;
  }
});

dashboardTiles.addEventListener("click", async (e) => {
  const b = e.target.closest(".tile");
  if (!b) return;
  if (b.dataset.action === "register") {
    setScreen("register");
    checkoutError.textContent = "";
    await refreshServices();
    await ensurePrintCatalogFromClient();
    renderCart();
    await refreshSummary();
    return;
  }
  if (b.dataset.action === "catalog") {
    setScreen("register");
    await refreshServices();
    await ensurePrintCatalogFromClient();
    renderCart();
    renderServiceAdmin();
    servicesDialog.showModal();
    return;
  }
  if (b.dataset.action === "reports") {
    await openReportsDialog();
    return;
  }
  if (b.dataset.action === "inventory") {
    await refreshServices();
    await openInventoryScreen();
    return;
  }
  if (b.dataset.action === "transactions") {
    await openTransactionsDialog();
    return;
  }
  window.alert("Module draft will be built next.");
});

goDashboard.addEventListener("click", () => {
  setScreen("dashboard");
  updateClock();
});

logoutBtn.addEventListener("click", () => {
  state.currentStaff = null;
  state.cart = [];
  state.saleLocked = false;
  state.lastTransaction = null;
  setScreen("login");
});

if (inventorySideDashboard) {
  inventorySideDashboard.addEventListener("click", () => {
    setScreen("dashboard");
    updateClock();
  });
}

if (inventorySideRegister) {
  inventorySideRegister.addEventListener("click", async () => {
    setScreen("register");
    checkoutError.textContent = "";
    await refreshServices();
    renderCart();
  });
}

if (inventorySideReports) {
  inventorySideReports.addEventListener("click", async () => {
    await openReportsDialog();
  });
}

if (inventorySideTransactions) {
  inventorySideTransactions.addEventListener("click", async () => {
    await openTransactionsDialog();
  });
}

if (inventorySideLogout) {
  inventorySideLogout.addEventListener("click", () => {
    state.currentStaff = null;
    state.cart = [];
    state.saleLocked = false;
    state.lastTransaction = null;
    setScreen("login");
  });
}

if (inventoryRefresh) {
  inventoryRefresh.addEventListener("click", async () => {
    clearInventoryMessage();
    try {
      await refreshInventoryData();
    } catch (error) {
      setInventoryMessage("error", error.message);
    }
  });
}

if (inventoryAddBtn) {
  inventoryAddBtn.addEventListener("click", createInventoryProduct);
}

if (inventorySearch) {
  inventorySearch.addEventListener("input", () => {
    state.inventory.page = 1;
    renderInventoryTable();
  });
}
if (inventoryCategoryFilter) {
  inventoryCategoryFilter.addEventListener("change", () => {
    state.inventory.page = 1;
    renderInventoryTable();
  });
}
if (inventoryStatusFilter) {
  inventoryStatusFilter.addEventListener("change", () => {
    state.inventory.page = 1;
    renderInventoryTable();
  });
}
if (inventorySort) {
  inventorySort.addEventListener("change", renderInventoryTable);
}
if (inventoryPageSize) {
  inventoryPageSize.addEventListener("change", () => {
    state.inventory.pageSize = Math.max(1, toSafeNumber(inventoryPageSize.value, 10));
    state.inventory.page = 1;
    renderInventoryTable();
  });
}
if (inventoryPrev) {
  inventoryPrev.addEventListener("click", () => {
    state.inventory.page = Math.max(1, state.inventory.page - 1);
    renderInventoryTable();
  });
}
if (inventoryNext) {
  inventoryNext.addEventListener("click", () => {
    state.inventory.page += 1;
    renderInventoryTable();
  });
}
if (inventorySelectAll) {
  inventorySelectAll.addEventListener("change", () => {
    const filteredIds = getFilteredInventoryItems().map((item) => String(item.id));
    if (inventorySelectAll.checked) {
      for (const id of filteredIds) state.inventory.selectedIds[id] = true;
    } else {
      for (const id of filteredIds) delete state.inventory.selectedIds[id];
    }
    renderInventoryTable();
  });
}
if (inventoryApplyAction) {
  inventoryApplyAction.addEventListener("click", applyInventorySelectedAction);
}

if (inventoryBody) {
  inventoryBody.addEventListener("change", async (e) => {
    const checkbox = e.target.closest(".inventory-select-item[data-id]");
    if (checkbox) {
      const id = String(checkbox.dataset.id || "");
      if (id) state.inventory.selectedIds[id] = checkbox.checked;
      if (!checkbox.checked) delete state.inventory.selectedIds[id];
      updateInventorySelectedCount();
      return;
    }

    const fieldInput = e.target.closest("[data-inventory-id][data-field]");
    if (!fieldInput) return;
    const id = String(fieldInput.dataset.inventoryId || "");
    const field = String(fieldInput.dataset.field || "");
    if (!id || !field) return;
    try {
      await saveInventoryCell(id, field, fieldInput.value);
      setInventoryMessage("success", "Saved.");
    } catch (error) {
      setInventoryMessage("error", error.message);
    }
  });

  inventoryBody.addEventListener("click", async (e) => {
    const del = e.target.closest(".inventory-delete-btn[data-id]");
    if (!del) return;
    try {
      await deleteInventoryProduct(del.dataset.id || "");
      setInventoryMessage("success", "Product deleted.");
    } catch (error) {
      setInventoryMessage("error", error.message);
    }
  });
}

if (inventoryAdjustCancel) {
  inventoryAdjustCancel.addEventListener("click", () => resolveInventoryAdjust(null));
}
if (inventoryAdjustDialog) {
  inventoryAdjustDialog.addEventListener("cancel", () => resolveInventoryAdjust(null));
}
if (inventoryAdjustApply) {
  inventoryAdjustApply.addEventListener("click", () => {
    const qty = toSafeNumber(inventoryAdjustQty?.value, 0);
    if (!Number.isFinite(qty) || qty <= 0) {
      setInventoryMessage("error", "Quantity must be a positive number.");
      return;
    }
    const delta = String(inventoryAdjustType?.value || "+") === "-" ? -qty : qty;
    resolveInventoryAdjust({
      delta,
      note: String(inventoryAdjustNote?.value || "").trim()
    });
  });
}

if (cashMovementBtn) {
  cashMovementBtn.addEventListener("click", async () => {
    try {
      const type = await askCashMovementChoice();
      if (!type) return;
      await logCashMovement(type);
    } catch (error) {
      showToast(error.message || "Failed to save cash movement entry.");
    }
  });
}

serviceChips.addEventListener("click", (e) => {
  const btn = e.target.closest(".service-btn");
  if (!btn) return;
  addToCart(btn.dataset.id);
});

serviceCategoryFilter.addEventListener("change", () => {
  serviceSubcategoryFilter.value = "";
  serviceSubsubcategoryFilter.value = "";
  renderServices();
});

serviceSubcategoryFilter.addEventListener("change", () => {
  serviceSubsubcategoryFilter.value = "";
  renderServices();
});
serviceSubsubcategoryFilter.addEventListener("change", renderServices);

serviceCategoryList.addEventListener("click", (e) => {
  const btn = e.target.closest(".list-chip[data-service-cat]");
  if (!btn) return;
  const value = btn.dataset.serviceCat || "";
  serviceCategoryFilter.value = value;
  serviceSubcategoryFilter.value = "";
  serviceSubsubcategoryFilter.value = "";
  renderServices();
});

serviceSubcategoryList.addEventListener("click", (e) => {
  const btn = e.target.closest(".list-chip[data-service-sub]");
  if (!btn) return;
  const value = btn.dataset.serviceSub || "";
  serviceSubcategoryFilter.value = value;
  serviceSubsubcategoryFilter.value = "";
  renderServices();
});

serviceSubsubcategoryList.addEventListener("click", (e) => {
  const btn = e.target.closest(".list-chip[data-service-subsub]");
  if (!btn) return;
  const value = btn.dataset.serviceSubsub || "";
  serviceSubsubcategoryFilter.value = value;
  renderServices();
});

serviceBreadcrumb.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-service-step]");
  if (!btn) return;
  const step = btn.dataset.serviceStep;
  if (step === "category") {
    serviceSubcategoryFilter.value = "";
    serviceSubsubcategoryFilter.value = "";
  } else if (step === "subcategory") {
    serviceSubsubcategoryFilter.value = "";
  } else if (step === "subsubcategory") {
    serviceSubsubcategoryFilter.value = "";
  }
  renderServices();
});

if (servicesBackBtn) {
  servicesBackBtn.addEventListener("click", () => {
    if (serviceSubsubcategoryFilter.value) {
      serviceSubsubcategoryFilter.value = "";
      renderServices();
      return;
    }
    if (serviceSubcategoryFilter.value) {
      serviceSubcategoryFilter.value = "";
      serviceSubsubcategoryFilter.value = "";
      renderServices();
      return;
    }
    if (serviceCategoryFilter.value) {
      serviceCategoryFilter.value = "";
      serviceSubcategoryFilter.value = "";
      serviceSubsubcategoryFilter.value = "";
      renderServices();
    }
  });
}

saleBody.addEventListener("click", (e) => {
  const btn = e.target.closest(".delete-line");
  if (!btn) return;
  deleteCartItem(btn.dataset.id);
});

paymentMethods.addEventListener("change", () => {
  setPayment(paymentMethods.value);
});

if (paymentQuick) {
  paymentQuick.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-payment-option]");
    if (!btn) return;
    setPayment(btn.dataset.paymentOption || "cash");
  });
}

cashReceived.addEventListener("input", updateTotalChange);
paymentReference.addEventListener("input", maybeAutofillReceivedFromReference);

newSaleBtn.addEventListener("click", async () => {
  const hasCurrentData = state.cart.length > 0 || state.saleLocked || Number(cashReceived.value || 0) > 0 || paymentReference.value.trim();
  const ok = await askActionConfirm(
    "Start New Sale",
    hasCurrentData
      ? "Start a new sale? Current sale details will be cleared."
      : "Start a new sale?"
  );
  if (!ok) return;

  state.cart = [];
  state.saleLocked = false;
  state.lastTransaction = null;
  paymentReference.value = "";
  cashReceived.value = "";
  checkoutError.textContent = "";
  renderCart();
  updateTotalChange();
});

completeSaleBtn.addEventListener("click", completeSale);
openCheckoutBtn.addEventListener("click", openCheckoutPopup);
closeCheckoutBtn.addEventListener("click", closeCheckoutPopup);
checkoutOverlay.addEventListener("click", closeCheckoutPopup);
confirmSaleNo.addEventListener("click", () => resolveSaleConfirmation(false));
confirmSaleYes.addEventListener("click", () => resolveSaleConfirmation(true));
confirmSaleDialog.addEventListener("cancel", () => resolveSaleConfirmation(false));
saleResultOk.addEventListener("click", () => {
  if (saleResultDialog.open) saleResultDialog.close();
});
nameEditCancel.addEventListener("click", () => resolveNameEdit(nameEditCancelValue));
nameEditSave.addEventListener("click", () => resolveNameEdit(nameEditInput.value));
nameEditDialog.addEventListener("cancel", () => resolveNameEdit(null));
confirmActionCancel.addEventListener("click", () => resolveActionConfirm(false));
confirmActionOk.addEventListener("click", () => resolveActionConfirm(true));
confirmActionDialog.addEventListener("cancel", () => resolveActionConfirm(false));
if (toggleModeEnable) toggleModeEnable.addEventListener("click", () => resolveToggleMode("enable"));
if (toggleModeDisable) toggleModeDisable.addEventListener("click", () => resolveToggleMode("disable"));
if (toggleModeEnableAll) toggleModeEnableAll.addEventListener("click", () => resolveToggleMode("enable_all"));
if (toggleModeDisableAll) toggleModeDisableAll.addEventListener("click", () => resolveToggleMode("disable_all"));
if (toggleModeCancel) toggleModeCancel.addEventListener("click", () => resolveToggleMode(null));
if (toggleModeDialog) toggleModeDialog.addEventListener("cancel", () => resolveToggleMode(null));
if (cashMovementIn) cashMovementIn.addEventListener("click", () => resolveCashMovementChoice("in"));
if (cashMovementOut) cashMovementOut.addEventListener("click", () => resolveCashMovementChoice("out"));
if (cashMovementCancel) cashMovementCancel.addEventListener("click", () => resolveCashMovementChoice(null));
if (cashMovementDialog) {
  cashMovementDialog.addEventListener("click", (e) => {
    if (e.target === cashMovementDialog) resolveCashMovementChoice(null);
  });
  cashMovementDialog.addEventListener("cancel", () => resolveCashMovementChoice(null));
}
serviceEditCancel.addEventListener("click", () => resolveServiceEdit(null));
serviceEditSave.addEventListener("click", () => resolveServiceEdit({
  name: serviceEditName.value,
  price: serviceEditPrice.value,
  priceMode: serviceEditPriceMode ? serviceEditPriceMode.value : "fixed"
}));
if (serviceEditPriceMode) {
  serviceEditPriceMode.addEventListener("change", syncServiceEditPriceVisibility);
}
serviceEditDialog.addEventListener("cancel", () => resolveServiceEdit(null));
serviceAmountCancel.addEventListener("click", () => resolveServiceAmount(null));
serviceAmountSave.addEventListener("click", () => resolveServiceAmount(serviceAmountInput.value));
serviceAmountDialog.addEventListener("cancel", () => resolveServiceAmount(null));
subcategoryTransferCancel.addEventListener("click", () => resolveSubcategoryTransfer(null));
subcategoryTransferSave.addEventListener("click", () => resolveSubcategoryTransfer({
  toCategory: subcategoryTransferCategory.value,
  toSubcategory: subcategoryTransferName.value
}));
subcategoryTransferDialog.addEventListener("cancel", () => resolveSubcategoryTransfer(null));
serviceTransferCategory.addEventListener("change", syncServiceTransferSubcategories);
serviceTransferCancel.addEventListener("click", () => resolveServiceTransfer(null));
serviceTransferSave.addEventListener("click", () => resolveServiceTransfer({
  category: serviceTransferCategory.value,
  subcategory: serviceTransferSubcategory.value
}));
serviceTransferDialog.addEventListener("cancel", () => resolveServiceTransfer(null));

manageServicesBtn.addEventListener("click", async () => {
  selectedManageCategory = "";
  selectedManageSubcategory = "";
  selectedManageSubsubcategory = "";
  selectedManageServiceId = "";
  selectedManageServiceIds = {};
  await refreshServices();
  renderServiceAdmin();
  setAdminStep(1);
  servicesDialog.showModal();
});

adminFilterCategory.addEventListener("change", () => {
  selectedManageCategory = adminFilterCategory.value || selectedManageCategory;
  if (!adminFilterCategory.value) {
    selectedManageSubcategory = "";
    selectedManageSubsubcategory = "";
  }
  adminFilterSubcategory.value = "";
  adminFilterSubsubcategory.value = "";
  renderServiceAdmin();
});

adminFilterSubcategory.addEventListener("change", () => {
  selectedManageSubcategory = adminFilterSubcategory.value || selectedManageSubcategory;
  selectedManageSubsubcategory = "";
  adminFilterSubsubcategory.value = "";
  renderServiceAdmin();
  if (!selectedManageSubcategory) {
    setAdminStep(2);
    return;
  }
  setAdminStep(3);
});

adminFilterSubsubcategory.addEventListener("change", () => {
  selectedManageSubsubcategory = adminFilterSubsubcategory.value || selectedManageSubsubcategory;
  renderServiceAdmin();
});

categoryList.addEventListener("click", async (e) => {
  const addBtn = e.target.closest(".list-chip[data-add='category']");
  if (addBtn) {
    const next = await askNameEdit("Add Category", "Category name", "");
    if (!next || !next.trim()) return;
    await addCategory(next.trim());
    return;
  }

  const actionBtn = e.target.closest(".icon-action[data-cat]");
  if (actionBtn) {
    const category = actionBtn.dataset.cat || "";
    const act = actionBtn.dataset.act;
    selectedManageCategory = category;
    selectedManageSubcategory = "";
    selectedManageSubsubcategory = "";
    adminFilterCategory.value = category;
    adminFilterSubcategory.value = "";
    adminFilterSubsubcategory.value = "";
    if (act === "edit") {
      const next = await askNameEdit("Edit Category", "Category name", category);
      if (!next || !next.trim() || next.trim() === category) return;
      await renameCategory(category, next.trim());
      return;
    }
    if (act === "toggle") {
      const nextEnabled = !isCategoryEnabled(category);
      setCategoryEnabled(category, nextEnabled);
      if (!nextEnabled && serviceCategoryFilter.value === category) {
        serviceCategoryFilter.value = "";
        serviceSubcategoryFilter.value = "";
        serviceSubsubcategoryFilter.value = "";
      }
      renderServices();
      renderServiceAdmin();
      return;
    }
    if (act === "delete") {
      const ok = await askActionConfirm("Delete Category", `Delete "${category}"? Services will move to Uncategorized.`);
      if (!ok) return;
      await deleteCategory(category);
      return;
    }
  }

  const btn = e.target.closest(".list-chip[data-cat]");
  if (!btn) return;
  const value = btn.dataset.cat || "";
  selectedManageCategory = value;
  selectedManageSubcategory = "";
  selectedManageSubsubcategory = "";
  selectedManageServiceId = "";
  adminFilterCategory.value = value;
  adminFilterSubcategory.value = "";
  adminFilterSubsubcategory.value = "";
  renderServiceAdmin();
  if (e.detail >= 2) {
    setAdminStep(2);
  }
});

subcategoryList.addEventListener("click", async (e) => {
  const addBtn = e.target.closest(".list-chip[data-add='subcategory']");
  if (addBtn) {
    if (!selectedManageCategory) {
      servicesAdminError.textContent = "Choose a category first.";
      return;
    }
    const next = await askNameEdit("Add Subcategory", "Subcategory name", "");
    if (!next || !next.trim()) return;
    await addSubcategory(selectedManageCategory, next.trim());
    return;
  }

  const actionBtn = e.target.closest(".icon-action[data-sub]");
  if (actionBtn) {
    const sub = actionBtn.dataset.sub || "";
    const act = actionBtn.dataset.act;
    selectedManageSubcategory = sub;
    selectedManageSubsubcategory = "";
    adminFilterSubcategory.value = sub;
    adminFilterSubsubcategory.value = "";
    if (act === "edit") {
      const next = await askNameEdit("Edit Subcategory", "Subcategory name", sub);
      if (!next || !next.trim() || next.trim() === sub) return;
      await renameSubcategory(selectedManageCategory, sub, next.trim());
      return;
    }
    if (act === "transfer") {
      await transferSubcategory(selectedManageCategory, sub);
      await refreshServices();
      renderServiceAdmin();
      setAdminStep(2);
      return;
    }
    if (act === "toggle") {
      const nextEnabled = !isSubcategoryEnabled(selectedManageCategory, sub);
      setSubcategoryEnabled(selectedManageCategory, sub, nextEnabled);
      if (!nextEnabled && serviceCategoryFilter.value === selectedManageCategory && serviceSubcategoryFilter.value === sub) {
        serviceSubcategoryFilter.value = "";
        serviceSubsubcategoryFilter.value = "";
      }
      renderServices();
      renderServiceAdmin();
      return;
    }
    if (act === "delete") {
      const ok = await askActionConfirm("Delete Subcategory", `Delete "${sub}"? Existing services will be moved to General.`);
      if (!ok) return;
      await deleteSubcategory(selectedManageCategory, sub);
      return;
    }
  }

  const btn = e.target.closest(".list-chip[data-sub]");
  if (!btn) return;
  const value = btn.dataset.sub || "";
  selectedManageSubcategory = value;
  selectedManageSubsubcategory = "";
  selectedManageServiceId = "";
  adminFilterSubcategory.value = value;
  adminFilterSubsubcategory.value = "";
  renderServiceAdmin();
  if (e.detail >= 2) {
    const key = taxonomySubKey(selectedManageCategory, value);
    const hasChild = (state.taxonomy.subSubcategories?.[key] || []).length > 0;
    setAdminStep(hasChild ? 3 : 4);
  }
});

subsubcategoryList.addEventListener("click", async (e) => {
  const openServicesBtn = e.target.closest(".list-chip[data-open-services='true']");
  if (openServicesBtn) {
    selectedManageSubsubcategory = "";
    adminFilterSubsubcategory.value = "";
    renderServiceAdmin();
    setAdminStep(4);
    return;
  }

  const addBtn = e.target.closest(".list-chip[data-add='subsubcategory']");
  if (addBtn) {
    if (!selectedManageCategory || !selectedManageSubcategory) {
      servicesAdminError.textContent = "Choose category and subcategory first.";
      return;
    }
    const next = await askNameEdit("Add Child Subcategory", "Child subcategory name", "");
    if (!next || !next.trim()) return;
    await addSubsubcategory(selectedManageCategory, selectedManageSubcategory, next.trim());
    return;
  }

  const actionBtn = e.target.closest(".icon-action[data-subsub]");
  if (actionBtn) {
    const subsub = actionBtn.dataset.subsub || "";
    const act = actionBtn.dataset.act;
    selectedManageSubsubcategory = subsub;
    adminFilterSubsubcategory.value = subsub;
    if (act === "edit") {
      const next = await askNameEdit("Edit Child Subcategory", "Child subcategory name", subsub);
      if (!next || !next.trim() || next.trim() === subsub) return;
      await renameSubsubcategory(selectedManageCategory, selectedManageSubcategory, subsub, next.trim());
      return;
    }
    if (act === "delete") {
      const ok = await askActionConfirm("Delete Child Subcategory", `Delete "${subsub}"? Existing services will be moved to unassigned child subcategory.`);
      if (!ok) return;
      await deleteSubsubcategory(selectedManageCategory, selectedManageSubcategory, subsub);
      return;
    }
  }

  const btn = e.target.closest(".list-chip[data-subsub]");
  if (!btn) return;
  const value = btn.dataset.subsub || "";
  selectedManageSubsubcategory = value;
  selectedManageServiceId = "";
  adminFilterSubsubcategory.value = value;
  renderServiceAdmin();
  if (e.detail >= 2) {
    setAdminStep(4);
  }
});

adminBreadcrumb.addEventListener("click", (e) => {
  const btn = e.target.closest(".crumb");
  if (!btn) return;
  const step = Number(btn.dataset.step || 1);
  if (step === 1) {
    adminFilterSubcategory.value = "";
    adminFilterSubsubcategory.value = "";
    selectedManageSubcategory = "";
    selectedManageSubsubcategory = "";
    renderServiceAdmin();
    setAdminStep(2);
    return;
  }
  if (step === 2) {
    adminFilterSubsubcategory.value = "";
    selectedManageSubsubcategory = "";
    renderServiceAdmin();
    setAdminStep(3);
    return;
  }
  if (step === 3) {
    renderServiceAdmin();
    setAdminStep(4);
  }
});

servicesDialog.addEventListener("click", (e) => {
  if (e.target === servicesDialog) {
    servicesDialog.close();
  }
});

if (reportsRangePicker) {
  reportsRangePicker.addEventListener("change", async () => {
    applyReportsRangeSelection(reportsRangePicker.value);
    try {
      await refreshReports();
    } catch (error) {
      if (reportsError) reportsError.textContent = error.message;
    }
  });
}

if (reportsRangeOpen) {
  reportsRangeOpen.addEventListener("click", () => {
    openDateRangeDialog("reports");
  });
}

if (reportsPresetToday) {
  reportsPresetToday.addEventListener("click", async () => {
    setReportsPreset("today");
    await refreshReports();
  });
}

if (reportsPresetYesterday) {
  reportsPresetYesterday.addEventListener("click", async () => {
    setReportsPreset("yesterday");
    await refreshReports();
  });
}

if (reportsPresetLast7) {
  reportsPresetLast7.addEventListener("click", async () => {
    setReportsPreset("last7");
    await refreshReports();
  });
}

if (reportsPresetMonth) {
  reportsPresetMonth.addEventListener("click", async () => {
    setReportsPreset("month");
    await refreshReports();
  });
}

if (reportsExportType) {
  reportsExportType.addEventListener("change", () => {
    const mode = String(reportsExportType.value || "").trim().toLowerCase();
    if (mode === "csv") {
      exportReportsCsv();
      reportsExportType.value = "";
    }
    if (mode === "pdf") {
      exportReportsPdf();
      reportsExportType.value = "";
    }
  });
}

if (reportsPrintSummaryBtn) {
  reportsPrintSummaryBtn.addEventListener("click", () => {
    printReportsSummary();
  });
}

if (reportsCloseBtn) {
  reportsCloseBtn.addEventListener("click", () => {
    if (reportsDialog?.open) reportsDialog.close();
  });
}

if (reportsDialog) {
  reportsDialog.addEventListener("click", (e) => {
    if (e.target === reportsDialog) reportsDialog.close();
  });
  reportsDialog.addEventListener("cancel", () => {
    if (reportsDialog.open) reportsDialog.close();
  });
}

if (transactionsReferenceSearch) {
  const triggerSearch = async () => {
    try {
      transactionsPage = 1;
      transactionsSelectedIds = {};
      await refreshTransactions();
    } catch (error) {
      if (transactionsError) transactionsError.textContent = error.message;
    }
  };

  transactionsReferenceSearch.addEventListener("input", () => {
    if (transactionsSearchTimer) clearTimeout(transactionsSearchTimer);
    transactionsSearchTimer = setTimeout(() => {
      triggerSearch();
    }, 220);
  });

  transactionsReferenceSearch.addEventListener("search", () => {
    if (transactionsSearchTimer) clearTimeout(transactionsSearchTimer);
    triggerSearch();
  });

  transactionsReferenceSearch.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (transactionsSearchTimer) clearTimeout(transactionsSearchTimer);
    await triggerSearch();
  });
}

if (transactionsPaymentFilter) {
  transactionsPaymentFilter.addEventListener("change", async () => {
    try {
      transactionsPage = 1;
      transactionsSelectedIds = {};
      await refreshTransactions();
    } catch (error) {
      if (transactionsError) transactionsError.textContent = error.message;
    }
  });
}

if (transactionsRangePicker) {
  transactionsRangePicker.addEventListener("change", async () => {
    applyTransactionsRangeSelection(transactionsRangePicker.value);
    try {
      transactionsPage = 1;
      transactionsSelectedIds = {};
      await refreshTransactions();
    } catch (error) {
      if (transactionsError) transactionsError.textContent = error.message;
    }
  });
}

if (transactionsRangeOpen) {
  transactionsRangeOpen.addEventListener("click", () => {
    openDateRangeDialog("transactions");
  });
}

if (transactionsPresetToday) {
  transactionsPresetToday.addEventListener("click", async () => {
    setTransactionsPreset("today");
    transactionsPage = 1;
    transactionsSelectedIds = {};
    await refreshTransactions();
  });
}

if (transactionsPresetYesterday) {
  transactionsPresetYesterday.addEventListener("click", async () => {
    setTransactionsPreset("yesterday");
    transactionsPage = 1;
    transactionsSelectedIds = {};
    await refreshTransactions();
  });
}

if (transactionsPresetLast7) {
  transactionsPresetLast7.addEventListener("click", async () => {
    setTransactionsPreset("last7");
    transactionsPage = 1;
    transactionsSelectedIds = {};
    await refreshTransactions();
  });
}

if (transactionsPresetMonth) {
  transactionsPresetMonth.addEventListener("click", async () => {
    setTransactionsPreset("month");
    transactionsPage = 1;
    transactionsSelectedIds = {};
    await refreshTransactions();
  });
}

if (transactionsExportType) {
  transactionsExportType.addEventListener("change", () => {
    const mode = String(transactionsExportType.value || "").trim().toLowerCase();
    if (mode === "csv") {
      exportTransactionsCsv();
      transactionsExportType.value = "";
    }
    if (mode === "pdf") {
      exportTransactionsPdf();
      transactionsExportType.value = "";
    }
  });
}

if (transactionsPrintBtn) {
  transactionsPrintBtn.addEventListener("click", () => {
    printTransactionsDirect();
  });
}

if (transactionsCloseBtn) {
  transactionsCloseBtn.addEventListener("click", () => {
    if (transactionsDialog?.open) transactionsDialog.close();
  });
}

if (transactionsSelectAll) {
  transactionsSelectAll.addEventListener("change", () => {
    if (!transactionsSelectMode) return;
    const pageRows = pageRowsForTransactions();
    for (const row of pageRows) {
      const id = String(row.id || "");
      if (!id) continue;
      if (transactionsSelectAll.checked) transactionsSelectedIds[id] = true;
      else delete transactionsSelectedIds[id];
    }
    renderTransactionsTable(state.transactionsView);
  });
}

if (transactionsSelectAction) {
  const ensureSelectMode = () => {
    if (transactionsSelectMode) return;
    transactionsSelectMode = true;
    renderTransactionsTable(state.transactionsView);
  };

  if (transactionsSelectTrigger && transactionsSelectMenu) {
    transactionsSelectTrigger.addEventListener("click", () => {
      ensureSelectMode();
      const willOpen = transactionsSelectMenu.hidden;
      transactionsSelectMenu.hidden = !willOpen;
      syncTransactionsSelectDropup();
    });

    transactionsSelectMenu.addEventListener("click", (e) => {
      const btn = e.target.closest(".select-dropup-item[data-action]");
      if (!btn || btn.disabled) return;
      transactionsSelectAction.value = String(btn.dataset.action || "");
      transactionsSelectMenu.hidden = true;
      transactionsSelectAction.dispatchEvent(new Event("change", { bubbles: true }));
    });

    document.addEventListener("click", (e) => {
      if (!transactionsSelectMenu || transactionsSelectMenu.hidden) return;
      const insideField = e.target.closest(".select-action-field");
      if (insideField) return;
      transactionsSelectMenu.hidden = true;
    });
  }

  transactionsSelectAction.addEventListener("change", async () => {
    const action = transactionsSelectAction.value;
    transactionsSelectAction.value = "";
    if (!action) return;
    if (action === "cancel") {
      transactionsSelectMode = false;
      transactionsSelectedIds = {};
      renderTransactionsTable(state.transactionsView);
      return;
    }
    if (action === "delete") {
      try {
        if (transactionsError) transactionsError.textContent = "";
        await deleteSelectedTransactions();
      } catch (error) {
        if (transactionsError) transactionsError.textContent = error.message;
      }
      return;
    }
    if (action === "restore") {
      try {
        if (transactionsError) transactionsError.textContent = "";
        await restoreSelectedTransactions();
      } catch (error) {
        if (transactionsError) transactionsError.textContent = error.message;
      }
    }
  });
}

if (transactionsPrevBtn) {
  transactionsPrevBtn.addEventListener("click", () => {
    if (transactionsPage <= 1) return;
    transactionsPage -= 1;
    renderTransactionsTable(state.transactionsView);
  });
}

if (transactionsNextBtn) {
  transactionsNextBtn.addEventListener("click", () => {
    const pageCount = transactionPageCount();
    if (transactionsPage >= pageCount) return;
    transactionsPage += 1;
    renderTransactionsTable(state.transactionsView);
  });
}

if (transactionsPageSize) {
  transactionsPageSize.addEventListener("change", () => {
    const next = Number(transactionsPageSize.value || 10);
    transactionsPageSizeValue = Number.isFinite(next) && next > 0 ? Math.min(100, Math.floor(next)) : 10;
    transactionsPage = 1;
    transactionsSelectedIds = {};
    renderTransactionsTable(state.transactionsView);
  });
}

if (transactionsDialog) {
  transactionsDialog.addEventListener("click", (e) => {
    if (e.target === transactionsDialog) transactionsDialog.close();
  });
  transactionsDialog.addEventListener("cancel", () => {
    if (transactionsDialog.open) transactionsDialog.close();
  });
  transactionsDialog.addEventListener("close", () => {
    if (transactionsSelectMenu) transactionsSelectMenu.hidden = true;
  });
}

if (transactionsBody) {
  transactionsBody.addEventListener("change", (e) => {
    if (!transactionsSelectMode) return;
    const checkbox = e.target.closest(".transaction-select[data-tx-id]");
    if (!checkbox) return;
    const id = String(checkbox.dataset.txId || "");
    if (!id) return;
    if (checkbox.checked) transactionsSelectedIds[id] = true;
    else delete transactionsSelectedIds[id];
    updateTransactionsSelectionUi(pageRowsForTransactions());
  });

  transactionsBody.addEventListener("click", async (e) => {
    if (e.target.closest(".transaction-select")) return;
    const row = e.target.closest(".transaction-row[data-tx-id]");
    if (!row) return;
    if (transactionsSelectMode) {
      const txId = String(row.dataset.txId || "");
      if (!txId) return;
      if (transactionsSelectedIds[txId]) delete transactionsSelectedIds[txId];
      else transactionsSelectedIds[txId] = true;
      renderTransactionsTable(state.transactionsView);
      return;
    }
    openTransactionItems(row.dataset.txId || "");
  });
}

if (transactionItemsClose) {
  transactionItemsClose.addEventListener("click", () => {
    if (transactionItemsDialog?.open) transactionItemsDialog.close();
  });
}

if (transactionItemsDialog) {
  transactionItemsDialog.addEventListener("click", (e) => {
    if (e.target === transactionItemsDialog) transactionItemsDialog.close();
  });
  transactionItemsDialog.addEventListener("cancel", () => {
    if (transactionItemsDialog.open) transactionItemsDialog.close();
  });
}

if (dateRangePrev) {
  dateRangePrev.addEventListener("click", () => {
    dateRangeViewMonth = shiftMonthKey(dateRangeViewMonth, -1);
    renderDateRangeDialog();
  });
}

if (dateRangeNext) {
  dateRangeNext.addEventListener("click", () => {
    dateRangeViewMonth = shiftMonthKey(dateRangeViewMonth, 1);
    renderDateRangeDialog();
  });
}

if (dateRangeGrid) {
  dateRangeGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-date-key]");
    if (!btn) return;
    const selected = String(btn.dataset.dateKey || "").trim();
    if (!selected) return;
    if (!dateRangeTempAnchor) {
      dateRangeTempAnchor = selected;
      dateRangeTempStart = selected;
      dateRangeTempEnd = selected;
    } else {
      dateRangeTempStart = dateRangeTempAnchor <= selected ? dateRangeTempAnchor : selected;
      dateRangeTempEnd = dateRangeTempAnchor <= selected ? selected : dateRangeTempAnchor;
      dateRangeTempAnchor = "";
    }
    renderDateRangeDialog();
  });
}

if (dateRangeToday) {
  dateRangeToday.addEventListener("click", () => {
    const today = todayLocalKey();
    dateRangeTempAnchor = "";
    dateRangeTempStart = today;
    dateRangeTempEnd = today;
    dateRangeViewMonth = monthKeyFromDateKey(today);
    renderDateRangeDialog();
  });
}

if (dateRangePresetToday) {
  dateRangePresetToday.addEventListener("click", () => {
    setDateRangeTempPreset("today");
  });
}

if (dateRangePresetYesterday) {
  dateRangePresetYesterday.addEventListener("click", () => {
    setDateRangeTempPreset("yesterday");
  });
}

if (dateRangePresetLast7) {
  dateRangePresetLast7.addEventListener("click", () => {
    setDateRangeTempPreset("last7");
  });
}

if (dateRangePresetMonth) {
  dateRangePresetMonth.addEventListener("click", () => {
    setDateRangeTempPreset("month");
  });
}

if (dateRangeApply) {
  dateRangeApply.addEventListener("click", async () => {
    try {
      await applyDateRangeDialog();
    } catch (error) {
      if (dateRangeContext === "reports") {
        if (reportsError) reportsError.textContent = error.message;
      } else if (transactionsError) {
        transactionsError.textContent = error.message;
      }
    }
  });
}

if (dateRangeCancel) {
  dateRangeCancel.addEventListener("click", () => {
    if (dateRangeDialog?.open) dateRangeDialog.close();
  });
}

if (dateRangeDialog) {
  dateRangeDialog.addEventListener("click", (e) => {
    if (e.target === dateRangeDialog) dateRangeDialog.close();
  });
  dateRangeDialog.addEventListener("cancel", () => {
    if (dateRangeDialog.open) dateRangeDialog.close();
  });
}

addServiceBtn.addEventListener("click", addService);
if (servicesAdminToggleAllBtn) {
  servicesAdminToggleAllBtn.addEventListener("click", async () => {
    try {
      const nextActive = String(servicesAdminToggleAllBtn.dataset.nextActive || "true") === "true";
      await setAllServicesActive(nextActive);
    } catch (error) {
      servicesAdminError.textContent = error.message;
    }
  });
}
if (servicesAdminBackBtn) {
  servicesAdminBackBtn.addEventListener("click", () => {
    const category = adminFilterCategory.value || selectedManageCategory;
    const subcategory = adminFilterSubcategory.value || selectedManageSubcategory;
    const subsubcategory = adminFilterSubsubcategory.value || selectedManageSubsubcategory;
    if (adminStep === 4 && category && subcategory) {
      adminFilterSubsubcategory.value = "";
      selectedManageSubsubcategory = "";
      renderServiceAdmin();
      setAdminStep(3);
      return;
    }

    if (subsubcategory) {
      adminFilterSubsubcategory.value = "";
      selectedManageSubsubcategory = "";
      renderServiceAdmin();
      setAdminStep(3);
      return;
    }
    if (subcategory) {
      adminFilterSubcategory.value = "";
      adminFilterSubsubcategory.value = "";
      selectedManageSubcategory = "";
      selectedManageSubsubcategory = "";
      renderServiceAdmin();
      setAdminStep(2);
      return;
    }
    if (category) {
      adminFilterCategory.value = "";
      adminFilterSubcategory.value = "";
      adminFilterSubsubcategory.value = "";
      selectedManageCategory = "";
      selectedManageSubcategory = "";
      selectedManageSubsubcategory = "";
      renderServiceAdmin();
      setAdminStep(1);
    }
  });
}

function selectedServiceRowElement() {
  if (!selectedManageServiceId) return null;
  return servicesAdminList.querySelector(`.service-list-item[data-id="${CSS.escape(String(selectedManageServiceId))}"]`);
}

if (servicesAdminActionAddBtn) {
  servicesAdminActionAddBtn.addEventListener("click", async () => {
    try {
      if (adminStep === 1) {
        const next = await askNameEdit("Add Category", "Category name", "");
        if (!next || !next.trim()) return;
        await addCategory(next.trim());
        return;
      }
      if (adminStep === 2) {
        if (!selectedManageCategory) return;
        const next = await askNameEdit("Add Subcategory", "Subcategory name", "");
        if (!next || !next.trim()) return;
        await addSubcategory(selectedManageCategory, next.trim());
        return;
      }
      if (adminStep === 3) {
        if (!selectedManageCategory || !selectedManageSubcategory) return;
        const next = await askNameEdit("Add Child Subcategory", "Child subcategory name", "");
        if (!next || !next.trim()) return;
        await addSubsubcategory(selectedManageCategory, selectedManageSubcategory, next.trim());
        return;
      }
      if (adminStep === 4) {
        await addServiceFromBox();
      }
    } catch (error) {
      servicesAdminError.textContent = error.message;
    }
  });
}

if (servicesAdminActionEditBtn) {
  servicesAdminActionEditBtn.addEventListener("click", async () => {
    try {
      if (adminStep === 1 && selectedManageCategory) {
        const next = await askNameEdit("Edit Category", "Category name", selectedManageCategory);
        if (!next || !next.trim() || next.trim() === selectedManageCategory) return;
        await renameCategory(selectedManageCategory, next.trim());
        return;
      }
      if (adminStep === 2 && selectedManageSubcategory) {
        const next = await askNameEdit("Edit Subcategory", "Subcategory name", selectedManageSubcategory);
        if (!next || !next.trim() || next.trim() === selectedManageSubcategory) return;
        await renameSubcategory(selectedManageCategory, selectedManageSubcategory, next.trim());
        return;
      }
      if (adminStep === 3 && selectedManageSubsubcategory) {
        const next = await askNameEdit("Edit Child Subcategory", "Child subcategory name", selectedManageSubsubcategory);
        if (!next || !next.trim() || next.trim() === selectedManageSubsubcategory) return;
        await renameSubsubcategory(selectedManageCategory, selectedManageSubcategory, selectedManageSubsubcategory, next.trim());
        return;
      }
      if (adminStep === 4) {
        const row = selectedServiceRowElement();
        if (!row) return;
        await editServiceFromBox(row);
      }
    } catch (error) {
      servicesAdminError.textContent = error.message;
    }
  });
}

if (servicesAdminActionDeleteBtn) {
  servicesAdminActionDeleteBtn.addEventListener("click", async () => {
    try {
      if (adminStep === 1 && selectedManageCategory) {
        const ok = await askActionConfirm("Delete Category", `Delete "${selectedManageCategory}"? Services will move to Uncategorized.`);
        if (!ok) return;
        await deleteCategory(selectedManageCategory);
        return;
      }
      if (adminStep === 2 && selectedManageSubcategory) {
        const ok = await askActionConfirm("Delete Subcategory", `Delete "${selectedManageSubcategory}"? Existing services will be moved to General.`);
        if (!ok) return;
        await deleteSubcategory(selectedManageCategory, selectedManageSubcategory);
        return;
      }
      if (adminStep === 3 && selectedManageSubsubcategory) {
        const ok = await askActionConfirm("Delete Child Subcategory", `Delete "${selectedManageSubsubcategory}"? Existing services will be moved to unassigned child subcategory.`);
        if (!ok) return;
        await deleteSubsubcategory(selectedManageCategory, selectedManageSubcategory, selectedManageSubsubcategory);
        return;
      }
      if (adminStep === 4) {
        const selectedIds = selectedServiceIdsInView();
        const ids = selectedIds.length > 0
          ? selectedIds
          : [selectedServiceRowElement()?.dataset.id || ""].filter(Boolean);
        if (ids.length === 0) return;
        const firstRow = ids.length === 1
          ? servicesAdminList.querySelector(`.service-list-item[data-id="${CSS.escape(String(ids[0]))}"]`)
          : null;
        const ok = await askActionConfirm(
          "Delete Service",
          ids.length > 1
            ? `Delete ${ids.length} selected services?`
            : `Delete "${firstRow?.dataset.name || "this service"}"?`
        );
        if (!ok) return;
        await queueServiceDeleteWithUndo(ids);
      }
    } catch (error) {
      servicesAdminError.textContent = error.message;
    }
  });
}

if (servicesAdminActionTransferBtn) {
  servicesAdminActionTransferBtn.addEventListener("click", async () => {
    try {
      if (adminStep === 2 && selectedManageSubcategory) {
        await transferSubcategory(selectedManageCategory, selectedManageSubcategory);
        await refreshServices();
        renderServiceAdmin();
        return;
      }
      if (adminStep === 4) {
        const selectedRows = selectedServiceRowsInView();
        if (selectedRows.length === 0) {
          const row = selectedServiceRowElement();
          if (!row) return;
          await transferService(row);
          await refreshServices();
          renderServiceAdmin();
          return;
        }
        const first = selectedRows[0];
        const currentCategory = String(first.dataset.category || "").trim();
        const currentSubcategory = String(first.dataset.subcategory || "").trim();
        if (selectedRows.length > 1) {
          const ok = await askActionConfirm("Transfer Services", `Transfer ${selectedRows.length} selected services?`);
          if (!ok) return;
        }
        const picked = await askServiceTransfer(currentCategory, currentSubcategory);
        if (!picked) return;
        const category = String(picked.category || "").trim();
        const subcategory = String(picked.subcategory || "").trim();
        if (!category || !subcategory) {
          servicesAdminError.textContent = "Target category and subcategory are required.";
          return;
        }
        for (const row of selectedRows) {
          const id = String(row.dataset.id || "").trim();
          if (!id) continue;
          const currentSubsubcategory = String(row.dataset.subsubcategory || "").trim();
          try {
            await api(`/api/services/${encodeURIComponent(id)}`, {
              method: "PATCH",
              body: JSON.stringify({
                category,
                subcategory,
                subSubcategory: currentSubsubcategory,
                changedByStaffId: state.currentStaff?.id || "system"
              })
            });
          } catch (error) {
            if (!isRouteMissingError(error)) throw error;
          }
        }
        selectedManageCategory = category;
        selectedManageSubcategory = subcategory;
        selectedManageSubsubcategory = "";
        adminFilterCategory.value = category;
        adminFilterSubcategory.value = subcategory;
        adminFilterSubsubcategory.value = "";
        selectedManageServiceId = "";
        exitServiceSelectionMode();
        await refreshServices();
        renderServiceAdmin();
        showToast(`Transferred ${selectedRows.length} service(s).`);
      }
    } catch (error) {
      servicesAdminError.textContent = error.message;
    }
  });
}

if (servicesAdminActionToggleBtn) {
  servicesAdminActionToggleBtn.addEventListener("click", async () => {
    try {
      const mode = await askToggleMode();
      if (!mode) return;
      const enable = mode === "enable" || mode === "enable_all";

      if (adminStep === 1) {
        if (mode.endsWith("_all")) {
          setAllCategoriesEnabled(enable);
          return;
        }
        if (!selectedManageCategory) return;
        setCategoryEnabled(selectedManageCategory, enable);
        renderServices();
        renderServiceAdmin();
        return;
      }

      if (adminStep === 2) {
        if (!selectedManageCategory) return;
        if (mode.endsWith("_all")) {
          setAllSubcategoriesEnabled(selectedManageCategory, enable);
          return;
        }
        if (!selectedManageSubcategory) return;
        setSubcategoryEnabled(selectedManageCategory, selectedManageSubcategory, enable);
        renderServices();
        renderServiceAdmin();
        return;
      }

      if (adminStep === 4) {
        if (mode.endsWith("_all")) {
          const scopedCount = getCurrentManagedServices().length;
          if (scopedCount > 1) {
            const ok = await askActionConfirm(enable ? "Enable All Services" : "Disable All Services", `${enable ? "Enable" : "Disable"} ${scopedCount} services?`);
            if (!ok) return;
          }
          await setAllServicesActive(enable);
          exitServiceSelectionMode();
          renderServiceAdmin();
          showToast(`${enable ? "Enabled" : "Disabled"} all services in this view.`);
          return;
        }
        const selectedIds = selectedServiceIdsInView();
        const ids = selectedIds.length > 0
          ? selectedIds
          : [selectedServiceRowElement()?.dataset.id || ""].filter(Boolean);
        if (ids.length === 0) return;
        if (ids.length > 1) {
          const ok = await askActionConfirm(enable ? "Enable Services" : "Disable Services", `${enable ? "Enable" : "Disable"} ${ids.length} selected services?`);
          if (!ok) return;
        }
        for (const id of ids) {
          try {
            await api(`/api/services/${encodeURIComponent(id)}/toggle-active`, {
              method: "PATCH",
              body: JSON.stringify({
                active: enable,
                changedByStaffId: state.currentStaff?.id || "system"
              })
            });
          } catch (error) {
            if (!isRouteMissingError(error)) throw error;
          }
        }
        exitServiceSelectionMode();
        await refreshServices();
        renderServiceAdmin();
        showToast(`${enable ? "Enabled" : "Disabled"} ${ids.length} service(s).`);
      }
    } catch (error) {
      servicesAdminError.textContent = error.message;
    }
  });
}

servicesAdminList.addEventListener("click", async (e) => {
  const checkbox = e.target.closest(".service-select-checkbox[data-service-select-id]");
  if (checkbox) {
    const id = String(checkbox.dataset.serviceSelectId || "");
    if (id) {
      selectedManageServiceIds[id] = checkbox.checked;
    }
    updateSelectedCount();
    return;
  }
  const serviceBtn = e.target.closest(".list-chip[data-service-id]");
  if (!serviceBtn) return;
  selectedManageServiceId = serviceBtn.dataset.serviceId || "";
  renderServiceAdmin();
});

servicesAdminList.addEventListener("dblclick", async (e) => {
  const serviceBtn = e.target.closest(".list-chip[data-service-id]");
  if (!serviceBtn) return;
  selectedManageServiceId = serviceBtn.dataset.serviceId || "";
  renderServiceAdmin();
});

if (servicesAdminSelectAllBtn) {
  servicesAdminSelectAllBtn.addEventListener("click", () => {
    if (adminStep !== 4) return;
    manageSelectMode = !manageSelectMode;
    if (!manageSelectMode) {
      selectedManageServiceIds = {};
    }
    renderServiceAdmin();
    showToast(manageSelectMode ? "Selection mode enabled." : "Selection mode hidden.");
  });

  servicesAdminSelectAllBtn.addEventListener("dblclick", (e) => {
    e.preventDefault();
    if (adminStep !== 4) return;
    manageSelectMode = true;
    const ids = [...servicesAdminList.querySelectorAll(".service-list-item[data-id]")]
      .map((el) => String(el.dataset.id || ""))
      .filter(Boolean);
    if (ids.length === 0) return;
    for (const id of ids) selectedManageServiceIds[id] = true;
    renderServiceAdmin();
    showToast(`Selected all (${ids.length}).`);
  });
}

attachDragReorder(categoryList, ".draggable-item[data-cat]", async () => {
  const visibleOrder = [...categoryList.querySelectorAll(".draggable-item[data-cat]")]
    .map((el) => el.dataset.cat || "")
    .filter(Boolean);
  if (visibleOrder.length === 0) return;
  await api("/api/services/taxonomy/order", {
    method: "PATCH",
    body: JSON.stringify({
      scope: "categories",
      order: visibleOrder
    })
  });
  await refreshServices();
  renderServiceAdmin();
});

attachDragReorder(subcategoryList, ".draggable-item[data-sub]", async () => {
  if (!selectedManageCategory) return;
  const order = [...subcategoryList.querySelectorAll(".draggable-item[data-sub]")]
    .map((el) => el.dataset.sub || "")
    .filter(Boolean);
  if (order.length === 0) return;
  await api("/api/services/taxonomy/order", {
    method: "PATCH",
    body: JSON.stringify({
      scope: "subcategories",
      category: selectedManageCategory,
      order
    })
  });
  await refreshServices();
  renderServiceAdmin();
});

attachDragReorder(subsubcategoryList, ".draggable-item[data-subsub]", async () => {
  if (!selectedManageCategory || !selectedManageSubcategory) return;
  const order = [...subsubcategoryList.querySelectorAll(".draggable-item[data-subsub]")]
    .map((el) => el.dataset.subsub || "")
    .filter(Boolean);
  if (order.length === 0) return;
  await api("/api/services/taxonomy/order", {
    method: "PATCH",
    body: JSON.stringify({
      scope: "subsubcategories",
      category: selectedManageCategory,
      subcategory: selectedManageSubcategory,
      order
    })
  });
  await refreshServices();
  renderServiceAdmin();
});

attachDragReorder(servicesAdminList, ".service-list-item.draggable-item", async () => {
  const orderedIds = [...servicesAdminList.querySelectorAll(".service-list-item.draggable-item")]
    .map((el) => el.dataset.id || "")
    .filter(Boolean);
  if (orderedIds.length === 0) return;

  const currentCategory = adminFilterCategory.value || selectedManageCategory;
  const currentSubcategory = adminFilterSubcategory.value || selectedManageSubcategory;
  const currentSubsubcategory = adminFilterSubsubcategory.value || selectedManageSubsubcategory;
  await api("/api/services/order", {
    method: "PATCH",
    body: JSON.stringify({
      category: currentCategory,
      subcategory: currentSubcategory,
      subSubcategory: currentSubsubcategory,
      ids: orderedIds
    })
  });
  await refreshServices();
  renderServiceAdmin();
});

document.addEventListener("keydown", (e) => {
  const key = String(e.key || "").toLowerCase();

  if ((e.ctrlKey || e.metaKey) && key === "f") {
    if (transactionsDialog?.open && transactionsReferenceSearch) {
      e.preventDefault();
      transactionsReferenceSearch.focus();
      transactionsReferenceSearch.select();
      return;
    }
    if (reportsDialog?.open && reportsRangeOpen) {
      e.preventDefault();
      reportsRangeOpen.focus();
    }
    return;
  }

  if (key !== "escape") return;
  if (inventoryAdjustDialog?.open) {
    e.preventDefault();
    resolveInventoryAdjust(null);
    return;
  }
  if (transactionItemsDialog?.open) {
    e.preventDefault();
    transactionItemsDialog.close();
    return;
  }
  if (dateRangeDialog?.open) {
    e.preventDefault();
    dateRangeDialog.close();
    return;
  }
  if (transactionsDialog?.open) {
    e.preventDefault();
    transactionsDialog.close();
    return;
  }
  if (reportsDialog?.open) {
    e.preventDefault();
    reportsDialog.close();
  }
});

async function init() {
  state.priceModeOverrides = loadPriceModeOverrides();
  state.categoryStatus = loadCategoryStatus();
  state.subcategoryStatus = loadSubcategoryStatus();
  state.subsubcategoryOverrides = loadSubsubcategoryOverrides();
  state.deletedServiceIds = loadDeletedServiceIds();
  setPayment("cash");
  setScreen("login");
  updateClock();
  try {
    await attemptLegacyMigration();
    const payload = await api("/api/auth/staff");
    state.staff = Array.isArray(payload.staff) ? payload.staff : [];
    renderStaffSelect();
  } catch (error) {
    if (String(error.message || "").includes("404")) {
      loginError.textContent = "Startup error: API not found (404). Restart using `npm.cmd start` or `start-pos.bat`.";
      return;
    }
    loginError.textContent = `Startup error: ${error.message}`;
  }
}

setInterval(updateClock, 30000);
init();
