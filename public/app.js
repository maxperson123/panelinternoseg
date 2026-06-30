const storageKey = "intel-multi-panel-config-v1";
const contactStateStorageKey = "elsecuaz-contact-state-v1";
const dbName = "intel-multi-panel-cache";
const dbVersion = 2;
const timeZone = "America/Argentina/Buenos_Aires";
const maxLookbackDaysFallback = 60;
const periodKeys = ["morning", "afternoon", "night", "overnight"];

const elements = {
  topbarKicker: document.querySelector("#topbarKicker"),
  topbarTitle: document.querySelector("#topbarTitle"),
  refreshButton: document.querySelector("#refreshButton"),
  exportButton: document.querySelector("#exportButton"),
  searchInput: document.querySelector("#searchInput"),
  globalStatus: document.querySelector("#globalStatus"),
  globalStatusNote: document.querySelector("#globalStatusNote"),
  overviewZonaSummary: document.querySelector("#overviewZonaSummary"),
  overviewZeusSummary: document.querySelector("#overviewZeusSummary"),
  overviewComparison: document.querySelector("#overviewComparison"),
  navLinks: Array.from(document.querySelectorAll("[data-tab]")),
  openTabButtons: Array.from(document.querySelectorAll("[data-open-tab]")),
  tabViews: {
    overview: document.querySelector("#overviewView"),
    zonaEpic: document.querySelector("#zonaEpicView"),
    zeus: document.querySelector("#zeusView"),
    settings: document.querySelector("#settingsView")
  },
  settingsStatusPill: document.querySelector("#settingsStatusPill"),

  zona: {
    statusPill: document.querySelector("#zonaStatusPill"),
    filterFrom: document.querySelector("#zonaFilterFrom"),
    filterTo: document.querySelector("#zonaFilterTo"),
    interval: document.querySelector("#zonaInterval"),
    syncButton: document.querySelector("#zonaSyncButton"),
    lastSync: document.querySelector("#zonaLastSync"),
    syncNote: document.querySelector("#zonaSyncNote"),
    filteredUsers: document.querySelector("#zonaFilteredUsers"),
    totalUsers: document.querySelector("#zonaTotalUsers"),
    totalLoads: document.querySelector("#zonaTotalLoads"),
    totalAmount: document.querySelector("#zonaTotalAmount"),
    lastSyncDuplicate: document.querySelector("#zonaLastSyncDuplicate"),
    activeFilterLabel: document.querySelector("#zonaActiveFilterLabel"),
    officeFilter: document.querySelector("#zonaOfficeFilter"),
    countFive: document.querySelector("#zonaCountFive"),
    countTen: document.querySelector("#zonaCountTen"),
    countFifteen: document.querySelector("#zonaCountFifteen"),
    listFive: document.querySelector("#zonaListFive"),
    listTen: document.querySelector("#zonaListTen"),
    listFifteen: document.querySelector("#zonaListFifteen"),
    countWeek: document.querySelector("#zonaCountWeek"),
    countMonth: document.querySelector("#zonaCountMonth"),
    weekRanking: document.querySelector("#zonaWeekRanking"),
    monthRanking: document.querySelector("#zonaMonthRanking"),
    periodButtons: Array.from(document.querySelectorAll("[data-zona-period]")),
    amountButtons: Array.from(document.querySelectorAll("[data-zona-amount]")),
    toolPanels: Array.from(document.querySelectorAll("[data-zona-panel]"))
  },

  zeus: {
    statusPill: document.querySelector("#zeusStatusPill"),
    filterFrom: document.querySelector("#zeusFilterFrom"),
    filterTo: document.querySelector("#zeusFilterTo"),
    interval: document.querySelector("#zeusInterval"),
    syncButton: document.querySelector("#zeusSyncButton"),
    lastSync: document.querySelector("#zeusLastSync"),
    syncNote: document.querySelector("#zeusSyncNote"),
    filteredUsers: document.querySelector("#zeusFilteredUsers"),
    totalUsers: document.querySelector("#zeusTotalUsers"),
    totalLoads: document.querySelector("#zeusTotalLoads"),
    totalAmount: document.querySelector("#zeusTotalAmount"),
    lastSyncDuplicate: document.querySelector("#zeusLastSyncDuplicate"),
    activeFilterLabel: document.querySelector("#zeusActiveFilterLabel"),
    officeFilter: document.querySelector("#zeusOfficeFilter"),
    countFive: document.querySelector("#zeusCountFive"),
    countTen: document.querySelector("#zeusCountTen"),
    countFifteen: document.querySelector("#zeusCountFifteen"),
    listFive: document.querySelector("#zeusListFive"),
    listTen: document.querySelector("#zeusListTen"),
    listFifteen: document.querySelector("#zeusListFifteen"),
    countWeek: document.querySelector("#zeusCountWeek"),
    countMonth: document.querySelector("#zeusCountMonth"),
    weekRanking: document.querySelector("#zeusWeekRanking"),
    monthRanking: document.querySelector("#zeusMonthRanking"),
    periodButtons: Array.from(document.querySelectorAll("[data-zeus-period]")),
    amountButtons: Array.from(document.querySelectorAll("[data-zeus-amount]")),
    toolPanels: Array.from(document.querySelectorAll("[data-zeus-panel]"))
  },

  settings: {
    zonaBaseUrl: document.querySelector("#settingsZonaBaseUrl"),
    zonaSessionId: document.querySelector("#settingsZonaSessionId"),
    zonaToken: document.querySelector("#settingsZonaToken"),
    zeusBaseUrl: document.querySelector("#settingsZeusBaseUrl"),
    zeusUsername: document.querySelector("#settingsZeusUsername"),
    zeusPassword: document.querySelector("#settingsZeusPassword"),
    saveZonaButton: document.querySelector("#saveZonaSettingsButton"),
    saveZeusButton: document.querySelector("#saveZeusSettingsButton")
  }
};

const state = {
  activeTab: "overview",
  searchQuery: "",
  defaults: {
    contactsDirectory: {
      offices: []
    },
    providers: {
      zonaEpic: {
        baseUrl: "https://admin.zonaepic.vip",
        sessionId: "",
        token: "",
        fullImportStart: "2025-01-01"
      },
      zeus: {
        baseUrl: "https://admin.casinozeus.tech",
        username: "",
        password: ""
      }
    }
  },
  config: {
    zonaEpic: {
      baseUrl: "",
      sessionId: "",
      token: "",
      filterFrom: "",
      filterTo: "",
      interval: 15000
    },
    zeus: {
      baseUrl: "",
      username: "",
      password: "",
      filterFrom: "",
      filterTo: "",
      interval: 30000
    }
  },
  providerData: {
    zonaEpic: null,
    zeus: null
  },
  providerErrors: {
    zonaEpic: "",
    zeus: ""
  },
  syncTimers: {
    zonaEpic: null,
    zeus: null
  },
  syncing: {
    zonaEpic: false,
    zeus: false
  },
  syncProgress: {
    zonaEpic: "",
    zeus: ""
  },
  zonaFilters: {
    office: "all",
    period: "all",
    amount: "all"
  },
  zeusFilters: {
    office: "all",
    period: "all",
    amount: "all"
  },
  panelState: {
    zonaEpic: {
      five: { filterField: "amount", filterOperator: "all", filterValue: "", sortField: "date", sortDirection: "desc" },
      ten: { filterField: "amount", filterOperator: "all", filterValue: "", sortField: "date", sortDirection: "desc" },
      fifteen: { filterField: "amount", filterOperator: "all", filterValue: "", sortField: "date", sortDirection: "desc" },
      week: { filterField: "amount", filterOperator: "all", filterValue: "", sortField: "amount", sortDirection: "desc" },
      month: { filterField: "amount", filterOperator: "all", filterValue: "", sortField: "amount", sortDirection: "desc" }
    },
    zeus: {
      five: { filterField: "amount", filterOperator: "all", filterValue: "", sortField: "date", sortDirection: "desc" },
      ten: { filterField: "amount", filterOperator: "all", filterValue: "", sortField: "date", sortDirection: "desc" },
      fifteen: { filterField: "amount", filterOperator: "all", filterValue: "", sortField: "date", sortDirection: "desc" },
      week: { filterField: "amount", filterOperator: "all", filterValue: "", sortField: "amount", sortDirection: "desc" },
      month: { filterField: "amount", filterOperator: "all", filterValue: "", sortField: "amount", sortDirection: "desc" }
    }
  },
  currentViews: {
    zonaEpic: null,
    zeus: null
  },
  contactedUsers: {},
  contactMatchCache: new Map()
};

let dbPromise;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultDateRange(days) {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - days);

  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10)
  };
}

function getProviderMaxLookbackDays(providerKey) {
  return Number(state.defaults.providers?.[providerKey]?.maxLookbackDays || maxLookbackDaysFallback);
}

function getEarliestAllowedIsoDate(maxLookbackDays = maxLookbackDaysFallback) {
  const earliest = new Date();
  earliest.setHours(0, 0, 0, 0);
  earliest.setDate(earliest.getDate() - (maxLookbackDays - 1));
  return earliest.toISOString().slice(0, 10);
}

function normalizeDateRange(from, to, maxLookbackDays = maxLookbackDaysFallback) {
  const today = todayIsoDate();
  const earliestAllowed = getEarliestAllowedIsoDate(maxLookbackDays);
  let safeFrom = from || "";
  let safeTo = to || today;

  if (safeTo > today) {
    safeTo = today;
  }

  if (safeTo < earliestAllowed) {
    safeTo = earliestAllowed;
  }

  if (safeFrom < earliestAllowed) {
    safeFrom = earliestAllowed;
  }

  if (!safeFrom || safeFrom > safeTo) {
    safeFrom = safeTo;
  }

  return { from: safeFrom, to: safeTo };
}

function normalizeBaseUrl(rawValue, fallback) {
  const input = String(rawValue || fallback).trim();

  try {
    return new URL(input).origin;
  } catch {
    return input.replace(/\/+$/, "").replace(/\/report_balances\.php$/i, "");
  }
}

function normalizeSearchQuery(value) {
  return String(value || "").trim().toLowerCase();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone
  }).format(new Date(value));
}

function formatClock(value) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loadStoredConfig() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    return {};
  }
}

function saveStoredConfig() {
  localStorage.setItem(storageKey, JSON.stringify(state.config));
}

function loadContactedUsers() {
  try {
    return JSON.parse(localStorage.getItem(contactStateStorageKey) || "{}");
  } catch {
    return {};
  }
}

function saveContactedUsers() {
  localStorage.setItem(contactStateStorageKey, JSON.stringify(state.contactedUsers));
}

function getContactedUserKey(providerKey, username) {
  return `${providerKey}::${normalizeSearchQuery(username)}`;
}

function isUserContacted(providerKey, username) {
  return Boolean(state.contactedUsers[getContactedUserKey(providerKey, username)]);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }

  return payload;
}

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  return Promise.resolve();
}

function downloadTextFile(filename, content, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function getAmountBucket(amount) {
  if (amount >= 30000) {
    return "large";
  }
  if (amount >= 10000) {
    return "medium";
  }
  if (amount >= 3000) {
    return "small";
  }
  return "other";
}

function parseMetricValue(field, rawValue) {
  if (!rawValue) {
    return null;
  }

  if (field === "date") {
    const parsed = new Date(`${rawValue}T00:00:00-03:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  const normalized = Number(String(rawValue || "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(normalized) ? normalized : null;
}

function getItemMetric(item, field) {
  if (field === "amount") {
    return item.metricAmount ?? 0;
  }
  if (field === "loads") {
    return item.metricLoads ?? 0;
  }
  return item.metricDate ?? 0;
}

function applyPanelControls(items, panelKey, providerKey) {
  const toolState = state.panelState[providerKey][panelKey];
  const filterValue = parseMetricValue(toolState.filterField, toolState.filterValue);

  const filtered = items.filter((item) => {
    if (toolState.filterOperator === "all" || filterValue === null) {
      return true;
    }

    const itemValue = getItemMetric(item, toolState.filterField);

    if (toolState.filterOperator === "gte") {
      return itemValue >= filterValue;
    }

    if (toolState.filterOperator === "lte") {
      return itemValue <= filterValue;
    }

    return true;
  });

  return filtered.sort((left, right) => {
    const leftValue = getItemMetric(left, toolState.sortField);
    const rightValue = getItemMetric(right, toolState.sortField);
    const direction = toolState.sortDirection === "asc" ? 1 : -1;

    if (leftValue === rightValue) {
      const fallbackLeft = left.username || left.operation || left.dateDisplay || "";
      const fallbackRight = right.username || right.operation || right.dateDisplay || "";
      return fallbackLeft.localeCompare(fallbackRight) * direction;
    }

    return (leftValue - rightValue) * direction;
  });
}

function openCacheDb() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "cacheKey" });
      }

      if (!db.objectStoreNames.contains("rows")) {
        const rowsStore = db.createObjectStore("rows", { keyPath: "id" });
        rowsStore.createIndex("cacheKeyDate", ["cacheKey", "dateMs"], { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function withStore(storeName, mode, handler) {
  const db = await openCacheDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let result;

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);

    Promise.resolve(handler(store, transaction))
      .then((value) => {
        result = value;
      })
      .catch((error) => {
        transaction.abort();
        reject(error);
      });
  });
}

async function getCacheMeta(cacheKey) {
  return withStore("meta", "readonly", (store) => {
    return new Promise((resolve, reject) => {
      const request = store.get(cacheKey);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  });
}

async function putCacheMeta(meta) {
  return withStore("meta", "readwrite", (store) => {
    store.put(meta);
  });
}

function parseZonaLoadDate(rawValue) {
  const cleaned = String(rawValue || "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const match = cleaned.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, day, month, year, hours, minutes, seconds] = match;
  return {
    raw: cleaned,
    date: new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`),
    hour: Number(hours)
  };
}

function normalizeZonaAmount(value) {
  if (typeof value !== "string") {
    return Number(value || 0);
  }

  return Number(value.replace(/\./g, "").replace(",", "."));
}

async function putCachedRows(cacheKey, rows) {
  if (!rows.length) {
    return;
  }

  await withStore("rows", "readwrite", (store) => {
    for (const row of rows) {
      const parsedDate = parseZonaLoadDate(row[0]);
      if (!parsedDate) {
        continue;
      }

      store.put({
        id: `${cacheKey}::${row.join("|")}`,
        cacheKey,
        dateMs: parsedDate.date.getTime(),
        row
      });
    }
  });
}

async function getCachedRowsInRange(cacheKey, fromIsoDate, toIsoDate) {
  const fromMs = new Date(`${fromIsoDate}T00:00:00-03:00`).getTime();
  const toMs = new Date(`${toIsoDate}T23:59:59.999-03:00`).getTime();

  return withStore("rows", "readonly", (store) => {
    const index = store.index("cacheKeyDate");
    const range = IDBKeyRange.bound([cacheKey, fromMs], [cacheKey, toMs]);

    return new Promise((resolve, reject) => {
      const rows = [];
      const request = index.openCursor(range);

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(rows);
          return;
        }

        rows.push(cursor.value.row);
        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  });
}

function addDaysToIso(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00-03:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromDate, toDate) {
  return Math.floor((toDate.getTime() - fromDate.getTime()) / 86400000);
}

function getPeriodByHour(hour) {
  if (hour >= 6 && hour < 12) {
    return "morning";
  }
  if (hour >= 12 && hour < 18) {
    return "afternoon";
  }
  if (hour >= 18 && hour < 24) {
    return "night";
  }
  return "overnight";
}

function getInactivityBucket(daysSinceLastLoad) {
  if (daysSinceLastLoad >= 45 && daysSinceLastLoad <= 60) {
    return "fifteen";
  }
  if (daysSinceLastLoad >= 30 && daysSinceLastLoad < 45) {
    return "ten";
  }
  if (daysSinceLastLoad >= 10 && daysSinceLastLoad < 30) {
    return "five";
  }
  return null;
}

function normalizeContactSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getMatchedContactsForUsername(username) {
  const normalizedUsername = normalizeContactSearchText(username);
  if (!normalizedUsername || normalizedUsername.length < 4) {
    return { officeLabel: "", officeKey: "", phoneLabels: [] };
  }
  if (state.contactMatchCache.has(normalizedUsername)) {
    return state.contactMatchCache.get(normalizedUsername);
  }
  const matches = (state.defaults.contactsDirectory?.offices || [])
    .map((office) => {
      const phoneLabels = Array.from(
        new Set(
          (office.entries || [])
            .filter((entry) => String(entry.searchText || "").includes(normalizedUsername))
            .map((entry) => entry.phoneLabel)
        )
      );

      return {
        officeLabel: office.officeLabel,
        officeKey: office.officeKey,
        phoneLabels
      };
    })
    .filter((office) => office.phoneLabels.length);

  if (!matches.length) {
    const emptyMatch = { officeLabel: "", officeKey: "", phoneLabels: [] };
    state.contactMatchCache.set(normalizedUsername, emptyMatch);
    return emptyMatch;
  }

  const bestMatch = matches.sort((left, right) => right.phoneLabels.length - left.phoneLabels.length)[0];
  state.contactMatchCache.set(normalizedUsername, bestMatch);
  return bestMatch;
}

function buildZonaTopRanking(rows, days) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const usersMap = new Map();

  for (const row of rows) {
    const parsedDate = parseZonaLoadDate(row[0]);
    const amount = normalizeZonaAmount(row[4]);
    const username = String(row[2] || "").trim();

    if (!parsedDate || !username || amount <= 0 || parsedDate.date < cutoff) {
      continue;
    }

    const current = usersMap.get(username) || {
      username,
      totalAmount: 0,
      loadsCount: 0,
      lastLoadAt: parsedDate.date
    };

    current.totalAmount += amount;
    current.loadsCount += 1;
    if (parsedDate.date > current.lastLoadAt) {
      current.lastLoadAt = parsedDate.date;
    }

    usersMap.set(username, current);
  }

  return Array.from(usersMap.values())
    .sort((left, right) => {
      if (right.totalAmount !== left.totalAmount) {
        return right.totalAmount - left.totalAmount;
      }

      return right.loadsCount - left.loadsCount;
    })
    .slice(0, 100)
    .map((user, index) => {
      const contactsMatch = getMatchedContactsForUsername(user.username);

      return {
        rank: index + 1,
        username: user.username,
        totalAmount: user.totalAmount,
        loadsCount: user.loadsCount,
        lastLoadAtDisplay: formatDateTime(user.lastLoadAt),
        officeLabel: contactsMatch.officeLabel,
        officeKey: contactsMatch.officeKey,
        phoneLabels: contactsMatch.phoneLabels,
        providerKey: "zonaEpic",
        metricAmount: user.totalAmount,
        metricLoads: user.loadsCount,
        metricDate: user.lastLoadAt.getTime()
      };
    });
}

function buildZonaAnalytics(rows) {
  const usersMap = new Map();
  const now = new Date();
  const loadRows = rows.filter((row) => normalizeZonaAmount(row[4]) > 0);

  for (const row of loadRows) {
    const parsedDate = parseZonaLoadDate(row[0]);
    const amount = normalizeZonaAmount(row[4]);
    const user = String(row[2] || row[1] || "").trim();

    if (!parsedDate || !user) {
      continue;
    }

    const period = getPeriodByHour(parsedDate.hour);
    const amountBucket = getAmountBucket(amount);
    const current = usersMap.get(user) || {
      username: user,
      loadsCount: 0,
      totalAmount: 0,
      lastLoadDate: parsedDate.date,
      periodCounts: { morning: 0, afternoon: 0, night: 0, overnight: 0 }
    };

    current.loadsCount += 1;
    current.totalAmount += amount;
    current.periodCounts[period] += 1;
    current.amountBucket = amountBucket;

    if (parsedDate.date >= current.lastLoadDate) {
      current.lastLoadDate = parsedDate.date;
    }

    usersMap.set(user, current);
  }

  const users = Array.from(usersMap.values()).map((user) => {
    const preferredPeriod = periodKeys.reduce((best, current) => {
      return user.periodCounts[current] > user.periodCounts[best] ? current : best;
    }, "morning");
    const averageAmount = user.loadsCount ? user.totalAmount / user.loadsCount : 0;
    const daysSinceLastLoad = daysBetween(user.lastLoadDate, now);
    const contactsMatch = getMatchedContactsForUsername(user.username);

    return {
      username: user.username,
      loadsCount: user.loadsCount,
      totalAmount: user.totalAmount,
      averageAmount,
      lastLoadAt: user.lastLoadDate.toISOString(),
      lastLoadAtDisplay: formatDateTime(user.lastLoadDate),
      preferredPeriod,
      preferredAmountBucket: getAmountBucket(averageAmount),
      daysSinceLastLoad,
      inactivityBucket: getInactivityBucket(daysSinceLastLoad),
      officeLabel: contactsMatch.officeLabel,
      officeKey: contactsMatch.officeKey,
      phoneLabels: contactsMatch.phoneLabels,
      providerKey: "zonaEpic",
      metricAmount: averageAmount,
      metricLoads: user.loadsCount,
      metricDate: user.lastLoadDate.getTime()
    };
  });

  const offices = Array.from(
    users.reduce((accumulator, user) => {
      if (!user.officeKey) {
        return accumulator;
      }

      accumulator.set(user.officeKey, {
        key: user.officeKey,
        label: user.officeLabel,
        count: (accumulator.get(user.officeKey)?.count || 0) + 1
      });
      return accumulator;
    }, new Map()).values()
  ).sort((left, right) => right.count - left.count);

  return {
    summary: {
      uniqueUsers: users.length,
      totalLoads: users.reduce((sum, user) => sum + user.loadsCount, 0),
      totalAmount: users.reduce((sum, user) => sum + user.totalAmount, 0),
      inactiveFive: users.filter((user) => user.inactivityBucket === "five").length,
      inactiveTen: users.filter((user) => user.inactivityBucket === "ten").length,
      inactiveFifteen: users.filter((user) => user.inactivityBucket === "fifteen").length
    },
    rankings: {
      week: buildZonaTopRanking(loadRows, 7),
      month: buildZonaTopRanking(loadRows, 30)
    },
    offices,
    users: users.sort((left, right) => right.daysSinceLastLoad - left.daysSinceLastLoad)
  };
}

function getZonaCacheKey() {
  const config = state.config.zonaEpic;
  const baseUrl = normalizeBaseUrl(config.baseUrl, state.defaults.providers.zonaEpic.baseUrl);
  const fingerprint = String(config.sessionId || "").trim().slice(0, 16) || "*";
  return `${baseUrl}::${fingerprint}`;
}

async function fetchZonaWindow(runtimeConfig, windowFrom, windowTo) {
  return fetchJson("/api/zonaepic/window", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      baseUrl: runtimeConfig.baseUrl,
      sessionId: runtimeConfig.sessionId,
      token: runtimeConfig.token,
      windowFrom,
      windowTo
    })
  });
}

async function syncZonaBrowserCache(runtimeConfig) {
  const cacheKey = getZonaCacheKey();
  const meta = await getCacheMeta(cacheKey);
  const requestedFrom = runtimeConfig.filterFrom;
  const requestedTo = runtimeConfig.filterTo;
  const configuredImportStart = (state.defaults.providers.zonaEpic.fullImportStart || "2025-01-01").slice(0, 10);
  const fullImportStart = configuredImportStart > requestedFrom ? configuredImportStart : requestedFrom;

  let mode = "incremental";
  let importCursor = meta?.latestSyncedTo || null;
  let importedFrom = meta?.importedFrom || null;
  let skippedRanges = meta?.skippedRanges || [];
  let firstSuccessFound = Boolean(importedFrom);

  if (!meta) {
    mode = "full_import";
    importCursor = addDaysToIso(fullImportStart, -1);
  }

  let current = addDaysToIso(importCursor || fullImportStart, 1);
  if (current < requestedFrom) {
    current = requestedFrom;
  }
  const finalDay = todayIsoDate();
  let steps = 0;
  let totalDays = 0;

  for (let probe = current; probe <= finalDay; probe = addDaysToIso(probe, 1)) {
    totalDays += 1;
  }

  while (current <= finalDay) {
    steps += 1;
    setProviderProgress(
      "zonaEpic",
      mode === "full_import"
        ? `Importando ${steps}/${totalDays}...`
        : `Actualizando ${steps}/${totalDays}...`
    );

    try {
      const payload = await fetchZonaWindow(runtimeConfig, current, current);
      await putCachedRows(cacheKey, payload.rows || []);

      if (!firstSuccessFound) {
        importedFrom = payload.meta?.importedFrom?.slice(0, 10) || payload.meta?.filterFrom || current;
        firstSuccessFound = true;
      }
    } catch (error) {
      if (!firstSuccessFound && /historico inicial/i.test(error.message)) {
        current = addDaysToIso(current, 1);
        continue;
      }

      throw error;
    }

    await putCacheMeta({
      cacheKey,
      importedFrom: importedFrom || current,
      latestSyncedTo: current,
      syncedAt: new Date().toISOString(),
      skippedRanges
    });

    current = addDaysToIso(current, 1);
  }

  const finalMeta = {
    cacheKey,
    importedFrom: importedFrom || requestedFrom,
    latestSyncedTo: finalDay,
    syncedAt: new Date().toISOString(),
    skippedRanges
  };

  await putCacheMeta(finalMeta);
  const rows = await getCachedRowsInRange(cacheKey, requestedFrom, requestedTo);

  return {
    meta: {
      provider: "zonaEpic",
      fetchedAt: finalMeta.syncedAt,
      filterFrom: requestedFrom,
      filterTo: requestedTo,
      cacheMode: mode,
      importedFrom: finalMeta.importedFrom,
      skippedRanges
    },
    rows,
    analytics: buildZonaAnalytics(rows)
  };
}

function setProviderStatus(providerKey, text) {
  state.syncProgress[providerKey] = text;
  if (providerKey === "zonaEpic") {
    elements.zona.statusPill.textContent = text;
  } else {
    elements.zeus.statusPill.textContent = text;
  }
}

function setProviderProgress(providerKey, text) {
  state.syncProgress[providerKey] = text;
  setProviderStatus(providerKey, text);
}

function isZonaConfigured() {
  const config = state.config.zonaEpic;
  return Boolean(config.baseUrl && config.sessionId);
}

function isZeusConfigured() {
  const config = state.config.zeus;
  return Boolean(config.baseUrl && config.username && config.password);
}

async function syncZonaEpic() {
  if (state.syncing.zonaEpic) {
    return;
  }

  if (!isZonaConfigured()) {
    state.providerErrors.zonaEpic = "Faltan credenciales de ZonaEpic en Settings.";
    state.providerData.zonaEpic = null;
    renderAll();
    return;
  }

  state.syncing.zonaEpic = true;
  state.syncProgress.zonaEpic = "Preparando sincronización...";
  state.providerErrors.zonaEpic = "";
  renderAll();

  try {
    const normalized = normalizeDateRange(
      state.config.zonaEpic.filterFrom,
      state.config.zonaEpic.filterTo,
      getProviderMaxLookbackDays("zonaEpic")
    );
    state.config.zonaEpic.filterFrom = normalized.from;
    state.config.zonaEpic.filterTo = normalized.to;
    saveStoredConfig();

    const payload = await syncZonaBrowserCache({
      baseUrl: normalizeBaseUrl(state.config.zonaEpic.baseUrl, state.defaults.providers.zonaEpic.baseUrl),
      sessionId: state.config.zonaEpic.sessionId,
      token: state.config.zonaEpic.token,
      filterFrom: normalized.from,
      filterTo: normalized.to
    });

    state.providerData.zonaEpic = payload;
    state.providerErrors.zonaEpic = "";
  } catch (error) {
    state.providerErrors.zonaEpic = error.message;
    state.providerData.zonaEpic = null;
  } finally {
    state.syncing.zonaEpic = false;
    state.syncProgress.zonaEpic = "";
    renderAll();
  }
}

async function syncZeus() {
  if (state.syncing.zeus) {
    return;
  }

  if (!isZeusConfigured()) {
    state.providerErrors.zeus = "Faltan credenciales de Zeus en Settings.";
    state.providerData.zeus = null;
    renderAll();
    return;
  }

  state.syncing.zeus = true;
  state.syncProgress.zeus = "Sincronizando Zeus...";
  state.providerErrors.zeus = "";
  renderAll();

  try {
    const normalized = normalizeDateRange(
      state.config.zeus.filterFrom,
      state.config.zeus.filterTo,
      getProviderMaxLookbackDays("zeus")
    );
    state.config.zeus.filterFrom = normalized.from;
    state.config.zeus.filterTo = normalized.to;
    saveStoredConfig();

    const payload = await fetchJson("/api/zeus/snapshot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        baseUrl: normalizeBaseUrl(state.config.zeus.baseUrl, state.defaults.providers.zeus.baseUrl),
        username: state.config.zeus.username,
        password: state.config.zeus.password,
        filterFrom: normalized.from,
        filterTo: normalized.to
      })
    });

    state.providerData.zeus = payload;
    state.providerErrors.zeus = "";
  } catch (error) {
    state.providerErrors.zeus = error.message;
    state.providerData.zeus = null;
  } finally {
    state.syncing.zeus = false;
    state.syncProgress.zeus = "";
    renderAll();
  }
}

async function syncAllProviders() {
  await Promise.all([syncZonaEpic(), syncZeus()]);
}

function applyZonaSearch(items) {
  if (!state.searchQuery) {
    return items;
  }

  return items.filter((item) =>
    [item.username, item.lastLoadAtDisplay, item.averageAmount, item.loadsCount]
      .join(" ")
      .toLowerCase()
      .includes(state.searchQuery)
  );
}

function applyZonaFilters(users) {
  return users.filter((user) => {
    const byOffice =
      state.zonaFilters.office === "all" || user.officeKey === state.zonaFilters.office;
    const byPeriod =
      state.zonaFilters.period === "all" || user.preferredPeriod === state.zonaFilters.period;
    const byAmount =
      state.zonaFilters.amount === "all" ||
      user.preferredAmountBucket === state.zonaFilters.amount;
    return byOffice && byPeriod && byAmount;
  });
}

function renderZonaUserCard(user) {
  const providerKey = user.providerKey || "zonaEpic";
  const ownershipMeta = [
    user.officeLabel ? `Oficina: ${escapeHtml(user.officeLabel)}` : "",
    user.phoneLabels?.length ? `Teléfonos: ${escapeHtml(user.phoneLabels.join(", "))}` : ""
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <article class="userCard copyableCard" data-provider="${escapeHtml(providerKey)}" data-username="${escapeHtml(user.username)}">
      <header>
        <button type="button" class="copyUsernameButton" data-copy-username="${escapeHtml(user.username)}">
          ${escapeHtml(user.username)}
        </button>
        <label class="contactToggle">
          <input type="checkbox" data-contacted-toggle="${escapeHtml(providerKey)}::${escapeHtml(user.username)}" ${isUserContacted(providerKey, user.username) ? "checked" : ""} />
          <span>Contactado</span>
        </label>
        <span>${formatCurrency(user.averageAmount)}</span>
      </header>
      <dl>
        <div>
          <dt>Promedio histórico</dt>
          <dd>${formatCurrency(user.averageAmount)}</dd>
        </div>
        <div>
          <dt>Cantidad de cargas</dt>
          <dd>${user.loadsCount}</dd>
        </div>
      </dl>
      <p class="meta">Última carga: ${escapeHtml(user.lastLoadAtDisplay)} · ${user.daysSinceLastLoad} días inactivo</p>
      ${ownershipMeta ? `<p class="meta">${ownershipMeta}</p>` : ""}
    </article>
  `;
}

function renderZonaRankingItem(item) {
  const providerKey = item.providerKey || "zonaEpic";
  const ownershipMeta = [
    item.officeLabel ? `Oficina: ${escapeHtml(item.officeLabel)}` : "",
    item.phoneLabels?.length ? `Teléfonos: ${escapeHtml(item.phoneLabels.join(", "))}` : ""
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <article class="rankingItem copyableCard" data-provider="${escapeHtml(providerKey)}" data-username="${escapeHtml(item.username)}">
      <div class="rankingTop">
        <button type="button" class="copyUsernameButton" data-copy-username="${escapeHtml(item.username)}">
          #${item.rank} ${escapeHtml(item.username)}
        </button>
        <label class="contactToggle">
          <input type="checkbox" data-contacted-toggle="${escapeHtml(providerKey)}::${escapeHtml(item.username)}" ${isUserContacted(providerKey, item.username) ? "checked" : ""} />
          <span>Contactado</span>
        </label>
        <span>${formatCurrency(item.totalAmount)}</span>
      </div>
      <div class="rankingMeta">
        <span>${item.loadsCount} cargas</span>
        <span>${escapeHtml(item.lastLoadAtDisplay)}</span>
      </div>
      ${ownershipMeta ? `<p class="meta">${ownershipMeta}</p>` : ""}
    </article>
  `;
}

function renderList(element, items, itemRenderer, emptyMessage) {
  if (!items.length) {
    element.innerHTML = `<p class="empty">${escapeHtml(emptyMessage)}</p>`;
    return;
  }

  element.innerHTML = items.map(itemRenderer).join("");
}

function withProviderKey(items, providerKey) {
  return items.map((item) => ({ ...item, providerKey }));
}

function renderZonaView() {
  const payload = state.providerData.zonaEpic;
  const minDate = getEarliestAllowedIsoDate(getProviderMaxLookbackDays("zonaEpic"));
  const maxDate = todayIsoDate();
  elements.zona.filterFrom.min = minDate;
  elements.zona.filterFrom.max = maxDate;
  elements.zona.filterTo.min = minDate;
  elements.zona.filterTo.max = maxDate;
  elements.zona.filterFrom.value = state.config.zonaEpic.filterFrom;
  elements.zona.filterTo.value = state.config.zonaEpic.filterTo;
  elements.zona.interval.value = String(state.config.zonaEpic.interval);
  syncOfficeFilterOptions(elements.zona.officeFilter, payload?.analytics?.offices, state.zonaFilters.office);

  if (state.syncing.zonaEpic) {
    elements.zona.statusPill.textContent = state.syncProgress.zonaEpic || "Sincronizando...";
  } else if (state.providerErrors.zonaEpic) {
    elements.zona.statusPill.textContent = state.providerErrors.zonaEpic;
  } else if (payload) {
    elements.zona.statusPill.textContent = "ZonaEpic actualizado";
  } else {
    elements.zona.statusPill.textContent = "Sincronización pendiente";
  }

  if (!payload) {
    const message = state.providerErrors.zonaEpic || "Esperando datos de ZonaEpic.";
    elements.zona.lastSync.textContent = "-";
    elements.zona.syncNote.textContent = message;
    elements.zona.filteredUsers.textContent = "-";
    elements.zona.totalUsers.textContent = "-";
    elements.zona.totalLoads.textContent = "-";
    elements.zona.totalAmount.textContent = "-";
    elements.zona.lastSyncDuplicate.textContent = "-";
    elements.zona.countFive.textContent = "0";
    elements.zona.countTen.textContent = "0";
    elements.zona.countFifteen.textContent = "0";
    elements.zona.countWeek.textContent = "0";
    elements.zona.countMonth.textContent = "0";
    elements.zona.activeFilterLabel.textContent = "Mostrando todos los usuarios.";
    renderList(elements.zona.listFive, [], () => "", message);
    renderList(elements.zona.listTen, [], () => "", message);
    renderList(elements.zona.listFifteen, [], () => "", message);
    renderList(elements.zona.weekRanking, [], () => "", message);
    renderList(elements.zona.monthRanking, [], () => "", message);
    state.currentViews.zonaEpic = null;
    return;
  }

  const filteredUsers = applyZonaSearch(applyZonaFilters(payload.analytics.users));
  const five = applyPanelControls(
    filteredUsers.filter((user) => user.inactivityBucket === "five"),
    "five",
    "zonaEpic"
  );
  const ten = applyPanelControls(
    filteredUsers.filter((user) => user.inactivityBucket === "ten"),
    "ten",
    "zonaEpic"
  );
  const fifteen = applyPanelControls(
    filteredUsers.filter((user) => user.inactivityBucket === "fifteen"),
    "fifteen",
    "zonaEpic"
  );
  const weekRanking = applyZonaSearch(
    applyPanelControls(payload.analytics.rankings.week, "week", "zonaEpic")
  );
  const monthRanking = applyZonaSearch(
    applyPanelControls(payload.analytics.rankings.month, "month", "zonaEpic")
  );
  const filteredLoads = filteredUsers.reduce((sum, item) => sum + item.loadsCount, 0);
  const filteredAmount = filteredUsers.reduce((sum, item) => sum + item.totalAmount, 0);

  elements.zona.lastSync.textContent = formatClock(payload.meta.fetchedAt);
  elements.zona.syncNote.textContent =
    payload.meta.cacheMode === "full_import"
      ? "Importación local limitada a los últimos 60 días"
      : "Cache incremental local de los últimos 60 días"
  ;
  elements.zona.filteredUsers.textContent = String(filteredUsers.length);
  elements.zona.totalUsers.textContent = String(payload.analytics.summary.uniqueUsers);
  elements.zona.totalLoads.textContent = String(filteredLoads);
  elements.zona.totalAmount.textContent = formatCurrency(filteredAmount);
  elements.zona.lastSyncDuplicate.textContent = formatClock(payload.meta.fetchedAt);
  elements.zona.countFive.textContent = String(five.length);
  elements.zona.countTen.textContent = String(ten.length);
  elements.zona.countFifteen.textContent = String(fifteen.length);
  elements.zona.countWeek.textContent = String(weekRanking.length);
  elements.zona.countMonth.textContent = String(monthRanking.length);

  const searchNote = state.searchQuery ? ` Búsqueda: "${state.searchQuery}".` : "";
  const officeLabel =
    state.zonaFilters.office === "all"
      ? "todas las oficinas"
      : payload.analytics.offices.find((office) => office.key === state.zonaFilters.office)?.label || "oficina filtrada";
  elements.zona.activeFilterLabel.textContent =
    `Mostrando ${filteredUsers.length} de ${payload.analytics.summary.uniqueUsers} usuarios para ${officeLabel}, ${getZonaPeriodLabel(state.zonaFilters.period)} y ${getZonaAmountLabel(state.zonaFilters.amount)}.${searchNote}`;

  renderList(elements.zona.listFive, withProviderKey(five, "zonaEpic"), renderZonaUserCard, "No hay usuarios para este filtro.");
  renderList(elements.zona.listTen, withProviderKey(ten, "zonaEpic"), renderZonaUserCard, "No hay usuarios para este filtro.");
  renderList(elements.zona.listFifteen, withProviderKey(fifteen, "zonaEpic"), renderZonaUserCard, "No hay usuarios para este filtro.");
  renderList(elements.zona.weekRanking, withProviderKey(weekRanking, "zonaEpic"), renderZonaRankingItem, "No hay jugadores para este ranking.");
  renderList(elements.zona.monthRanking, withProviderKey(monthRanking, "zonaEpic"), renderZonaRankingItem, "No hay jugadores para este ranking.");

  state.currentViews.zonaEpic = {
    filteredUsers,
    five,
    ten,
    fifteen,
    weekRanking,
    monthRanking,
    summary: {
      filteredUsers: filteredUsers.length,
      totalUsers: payload.analytics.summary.uniqueUsers,
      filteredLoads,
      filteredAmount
    }
  };
}

function getZonaPeriodLabel(value) {
  return {
    all: "todos los horarios",
    morning: "mañana",
    afternoon: "tarde",
    night: "noche",
    overnight: "madrugada"
  }[value] || "todos los horarios";
}

function getZonaAmountLabel(value) {
  return {
    all: "todos los montos",
    small: "monto chico",
    medium: "monto mediano",
    large: "monto grande"
  }[value] || "todos los montos";
}

function syncOfficeFilterOptions(select, offices, selectedValue) {
  if (!select) {
    return;
  }

  const normalizedOffices = Array.isArray(offices) ? offices : [];
  select.innerHTML = [
    '<option value="all">Todas las oficinas</option>',
    ...normalizedOffices.map(
      (office) => `<option value="${escapeHtml(office.key)}">${escapeHtml(office.label)} (${office.count})</option>`
    )
  ].join("");
  select.value = normalizedOffices.some((office) => office.key === selectedValue) ? selectedValue : "all";
}

function applyZeusFilters(users) {
  return users.filter((user) => {
    const byOffice =
      state.zeusFilters.office === "all" || user.officeKey === state.zeusFilters.office;
    const byPeriod =
      state.zeusFilters.period === "all" || user.preferredPeriod === state.zeusFilters.period;
    const byAmount =
      state.zeusFilters.amount === "all" ||
      user.preferredAmountBucket === state.zeusFilters.amount;
    return byOffice && byPeriod && byAmount;
  });
}

function applyZeusSearch(items) {
  if (!state.searchQuery) {
    return items;
  }

  return items.filter((item) =>
    [
      item.username,
      item.lastLoadAtDisplay,
      item.averageAmount,
      item.loadsCount,
      item.totalAmount,
      item.officeLabel,
      (item.phoneLabels || []).join(" ")
    ]
      .join(" ")
      .toLowerCase()
      .includes(state.searchQuery)
  );
}

function renderZeusView() {
  const payload = state.providerData.zeus;
  const minDate = getEarliestAllowedIsoDate(getProviderMaxLookbackDays("zeus"));
  const maxDate = todayIsoDate();
  elements.zeus.filterFrom.min = minDate;
  elements.zeus.filterFrom.max = maxDate;
  elements.zeus.filterTo.min = minDate;
  elements.zeus.filterTo.max = maxDate;
  elements.zeus.filterFrom.value = state.config.zeus.filterFrom;
  elements.zeus.filterTo.value = state.config.zeus.filterTo;
  elements.zeus.interval.value = String(state.config.zeus.interval);
  syncOfficeFilterOptions(elements.zeus.officeFilter, payload?.analytics?.offices, state.zeusFilters.office);

  if (state.syncing.zeus) {
    elements.zeus.statusPill.textContent = state.syncProgress.zeus || "Sincronizando...";
  } else if (state.providerErrors.zeus) {
    elements.zeus.statusPill.textContent = state.providerErrors.zeus;
  } else if (payload) {
    elements.zeus.statusPill.textContent = "Zeus actualizado";
  } else {
    elements.zeus.statusPill.textContent = "Sincronización pendiente";
  }

  if (!payload) {
    const message = state.providerErrors.zeus || "Esperando datos de Zeus.";
    elements.zeus.lastSync.textContent = "-";
    elements.zeus.syncNote.textContent = message;
    elements.zeus.filteredUsers.textContent = "-";
    elements.zeus.totalUsers.textContent = "-";
    elements.zeus.totalLoads.textContent = "-";
    elements.zeus.totalAmount.textContent = "-";
    elements.zeus.lastSyncDuplicate.textContent = "-";
    elements.zeus.countFive.textContent = "0";
    elements.zeus.countTen.textContent = "0";
    elements.zeus.countFifteen.textContent = "0";
    elements.zeus.countWeek.textContent = "0";
    elements.zeus.countMonth.textContent = "0";
    elements.zeus.activeFilterLabel.textContent = "Mostrando todos los usuarios.";
    renderList(elements.zeus.listFive, [], () => "", message);
    renderList(elements.zeus.listTen, [], () => "", message);
    renderList(elements.zeus.listFifteen, [], () => "", message);
    renderList(elements.zeus.weekRanking, [], () => "", message);
    renderList(elements.zeus.monthRanking, [], () => "", message);
    state.currentViews.zeus = null;
    return;
  }

  const filteredUsers = applyZeusSearch(applyZeusFilters(payload.analytics.users));
  const five = applyPanelControls(
    filteredUsers.filter((user) => user.inactivityBucket === "five"),
    "five",
    "zeus"
  );
  const ten = applyPanelControls(
    filteredUsers.filter((user) => user.inactivityBucket === "ten"),
    "ten",
    "zeus"
  );
  const fifteen = applyPanelControls(
    filteredUsers.filter((user) => user.inactivityBucket === "fifteen"),
    "fifteen",
    "zeus"
  );
  const weekRanking = applyZeusSearch(
    applyPanelControls(payload.analytics.rankings.week, "week", "zeus")
  );
  const monthRanking = applyZeusSearch(
    applyPanelControls(payload.analytics.rankings.month, "month", "zeus")
  );
  const filteredLoads = filteredUsers.reduce((sum, item) => sum + item.loadsCount, 0);
  const filteredAmount = filteredUsers.reduce((sum, item) => sum + item.totalAmount, 0);

  elements.zeus.lastSync.textContent = formatClock(payload.meta.fetchedAt);
  elements.zeus.syncNote.textContent = `${payload.meta.totalRows} transferencias de jugadores cargadas, con tope de 60 días`;
  elements.zeus.filteredUsers.textContent = String(filteredUsers.length);
  elements.zeus.totalUsers.textContent = String(payload.analytics.summary.uniqueUsers);
  elements.zeus.totalLoads.textContent = String(filteredLoads);
  elements.zeus.totalAmount.textContent = formatCurrency(filteredAmount);
  elements.zeus.lastSyncDuplicate.textContent = formatClock(payload.meta.fetchedAt);
  elements.zeus.countFive.textContent = String(five.length);
  elements.zeus.countTen.textContent = String(ten.length);
  elements.zeus.countFifteen.textContent = String(fifteen.length);
  elements.zeus.countWeek.textContent = String(weekRanking.length);
  elements.zeus.countMonth.textContent = String(monthRanking.length);

  const searchNote = state.searchQuery ? ` Búsqueda: "${state.searchQuery}".` : "";
  const officeLabel =
    state.zeusFilters.office === "all"
      ? "todas las oficinas"
      : payload.analytics.offices.find((office) => office.key === state.zeusFilters.office)?.label || "oficina filtrada";
  elements.zeus.activeFilterLabel.textContent =
    `Mostrando ${filteredUsers.length} de ${payload.analytics.summary.uniqueUsers} usuarios para ${officeLabel}, ${getZonaPeriodLabel(state.zeusFilters.period)} y ${getZonaAmountLabel(state.zeusFilters.amount)}.${searchNote}`;

  renderList(elements.zeus.listFive, withProviderKey(five, "zeus"), renderZonaUserCard, "No hay usuarios para este filtro.");
  renderList(elements.zeus.listTen, withProviderKey(ten, "zeus"), renderZonaUserCard, "No hay usuarios para este filtro.");
  renderList(elements.zeus.listFifteen, withProviderKey(fifteen, "zeus"), renderZonaUserCard, "No hay usuarios para este filtro.");
  renderList(elements.zeus.weekRanking, withProviderKey(weekRanking, "zeus"), renderZonaRankingItem, "No hay jugadores para este ranking.");
  renderList(elements.zeus.monthRanking, withProviderKey(monthRanking, "zeus"), renderZonaRankingItem, "No hay jugadores para este ranking.");

  state.currentViews.zeus = {
    filteredUsers,
    five,
    ten,
    fifteen,
    weekRanking,
    monthRanking,
    summary: {
      filteredUsers: filteredUsers.length,
      totalUsers: payload.analytics.summary.uniqueUsers,
      filteredLoads,
      filteredAmount
    }
  };
}

function renderOverviewSummaryCard(providerKey, payload, error) {
  if (error) {
    return `<p class="empty error">${escapeHtml(error)}</p>`;
  }

  if (!payload) {
    return `<p class="empty">Esperando primera sincronización.</p>`;
  }

  if (providerKey === "zonaEpic") {
    return `
      <div class="providerSummaryGrid">
        <div class="summaryMini"><span>Usuarios</span><strong>${payload.analytics.summary.uniqueUsers}</strong></div>
        <div class="summaryMini"><span>Cargas</span><strong>${payload.analytics.summary.totalLoads}</strong></div>
        <div class="summaryMini"><span>Monto</span><strong>${formatCurrency(payload.analytics.summary.totalAmount)}</strong></div>
        <div class="summaryMini"><span>Última sync</span><strong>${formatClock(payload.meta.fetchedAt)}</strong></div>
      </div>
      <div class="pillRow">
        <span class="miniPill">10-30 días: ${payload.analytics.summary.inactiveFive}</span>
        <span class="miniPill">30-45 días: ${payload.analytics.summary.inactiveTen}</span>
        <span class="miniPill">45-60 días: ${payload.analytics.summary.inactiveFifteen}</span>
      </div>
    `;
  }

  return `
    <div class="providerSummaryGrid">
      <div class="summaryMini"><span>Usuarios</span><strong>${payload.analytics.summary.uniqueUsers}</strong></div>
      <div class="summaryMini"><span>Cargas</span><strong>${payload.analytics.summary.totalLoads}</strong></div>
      <div class="summaryMini"><span>Monto</span><strong>${formatCurrency(payload.analytics.summary.totalAmount)}</strong></div>
      <div class="summaryMini"><span>Última sync</span><strong>${formatClock(payload.meta.fetchedAt)}</strong></div>
    </div>
    <div class="pillRow">
      <span class="miniPill">10-30 días: ${payload.analytics.summary.inactiveFive}</span>
      <span class="miniPill">30-45 días: ${payload.analytics.summary.inactiveTen}</span>
      <span class="miniPill">45-60 días: ${payload.analytics.summary.inactiveFifteen}</span>
    </div>
  `;
}

function renderOverviewComparison() {
  const zona = state.providerData.zonaEpic;
  const zeus = state.providerData.zeus;

  if (!zona && !zeus) {
    elements.overviewComparison.innerHTML = `
      <article class="comparisonCard">
        <strong>Sin datos todavía</strong>
        <p>Guardá las credenciales de ambos paneles y corré una sincronización desde Inicio o desde cada provider.</p>
      </article>
    `;
    return;
  }

  const cards = [];

  if (zona) {
    cards.push(`
      <article class="comparisonCard">
        <strong>ZonaEpic activo</strong>
        <p>${zona.analytics.summary.uniqueUsers} usuarios y ${formatCurrency(zona.analytics.summary.totalAmount)} acumulados en el rango actual.</p>
      </article>
    `);
  }

  if (zeus) {
    cards.push(`
      <article class="comparisonCard">
        <strong>Zeus activo</strong>
        <p>${zeus.analytics.summary.uniqueUsers} usuarios y ${formatCurrency(zeus.analytics.summary.totalAmount)} acumulados en el rango actual.</p>
      </article>
    `);
  }

  if (zona && zeus) {
    cards.push(`
      <article class="comparisonCard">
        <strong>Lectura cruzada</strong>
        <p>ZonaEpic está mostrando ${zona.analytics.summary.uniqueUsers} usuarios operados, mientras Zeus muestra ${zeus.analytics.summary.uniqueUsers} usuarios con cargas en el mismo rango.</p>
      </article>
    `);
  }

  elements.overviewComparison.innerHTML = cards.join("");
}

function renderOverview() {
  elements.overviewZonaSummary.innerHTML = renderOverviewSummaryCard(
    "zonaEpic",
    state.providerData.zonaEpic,
    state.providerErrors.zonaEpic
  );
  elements.overviewZeusSummary.innerHTML = renderOverviewSummaryCard(
    "zeus",
    state.providerData.zeus,
    state.providerErrors.zeus
  );
  renderOverviewComparison();

  const zonaReady = Boolean(state.providerData.zonaEpic);
  const zeusReady = Boolean(state.providerData.zeus);
  const syncingCount = Number(state.syncing.zonaEpic) + Number(state.syncing.zeus);

  if (syncingCount) {
    elements.globalStatus.textContent = "Sincronizando paneles...";
    elements.globalStatusNote.textContent = "Inicio consolidado";
  } else if (zonaReady && zeusReady) {
    elements.globalStatus.textContent = "ZonaEpic y Zeus sincronizados";
    elements.globalStatusNote.textContent = "Datos discriminados por provider";
  } else if (zonaReady || zeusReady) {
    elements.globalStatus.textContent = "Uno de los paneles ya respondió";
    elements.globalStatusNote.textContent = "Falta completar la otra integración";
  } else {
    elements.globalStatus.textContent = "Esperando primera sincronización...";
    elements.globalStatusNote.textContent = "Inicio consolidado";
  }
}

function renderSettings() {
  const focusedElement = document.activeElement;
  if (state.activeTab === "settings" && focusedElement && focusedElement.closest("#settingsView")) {
    return;
  }

  elements.settings.zonaBaseUrl.value = state.config.zonaEpic.baseUrl;
  elements.settings.zonaSessionId.value = state.config.zonaEpic.sessionId;
  elements.settings.zonaToken.value = state.config.zonaEpic.token;
  elements.settings.zeusBaseUrl.value = state.config.zeus.baseUrl;
  elements.settings.zeusUsername.value = state.config.zeus.username;
  elements.settings.zeusPassword.value = state.config.zeus.password;
}

function renderAll() {
  renderOverview();
  renderZonaView();
  renderZeusView();
  renderSettings();
}

function setActiveTab(tabKey) {
  state.activeTab = tabKey;

  elements.navLinks.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabKey);
  });

  Object.entries(elements.tabViews).forEach(([key, element]) => {
    element.classList.toggle("hidden", key !== tabKey);
  });

  const titles = {
    overview: {
      kicker: "Inicio",
      title: "ElSecuaz | Resumen cruzado de ZonaEpic y Zeus"
    },
    zonaEpic: {
      kicker: "ZonaEpic",
      title: "Usuarios, cargas e inactividad"
    },
    zeus: {
      kicker: "Zeus",
      title: "Usuarios, cargas e inactividad"
    },
    settings: {
      kicker: "Settings",
      title: "Credenciales guardadas por provider"
    }
  };

  elements.topbarKicker.textContent = titles[tabKey].kicker;
  elements.topbarTitle.textContent = titles[tabKey].title;
  elements.searchInput.placeholder =
    tabKey === "overview"
      ? "Buscar dentro del resumen activo..."
      : tabKey === "settings"
        ? "La búsqueda no aplica en Settings"
        : "Buscar dentro de la solapa activa...";
  elements.searchInput.disabled = tabKey === "settings";
}

function exportOverviewCsv() {
  const lines = [
    ['"Provider"', '"Estado"', '"Metrica 1"', '"Valor 1"', '"Metrica 2"', '"Valor 2"'].join(";")
  ];

  const zona = state.providerData.zonaEpic;
  const zeus = state.providerData.zeus;

  lines.push([
    '"ZonaEpic"',
    `"${zona ? "ok" : state.providerErrors.zonaEpic || "sin datos"}"`,
    '"Usuarios"',
    `"${zona?.analytics?.summary?.uniqueUsers ?? "-"}"`,
    '"Monto"',
    `"${zona ? formatCurrency(zona.analytics.summary.totalAmount) : "-"}"`
  ].join(";"));

  lines.push([
    '"Zeus"',
    `"${zeus ? "ok" : state.providerErrors.zeus || "sin datos"}"`,
    '"Usuarios"',
    `"${zeus?.analytics?.summary?.uniqueUsers ?? "-"}"`,
    '"Monto"',
    `"${zeus ? formatCurrency(zeus.analytics.summary.totalAmount) : "-"}"`
  ].join(";"));

  downloadTextFile(`overview-panels-${todayIsoDate()}.csv`, `\uFEFF${lines.join("\n")}`, "text/csv;charset=utf-8");
}

function exportZonaCsv() {
  const view = state.currentViews.zonaEpic;
  if (!view) {
    elements.zona.statusPill.textContent = "No hay datos de ZonaEpic para exportar";
    return;
  }

  const lines = [];
  lines.push(['"Seccion"', '"Usuario"', '"Oficina"', '"Telefonos"', '"Promedio"', '"Cantidad cargas"', '"Ultima carga"', '"Dias inactivo"'].join(";"));

  [
    ["10 a 30 dias", view.five],
    ["30 a 45 dias", view.ten],
    ["45 a 60 dias", view.fifteen]
  ].forEach(([section, items]) => {
    items.forEach((item) => {
      lines.push([
        `"${section}"`,
        `"${item.username}"`,
        `"${item.officeLabel || ""}"`,
        `"${(item.phoneLabels || []).join(", ")}"`,
        `"${formatCurrency(item.averageAmount)}"`,
        `"${item.loadsCount}"`,
        `"${item.lastLoadAtDisplay}"`,
        `"${item.daysSinceLastLoad}"`
      ].join(";"));
    });
  });

  lines.push("");
  lines.push(['"Ranking"', '"Rank"', '"Usuario"', '"Oficina"', '"Telefonos"', '"Monto"', '"Cantidad cargas"', '"Ultima carga"'].join(";"));

  [["Semana", view.weekRanking], ["Mes", view.monthRanking]].forEach(([section, items]) => {
    items.forEach((item) => {
      lines.push([
        `"${section}"`,
        `"${item.rank}"`,
        `"${item.username}"`,
        `"${item.officeLabel || ""}"`,
        `"${(item.phoneLabels || []).join(", ")}"`,
        `"${formatCurrency(item.totalAmount)}"`,
        `"${item.loadsCount}"`,
        `"${item.lastLoadAtDisplay}"`
      ].join(";"));
    });
  });

  downloadTextFile(`zonaepic-${todayIsoDate()}.csv`, `\uFEFF${lines.join("\n")}`, "text/csv;charset=utf-8");
}

function exportZeusCsv() {
  const view = state.currentViews.zeus;
  if (!view) {
    elements.zeus.statusPill.textContent = "No hay datos de Zeus para exportar";
    return;
  }

  const lines = [];
  lines.push(['"Seccion"', '"Usuario"', '"Oficina"', '"Telefonos"', '"Promedio"', '"Cantidad cargas"', '"Ultima carga"', '"Dias inactivo"'].join(";"));

  [
    ["10 a 30 dias", view.five],
    ["30 a 45 dias", view.ten],
    ["45 a 60 dias", view.fifteen]
  ].forEach(([section, items]) => {
    items.forEach((item) => {
      lines.push([
        `"${section}"`,
        `"${item.username}"`,
        `"${item.officeLabel || ""}"`,
        `"${(item.phoneLabels || []).join(", ")}"`,
        `"${formatCurrency(item.averageAmount)}"`,
        `"${item.loadsCount}"`,
        `"${item.lastLoadAtDisplay}"`,
        `"${item.daysSinceLastLoad}"`
      ].join(";"));
    });
  });

  lines.push("");
  lines.push(['"Ranking"', '"Rank"', '"Usuario"', '"Oficina"', '"Telefonos"', '"Monto"', '"Cantidad cargas"', '"Ultima carga"'].join(";"));

  [["Semana", view.weekRanking], ["Mes", view.monthRanking]].forEach(([section, items]) => {
    items.forEach((item) => {
      lines.push([
        `"${section}"`,
        `"${item.rank}"`,
        `"${item.username}"`,
        `"${item.officeLabel || ""}"`,
        `"${(item.phoneLabels || []).join(", ")}"`,
        `"${formatCurrency(item.totalAmount)}"`,
        `"${item.loadsCount}"`,
        `"${item.lastLoadAtDisplay}"`
      ].join(";"));
    });
  });

  downloadTextFile(`zeus-${todayIsoDate()}.csv`, `\uFEFF${lines.join("\n")}`, "text/csv;charset=utf-8");
}

function exportCurrentTab() {
  if (state.activeTab === "overview") {
    exportOverviewCsv();
    return;
  }

  if (state.activeTab === "zonaEpic") {
    exportZonaCsv();
    return;
  }

  if (state.activeTab === "zeus") {
    exportZeusCsv();
    return;
  }

  elements.settingsStatusPill.textContent = "Settings no exporta CSV";
}

function saveZonaSettings() {
  state.config.zonaEpic.baseUrl = normalizeBaseUrl(
    elements.settings.zonaBaseUrl.value,
    state.defaults.providers.zonaEpic.baseUrl
  );
  state.config.zonaEpic.sessionId = elements.settings.zonaSessionId.value.trim();
  state.config.zonaEpic.token = elements.settings.zonaToken.value.trim();
  saveStoredConfig();
  resetProviderTimer("zonaEpic");
  elements.settingsStatusPill.textContent = "Settings de ZonaEpic guardados";
  renderAll();
}

function saveZeusSettings() {
  state.config.zeus.baseUrl = normalizeBaseUrl(
    elements.settings.zeusBaseUrl.value,
    state.defaults.providers.zeus.baseUrl
  );
  state.config.zeus.username = elements.settings.zeusUsername.value.trim();
  state.config.zeus.password = elements.settings.zeusPassword.value;
  saveStoredConfig();
  resetProviderTimer("zeus");
  elements.settingsStatusPill.textContent = "Settings de Zeus guardados";
  renderAll();
}

function resetProviderTimer(providerKey) {
  clearInterval(state.syncTimers[providerKey]);
  const interval = Number(state.config[providerKey].interval);

  if (!interval || Number.isNaN(interval)) {
    return;
  }

  state.syncTimers[providerKey] = window.setInterval(() => {
    if (providerKey === "zonaEpic") {
      syncZonaEpic();
      return;
    }

    syncZeus();
  }, interval);
}

async function hydrateConfig() {
  try {
    const config = await fetchJson("/api/config");
    state.defaults = config;
  } catch {
    state.defaults = {
      providers: {
        zonaEpic: { baseUrl: "https://admin.zonaepic.vip", sessionId: "", token: "", fullImportStart: "2025-01-01", maxLookbackDays: maxLookbackDaysFallback },
        zeus: { baseUrl: "https://admin.casinozeus.tech", username: "", password: "", maxLookbackDays: maxLookbackDaysFallback }
      }
    };
  }

  const stored = loadStoredConfig();
  const zonaDefaults = getDefaultDateRange(30);
  const zeusDefaults = getDefaultDateRange(30);

  state.config.zonaEpic = {
    baseUrl: stored?.zonaEpic?.baseUrl || state.defaults.providers.zonaEpic.baseUrl,
    sessionId: stored?.zonaEpic?.sessionId || state.defaults.providers.zonaEpic.sessionId,
    token: stored?.zonaEpic?.token || state.defaults.providers.zonaEpic.token,
    filterFrom: stored?.zonaEpic?.filterFrom || state.defaults.providers.zonaEpic.fullImportStart || zonaDefaults.from,
    filterTo: stored?.zonaEpic?.filterTo || zonaDefaults.to,
    interval: Number(stored?.zonaEpic?.interval || 15000)
  };

  state.config.zeus = {
    baseUrl: stored?.zeus?.baseUrl || state.defaults.providers.zeus.baseUrl,
    username: stored?.zeus?.username || state.defaults.providers.zeus.username,
    password: stored?.zeus?.password || state.defaults.providers.zeus.password,
    filterFrom: stored?.zeus?.filterFrom || zeusDefaults.from,
    filterTo: stored?.zeus?.filterTo || zeusDefaults.to,
    interval: Number(stored?.zeus?.interval || 30000)
  };

  const zonaRange = normalizeDateRange(
    state.config.zonaEpic.filterFrom,
    state.config.zonaEpic.filterTo,
    getProviderMaxLookbackDays("zonaEpic")
  );
  const zeusRange = normalizeDateRange(
    state.config.zeus.filterFrom,
    state.config.zeus.filterTo,
    getProviderMaxLookbackDays("zeus")
  );
  state.config.zonaEpic.filterFrom = zonaRange.from;
  state.config.zonaEpic.filterTo = zonaRange.to;
  state.config.zeus.filterFrom = zeusRange.from;
  state.config.zeus.filterTo = zeusRange.to;
  state.contactedUsers = loadContactedUsers();
  state.contactMatchCache = new Map();
  saveStoredConfig();
}

function setupTabNavigation() {
  elements.navLinks.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTab(button.dataset.tab);
      renderAll();
    });
  });

  elements.openTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTab(button.dataset.openTab);
      renderAll();
    });
  });
}

function setupZonaFilters() {
  elements.zona.officeFilter.addEventListener("change", () => {
    state.zonaFilters.office = elements.zona.officeFilter.value;
    renderZonaView();
  });

  elements.zona.periodButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.zonaFilters.period = button.dataset.zonaPeriod;
      elements.zona.periodButtons.forEach((item) =>
        item.classList.toggle("active", item === button)
      );
      renderZonaView();
    });
  });

  elements.zona.amountButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.zonaFilters.amount = button.dataset.zonaAmount;
      elements.zona.amountButtons.forEach((item) =>
        item.classList.toggle("active", item === button)
      );
      renderZonaView();
    });
  });
}

function setupZeusFilters() {
  elements.zeus.officeFilter.addEventListener("change", () => {
    state.zeusFilters.office = elements.zeus.officeFilter.value;
    renderZeusView();
  });

  elements.zeus.periodButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.zeusFilters.period = button.dataset.zeusPeriod;
      elements.zeus.periodButtons.forEach((item) =>
        item.classList.toggle("active", item === button)
      );
      renderZeusView();
    });
  });

  elements.zeus.amountButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.zeusFilters.amount = button.dataset.zeusAmount;
      elements.zeus.amountButtons.forEach((item) =>
        item.classList.toggle("active", item === button)
      );
      renderZeusView();
    });
  });
}

function setupPanelTools(providerKey, panels) {
  panels.forEach((panel) => {
    const panelKey = providerKey === "zonaEpic" ? panel.dataset.zonaPanel : panel.dataset.zeusPanel;
    panel.querySelectorAll("select, input").forEach((control) => {
      control.addEventListener("change", () => {
        const role = control.dataset.role;
        const toolState = state.panelState[providerKey][panelKey];
        if (role === "filter-field") {
          toolState.filterField = control.value;
        } else if (role === "filter-operator") {
          toolState.filterOperator = control.value;
        } else if (role === "filter-value") {
          toolState.filterValue = control.value.trim();
        } else if (role === "sort-field") {
          toolState.sortField = control.value;
        } else if (role === "sort-direction") {
          toolState.sortDirection = control.value;
        }

        if (providerKey === "zonaEpic") {
          renderZonaView();
        } else {
          renderZeusView();
        }
      });

      if (control.tagName === "INPUT") {
        control.addEventListener("input", () => {
          state.panelState[providerKey][panelKey].filterValue = control.value.trim();
          if (providerKey === "zonaEpic") {
            renderZonaView();
          } else {
            renderZeusView();
          }
        });
      }
    });
  });
}

function setupSearch() {
  elements.searchInput.addEventListener("input", () => {
    state.searchQuery = normalizeSearchQuery(elements.searchInput.value);
    if (state.activeTab === "overview") {
      renderOverview();
      return;
    }
    if (state.activeTab === "zonaEpic") {
      renderZonaView();
      return;
    }
    if (state.activeTab === "zeus") {
      renderZeusView();
    }
  });
}

function setupCopyHandlers() {
  document.body.addEventListener("click", async (event) => {
    if (event.target.closest(".contactToggle")) {
      return;
    }

    const usernameTrigger = event.target.closest("[data-copy-username]");
    const card = event.target.closest(".copyableCard");

    if (!usernameTrigger && !card) {
      return;
    }

    const username = usernameTrigger?.dataset.copyUsername || card?.dataset.username;
    if (!username) {
      return;
    }

    try {
      await copyToClipboard(username);
      const sourceElement = usernameTrigger || card;
      const providerKey = sourceElement.closest("#zeusView") ? "zeus" : "zonaEpic";
      const targetStatus = providerKey === "zeus" ? elements.zeus.statusPill : elements.zona.statusPill;
      targetStatus.textContent = `Copiado: ${username}`;
      card?.classList.add("copied");
      usernameTrigger?.classList.add("copied");
      window.setTimeout(() => {
        card?.classList.remove("copied");
        usernameTrigger?.classList.remove("copied");
        if (targetStatus.textContent === `Copiado: ${username}`) {
          targetStatus.textContent = providerKey === "zeus"
            ? state.syncing.zeus
              ? state.syncProgress.zeus || "Sincronizando..."
              : "Zeus actualizado"
            : state.syncing.zonaEpic
              ? state.syncProgress.zonaEpic || "Sincronizando..."
              : "ZonaEpic actualizado";
        }
      }, 1200);
    } catch {
      const targetStatus = card.closest("#zeusView") ? elements.zeus.statusPill : elements.zona.statusPill;
      targetStatus.textContent = "No se pudo copiar el usuario";
    }
  });
}

function setupContactedHandlers() {
  document.body.addEventListener("change", (event) => {
    const toggle = event.target.closest("[data-contacted-toggle]");
    if (!toggle) {
      return;
    }

    state.contactedUsers[toggle.dataset.contactedToggle] = toggle.checked;
    saveContactedUsers();
  });
}

function setupSettings() {
  elements.settings.saveZonaButton.addEventListener("click", saveZonaSettings);
  elements.settings.saveZeusButton.addEventListener("click", saveZeusSettings);
}

function setupProviderControls() {
  elements.zona.syncButton.addEventListener("click", syncZonaEpic);
  elements.zeus.syncButton.addEventListener("click", syncZeus);

  elements.zona.filterFrom.addEventListener("change", () => {
    state.config.zonaEpic.filterFrom = elements.zona.filterFrom.value;
    saveStoredConfig();
    syncZonaEpic();
  });
  elements.zona.filterTo.addEventListener("change", () => {
    state.config.zonaEpic.filterTo = elements.zona.filterTo.value;
    saveStoredConfig();
    syncZonaEpic();
  });
  elements.zona.interval.addEventListener("change", () => {
    state.config.zonaEpic.interval = Number(elements.zona.interval.value);
    saveStoredConfig();
    resetProviderTimer("zonaEpic");
  });

  elements.zeus.filterFrom.addEventListener("change", () => {
    state.config.zeus.filterFrom = elements.zeus.filterFrom.value;
    saveStoredConfig();
    syncZeus();
  });
  elements.zeus.filterTo.addEventListener("change", () => {
    state.config.zeus.filterTo = elements.zeus.filterTo.value;
    saveStoredConfig();
    syncZeus();
  });
  elements.zeus.interval.addEventListener("change", () => {
    state.config.zeus.interval = Number(elements.zeus.interval.value);
    saveStoredConfig();
    resetProviderTimer("zeus");
  });
}

function setupTopbarActions() {
  elements.refreshButton.addEventListener("click", () => {
    if (state.activeTab === "overview" || state.activeTab === "settings") {
      if (state.activeTab === "settings") {
        saveZonaSettings();
        saveZeusSettings();
      }
      syncAllProviders();
      return;
    }

    if (state.activeTab === "zonaEpic") {
      syncZonaEpic();
      return;
    }

    syncZeus();
  });

  elements.exportButton.addEventListener("click", exportCurrentTab);
}

async function bootstrap() {
  await hydrateConfig();
  setupTabNavigation();
  setupTopbarActions();
  setupSearch();
  setupSettings();
  setupProviderControls();
  setupZonaFilters();
  setupZeusFilters();
  setupPanelTools("zonaEpic", elements.zona.toolPanels);
  setupPanelTools("zeus", elements.zeus.toolPanels);
  setupCopyHandlers();
  setupContactedHandlers();
  setActiveTab("overview");
  renderAll();
  resetProviderTimer("zonaEpic");
  resetProviderTimer("zeus");
  await syncAllProviders();
}

bootstrap();
