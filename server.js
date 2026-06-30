import "dotenv/config";
import { createServer } from "node:http";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT || 3001);
const timeZone = "America/Argentina/Buenos_Aires";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const contactsDir = path.join(__dirname, "data", "contacts");
const cacheDir = path.join(__dirname, ".cache");
const cacheFile = path.join(cacheDir, "panel-cache.json");
const cacheSchemaVersion = 2;
const maxLookbackDays = 60;
const periodKeys = ["morning", "afternoon", "night", "overnight"];
const defaultZonaBaseUrl = "https://admin.zonaepic.vip";
const defaultZeusBaseUrl = "https://admin.casinozeus.tech";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getBaseUrl(rawBaseUrl) {
  const rawValue = String(rawBaseUrl || process.env.ZONAEPIC_BASE_URL || defaultZonaBaseUrl).trim();

  try {
    const parsed = new URL(rawValue);

    // Accept either the admin root or a specific panel page URL such as
    // /report_balances.php and normalize both to the site origin.
    return parsed.origin.replace(/\/+$/, "");
  } catch {
    return rawValue.replace(/\/+$/, "").replace(/\/report_balances\.php$/i, "");
  }
}

function getRequestConfig(overrides = {}) {
  const baseUrl = getBaseUrl(overrides.baseUrl);
  const sessionId = String(
    overrides.sessionId || process.env.ZONAEPIC_PHPSESSID || ""
  ).trim();
  const token = String(overrides.token || process.env.ZONAEPIC_TOKEN || "").trim();

  if (!sessionId) {
    throw new Error("Falta PHPSESSID. Cargalo en la configuracion del panel.");
  }

  return {
    baseUrl,
    reportPageUrl: `${baseUrl}/report_balances.php`,
    reportApiUrl: `${baseUrl}/services/report_get_balances_history.php`,
    sessionId,
    token
  };
}

function getZeusBaseUrl(rawBaseUrl) {
  const rawValue = String(rawBaseUrl || process.env.ZEUS_BASE_URL || defaultZeusBaseUrl).trim();

  try {
    return new URL(rawValue).origin.replace(/\/+$/, "");
  } catch {
    return rawValue.replace(/\/+$/, "");
  }
}

function getZeusRequestConfig(overrides = {}) {
  const baseUrl = getZeusBaseUrl(overrides.baseUrl);
  const username = String(overrides.username || process.env.ZEUS_USERNAME || "").trim();
  const password = String(overrides.password || process.env.ZEUS_PASSWORD || "").trim();

  if (!username || !password) {
    throw new Error("Faltan usuario o clave de Zeus. Cargalos en Settings.");
  }

  return {
    baseUrl,
    username,
    password,
    authUrl: `${baseUrl}/api/backoffice/v1/auth/signin`,
    profileUrl: `${baseUrl}/api/backoffice/v1/users/me`,
    transactionsUrl: `${baseUrl}/api/backoffice/v1/project/account-transactions`,
    totalAmountUrl: `${baseUrl}/api/backoffice/v1/project/account-transactions/total-amount`,
    playerTransfersUrl: `${baseUrl}/api/backoffice/v1/account-transfers/player`,
    playerStatsUrl: `${baseUrl}/api/backoffice/v1/player-account-transaction-stats`
  };
}

async function readCacheStore() {
  try {
    const raw = await readFile(cacheFile, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeCacheStore(store) {
  await mkdir(cacheDir, { recursive: true });
  await writeFile(cacheFile, JSON.stringify(store), "utf8");
}

function getCacheKey(baseUrl, username) {
  return `${baseUrl}::${username || "*"}`;
}

function getZonaBrowserCacheKey(baseUrl, sessionId) {
  const fingerprint = String(sessionId || "").trim().slice(0, 16) || "*";
  return `${baseUrl}::${fingerprint}`;
}

function formatSpanishMonth(date) {
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre"
  ];

  const zoned = new Date(date.toLocaleString("en-US", { timeZone }));
  const day = String(zoned.getDate()).padStart(2, "0");
  const month = months[zoned.getMonth()];
  const year = zoned.getFullYear();

  return `${day} ${month} ${year}`;
}

function getDefaultRange(lookbackDays = 30) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - lookbackDays);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    startDate: formatSpanishMonth(start),
    endDate: formatSpanishMonth(tomorrow),
    startTime: "00:00:00",
    endTime: "00:00:00"
  };
}

async function getSessionToken(config) {
  // Always refresh the CSRF token from the report page. Manually pasted tokens
  // expire quickly and are unreliable across Vercel invocations.
  const response = await fetch(config.reportPageUrl, {
    headers: {
      Cookie: `PHPSESSID=${config.sessionId}`,
      "User-Agent": "Mozilla/5.0",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "es-419,es;q=0.9"
    }
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch report page: ${response.status}`);
  }

  const html = await response.text();
  const tokenMatch =
    html.match(/token["'\s:=>]+([a-f0-9]{32,128})/i) ||
    html.match(/value=["']([a-f0-9]{32,128})["'][^>]*name=["']token["']/i) ||
    html.match(/name=["']token["'][^>]*value=["']([a-f0-9]{32,128})["']/i);

  if (!tokenMatch) {
    throw new Error("No pude extraer el token fresco desde report_balances.php. Revisa PHPSESSID.");
  }

  return tokenMatch[1];
}

async function loginZeus(config) {
  const response = await fetch(config.authUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0"
    },
    body: JSON.stringify({
      username: config.username,
      password: config.password
    })
  });

  let payload;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Zeus devolvio ${response.status} al intentar autenticarse`;
    throw new Error(message);
  }

  const accessToken = payload?.meta?.accessToken;

  if (!accessToken) {
    throw new Error("Zeus no devolvio accessToken en el login.");
  }

  return {
    accessToken,
    refreshToken: payload?.meta?.refreshToken || null,
    user: payload?.user || null
  };
}

async function fetchZeusJson(url, accessToken, searchParams = null) {
  const requestUrl = new URL(url);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        requestUrl.searchParams.delete(key);
        value.forEach((entry) => {
          if (entry !== undefined && entry !== null && entry !== "") {
            requestUrl.searchParams.append(key, String(entry));
          }
        });
        return;
      }

      if (value !== undefined && value !== null && value !== "") {
        requestUrl.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(requestUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0"
    }
  });

  let payload;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Zeus devolvio ${response.status} al consultar ${requestUrl.pathname}`;
    throw new Error(message);
  }

  return payload;
}

function toZeusIsoRange(fromDate, toDateExclusive) {
  const endInclusive = new Date(toDateExclusive.getTime() - 1);

  return {
    dateFrom: fromDate.toISOString(),
    dateTo: endInclusive.toISOString()
  };
}

async function fetchAllZeusTransactions({ config, accessToken, fromDate, toDateExclusive, pageSize }) {
  const { dateFrom, dateTo } = toZeusIsoRange(fromDate, toDateExclusive);
  const rows = [];
  let offset = 0;
  let totalCount = 0;

  while (true) {
    const payload = await fetchZeusJson(config.transactionsUrl, accessToken, {
      dateFrom,
      dateTo,
      offset,
      limit: pageSize
    });

    const items = Array.isArray(payload?.items) ? payload.items : [];
    totalCount = Number(payload?.count || totalCount || items.length);
    rows.push(...items);

    if (!items.length || items.length < pageSize || rows.length >= totalCount) {
      break;
    }

    offset += items.length;
  }

  return {
    totalCount,
    rows
  };
}

async function fetchAllZeusPlayerTransfers({
  config,
  accessToken,
  agentUserId,
  fromDate,
  toDateExclusive,
  pageSize
}) {
  const { dateFrom, dateTo } = toZeusIsoRange(fromDate, toDateExclusive);
  const rows = [];
  let offset = 0;

  while (true) {
    const requestUrl = new URL(config.playerTransfersUrl);
    requestUrl.searchParams.set("agentUserId", String(agentUserId));
    requestUrl.searchParams.set("dateFrom", dateFrom);
    requestUrl.searchParams.set("dateTo", dateTo);
    requestUrl.searchParams.set("offset", String(offset));
    requestUrl.searchParams.set("limit", String(pageSize));
    requestUrl.searchParams.append("operations[]", "INCOME");
    requestUrl.searchParams.append("operations[]", "OUTCOME");

    const response = await fetch(requestUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0"
      }
    });

    let payload;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message =
        payload?.error?.message ||
        payload?.message ||
        `Zeus devolvio ${response.status} al consultar ${requestUrl.pathname}`;
      throw new Error(message);
    }

    const items = Array.isArray(payload?.items) ? payload.items : [];
    rows.push(...items);

    if (!items.length || items.length < pageSize) {
      break;
    }

    offset += items.length;
  }

  return {
    totalCount: rows.length,
    rows
  };
}

function buildFormPayload({ token, username, startDate, endDate, startTime, endTime, length, start }) {
  const form = new URLSearchParams();
  form.set("draw", "1");

  for (let index = 0; index <= 5; index += 1) {
    form.set(`columns[${index}][data]`, String(index));
    form.set(`columns[${index}][name]`, "");
    form.set(`columns[${index}][searchable]`, "true");
    form.set(`columns[${index}][orderable]`, "false");
    form.set(`columns[${index}][search][value]`, "");
    form.set(`columns[${index}][search][regex]`, "false");
  }

  form.set("start", String(start || 0));
  form.set("length", String(length));
  form.set("search[value]", "");
  form.set("search[regex]", "false");
  form.set("search_type", "player");
  form.set("start_date", startDate);
  form.set("end_date", endDate);
  form.set("start_time", startTime);
  form.set("end_time", endTime);
  form.set("username", username || "");
  form.set("direct_children", "false");
  form.set("by_parent", "false");
  form.set("from_parent", "false");
  form.set("token", token);

  return form;
}

function normalizeNumber(value) {
  if (typeof value !== "string") {
    return Number(value || 0);
  }

  return Number(value.replace(/\./g, "").replace(",", "."));
}

function normalizeDecimal(value) {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeContactSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function decodeQuotedPrintable(value) {
  const cleaned = String(value || "")
    .replace(/=(\r?\n)/g, "")
    .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));

  return Buffer.from(cleaned, "latin1").toString("utf8").trim();
}

function parseVCardEntries(rawContent) {
  const cards = String(rawContent || "")
    .replace(/\r\n/g, "\n")
    .split("BEGIN:VCARD")
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return cards.map((card) => {
    const logicalLines = [];

    for (const line of card.split("\n")) {
      if (!line) {
        continue;
      }

      if (!logicalLines.length) {
        logicalLines.push(line);
        continue;
      }

      if (/^[ \t]/.test(line) || logicalLines[logicalLines.length - 1].endsWith("=")) {
        logicalLines[logicalLines.length - 1] += line.trimStart();
        continue;
      }

      logicalLines.push(line);
    }

    const entry = { fn: "", tels: [] };

    for (const line of logicalLines) {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) {
        continue;
      }

      const meta = line.slice(0, separatorIndex);
      const rawValue = line.slice(separatorIndex + 1);
      const key = meta.split(";")[0].toUpperCase();
      const value = /QUOTED-PRINTABLE/i.test(meta)
        ? decodeQuotedPrintable(rawValue)
        : rawValue.trim();

      if (key === "FN" && value) {
        entry.fn = value;
      }

      if (key === "TEL" && value) {
        entry.tels.push(value);
      }
    }

    return entry;
  });
}

async function loadContactsDirectory() {
  try {
    const officeEntries = await readdir(contactsDir, { withFileTypes: true });
    const offices = {};

    for (const officeEntry of officeEntries) {
      if (!officeEntry.isDirectory()) {
        continue;
      }

      const officeKey = normalizeContactSearchText(officeEntry.name);
      const officePath = path.join(contactsDir, officeEntry.name);
      const fileEntries = await readdir(officePath, { withFileTypes: true });
      const entries = [];

      for (const fileEntry of fileEntries) {
        if (!fileEntry.isFile() || path.extname(fileEntry.name).toLowerCase() !== ".vcf") {
          continue;
        }

        const fileLabel = path.basename(fileEntry.name, path.extname(fileEntry.name));
        const rawContent = await readFile(path.join(officePath, fileEntry.name), "utf8");
        const cards = parseVCardEntries(rawContent);

        for (const card of cards) {
          const searchText = normalizeContactSearchText(card.fn);
          if (!searchText) {
            continue;
          }

          entries.push({
            phoneLabel: fileLabel,
            displayName: card.fn,
            phoneNumbers: card.tels,
            searchText
          });
        }
      }

      offices[officeKey] = {
        officeKey,
        officeLabel: officeEntry.name,
        entries
      };
    }

    return { offices };
  } catch {
    return { offices: {} };
  }
}

function buildPublicContactsDirectory(contactsDirectory) {
  const offices = Object.values(contactsDirectory?.offices || {}).map((office) => ({
    officeKey: office.officeKey,
    officeLabel: office.officeLabel,
    entries: office.entries.map((entry) => ({
      phoneLabel: entry.phoneLabel,
      searchText: entry.searchText
    }))
  }));

  return { offices };
}

async function fetchBalancesPage({
  config,
  token,
  username,
  startDate,
  endDate,
  startTime,
  endTime,
  start,
  length
}) {
  const form = buildFormPayload({
    token,
    username,
    startDate,
    endDate,
    startTime,
    endTime,
    length,
    start
  });

  const response = await fetch(config.reportApiUrl, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: `PHPSESSID=${config.sessionId}`,
      Origin: config.baseUrl,
      Referer: config.reportPageUrl,
      "User-Agent": "Mozilla/5.0",
      "X-Requested-With": "XMLHttpRequest"
    },
    body: form.toString()
  });

  if (!response.ok) {
    throw new Error(`ZonaEpic devolvio ${response.status}`);
  }

  return response.json();
}

async function fetchAllBalances({
  config,
  token,
  username,
  startDate,
  endDate,
  startTime,
  endTime,
  pageSize,
  maxRows
}) {
  const rows = [];
  let start = 0;
  let totalAmount = 0;
  let recordsFiltered = 0;
  const effectiveMaxRows = Number(maxRows || process.env.ZONAEPIC_MAX_ROWS || 5000);

  for (let page = 0; page < Math.ceil(effectiveMaxRows / pageSize); page += 1) {
    const payload = await fetchBalancesPage({
      config,
      token,
      username,
      startDate,
      endDate,
      startTime,
      endTime,
      start,
      length: pageSize
    });

    const currentRows = Array.isArray(payload.data) ? payload.data : [];
    rows.push(...currentRows);
    totalAmount = normalizeNumber(payload.TotalAmount);
    recordsFiltered = payload.recordsFiltered || rows.length;

    if (
      currentRows.length < pageSize ||
      rows.length >= recordsFiltered ||
      rows.length >= effectiveMaxRows
    ) {
      break;
    }

    start += pageSize;
  }

  return {
    rows,
    totalAmount,
    recordsFiltered,
    truncated: rows.length >= effectiveMaxRows && recordsFiltered > rows.length
  };
}

function parseLoadDate(rawValue) {
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

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function parseDateInput(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00-03:00`);
  return isValidDate(parsed) ? startOfDay(parsed) : null;
}

function clampDateRange(fromDate, toDateExclusive, fallbackDays) {
  const todayStart = startOfDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);
  const fallbackFrom = addDays(todayStart, -fallbackDays);
  const earliestAllowed = addDays(todayStart, -(maxLookbackDays - 1));

  let safeFrom = isValidDate(fromDate) ? fromDate : fallbackFrom;
  let safeToExclusive = isValidDate(toDateExclusive) ? toDateExclusive : tomorrowStart;

  if (safeToExclusive > tomorrowStart) {
    safeToExclusive = tomorrowStart;
  }

  if (safeFrom >= safeToExclusive) {
    safeFrom = addDays(safeToExclusive, -fallbackDays);
  }

  if (safeFrom < earliestAllowed) {
    safeFrom = earliestAllowed;
  }

  if (safeFrom >= safeToExclusive) {
    safeFrom = earliestAllowed;
    safeToExclusive = tomorrowStart;
  }

  return {
    from: safeFrom,
    toExclusive: safeToExclusive
  };
}

function getRowKey(row) {
  return row.join("|");
}

function mergeRows(existingRows, newRows) {
  const merged = new Map();

  for (const row of [...existingRows, ...newRows]) {
    const parsedDate = parseLoadDate(row[0]);

    if (!parsedDate) {
      continue;
    }

    merged.set(getRowKey(row), row);
  }

  return Array.from(merged.values()).sort((left, right) => {
    const leftDate = parseLoadDate(left[0])?.date?.getTime() || 0;
    const rightDate = parseLoadDate(right[0])?.date?.getTime() || 0;
    return rightDate - leftDate;
  });
}

function filterRowsByDateRange(rows, fromDate, toDateExclusive) {
  return rows.filter((row) => {
    const parsedDate = parseLoadDate(row[0]);
    if (!parsedDate) {
      return false;
    }

    return parsedDate.date >= fromDate && parsedDate.date < toDateExclusive;
  });
}

async function fetchWindowedBalances({
  config,
  token,
  username,
  startDate,
  endDate,
  pageSize,
  maxRowsPerWindow
}) {
  const rows = [];
  let truncated = false;
  let current = startOfDay(startDate);
  const end = startOfDay(endDate);
  let firstSuccessfulDate = null;
  const skippedRanges = [];

  while (current < end) {
    const next = addDays(current, 1);
    let windowResult;

    try {
      windowResult = await fetchAllBalances({
        config,
        token,
        username,
        startDate: formatSpanishMonth(current),
        endDate: formatSpanishMonth(next),
        startTime: "00:00:00",
        endTime: "00:00:00",
        pageSize,
        maxRows: maxRowsPerWindow
      });
    } catch (error) {
      const isServerError = /ZonaEpic devolvio 500/i.test(String(error?.message || ""));

      if (!firstSuccessfulDate && isServerError) {
        skippedRanges.push({
          start: current.toISOString(),
          end: next.toISOString(),
          reason: "unsupported_initial_range"
        });
        current = next;
        continue;
      }

      throw error;
    }

    rows.push(...windowResult.rows);
    truncated = truncated || windowResult.truncated;
    firstSuccessfulDate = firstSuccessfulDate || current;
    current = next;
  }

  return {
    rows,
    truncated,
    firstSuccessfulDate: firstSuccessfulDate ? firstSuccessfulDate.toISOString() : null,
    skippedRanges
  };
}

async function getCachedOrFreshRows({
  config,
  token,
  username,
  requestedFromDate,
  pageSize
}) {
  const store = await readCacheStore();
  const cacheKey = getCacheKey(config.baseUrl, username);
  const cachedEntry = store[cacheKey];
  const maxRowsPerWindow = Number(process.env.ZONAEPIC_WINDOW_MAX_ROWS || 20000);
  const now = new Date();
  const configuredImportStart = new Date(
    process.env.ZONAEPIC_FULL_IMPORT_START || "2025-11-01T00:00:00-03:00"
  );
  const importStart =
    requestedFromDate && requestedFromDate < configuredImportStart
      ? requestedFromDate
      : configuredImportStart;
  const rangeEnd = addDays(startOfDay(now), 1);
  const needsFullReimport =
    !cachedEntry ||
    cachedEntry.schemaVersion !== cacheSchemaVersion ||
    !cachedEntry.importedFrom ||
    new Date(cachedEntry.importedFrom) > importStart;

  if (needsFullReimport) {
    const fullImport = await fetchWindowedBalances({
      config,
      token,
      username,
      startDate: importStart,
      endDate: rangeEnd,
      pageSize,
      maxRowsPerWindow
    });
    const mergedRows = mergeRows([], fullImport.rows);

    store[cacheKey] = {
      schemaVersion: cacheSchemaVersion,
      baseUrl: config.baseUrl,
      username,
      importedFrom: (fullImport.firstSuccessfulDate || importStart.toISOString()),
      rows: mergedRows,
      latestRowDate: parseLoadDate(mergedRows[0]?.[0] || "")?.date?.toISOString() || null,
      syncedAt: new Date().toISOString(),
      skippedRanges: fullImport.skippedRanges || []
    };
    await writeCacheStore(store);

    return {
      rows: mergedRows,
      totalRows: mergedRows.length,
      processedRows: mergedRows.length,
      truncated: fullImport.truncated,
      cacheMode: "full_import",
      importedFrom: fullImport.firstSuccessfulDate || importStart.toISOString(),
      skippedRanges: fullImport.skippedRanges || []
    };
  }

  const latestKnownDate = cachedEntry.latestRowDate
    ? new Date(cachedEntry.latestRowDate)
    : importStart;
  const incrementalStart = addDays(startOfDay(latestKnownDate), -1);
  const incrementalImport = await fetchWindowedBalances({
    config,
    token,
    username,
    startDate: incrementalStart < importStart ? importStart : incrementalStart,
    endDate: rangeEnd,
    pageSize,
    maxRowsPerWindow
  });
  const mergedRows = mergeRows(cachedEntry.rows || [], incrementalImport.rows);

  store[cacheKey] = {
    schemaVersion: cacheSchemaVersion,
    baseUrl: config.baseUrl,
    username,
    importedFrom: cachedEntry.importedFrom || importStart.toISOString(),
    rows: mergedRows,
    latestRowDate: parseLoadDate(mergedRows[0]?.[0] || "")?.date?.toISOString() || null,
    syncedAt: new Date().toISOString(),
    skippedRanges: cachedEntry.skippedRanges || []
  };
  await writeCacheStore(store);

  return {
    rows: mergedRows,
    totalRows: mergedRows.length,
    processedRows: incrementalImport.rows.length,
    truncated: incrementalImport.truncated,
    cacheMode: "incremental",
    importedFrom: cachedEntry.importedFrom || importStart.toISOString(),
    skippedRanges: cachedEntry.skippedRanges || []
  };
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

function daysBetween(fromDate, toDate) {
  return Math.floor((toDate.getTime() - fromDate.getTime()) / 86400000);
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone
  }).format(date);
}

function toInputDateValue(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function buildTopRanking(rows, days) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const usersMap = new Map();

  for (const row of rows) {
    const parsedDate = parseLoadDate(row[0]);
    const amount = normalizeNumber(row[4]);
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
    .map((user, index) => ({
      rank: index + 1,
      username: user.username,
      totalAmount: user.totalAmount,
      loadsCount: user.loadsCount,
      lastLoadAtDisplay: formatDateTime(user.lastLoadAt)
    }));
}

function buildAnalytics(rows) {
  const usersMap = new Map();
  const now = new Date();
  const loadRows = rows.filter((row) => normalizeNumber(row[4]) > 0);

  for (const row of loadRows) {
    const parsedDate = parseLoadDate(row[0]);
    const amount = normalizeNumber(row[4]);
    const user = String(row[2] || row[1] || "").trim();
    if (!parsedDate || !user) {
      continue;
    }

    const period = getPeriodByHour(parsedDate.hour);
    const amountBucket = getAmountBucket(amount);
    const existingUser = usersMap.get(user) || {
      username: user,
      loadsCount: 0,
      totalAmount: 0,
      lastLoadDate: parsedDate.date,
      lastLoadLabel: row[4] || "0,00",
      lastLoadAmount: amount,
      lastLoadAtLabel: parsedDate.raw,
      periodCounts: { morning: 0, afternoon: 0, night: 0, overnight: 0 },
      amountCounts: { small: 0, medium: 0, large: 0, other: 0 }
    };

    existingUser.loadsCount += 1;
    existingUser.totalAmount += amount;
    existingUser.periodCounts[period] += 1;
    existingUser.amountCounts[amountBucket] += 1;

    if (parsedDate.date >= existingUser.lastLoadDate) {
      existingUser.lastLoadDate = parsedDate.date;
      existingUser.lastLoadAmount = amount;
      existingUser.lastLoadLabel = row[4] || "0,00";
      existingUser.lastLoadAtLabel = parsedDate.raw;
    }

    usersMap.set(user, existingUser);
  }

  const users = Array.from(usersMap.values()).map((user) => {
    const preferredPeriod = periodKeys.reduce((best, current) => {
      return user.periodCounts[current] > user.periodCounts[best] ? current : best;
    }, "morning");

    const averageAmount = user.loadsCount ? user.totalAmount / user.loadsCount : 0;
    const daysSinceLastLoad = daysBetween(user.lastLoadDate, now);

    return {
      username: user.username,
      loadsCount: user.loadsCount,
      totalAmount: user.totalAmount,
      averageAmount,
      lastLoadAmount: user.lastLoadAmount,
      lastLoadLabel: user.lastLoadLabel,
      lastLoadAt: user.lastLoadDate.toISOString(),
      lastLoadAtLabel: user.lastLoadAtLabel,
      preferredPeriod,
      preferredAmountBucket: getAmountBucket(averageAmount),
      daysSinceLastLoad,
      inactivityBucket: getInactivityBucket(daysSinceLastLoad)
    };
  });

  return {
    summary: {
      uniqueUsers: users.length,
      totalLoads: users.reduce((sum, user) => sum + user.loadsCount, 0),
      totalAmount: users.reduce((sum, user) => sum + user.totalAmount, 0),
      totalLoadAmount: loadRows.reduce((sum, row) => {
        const amount = normalizeNumber(row[4]);
        return amount > 0 ? sum + amount : sum;
      }, 0),
      inactiveFive: users.filter((user) => user.inactivityBucket === "five").length,
      inactiveTen: users.filter((user) => user.inactivityBucket === "ten").length,
      inactiveFifteen: users.filter((user) => user.inactivityBucket === "fifteen").length
    },
    rankings: {
      week: buildTopRanking(loadRows, 7),
      month: buildTopRanking(loadRows, 30)
    },
    users: users
      .sort((left, right) => right.daysSinceLastLoad - left.daysSinceLastLoad)
      .map((user) => ({
        ...user,
        lastLoadAtDisplay: formatDateTime(new Date(user.lastLoadAt))
      }))
  };
}

function classifyZeusOperation(operation) {
  const normalized = String(operation || "").toUpperCase();

  if (
    normalized.includes("INCOME") ||
    normalized.includes("DEPOSIT") ||
    normalized.includes("LOAD")
  ) {
    return "income";
  }

  if (
    normalized.includes("WITHDRAW") ||
    normalized.includes("OUTCOME") ||
    normalized.includes("EXPENSE")
  ) {
    return "expense";
  }

  return "other";
}

function getZeusTransferPlayer(item) {
  if (String(item?.toUserRole || "").toLowerCase() === "player") {
    return {
      userId: item.toUserId,
      username: String(item.toUsername || "").trim()
    };
  }

  if (String(item?.fromUserRole || "").toLowerCase() === "player") {
    return {
      userId: item.fromUserId,
      username: String(item.fromUsername || "").trim()
    };
  }

  return null;
}

function getZeusTransferOffice(item) {
  if (String(item?.toUserRole || "").toLowerCase() === "player") {
    return String(item.fromUsername || item.creatorUsername || "").trim();
  }

  if (String(item?.fromUserRole || "").toLowerCase() === "player") {
    return String(item.toUsername || item.creatorUsername || "").trim();
  }

  return String(item.creatorUsername || "").trim();
}

function getBestOfficeLabel(officeCounts) {
  return Object.entries(officeCounts || {}).sort((left, right) => right[1] - left[1])[0]?.[0] || "";
}

function getMatchedPhoneLabels(contactsDirectory, officeLabel, username) {
  const officeKey = normalizeContactSearchText(officeLabel);
  const usernameKey = normalizeContactSearchText(username);
  const office = contactsDirectory?.offices?.[officeKey];

  if (!office || !usernameKey || usernameKey.length < 4) {
    return [];
  }
  office.matchCache ||= new Map();
  if (office.matchCache.has(usernameKey)) {
    return office.matchCache.get(usernameKey);
  }
  const labels = new Set();

  for (const entry of office.entries) {
    if (entry.searchText.includes(usernameKey)) {
      labels.add(entry.phoneLabel);
    }
  }
  const matchedLabels = Array.from(labels).sort((left, right) => left.localeCompare(right));
  office.matchCache.set(usernameKey, matchedLabels);
  return matchedLabels;
}

function buildZeusTopRanking(loads, days, userLookup) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const usersMap = new Map();

  for (const item of loads) {
    if (item.createdAtDate < cutoff) {
      continue;
    }

    const current = usersMap.get(item.username) || {
      username: item.username,
      totalAmount: 0,
      loadsCount: 0,
      lastLoadAt: item.createdAtDate,
      officeCounts: {}
    };

    current.totalAmount += item.amount;
    current.loadsCount += 1;
    if (item.officeLabel) {
      current.officeCounts[item.officeLabel] = (current.officeCounts[item.officeLabel] || 0) + 1;
    }

    if (item.createdAtDate > current.lastLoadAt) {
      current.lastLoadAt = item.createdAtDate;
    }

    usersMap.set(item.username, current);
  }

  return Array.from(usersMap.values())
    .sort((left, right) => {
      if (right.totalAmount !== left.totalAmount) {
        return right.totalAmount - left.totalAmount;
      }

      return right.loadsCount - left.loadsCount;
    })
    .slice(0, 100)
    .map((user, index) => ({
      ...(userLookup.get(user.username) || {}),
      rank: index + 1,
      username: user.username,
      totalAmount: user.totalAmount,
      loadsCount: user.loadsCount,
      lastLoadAtDisplay: formatDateTime(user.lastLoadAt),
      metricAmount: user.totalAmount,
      metricLoads: user.loadsCount,
      metricDate: user.lastLoadAt.getTime(),
      officeLabel: (userLookup.get(user.username) || {}).officeLabel || getBestOfficeLabel(user.officeCounts),
      phoneLabels: (userLookup.get(user.username) || {}).phoneLabels || []
    }));
}

function buildZeusAnalytics(transfers, contactsDirectory) {
  const usersMap = new Map();
  const now = new Date();
  const normalizedTransfers = transfers
    .map((item) => {
      const player = getZeusTransferPlayer(item);
      const username = String(player?.username || "").trim();
      const createdAtDate = new Date(item.createdAt);
      const amount = normalizeDecimal(item.amount);
      const operation = String(item.operation || "UNKNOWN").toUpperCase();
      const officeLabel = getZeusTransferOffice(item);

      return {
        id: item.id,
        username,
        userId: player?.userId || null,
        amount,
        operation,
        officeLabel,
        createdAt: item.createdAt,
        createdAtDate,
        createdAtDisplay: formatDateTime(createdAtDate),
        metricAmount: amount,
        metricLoads: 1,
        metricDate: createdAtDate.getTime()
      };
    })
    .filter((item) => item.username && item.amount > 0 && !Number.isNaN(item.createdAtDate.getTime()))
    .sort((left, right) => right.createdAtDate - left.createdAtDate);

  const loadTransfers = normalizedTransfers.filter((item) => item.operation === "INCOME");

  for (const item of loadTransfers) {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        hour12: false,
        timeZone
      }).format(item.createdAtDate)
    );
    const period =
      hour >= 6 && hour < 12
        ? "morning"
        : hour >= 12 && hour < 18
          ? "afternoon"
          : hour >= 18 && hour < 24
            ? "night"
            : "overnight";
    const current = usersMap.get(item.username) || {
      username: item.username,
      totalAmount: 0,
      loadsCount: 0,
      lastLoadDate: item.createdAtDate,
      periodCounts: { morning: 0, afternoon: 0, night: 0, overnight: 0 },
      officeCounts: {}
    };

    current.totalAmount += item.amount;
    current.loadsCount += 1;
    current.periodCounts[period] += 1;
    if (item.officeLabel) {
      current.officeCounts[item.officeLabel] = (current.officeCounts[item.officeLabel] || 0) + 1;
    }

    if (item.createdAtDate >= current.lastLoadDate) {
      current.lastLoadDate = item.createdAtDate;
    }

    usersMap.set(item.username, current);
  }

  const users = Array.from(usersMap.values())
    .map((user) => {
      const preferredPeriod = periodKeys.reduce((best, current) => {
        return user.periodCounts[current] > user.periodCounts[best] ? current : best;
      }, "morning");
      const averageAmount = user.loadsCount ? user.totalAmount / user.loadsCount : 0;
      const daysSinceLastLoad = Math.floor((now.getTime() - user.lastLoadDate.getTime()) / 86400000);
      const inactivityBucket = getInactivityBucket(daysSinceLastLoad);
      const officeLabel = getBestOfficeLabel(user.officeCounts);
      const phoneLabels = getMatchedPhoneLabels(contactsDirectory, officeLabel, user.username);

      return {
        username: user.username,
        loadsCount: user.loadsCount,
        totalAmount: user.totalAmount,
        averageAmount,
        lastLoadAt: user.lastLoadDate.toISOString(),
        lastLoadAtDisplay: formatDateTime(user.lastLoadDate),
        preferredPeriod,
        preferredAmountBucket: averageAmount >= 30000 ? "large" : averageAmount >= 10000 ? "medium" : averageAmount >= 3000 ? "small" : "other",
        daysSinceLastLoad,
        inactivityBucket,
        officeLabel,
        officeKey: normalizeContactSearchText(officeLabel),
        phoneLabels,
        metricAmount: averageAmount,
        metricLoads: user.loadsCount,
        metricDate: user.lastLoadDate.getTime()
      };
    })
    .sort((left, right) => right.daysSinceLastLoad - left.daysSinceLastLoad);

  const userLookup = new Map(users.map((user) => [user.username, user]));
  const officeSummary = Array.from(
    users.reduce((accumulator, user) => {
      if (!user.officeLabel) {
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
      week: buildZeusTopRanking(loadTransfers, 7, userLookup),
      month: buildZeusTopRanking(loadTransfers, 30, userLookup)
    },
    offices: officeSummary,
    users
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

async function handleApiConfig(response) {
  const contactsDirectory = await loadContactsDirectory();

  sendJson(response, 200, {
    providers: {
      zonaEpic: {
        baseUrl: process.env.ZONAEPIC_BASE_URL || defaultZonaBaseUrl,
        sessionId: process.env.ZONAEPIC_PHPSESSID || "",
        token: process.env.ZONAEPIC_TOKEN || "",
        fullImportStart: process.env.ZONAEPIC_FULL_IMPORT_START || "2025-01-01",
        maxLookbackDays
      },
      zeus: {
        baseUrl: process.env.ZEUS_BASE_URL || defaultZeusBaseUrl,
        username: process.env.ZEUS_USERNAME || "",
        password: process.env.ZEUS_PASSWORD || "",
        maxLookbackDays
      }
    },
    contactsDirectory: buildPublicContactsDirectory(contactsDirectory)
  });
}

async function handleApiLoads(requestUrl, response) {
  try {
    const body = requestUrl.body || {};
    const config = getRequestConfig({
      baseUrl: body.baseUrl,
      sessionId: body.sessionId,
      token: body.token
    });
    const username = "";
    const pageSize = Math.min(
      100,
      Number(body.length || requestUrl.searchParams.get("length") || process.env.ZONAEPIC_PAGE_SIZE || 100)
    );
    const defaultLookbackDays = Number(process.env.ZONAEPIC_LOOKBACK_DAYS || 30);
    const parsedFrom = parseDateInput(body.filterFrom);
    const parsedTo = parseDateInput(body.filterTo);
    const safeRange = clampDateRange(
      parsedFrom,
      parsedTo ? addDays(parsedTo, 1) : null,
      defaultLookbackDays
    );
    const filterFrom = safeRange.from;
    const filterToExclusive = safeRange.toExclusive;
    const token = await getSessionToken(config);
    const result = await fetchWindowedBalances({
      config,
      token,
      username,
      startDate: filterFrom,
      endDate: filterToExclusive,
      pageSize,
      maxRowsPerWindow: Number(process.env.ZONAEPIC_WINDOW_MAX_ROWS || 20000)
    });
    const rows = filterRowsByDateRange(result.rows, filterFrom, filterToExclusive);
    const analytics = buildAnalytics(rows);

    sendJson(response, 200, {
      meta: {
        fetchedAt: new Date().toISOString(),
        username: username || null,
        baseUrl: config.baseUrl,
        totalRows: rows.length,
        processedRows: rows.length,
        truncated: result.truncated,
        cacheMode: "stateless",
        importedFrom: result.firstSuccessfulDate || filterFrom.toISOString(),
        totalAmount: analytics.summary.totalLoadAmount,
        selectedDays: Math.max(
          1,
          Math.ceil((filterToExclusive.getTime() - filterFrom.getTime()) / 86400000)
        ),
        startDate: formatSpanishMonth(filterFrom),
        endDate: formatSpanishMonth(filterToExclusive),
        filterFrom: toInputDateValue(filterFrom),
        filterTo: toInputDateValue(addDays(filterToExclusive, -1)),
        skippedRanges: result.skippedRanges || []
      },
      analytics,
      rows: rows.map((row, index) => ({
        id: index + 1,
        date: row[0] || "",
        origin: row[1] || "",
        destination: row[2] || "",
        operations: row[3] || "",
        amountLabel: row[4] || "0,00",
        amount: normalizeNumber(row[4]),
        extra: row[5] || ""
      }))
    });
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
}

async function handleApiWindow(requestUrl, response) {
  try {
    const body = requestUrl.body || {};
    const config = getRequestConfig({
      baseUrl: body.baseUrl,
      sessionId: body.sessionId,
      token: body.token
    });
    const pageSize = Math.min(
      100,
      Number(body.length || requestUrl.searchParams.get("length") || process.env.ZONAEPIC_PAGE_SIZE || 100)
    );
    const defaultLookbackDays = Number(process.env.ZONAEPIC_LOOKBACK_DAYS || 30);
    const parsedFrom = parseDateInput(body.windowFrom || body.filterFrom);
    const parsedTo = parseDateInput(body.windowTo || body.filterTo || body.windowFrom || body.filterFrom);
    const safeRange = clampDateRange(
      parsedFrom,
      parsedTo ? addDays(parsedTo, 1) : null,
      defaultLookbackDays
    );
    const filterFrom = safeRange.from;
    const filterToExclusive = safeRange.toExclusive;
    const token = await getSessionToken(config);
    const result = await fetchWindowedBalances({
      config,
      token,
      username: "",
      startDate: filterFrom,
      endDate: filterToExclusive,
      pageSize,
      maxRowsPerWindow: Number(process.env.ZONAEPIC_WINDOW_MAX_ROWS || 20000)
    });

    if (!result.rows.length && result.skippedRanges?.length && !result.firstSuccessfulDate) {
      sendJson(response, 409, {
        error: "ZonaEpic no devolvio datos para este tramo historico inicial.",
        code: "UNSUPPORTED_RANGE",
        meta: {
          filterFrom: toInputDateValue(filterFrom),
          filterTo: toInputDateValue(addDays(filterToExclusive, -1)),
          skippedRanges: result.skippedRanges
        }
      });
      return;
    }

    sendJson(response, 200, {
      meta: {
        fetchedAt: new Date().toISOString(),
        baseUrl: config.baseUrl,
        filterFrom: toInputDateValue(filterFrom),
        filterTo: toInputDateValue(addDays(filterToExclusive, -1)),
        importedFrom: result.firstSuccessfulDate || filterFrom.toISOString(),
        truncated: result.truncated,
        skippedRanges: result.skippedRanges || []
      },
      rows: result.rows
    });
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
}

async function handleApiZeusSnapshot(requestUrl, response) {
  try {
    const body = requestUrl.body || {};
    const config = getZeusRequestConfig({
      baseUrl: body.baseUrl,
      username: body.username,
      password: body.password
    });
    const defaultLookbackDays = Number(process.env.ZEUS_LOOKBACK_DAYS || 30);
    const parsedFrom = parseDateInput(body.filterFrom);
    const parsedTo = parseDateInput(body.filterTo);
    const safeRange = clampDateRange(
      parsedFrom,
      parsedTo ? addDays(parsedTo, 1) : null,
      defaultLookbackDays
    );
    const pageSize = Math.min(30, Number(body.limit || process.env.ZEUS_PAGE_SIZE || 30));
    const auth = await loginZeus(config);
    const profile = await fetchZeusJson(
      `${config.profileUrl}?includeAccounts=true&includeCreator=true&includePermissions=true&includeAgentSettings=true`,
      auth.accessToken
    );
    const agentUserId = profile?.id || profile?.userId || auth.user?.id || auth.user?.userId;

    if (!agentUserId) {
      throw new Error("No pude obtener el agentUserId de Zeus.");
    }

    const [contactsDirectory, transfersPayload, statsPayload] = await Promise.all([
      loadContactsDirectory(),
      fetchAllZeusPlayerTransfers({
        config,
        accessToken: auth.accessToken,
        agentUserId,
        fromDate: safeRange.from,
        toDateExclusive: safeRange.toExclusive,
        pageSize
      }),
      fetchZeusJson(config.playerStatsUrl, auth.accessToken, {
        agentUserId,
        ...toZeusIsoRange(safeRange.from, safeRange.toExclusive),
        "operations[]": ["INCOME", "OUTCOME"]
      }).catch(() => null)
    ]);
    const analytics = buildZeusAnalytics(transfersPayload.rows, contactsDirectory);

    sendJson(response, 200, {
      meta: {
        provider: "zeus",
        fetchedAt: new Date().toISOString(),
        baseUrl: config.baseUrl,
        username: config.username,
        filterFrom: toInputDateValue(safeRange.from),
        filterTo: toInputDateValue(addDays(safeRange.toExclusive, -1)),
        totalRows: transfersPayload.rows.length,
        availableCount: transfersPayload.totalCount,
        agentUserId,
        totalAmount: normalizeDecimal(statsPayload?.totalDepositAmount)
      },
      profile,
      stats: statsPayload,
      analytics
    });
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

async function handleStatic(requestUrl, response) {
  let pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const filePath = path.normalize(path.join(publicDir, pathname));

  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const content = await readFile(filePath);
    const extname = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export async function handleRequest(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (
    requestUrl.pathname === "/api/loads" ||
    requestUrl.pathname === "/api/window" ||
    requestUrl.pathname === "/api/zonaepic/loads" ||
    requestUrl.pathname === "/api/zonaepic/window" ||
    requestUrl.pathname === "/api/zeus/snapshot"
  ) {
    if (request.method === "POST") {
      try {
        requestUrl.body = await readJsonBody(request);
      } catch {
        sendJson(response, 400, { error: "JSON invalido en la configuracion." });
        return;
      }
    }
    if (requestUrl.pathname === "/api/window" || requestUrl.pathname === "/api/zonaepic/window") {
      await handleApiWindow(requestUrl, response);
      return;
    }
    if (requestUrl.pathname === "/api/zeus/snapshot") {
      await handleApiZeusSnapshot(requestUrl, response);
      return;
    }
    await handleApiLoads(requestUrl, response);
    return;
  }

  if (requestUrl.pathname === "/api/config") {
    await handleApiConfig(response);
    return;
  }

  await handleStatic(requestUrl, response);
}

export default handleRequest;

if (!process.env.VERCEL) {
  const server = createServer(handleRequest);
  console.log("Booting dashboard server...");
  server.listen(port, () => {
    console.log(`Dashboard listo en http://localhost:${port}`);
  });
}
