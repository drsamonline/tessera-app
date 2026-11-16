/* ==========================================================================
   TESSERA console - the reference core, in the browser.
   No dependencies, no network, no build step. State lives in localStorage.
   ========================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---- deterministic hashing (Web Crypto) --------------------------------- */
async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}
function canonicalJSON(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJSON).join(",") + "]";
  return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonicalJSON(value[k])).join(",") + "}";
}

/* ---- seed data: two systems that disagree ------------------------------- */
const NODES = {
  hubspot: { id: "hubspot", label: "HubSpot", kind: "sales", trust: 0.82, authority: { email: "authority", stage: "authority" },
             lastSync: 4, errors: 0 },
  zendesk: { id: "zendesk", label: "Zendesk", kind: "support", trust: 0.61, authority: {},
             lastSync: 2, errors: 1 },
  netsuite:{ id: "netsuite", label: "NetSuite", kind: "erp", trust: 0.74, authority: { amount_minor: "authority" },
             lastSync: 96, errors: 0 },
  native:  { id: "native", label: "Tessera", kind: "native", trust: 0.90, authority: {},
             lastSync: 0, errors: 0 },
  // the engine itself, when the console is reading from one: every field it
  // resolves arrives already merged, so it is a source like any other
  engine:  { id: "engine", label: "Engine", kind: "native", trust: 0.95, authority: {},
             lastSync: 0, errors: 0 },
};

const UNKNOWN_NODE = { label: "Engine", trust: 0.5, authority: {}, lastSync: 0, errors: 0 };

function nodeInfo(id) {
  if (NODES[id]) return NODES[id];
  const first = String(id || "").split("+")[0];
  if (NODES[first]) return { ...NODES[first], label: sourceLabel(id) };
  return { ...UNKNOWN_NODE, label: sourceLabel(id) };
}

/* Every value that comes from a record, an engine or a file goes through this
   before it reaches innerHTML. Without it, a CSV with `<img src=x onerror=...>`
   in a name column is script execution in the origin that holds the bearer
   token - a stored XSS with a credential-theft payload, reachable by importing a
   file somebody sent you. */
function esc(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function sourceLabel(source) {
  if (!source) return "engine";
  if (source.includes("+")) {
    return source.split("+").map(part => (NODES[part] && NODES[part].label) || part).join(" + ");
  }
  return (NODES[source] && NODES[source].label) || source;
}

function connectorState(node) {
  if (node.errors > 0) return { state: "warn", label: `${node.errors} error${node.errors > 1 ? "s" : ""}` };
  if (node.lastSync > 60) return { state: "bad", label: "stale" };
  return { state: "ok", label: "healthy" };
}

const RECORDS = [
  { id: "c1", name: "Asha Rao", role: "Director of Operations", company: "Acme Industrial", health: 82,
    fields: {
      full_name:    { hubspot: "Asha Rao", zendesk: "Asha R Rao", netsuite: "Asha Rao" },
      email:        { hubspot: "asha@acme.example", zendesk: "asha.rao@acme.example" },
      phone:        { hubspot: "+91 90000 00001", netsuite: "+91 90000 00001" },
      company:      { hubspot: "Acme Industrial", netsuite: "Acme Industrial Pvt Ltd" },
      stage:        { hubspot: "proposal", native: "proposal" },
      amount_minor: { netsuite: 4500000, hubspot: 4500000 },
      owner:        { native: "Priya Nair" },
      consent:      { hubspot: "granted", zendesk: "granted" },
    },
    activity: [
      { at: "09:12", node: "hubspot", text: "Deal moved to proposal by Priya Nair" },
      { at: "09:40", node: "zendesk", text: "Ticket #4821 opened: delivery address change" },
      { at: "10:05", node: "native",  text: "Task assigned to position Support triage" },
      { at: "10:22", node: "netsuite", text: "Invoice INV-2291 issued for ₹45,000" },
      { at: "11:02", node: "zendesk", text: "Ticket #4821 resolved by agent" },
    ] },
  { id: "c2", name: "Ravi Kumar", role: "Head of Procurement", company: "Globex", health: 64,
    fields: {
      full_name:    { hubspot: "Ravi Kumar", netsuite: "Ravi Kumar" },
      email:        { hubspot: "ravi@globex.example", zendesk: "r.kumar@globex.example" },
      phone:        { hubspot: "+91 90000 00002" },
      company:      { hubspot: "Globex", netsuite: "Globex Ltd" },
      stage:        { hubspot: "negotiation" },
      amount_minor: { netsuite: 12000000 },
      owner:        { native: "Sam Iyer" },
      consent:      { hubspot: "granted" },
    },
    activity: [
      { at: "08:31", node: "hubspot", text: "Deal moved to negotiation" },
      { at: "09:15", node: "netsuite", text: "Credit note CN-118 applied" },
    ] },
  { id: "c3", name: "Meera Iyer", role: "Finance Lead", company: "Initech", health: 91,
    fields: {
      full_name:    { hubspot: "Meera Iyer", netsuite: "Meera Iyer" },
      email:        { hubspot: "meera@initech.example", zendesk: "meera@initech.example" },
      phone:        { hubspot: "+91 90000 00003", netsuite: "+91 90000 00003" },
      company:      { hubspot: "Initech", netsuite: "Initech" },
      stage:        { hubspot: "won", native: "won" },
      amount_minor: { netsuite: 8900000, hubspot: 8900000 },
      owner:        { native: "Priya Nair" },
      consent:      { hubspot: "granted", zendesk: "granted" },
    },
    activity: [
      { at: "10:02", node: "hubspot", text: "Deal closed won" },
      { at: "10:04", node: "netsuite", text: "Invoice INV-2302 raised" },
    ] },
  { id: "c4", name: "Daniel Okafor", role: "Plant Manager", company: "Umbrella", health: 47,
    fields: {
      full_name:    { hubspot: "Daniel Okafor", zendesk: "Dan Okafor" },
      email:        { hubspot: "daniel@umbrella.example" },
      phone:        { hubspot: "+234 800 000 0004" },
      company:      { hubspot: "Umbrella" },
      stage:        { hubspot: "scoping" },
      amount_minor: { netsuite: 2100000 },
      owner:        { native: "Sam Iyer" },
      consent:      { hubspot: "pending", zendesk: "granted" },
    },
    activity: [
      { at: "07:48", node: "zendesk", text: "Ticket #4790 reopened by customer" },
      { at: "08:10", node: "hubspot", text: "Discovery call logged" },
    ] },
  { id: "c5", name: "Sofia Marin", role: "Operations Director", company: "Vandelay", health: 73,
    fields: {
      full_name:    { hubspot: "Sofia Marin", netsuite: "Sofia Marin" },
      email:        { hubspot: "sofia@vandelay.example", netsuite: "s.marin@vandelay.example" },
      phone:        { hubspot: "+34 600 000 005" },
      company:      { hubspot: "Vandelay", netsuite: "Vandelay Imports" },
      stage:        { hubspot: "proposal" },
      amount_minor: { netsuite: 5600000 },
      owner:        { native: "Priya Nair" },
      consent:      { hubspot: "granted" },
    },
    activity: [{ at: "11:20", node: "hubspot", text: "Proposal sent" }] },
  { id: "c6", name: "Karan Shah", role: "IT Manager", company: "Hooli", health: 58,
    fields: {
      full_name:    { hubspot: "Karan Shah", zendesk: "Karan Shah" },
      email:        { hubspot: "karan@hooli.example" },
      phone:        { hubspot: "+91 90000 00006", netsuite: "+91 90000 00066" },
      company:      { hubspot: "Hooli" },
      stage:        { hubspot: "negotiation", native: "negotiation" },
      amount_minor: { netsuite: 3300000 },
      owner:        { native: "Sam Iyer" },
      consent:      { hubspot: "granted", zendesk: "granted" },
    },
    activity: [{ at: "09:55", node: "zendesk", text: "Ticket #4802 escalated" }] },
  { id: "c7", name: "Elena Petrova", role: "CFO", company: "Stark Industries", health: 88,
    fields: {
      full_name:    { hubspot: "Elena Petrova", netsuite: "Elena Petrova" },
      email:        { hubspot: "elena@stark.example" },
      phone:        { hubspot: "+44 20 0000 0007" },
      company:      { hubspot: "Stark Industries", netsuite: "Stark Industries" },
      stage:        { hubspot: "won" },
      amount_minor: { netsuite: 22000000 },
      owner:        { native: "Priya Nair" },
      consent:      { hubspot: "granted" },
    },
    activity: [{ at: "12:05", node: "netsuite", text: "Payment received in full" }] },
  { id: "c8", name: "Tomás Silva", role: "Logistics Lead", company: "Wayne Shipping", health: 39,
    fields: {
      full_name:    { hubspot: "Tomás Silva", zendesk: "Tomas Silva" },
      email:        { hubspot: "tomas@wayne.example", zendesk: "t.silva@wayne.example" },
      phone:        { hubspot: "+55 11 90000 0008" },
      company:      { hubspot: "Wayne Shipping" },
      stage:        { hubspot: "scoping" },
      amount_minor: { netsuite: 900000 },
      owner:        { native: "Sam Iyer" },
      consent:      { zendesk: "withdrawn" },
    },
    activity: [{ at: "13:40", node: "zendesk", text: "Consent withdrawn for marketing" }] },
  { id: "c9", name: "Nadia Haddad", role: "Buyer", company: "Soylent", health: 76,
    fields: {
      full_name:    { hubspot: "Nadia Haddad", netsuite: "Nadia Haddad" },
      email:        { hubspot: "nadia@soylent.example" },
      phone:        { hubspot: "+971 50 000 0009" },
      company:      { hubspot: "Soylent" },
      stage:        { hubspot: "proposal" },
      amount_minor: { netsuite: 1750000 },
      owner:        { native: "Priya Nair" },
      consent:      { hubspot: "granted", zendesk: "granted" },
    },
    activity: [{ at: "14:12", node: "hubspot", text: "Pricing sheet shared" }] },
  { id: "c10", name: "Ben Whitfield", role: "Founder", company: "Tyrell", health: 52,
    fields: {
      full_name:    { hubspot: "Ben Whitfield", zendesk: "Benjamin Whitfield" },
      email:        { hubspot: "ben@tyrell.example" },
      phone:        { hubspot: "+1 415 000 0010" },
      company:      { hubspot: "Tyrell", netsuite: "Tyrell Corp" },
      stage:        { hubspot: "negotiation" },
      amount_minor: { netsuite: 7400000 },
      owner:        { native: "Sam Iyer" },
      consent:      { hubspot: "granted" },
    },
    activity: [{ at: "15:30", node: "hubspot", text: "Contract redlines received" }] },
];

let RECORD = RECORDS[0].fields;
let ACTIVITY = RECORDS[0].activity;
function allRecords() {
  if (state.engine && state.engine.live && state.engineRecords && state.engineRecords.length) {
    return state.engineRecords;
  }
  return RECORDS.concat(state.customRecords || []);
}

async function loadEngineCompanies() {
  state.engineCompanies = [];
  try {
    const listing = await engineFetch("/v1/objects/Company");
    for (const id of listing.ids) {
      const detail = await engineFetch(`/v1/objects/Company/${id}`);
      state.engineCompanies.push(detail.record || {});
    }
  } catch { state.engineCompanies = []; }
}

async function loadEngineDeals() {
  state.engineDeals = [];
  try {
    const listing = await engineFetch("/v1/objects/Deal");
    for (const id of listing.ids) {
      const detail = await engineFetch(`/v1/objects/Deal/${id}`);
      state.engineDeals.push(detail.record || {});
    }
  } catch { state.engineDeals = []; }
}

/* The engine's records, in the shape this console renders. A field the engine
   resolved comes with its source and rule, which is exactly what a provenance
   line needs - so the live view is not a lesser view. */
async function loadEngineRecords() {
  const listing = await engineFetch("/v1/objects/Contact");
  const records = [];
  for (const id of listing.ids) {
    const detail = await engineFetch(`/v1/objects/Contact/${id}`);
    const record = detail.record || {};
    let view = null;
    try { view = await engineFetch(`/v1/mesh/view/Contact/${id}`); } catch { view = null; }

    // The envelope is not the record. A CRM screen shows the customer, not
    // tenant_id and tx_time, so the live view is filtered to the same fields the
    // demo record shows rather than dumping the canonical schema on the page.
    const SHOWN = ["full_name", "email", "phone", "company_ref", "consent_state",
                   "stage", "amount_minor", "owner_seat_id"];
    const fields = {};
    const source = (view && view.fields) || record;
    for (const [field, value] of Object.entries(source)) {
      if (!SHOWN.includes(field)) continue;
      if (view && view.fields) {
        fields[field] = { [value.source || "engine"]: value.value };
      } else {
        fields[field] = { engine: value };
      }
    }
    records.push({
      id, name: record.full_name || record.email || id.slice(0, 8),
      role: view ? `${view.nodes.length} systems` : "from the engine",
      company: record.company_ref || "-", health: 50, fields,
      engineView: view, activity: [],
    });
  }
  state.engineRecords = records;
  await loadEngineDeals();
  await loadEngineCompanies();
  // the selection was a demo id; point it at a record that now exists
  if (records.length && !records.some(record => record.id === state.selected)) {
    state.selected = records[0].id;
    RECORD = records[0].fields;
    ACTIVITY = records[0].activity;
  }
  return records;
}

function activeRecord() {
  const pool = listPool();
  return pool.find(record => record.id === state.selected) || pool[0] || RECORDS[0];
}

/* ---- conflict resolution, ported from conflict.py ----------------------- */
const AUTHORITY_RANK = { authority: 3, delegate: 2, bidirectional: 1, mirror: 0 };

function resolveField(field, candidates, authority) {
  if (!candidates || !Object.keys(candidates).length) {
    return { value: "", node: "engine", rule: "no value", blocked: false };
  }
  const entries = Object.entries(candidates).map(([node, value]) => ({ node, value }));
  if (entries.length === 1) return { ...entries[0], rule: "single source" };

  const owned = entries.filter(e => AUTHORITY_RANK[authority[e.node]] === 3);
  if (owned.length === 1) return { ...owned[0], rule: "authority map" };
  if (owned.length > 1) {
    owned.sort((a, b) => nodeInfo(b.node).trust - nodeInfo(a.node).trust);
    return { ...owned[0], rule: "authority, then trust" };
  }
  const distinct = new Set(entries.map(e => canonicalJSON(e.value)));
  if (distinct.size === 1) return { ...entries[0], rule: "agreement" };

  const ranked = [...entries].sort((a, b) => nodeInfo(b.node).trust - nodeInfo(a.node).trust);
  if (nodeInfo(ranked[0].node).trust > nodeInfo(ranked[1].node).trust) {
    return { ...ranked[0], rule: "trust score" };
  }
  return { ...ranked[0], rule: "trust, then node id", blocked: true };
}

/* ---- routing, ported from routing.py ------------------------------------ */
const WEIGHTS = { capability_match: 0.30, authority_match: 0.15, sla_headroom: 0.15,
                  trust_score: 0.15, utilization: 0.10, cost_efficiency: 0.10,
                  data_freshness: 0.05, _penalty: 0.20 };

function routeScore(terms) {
  let total = 0;
  const lines = [];
  for (const [name, weight] of Object.entries(WEIGHTS)) {
    if (name.startsWith("_")) continue;
    const contribution = weight * terms[name];
    total += contribution;
    lines.push(`${name.padEnd(20)} ${terms[name].toFixed(2)} × ${weight.toFixed(2)} = ${contribution.toFixed(3)}`);
  }
  const penalty = WEIGHTS._penalty * terms.cross_boundary_penalty;
  lines.push(`${"cross_boundary".padEnd(20)} ${terms.cross_boundary_penalty.toFixed(2)} × ${WEIGHTS._penalty.toFixed(2)} = -${penalty.toFixed(3)}`);
  return { score: total - penalty, lines };
}

/* ---- state -------------------------------------------------------------- */
const DEFAULT_STATE = {
  selected: "c1",
  query: "",
  view: { filter: "all", sort: "name" },
  listObject: "Contact",   // Contact, Company or Deal — the list is not contact-only
  savedViews: {},
  customRecords: [],
  outbox: [],
  flushed: [],
  rules: {},             // field -> node, applied to every record
  engine: { url: "", token: "", live: false },
  resolved: {},          // "recordId|field" -> chosen node
  ledger: null,          // [{seq, action, actor, payload, hash, prev}]
  theme: "dark",
  density: "comfortable",
  assigned: null,
  escalated: null,
  workflowEnabled: { "w1": true, "w2": true },
};
let state = structuredClone(DEFAULT_STATE);

/* Two stores on purpose. localStorage is synchronous, so every call site stays
   simple and the UI never waits; IndexedDB holds the same document without the
   5 MB ceiling and is the copy that survives an eviction of the small one. */
const STORE_KEY = "tessera.console.v1";
const DB_NAME = "tessera-console";
const DB_STORE = "state";
let storageBackend = "memory";

function idbOpen() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) { reject(new Error("no indexedDB")); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbRun(mode, work) {
  return idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, mode);
    const store = tx.objectStore(DB_STORE);
    const request = work(store);
    tx.oncomplete = () => { db.close(); resolve(request && request.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

const idbGet = key => idbRun("readonly", store => store.get(key));
const idbSet = (key, value) => idbRun("readwrite", store => store.put(value, key));

/* Ask once, remember the answer. Without this the browser may evict the whole
   workspace under pressure, and the user blames the app rather than the quota. */
let persistState = "";

/* Every storage API here gets a deadline. A permission prompt with no UI, a
   private window, an embedded webview - each of them can leave a promise that
   never settles, and a panel that says "Checking…" forever is worse than one
   that says it could not find out. */
function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallback), ms)),
  ]).catch(() => fallback);
}

async function requestPersistence() {
  if (!navigator.storage || !navigator.storage.persist) { persistState = "not supported"; return; }
  const already = navigator.storage.persisted
    ? await withTimeout(navigator.storage.persisted(), 1500, false) : false;
  if (already) { persistState = "granted"; return; }
  const granted = await withTimeout(navigator.storage.persist(), 1500, null);
  persistState = granted === null ? "no answer from the browser"
              : granted ? "granted" : "denied by the browser";
}

function mergeState(raw) {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return Object.assign(structuredClone(DEFAULT_STATE), parsed || {});
}

async function loadState() {
  // A storage engine that never answers must not hang the boot. The mirror is
  // there for exactly this: a private window, a blocked origin, a wedged profile.
  try {
    const fromIdb = await withTimeout(idbGet(STORE_KEY), 1500, null);
    if (fromIdb) { storageBackend = "indexeddb"; return mergeState(fromIdb); }
  } catch {}
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const merged = mergeState(raw);
      idbSet(STORE_KEY, merged).then(() => { storageBackend = "indexeddb"; }).catch(() => {});
      storageBackend = "localstorage";
      return merged;
    }
  } catch {}
  storageBackend = "indexeddb";
  return structuredClone(DEFAULT_STATE);
}

function save() {
  let serialised;
  try { serialised = JSON.stringify(state); } catch { return; }
  try { localStorage.setItem(STORE_KEY, serialised); } catch {}
  idbSet(STORE_KEY, serialised).then(() => { storageBackend = "indexeddb"; }).catch(() => {});
}

/* ---- the engine, when there is one ------------------------------------- */
async function engineFetch(path) {
  const { url, token } = state.engine || {};
  if (!url) throw new Error("no engine configured");
  const response = await fetch(`${url}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function connectEngine() {
  const url = ($("#engineUrl").value || "").trim().replace(/\/$/, "");
  const token = ($("#engineToken").value || "").trim();
  const status = $("#engineStatus");
  if (!url) { status.textContent = "Enter an address first."; return; }
  status.textContent = "Contacting the engine…";
  try {
    const health = await fetch(`${url}/health`).then(r => r.json());
    const listing = await fetch(`${url}/v1/objects/Contact`,
      { headers: { Authorization: `Bearer ${token}` } });
    if (!listing.ok) throw new Error(`${listing.status} from /v1/objects/Contact`);
    const data = await listing.json();
    state.engine = { url, token, live: true };
    save();
    await loadEngineRecords();
    status.textContent = `Connected to ${health.tenant || "engine"} — ${data.ids.length} contact(s).`;
    renderAll();
    toast("Engine connected — the Records list is live");
  } catch (error) {
    state.engine = { url, token, live: false };
    save();
    status.textContent = `Could not connect: ${esc(error.message)}. A CORS refusal looks identical to a refused ` +
      `connection from here — check the engine's allowlist includes this origin.`;
  }
  renderEngineChip();
}

function disconnectEngine() {
  state.engine = { url: "", token: "", live: false };
  state.engineRecords = [];
  save();
  $("#engineStatus").textContent = "Not connected — showing the demo.";
  $("#engineUrl").value = "";
  $("#engineToken").value = "";
  renderEngineChip();
  renderAll();
  toast("Disconnected — back to the demo data");
}

function renderEngineChip() {
  const chip = $("#engineChip");
  if (!chip) return;
  const live = state.engine && state.engine.live;
  chip.hidden = !live;
  chip.textContent = live ? `engine ${new URL(state.engine.url).host}` : "";
}

async function storageReport() {
  const lines = [`Backend: ${storageBackend === "indexeddb" ? "IndexedDB + localStorage mirror" : "localStorage only"}`];
  if (persistState) lines.push(`Persistent: ${persistState}`);
  try {
    const estimate = await withTimeout(navigator.storage.estimate(), 1500, null);
    if (estimate && estimate.quota) {
      lines.push(`Used: ${(estimate.usage / 1024).toFixed(0)} KB of ${(estimate.quota / 1048576).toFixed(0)} MB available`);
    }
  } catch { lines.push("Quota: not reported by this browser"); }
  lines.push(`Records: ${allRecords().length} · ledger events: ${(state.ledger || []).length}` +
             ` · queued: ${(state.outbox || []).length}`);
  return lines.join(" · ");
}

/* ---- the ledger --------------------------------------------------------- */
const SEED_EVENTS = [
  { action: "contact.sync", actor: "system", payload: { node: "hubspot", field: "email", value: "asha@acme.example" } },
  { action: "contact.sync", actor: "system", payload: { node: "zendesk", field: "email", value: "asha.rao@acme.example" } },
  { action: "conflict.resolved", actor: "human", payload: { field: "email", rule: "authority map", winner: "hubspot" } },
  { action: "task.assigned", actor: "system", payload: { seat: "Support triage", occupant: "priya" } },
  { action: "deal.stage", actor: "human", payload: { from: "scoping", to: "proposal" } },
];

/* The five seed events, hashed once at build time. Boot uses these so the chain
   is on screen at first paint instead of after a round of crypto.subtle - which
   takes milliseconds in a browser and can hang in an environment without a real
   clock. Reset still rebuilds them from scratch, and verify always recomputes. */
const SEED_LEDGER = [{"seq": 1, "action": "contact.sync", "actor": "system", "payload": {"node": "hubspot", "field": "email", "value": "asha@acme.example"}, "prev": "0000000000000000000000000000000000000000000000000000000000000000", "hash": "8387edf587d629aaedd40722b3e4327aa481f294cbe5cba2bd23bff302685fb7"}, {"seq": 2, "action": "contact.sync", "actor": "system", "payload": {"node": "zendesk", "field": "email", "value": "asha.rao@acme.example"}, "prev": "8387edf587d629aaedd40722b3e4327aa481f294cbe5cba2bd23bff302685fb7", "hash": "193381dd139b2f878fbfacbc71085d5b9f3d1cb85e9d7cde74e40a391f6c45d4"}, {"seq": 3, "action": "conflict.resolved", "actor": "human", "payload": {"field": "email", "rule": "authority map", "winner": "hubspot"}, "prev": "193381dd139b2f878fbfacbc71085d5b9f3d1cb85e9d7cde74e40a391f6c45d4", "hash": "1d3ad328402154d87d5eb8d0ac557875d32636422db595f328a7a25c156bcbfd"}, {"seq": 4, "action": "task.assigned", "actor": "system", "payload": {"seat": "Support triage", "occupant": "priya"}, "prev": "1d3ad328402154d87d5eb8d0ac557875d32636422db595f328a7a25c156bcbfd", "hash": "7c88b7a7f3f6fe179031aba489c0bfd645db039d60266b09ca5fb4785150c9f9"}, {"seq": 5, "action": "deal.stage", "actor": "human", "payload": {"from": "scoping", "to": "proposal"}, "prev": "7c88b7a7f3f6fe179031aba489c0bfd645db039d60266b09ca5fb4785150c9f9", "hash": "0efca780d51e669f99393e7a3478ccbb8d50f718b1938d141a0c19bb2afae9f5"}];

async function buildLedger() {
  const events = [];
  let prev = "0".repeat(64);
  for (let i = 0; i < SEED_EVENTS.length; i++) {
    const base = { seq: i + 1, ...SEED_EVENTS[i], prev };
    const hash = await sha256(canonicalJSON(base));
    events.push({ ...base, hash });
    prev = hash;
  }
  return events;
}

async function ensureLedger() {
  if (!state.ledger) {
    state.ledger = structuredClone(SEED_LEDGER);
    save();
  }
  return state.ledger;
}

/* Every mutation goes through a durable outbox before it reaches the chain.
   There is no server to sync with, so "background sync" here means the honest
   half: an intent that survives the tab being killed, replayed into the ledger
   on the next boot. Ids make the replay idempotent. */
function enqueue(action, actor, payload) {
  const item = {
    id: "q" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    action, actor, payload, at: new Date().toISOString(),
  };
  state.outbox = (state.outbox || []).concat(item);
  save();
  renderQueue();
  return flushOutbox();
}

async function flushOutbox() {
  const queue = state.outbox || [];
  if (!queue.length) return;
  await ensureLedger();
  const done = new Set(state.flushed || []);
  for (const item of queue) {
    if (done.has(item.id)) continue;
    await appendEvent(item.action, item.actor, item.payload);
    done.add(item.id);
  }
  state.flushed = Array.from(done).slice(-400);
  state.outbox = [];
  save();
  renderQueue();
}

function renderQueue() {
  const chip = $("#queueChip");
  if (!chip) return;
  const pending = (state.outbox || []).length;
  chip.hidden = pending === 0;
  chip.textContent = pending ? `${pending} queued` : "";
}

async function appendEvent(action, actor, payload) {
  const events = await ensureLedger();
  const prev = events.length ? events[events.length - 1].hash : "0".repeat(64);
  const base = { seq: events.length + 1, action, actor, payload, prev };
  const hash = await sha256(canonicalJSON(base));
  events.push({ ...base, hash });
  state.ledger = events;
  save();
  renderLedger();
}

async function verifyChain() {
  const events = await ensureLedger();
  let prev = "0".repeat(64);
  for (const event of events) {
    const { hash, ...base } = event;
    if (base.prev !== prev) return { ok: false, at: event.seq, why: "broken link" };
    if (await sha256(canonicalJSON(base)) !== hash) return { ok: false, at: event.seq, why: "hash mismatch" };
    prev = hash;
  }
  return { ok: true, count: events.length };
}

/* ---- rendering ---------------------------------------------------------- */
/* Every overlay returns focus where it came from and keeps Tab inside itself.
   A dialog you can tab out of is a dialog that strands a keyboard user behind
   the backdrop. */
let sheetReturnFocus = null;

function focusables(root) {
  return Array.from(root.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter(node => !node.disabled && node.offsetParent !== null);
}

function trapFocus(root) {
  root.addEventListener("keydown", event => {
    if (event.key !== "Tab") return;
    const nodes = focusables(root);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
}

function openSheet(id) {
  sheetReturnFocus = document.activeElement;
  const el = $(id);
  el.hidden = false;
  const nodes = focusables(el);
  if (nodes.length) nodes[0].focus();
}

function closeSheet(id) {
  $(id).hidden = true;
  if (sheetReturnFocus && sheetReturnFocus.focus) sheetReturnFocus.focus();
  sheetReturnFocus = null;
}

function toast(message, onUndo) {
  const el = $("#toast");
  el.textContent = "";
  el.append(document.createTextNode(message));
  if (onUndo) {
    const button = document.createElement("button");
    button.className = "undo";
    button.textContent = "Undo";
    button.onclick = () => { el.removeAttribute("data-show"); onUndo(); };
    el.append(button);
  }
  el.setAttribute("data-show", "");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.removeAttribute("data-show"), onUndo ? 9000 : 2400);
}

function currentValue(field) {
  // A record that came from the engine already carries the engine's resolution,
  // including which node won and by which rule. Recomputing it here would be a
  // second implementation of the same decision, which is how two answers appear.
  const view = activeRecord().engineView;
  if (view && view.fields && view.fields[field]) {
    const resolved = view.fields[field];
    return { value: resolved.value, node: resolved.source || "engine",
             rule: resolved.rule || "engine", blocked: resolved.blocked };
  }
  const candidates = RECORD[field];
  const resolution = resolveField(field, candidates, Object.fromEntries(
    Object.entries(candidates).map(([node]) => [node, nodeInfo(node).authority[field] || "bidirectional"])));
  // order: a choice for this record, then your standing rule, then the engine
  const chosen = state.resolved[state.selected + "|" + field];
  if (chosen && candidates[chosen] !== undefined) {
    return { value: candidates[chosen], node: chosen, rule: "chosen by you" };
  }
  const rule = (state.rules || {})[field];
  if (rule && candidates[rule] !== undefined) {
    return { value: candidates[rule], node: rule, rule: "your standing rule" };
  }
  return { value: resolution.value, node: resolution.node, rule: resolution.rule };
}

function isConflict(field) {
  const view = activeRecord().engineView;
  if (view && view.fields && view.fields[field]) return Boolean(view.fields[field].blocked);
  const values = new Set(Object.values(RECORD[field]).map(v => canonicalJSON(v)));
  if (values.size <= 1) return false;
  if (state.resolved[state.selected + "|" + field]) return false;
  const rule = (state.rules || {})[field];
  return !(rule && RECORD[field][rule] !== undefined);
}

function formatValue(field, value) {
  if (field === "amount_minor") return "₹" + (value / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  return String(value);
}

function conflictsIn(record) {
  return Object.entries(record.fields).filter(([field, candidates]) => {
    const distinct = new Set(Object.values(candidates).map(v => canonicalJSON(v)));
    return distinct.size > 1 && !state.resolved[record.id + "|" + field];
  }).length;
}

/* The list is not contact-only. A CRM you cannot browse by company or by deal is a
   contact directory with extra screens; the object switcher is the difference. */
function listPool() {
  const object = state.listObject || "Contact";
  if (object === "Company") {
    return (state.engineCompanies || []).map(company => ({
      id: company.id, object: "Company",
      name: company.name || company.domain || company.id.slice(0, 8),
      role: company.industry || "company",
      company: company.domain || "",
      health: 0, fields: { name: { engine: company.name }, domain: { engine: company.domain } },
      activity: [], raw: company,
    }));
  }
  if (object === "Deal") {
    return (state.engineDeals || []).map(deal => {
      const company = (state.engineCompanies || [])
        .find(item => `Company:${item.id}` === deal.company_ref);
      return {
        id: deal.id, object: "Deal",
        name: deal.name || "deal",
        role: deal.stage || "unknown",
        company: company ? company.name : "",
        health: 0,
        fields: { name: { engine: deal.name }, stage: { engine: deal.stage },
                  amount_minor: { engine: deal.amount_minor } },
        activity: [], raw: deal,
      };
    });
  }
  return allRecords().map(record => ({ ...record, object: "Contact" }));
}

function renderRecords() {
  const query = (state.query || "").trim().toLowerCase();
  const { filter, sort } = state.view || { filter: "all", sort: "name" };
  const pool = listPool();
  const matches = pool.filter(record => {
    if (query) {
      const haystack = [record.name, record.company, record.role,
        ...Object.values(record.fields.email || {}),
        ...Object.values(record.fields.company || {})].join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    const conflicts = conflictsIn(record);
    if (filter === "conflicts" && conflicts === 0) return false;
    if (filter === "agrees" && conflicts > 0) return false;
    return true;
  }).sort((a, b) => {
    if (sort === "health") return b.health - a.health;
    if (sort === "conflicts") return conflictsIn(b) - conflictsIn(a) || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });

  const object = state.listObject || "Contact";
  const noun = ({ Contact: "customer", Company: "company", Deal: "deal" })[object];
  const plural = ({ Contact: "customers", Company: "companies", Deal: "deals" })[object];
  $("#recordCount").textContent = (query || filter !== "all")
    ? `${matches.length} of ${pool.length}`
    : `${pool.length} ${pool.length === 1 ? noun : plural}`;

  const host = $("#recordList");
  if (!matches.length) {
    host.innerHTML = query
      ? `<p class="empty">Nothing matches “${esc(query)}”.</p>`
      : `<p class="empty">No ${esc(plural)} yet.</p>`;
    return;
  }
  host.innerHTML = matches.map(record => {
    const conflicts = conflictsIn(record);
    const initials = record.name.split(" ").map(part => part[0]).join("").slice(0, 2);
    const email = currentValueFor(record, "email");
    return `<button class="rec" data-open="${esc(record.id)}" ${record.id === state.selected ? 'aria-current="true"' : ""}>
      <span class="av" aria-hidden="true">${esc(initials)}</span>
      <span>
        <span class="nm">${esc(record.name)}</span>
        <span class="meta">${esc(record.role)} · ${esc(record.company)}<br>${esc(email)}</span>
      </span>
      <span class="right">
        ${conflicts ? `<span class="chip warn">${conflicts} conflict${conflicts > 1 ? "s" : ""}</span>`
                    : `<span class="chip ok">agrees</span>`}
        <span class="chip" title="Relationship health"><span class="sr">health </span>${esc(record.health)}</span>
      </span>
    </button>`;
  }).join("");

  $$("[data-open]", host).forEach(button => button.onclick = () => {
    const object = state.listObject || "Contact";
    if (object === "Company") openCompany(button.dataset.open);
    else if (object === "Deal") openDeal(button.dataset.open);
    else openRecord(button.dataset.open);
  });
}

function currentValueFor(record, field) {
  const candidates = record.fields[field] || {};
  if (!Object.keys(candidates).length) return "";
  const chosen = state.resolved[record.id + "|" + field];
  if (chosen && candidates[chosen] !== undefined) return candidates[chosen];
  const resolution = resolveField(field, candidates, Object.fromEntries(
    Object.entries(candidates).map(([node]) => [node, nodeInfo(node).authority[field] || "bidirectional"])));
  return resolution.value;
}

function openRecord(id) {
  state.selected = id;
  const record = activeRecord();
  RECORD = record.fields;
  ACTIVITY = record.activity;
  save();
  go("unified");
  renderAll();
  toast(`${record.name} loaded`);
}

function renderFields() {
  const host = $("#fields");
  host.innerHTML = "";
  for (const field of Object.keys(RECORD)) {
    const { value, node, rule } = currentValue(field);
    const row = document.createElement("div");
    row.className = "frow";
    if (isConflict(field)) row.dataset.conflict = "1";
    const label = field === "amount_minor" ? "Deal amount" : field.replace(/_/g, " ");
    row.innerHTML = `
      <div class="k">${esc(label)}</div>
      <button class="v" type="button" data-hist="${esc(field)}" title="See every write to this field">${esc(formatValue(field, value))}</button>
      <div class="src">${esc(sourceLabel(node))} · ${esc(rule.replace(/_/g, " "))}</div>
      <button class="editbtn" type="button" data-edit="${esc(field)}" aria-label="Edit ${esc(label)}"
        title="Edit this field">✎</button>`;
    if (isConflict(field)) {
      const btn = document.createElement("button");
      btn.className = "rowaction";
      btn.textContent = "Resolve";
      btn.onclick = () => go("conflicts");
      row.appendChild(btn);
    }
    host.appendChild(row);
  }
  $$("[data-hist]", host).forEach(btn => btn.onclick = () => openHistory(btn.dataset.hist));
  $$("[data-edit]", host).forEach(btn => btn.onclick = () => openEdit(btn.dataset.edit));
  const count = Object.keys(RECORD).filter(isConflict).length;
  const chip = $("#conflictCount");
  chip.textContent = count === 1 ? "1 conflict" : `${count} conflicts`;
  chip.className = count ? "chip warn" : "chip ok";
}

function renderReport() {
  const records = allRecords();
  const openConflicts = records.reduce((total, record) =>
    total + Object.keys(record.fields).filter(field => {
      const previous = RECORD;
      RECORD = record.fields;
      const conflict = isConflict(field);
      RECORD = previous;
      return conflict;
    }).length, 0);
  const deals = state.engineDeals || [];

  $("#reportKpis").innerHTML = [
    ["Contacts", records.length],
    ["Open conflicts", openConflicts],
    ["Deals", deals.length || "—"],
    ["Pipeline", deals.length
      ? formatValue("amount_minor", deals.reduce((sum, deal) => sum + (deal.amount_minor || 0), 0))
      : "—"],
  ].map(([label, value]) => `<div class="kpi"><b>${esc(value)}</b><span>${esc(label)}</span></div>`).join("");

  // pipeline by stage, drawn with divs: a chart library for five bars is a dependency
  const byStage = {};
  for (const deal of deals) byStage[deal.stage || "unknown"] = (byStage[deal.stage || "unknown"] || 0) + 1;
  const stages = Object.entries(byStage).sort((a, b) => b[1] - a[1]);
  const most = Math.max(1, ...stages.map(([, count]) => count));
  $("#reportPipeline").innerHTML = stages.length
    ? stages.map(([stage, count]) => `
        <div class="bar"><span>${esc(stage)}</span>
          <span class="track"><span class="fill" style="width:${(count / most) * 100}%"></span></span>
          <span class="n">${count}</span></div>`).join("")
    : `<p class="note">No deals yet. ${state.engine && state.engine.live
        ? "The engine has none for this tenant."
        : "Connect an engine to read them."}</p>`;

  // which node supplied how many fields, across every record
  const sources = {};
  for (const record of records) {
    for (const field of Object.keys(record.fields)) {
      const previous = RECORD;
      RECORD = record.fields;
      const { node } = currentValue(field);
      RECORD = previous;
      const label = sourceLabel(node);
      sources[label] = (sources[label] || 0) + 1;
    }
  }
  const totalFields = Object.values(sources).reduce((a, b) => a + b, 0) || 1;
  $("#reportSources").innerHTML = Object.entries(sources)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => `
      <div class="bar"><span>${esc(label)}</span>
        <span class="track"><span class="fill" style="width:${(count / totalFields) * 100}%"></span></span>
        <span class="n">${Math.round((count / totalFields) * 100)}%</span></div>`).join("");

  const wanted = ["full_name", "email", "phone", "company_ref"];
  const rows = records.map(record => {
    const filled = wanted.filter(field => record.fields[field]).length;
    return { name: record.name, filled, of: wanted.length };
  }).sort((a, b) => a.filled - b.filled).slice(0, 8);
  $("#reportCompleteness").innerHTML = rows.map(row => `
    <div class="bar"><span>${esc(row.name)}</span>
      <span class="track"><span class="fill" style="width:${(row.filled / row.of) * 100}%"></span></span>
      <span class="n">${row.filled}/${row.of}</span></div>`).join("");
}

function renderConnectors() {
  $("#connectors").innerHTML = Object.values(NODES).map(node => {
    const status = connectorState(node);
    const ago = node.lastSync === 0 ? "now" : `${esc(node.lastSync)}m ago`;
    return `<span class="conn ${status.state === "ok" ? "" : status.state}"
      title="${node.label}: last sync ${ago}, ${node.errors} error(s)">
      <span class="dot" aria-hidden="true"></span>
      <b>${node.label}</b>
      <time>${ago}</time>
      <span>${status.label}</span>
    </span>`;
  }).join("");
}

const STAGE_ORDER = ["scoping", "proposal", "negotiation", "closed_won", "closed_lost"];

function renderPipeline() {
  const board = $("#board");
  if (!board) return;
  const deals = state.engineDeals || [];
  if (!deals.length) {
    board.innerHTML = `<p class="note">${state.engine && state.engine.live
      ? "No deals on this tenant yet." : "Connect an engine to read deals."}</p>`;
    return;
  }
  const stages = STAGE_ORDER.concat(deals.map(deal => deal.stage || "unknown")
    .filter(stage => !STAGE_ORDER.includes(stage)));
  board.innerHTML = [...new Set(stages)].map(stage => {
    const inStage = deals.filter(deal => (deal.stage || "unknown") === stage);
    const total = inStage.reduce((sum, deal) => sum + (deal.amount_minor || 0), 0);
    const next = STAGE_ORDER[STAGE_ORDER.indexOf(stage) + 1];
    return `<div class="col">
      <header><b>${esc(stage.replace(/_/g, " "))}</b>
        <span>${inStage.length} deal${inStage.length === 1 ? "" : "s"} · ${formatValue("amount_minor", total)}</span></header>
      <div class="cards">
        ${inStage.map(deal => {
          const company = (state.engineCompanies || [])
            .find(item => `Company:${esc(item.id)}` === deal.company_ref);
          return `<div class="dcard">
            <b>${esc(deal.name)}</b>
            <span class="amt">${formatValue("amount_minor", deal.amount_minor || 0)}</span>
            <span class="co">${company ? esc(company.name) : ""}</span>
            <div class="row" style="margin-top:8px;gap:6px">
              <button class="move" data-open="${esc(deal.id)}">Open</button>
              ${next ? `<button class="move" data-move="${esc(deal.id)}|${next}">→ ${next.replace(/_/g, " ")}</button>` : ""}
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
  }).join("");
  $$("[data-open]", board).forEach(button =>
    button.onclick = () => openDeal(button.dataset.open));
  $$("[data-move]", board).forEach(button => button.onclick = async () => {
    const [dealId, stage] = button.dataset.move.split("|");
    await moveDeal(dealId, stage);
  });
}

async function moveDeal(dealId, stage) {
  if (!(state.engine && state.engine.live)) { toast("Connect an engine first"); return; }
  const deal = (state.engineDeals || []).find(item => item.id === dealId);
  const before = deal ? deal.stage : null;
  const response = await fetch(`${state.engine.url}/v1/objects/Deal/${dealId}/fields/stage`, {
    method: "POST",
    headers: { Authorization: `Bearer ${state.engine.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ value: stage }),
  }).catch(() => null);
  if (!response || !response.ok) {
    const payload = response ? await response.json().catch(() => ({})) : {};
    toast(payload.detail || "Could not move the deal");
    return;
  }
  await loadEngineDeals();
  renderPipeline(); renderReport();
  toast(`${deal ? deal.name : "Deal"} → ${stage.replace(/_/g, " ")}`, async () => {
    await fetch(`${state.engine.url}/v1/objects/Deal/${dealId}/fields/stage`, {
      method: "POST",
      headers: { Authorization: `Bearer ${state.engine.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value: before }),
    });
    await loadEngineDeals();
    renderPipeline(); renderReport();
    toast("Moved back — the change stays in the chain");
  });
}

function renderRelated() {
  const host = $("#related");
  if (!host) return;
  const record = activeRecord();
  // A record from the engine carries `company_ref`; a record created here or
  // seeded carries `company`. Reading only the ref made this card say "No company
  // reference" directly under a table showing the company. A card that
  // contradicts the screen it sits on is worse than no card.
  const companyRef = record.fields && record.fields.company_ref
    ? Object.values(record.fields.company_ref)[0]
    : (record.fields && record.fields.company
        ? Object.values(record.fields.company)[0] : null);
  if (!companyRef) {
    host.innerHTML = `<p class="note">This record is not linked to a company yet.</p>`;
    return;
  }
  const isRef = String(companyRef).startsWith("Company:");
  const companies = state.engineCompanies || [];
  const company = isRef
    ? companies.find(item => `Company:${esc(item.id)}` === companyRef) : null;
  const deals = isRef
    ? (state.engineDeals || []).filter(deal => deal.company_ref === companyRef)
    : [];
  host.innerHTML = `
    <div class="row" style="margin:0 0 10px">
      <span class="mono" style="font-size:11px;color:var(--muted)">COMPANY</span>
      ${isRef
        ? `<button class="linkish" data-company="${esc(company ? company.name : companyRef)}"
             title="Show every record at this company">${esc(company ? company.name : companyRef)}</button>`
        : `<b>${esc(companyRef)}</b>`}
      ${company && company.domain ? `<span class="note">${esc(company.domain)}</span>` : ""}
    </div>
    ${deals.length ? deals.map(deal => `
      <button class="row" data-deal="${esc(deal.id)}" style="margin:6px 0;width:100%;text-align:left;
        border-radius:8px;padding:6px 8px" title="Open this deal">
        <span class="mono" style="font-size:11px;color:var(--muted);min-width:64px">DEAL</span>
        <span>${esc(deal.name)}</span>
        <span class="chip">${esc(deal.stage || "unknown")}</span>
        <span class="mono">${formatValue("amount_minor", deal.amount_minor || 0)}</span>
      </button>`).join("")
      : `<p class="note">${isRef ? "No deals for this company." : "Deals are linked through the engine."}</p>`}`;
  $$("[data-deal]", host).forEach(button =>
    button.onclick = () => openDeal(button.dataset.deal));
  const companyButton = $("[data-company]", host);
  if (companyButton) companyButton.onclick = () => {
    state.query = companyButton.dataset.company;
    save();
    $("#search").value = state.query;
    go("records");
  };
}

function renderNotes() {
  const host = $("#noteList");
  if (!host) return;
  const retracted = new Set((state.ledger || [])
    .filter(event => event.action === "note.retracted")
    .map(event => event.payload.note));
  const notes = (state.ledger || []).filter(event =>
    event.action === "note.added" &&
    event.payload.record === state.selected &&
    !retracted.has(event.payload.note));
  host.innerHTML = notes.length
    ? notes.slice().reverse().map(event => `
        <li><time>#${esc(event.seq)} · ${esc(event.actor)}</time><p>${esc(event.payload.text)}</p></li>`).join("")
    : `<li style="border-left-color:transparent;padding-left:0"><p class="note">
         No notes on this record. A note is a ledger event, so it is as durable as everything else.</p></li>`;
}

async function addNote() {
  const input = $("#noteText");
  const text = (input.value || "").trim();
  if (!text) { input.focus(); return; }
  const noteId = "n" + Date.now().toString(36);
  input.value = "";
  await enqueue("note.added", "human", { record: state.selected, note: noteId, text });
  renderNotes();
  toast("Note added", async () => {
    await enqueue("note.retracted", "human", { record: state.selected, note: noteId });
    renderNotes();
    toast("Note retracted - the original stays in the chain");
  });
}

function renderTimeline() {
  const host = $("#timeline");
  host.innerHTML = ACTIVITY.map(item => `
    <li><time>${esc(item.at)} · ${esc(nodeInfo(item.node).label)}</time><p>${esc(item.text)}</p></li>`).join("");
}

function engineWinner(field) {
  const candidates = RECORD[field] || {};
  const authority = Object.fromEntries(Object.entries(candidates).map(([node]) =>
    [node, nodeInfo(node).authority[field] || "bidirectional"]));
  return resolveField(field, candidates, authority);
}

async function resolveFieldTo(field, node) {
  const key = state.selected + "|" + field;
  const before = state.resolved[key];
  state.resolved[key] = node;
  save();
  await enqueue("conflict.resolved", "human", { field, winner: node });
  renderAll();
  toast(`Kept ${nodeInfo(node).label} for ${esc(field.replace(/_/g, " "))}`, async () => {
    if (before === undefined) delete state.resolved[key];
    else state.resolved[key] = before;
    save();
    await enqueue("conflict.reopened", "human", { field, was: node });
    renderAll();
    toast("Reverted - the conflict is open again");
  });
}

async function resolveAll() {
  const fields = Object.keys(RECORD).filter(isConflict);
  if (!fields.length) { toast("Nothing to resolve on this record"); return; }
  const before = { ...state.resolved };
  const winners = {};
  for (const field of fields) {
    const winner = engineWinner(field);
    state.resolved[state.selected + "|" + field] = winner.node;
    winners[field] = winner.node;
  }
  save();
  await enqueue("conflict.bulk_resolved", "human", { fields: fields.length, winners });
  renderAll();
  toast(`${fields.length} resolved by the engine's rule`, async () => {
    state.resolved = before;
    save();
    await enqueue("conflict.bulk_reopened", "human", { fields: fields.length });
    renderAll();
    toast("Reverted - every conflict is open again");
  });
}

function renderRules() {
  const rules = state.rules || {};
  const fields = Object.keys(rules);
  const box = $("#rulesBox");
  if (!fields.length) { box.innerHTML = ""; return; }
  box.innerHTML = `<div class="item" style="margin-bottom:12px">
    <div class="top"><b>Your standing rules</b><span class="chip">applied to every record</span></div>
    ${fields.map(field => `<div class="row" style="margin:6px 0">
      <span class="mono">${esc(field.replace(/_/g, " "))}</span>
      <span class="chip ok">always ${esc(nodeInfo(rules[field]).label)}</span>
      <button class="btn small ghost" data-unrule="${esc(field)}">Remove</button>
    </div>`).join("")}
  </div>`;
  $$("[data-unrule]", box).forEach(button => button.onclick = () => {
    delete state.rules[button.dataset.unrule];
    save(); renderAll(); toast("Rule removed - the engine decides again");
  });
}

function renderConflicts() {
  const host = $("#conflictList");
  const fields = Object.keys(RECORD).filter(isConflict);
  $("#conflictSummary").textContent = fields.length
    ? `${fields.length} open on this record`
    : "nothing open on this record";
  $("#resolveAll").disabled = fields.length === 0;
  $("#resolveAll").style.opacity = fields.length === 0 ? ".5" : "1";
  if (!fields.length) {
    host.innerHTML = `<div class="card"><div class="body"><p class="note">
      Nothing to resolve. Every field agrees, or you have already chosen.
      <button class="rowaction" id="toRecords" style="margin-left:10px">Pick another customer</button>
      </p></div></div>`;
    const jump = $("#toRecords");
    if (jump) jump.onclick = () => go("records");
    return;
  }
  host.innerHTML = fields.map(field => {
    const entries = Object.entries(RECORD[field]);
    const authority = Object.fromEntries(entries.map(([node]) =>
      [node, nodeInfo(node).authority[field] || "bidirectional"]));
    const resolution = resolveField(field, RECORD[field], authority);
    return `<div class="item">
      <div class="top">
        <b>${esc(field.replace(/_/g, " "))}</b>
        <span class="chip">rule: ${esc(resolution.rule)}</span>
      </div>
      ${entries.map(([node, value]) => {
        const isCurrent = canonicalJSON(value) === canonicalJSON(currentValue(field).value);
        return `<div class="row" style="margin:6px 0">
          <span class="val">${formatValue(field, value)}</span>
          <span class="chip ${isCurrent ? "ok" : "warn"}">${isCurrent ? "current" : "changes"}</span>
          <span class="mono">${esc(nodeInfo(node).label)} · trust ${esc(nodeInfo(node).trust.toFixed(2))}</span>
          <button class="btn small" data-pick="${esc(field)}|${esc(node)}">${isCurrent ? "Keep" : "Change to this"}</button>
          <button class="btn small ghost" data-always="${esc(field)}|${esc(node)}" title="Use this system for this field on every record">Always</button>
        </div>`;
      }).join("")}
      <div class="note">The engine would take <b>${esc(nodeInfo(resolution.node).label)}</b> by ${esc(resolution.rule)}.</div>
    </div>`;
  }).join("");
  $$("[data-pick]", host).forEach(btn => {
    btn.onclick = () => {
      const [field, node] = btn.dataset.pick.split("|");
      resolveFieldTo(field, node);
    };
  });
  $$("[data-always]", host).forEach(btn => {
    btn.onclick = async () => {
      const [field, node] = btn.dataset.always.split("|");
      const before = { ...(state.rules || {}) };
      state.rules = { ...(state.rules || {}), [field]: node };
      save();
      await enqueue("rule.saved", "human", { field, source: node });
      renderAll();
      toast(`Rule saved: ${esc(field.replace(/_/g, " "))} always from ${nodeInfo(node).label}`, async () => {
        state.rules = before;
        save();
        await enqueue("rule.removed", "human", { field });
        renderAll();
        toast("Rule removed");
      });
    };
  });
}

function renderLedger() {
  const host = $("#ledgerRows");
  if (!state.ledger) {
    host.innerHTML = `<tr><td colspan="4" class="empty">Building the chain…</td></tr>`;
    return;
  }
  host.innerHTML = state.ledger.map(event => `
    <tr data-seq="${esc(event.seq)}">
      <td class="mono">${esc(event.seq)}</td>
      <td>${esc(event.action)}</td>
      <td class="mono">${esc(event.actor)}</td>
      <td class="hash">${esc(event.hash.slice(0, 12))}…</td>
    </tr>`).join("");
}

const SEATS = [
  { id: "triage", name: "Support triage", occupant: "priya", kind: "human", trust: 0.9, load: 0.4, capability: 1.0, cost: 0.9 },
  { id: "agent", name: "First response", occupant: "agent-7", kind: "agent", trust: 0.78, load: 0.2, capability: 0.95, cost: 0.55 },
  { id: "specialist", name: "Escalation", occupant: "sam", kind: "human", trust: 0.72, load: 0.7, capability: 0.6, cost: 0.5 },
];

function renderSeats() {
  $("#seats").innerHTML = SEATS.map(seat => `
    <div class="seat">
      <div>
        <b>${esc(seat.name)}</b>
        <div class="occ">${esc(seat.occupant)} · ${esc(seat.kind)} · trust ${seat.trust.toFixed(2)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${seat.load * 100}%"></div></div>
      </div>
      <span class="chip ${seat.kind === "agent" ? "warn" : "ok"}">${esc(seat.kind)}</span>
    </div>`).join("");
}

function renderRouting() {
  const host = $("#routing");
  const rows = SEATS.map(seat => {
    const terms = {
      capability_match: seat.capability,
      authority_match: 1.0,
      sla_headroom: 1 - seat.load,
      trust_score: seat.trust,
      utilization: 1 - seat.load,
      cost_efficiency: seat.cost,
      data_freshness: 0.9,
      cross_boundary_penalty: seat.kind === "agent" ? 0.2 : 0.0,
    };
    return { seat, ...routeScore(terms) };
  }).sort((a, b) => b.score - a.score);

  host.innerHTML = rows.map((row, index) => `
    <div class="item">
      <div class="top">
        <b>${index + 1}. ${esc(row.seat.name)}</b>
        <span class="chip ${index === 0 ? "ok" : ""}">${row.score.toFixed(3)}</span>
      </div>
      <div class="mono">${esc(row.seat.occupant)} · ${esc(row.seat.kind)}</div>
      ${index === 0 ? `<div class="breakdown">${esc(row.lines.join("\n"))}</div>` : ""}
    </div>`).join("");

  if (state.assigned) {
    $("#routingNote").textContent = `Assigned to ${state.assigned}. Escalation carries a signed packet.`;
  }
}

const WORKFLOWS = [
  { id: "w1", name: "Escalate a stale deal", author: "agent", condition: "amount_minor > 100000 and stage == 'proposal'",
    actions: ["assign_to_seat: Escalation", "send_notification: owner"], approved: true },
  { id: "w2", name: "Welcome a new contact", author: "agent", condition: "consent == 'granted'",
    actions: ["create_task: Send welcome", "send_email: owner"], approved: false },
];

function evaluateCondition(text, record) {
  const flat = Object.fromEntries(Object.entries(record).map(([k, v]) => [k, currentValue(k).value]));
  return text.split(" and ").every(part => {
    const match = part.match(/^(\w+)\s*(==|!=|>|<)\s*'?([^']*)'?$/);
    if (!match) return false;
    const [, field, op, raw] = match;
    const left = flat[field];
    const right = isNaN(Number(raw)) ? raw : Number(raw);
    if (op === "==") return String(left) === String(right);
    if (op === "!=") return String(left) !== String(right);
    if (op === ">") return Number(left) > Number(right);
    if (op === "<") return Number(left) < Number(right);
    return false;
  });
}

function renderWorkflows() {
  $("#workflows").innerHTML = WORKFLOWS.map(flow => {
    const fires = evaluateCondition(flow.condition, RECORD);
    const enabled = state.workflowEnabled[flow.id] !== false;
    return `<div class="item">
      <div class="top">
        <b>${esc(flow.name)}</b>
        <span class="chip ${flow.approved ? "ok" : "warn"}">${flow.approved ? "approved" : "proposal — not executable"}</span>
      </div>
      <div class="mono">when ${esc(flow.condition)}</div>
      <div class="row" style="margin-top:10px">
        ${flow.actions.map(a => `<span class="chip">${esc(a)}</span>`).join("")}
      </div>
      <div class="row" style="margin-top:12px">
        <button class="btn small ${flow.approved ? "primary" : ""}" data-run="${esc(flow.id)}" ${flow.approved ? "" : "disabled"}>
          ${flow.approved ? "Fire event" : "Approve first"}</button>
        <button class="btn small ghost" data-toggle="${esc(flow.id)}">${enabled ? "Disable" : "Enable"}</button>
        <span class="mono">condition ${fires ? "matches this record" : "does not match"}</span>
      </div>
    </div>`;
  }).join("");

  $$("[data-run]").forEach(btn => btn.onclick = async () => {
    const flow = WORKFLOWS.find(f => f.id === btn.dataset.run);
    if (!evaluateCondition(flow.condition, RECORD)) { toast("Condition does not match this record"); return; }
    await enqueue("workflow.fired", "system", { workflow: flow.id, actions: flow.actions.length });
    toast(`${esc(flow.name)}: ${flow.actions.length} actions ran`, async () => {
      await enqueue("workflow.reverted", "human", { workflow: flow.id });
      toast("Run reverted - the firing stays in the chain");
    });
  });
  $$("[data-toggle]").forEach(btn => btn.onclick = () => {
    const id = btn.dataset.toggle;
    state.workflowEnabled[id] = state.workflowEnabled[id] === false;
    save(); renderWorkflows();
  });
}

async function refreshStorage() {
  const el = $("#storageStatus");
  if (!el) return;
  el.textContent = "Checking storage…";
  // Asked here, not at boot: a permission prompt with no UI never settles, and a
  // boot that waits on it never finishes. Settings is the only place it matters.
  if (!persistState) await requestPersistence();
  el.textContent = await storageReport();
}

function renderAll() {
  const record = activeRecord();
  $("#recordName").textContent = record.name;
  $("#recordTitle").textContent = record.name;
  $("#recordSubtitle").textContent = `${esc(record.role)} · ${esc(record.company)}`;
  $("#recordAvatar").textContent = record.name.split(" ").map(p => p[0]).join("").slice(0, 2);
  $("#healthChip").textContent = `Relationship health ${esc(record.health)}`;
  const head = state.ledger && state.ledger.length
    ? state.ledger[state.ledger.length - 1].hash.slice(0, 16) : "not built";
  $("#printMeta").textContent =
    `${record.name} · ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · ` +
    `chain head ${head}… · ${Object.keys(record.fields).filter(isConflict).length} open conflict(s)`;
  renderRecords(); renderConnectors(); renderNotes(); renderRelated();
  renderPipeline(); renderReport();
  renderFields(); renderTimeline(); renderRules(); renderConflicts(); renderLedger(); renderSeats();
  renderRouting(); renderWorkflows();
  $("#storageNote").textContent =
    "Everything is stored in this browser only - IndexedDB with a localStorage mirror. Clearing site data resets it; " +
    "use Download above for a real backup.";
}

/* ---- field history ------------------------------------------------------ */
function openHistory(field) {
  const label = field === "amount_minor" ? "Deal amount" : field.replace(/_/g, " ");
  $("#histTitle").textContent = label;
  const events = (state.ledger || []).filter(event =>
    (event.payload && event.payload.field === field) ||
    (event.action === "conflict.resolved" && event.payload.field === field));

  const current = currentValue(field);
  const rows = events.length
    ? events.map(event => `
        <div class="hrow">
          <span class="when">#${esc(event.seq)} · ${esc(event.actor)}</span>
          <span class="what">${esc(event.action)}
            <span class="val">${event.payload.value !== undefined ? event.payload.value : (event.payload.winner || "")}</span>
            <span class="mono"> ${event.hash.slice(0, 10)}…</span>
          </span>
        </div>`).join("")
    : `<p class="note">No event has touched this field yet. The current value comes from
         <b>${nodeInfo(current.node).label}</b> by ${current.rule}.</p>`;

  $("#histBody").innerHTML = rows + `
    <p class="note" style="margin-top:12px">Every write is in the chain. Close this and press
      <b>Verify chain</b> on the Ledger screen to recompute all of it.</p>`;
  openSheet("#hist");
}

function closeHistory() {
  closeSheet("#hist");
}
$("#histClose").onclick = closeHistory;
$("#hist").onclick = event => { if (event.target.id === "hist") closeHistory(); };
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (!$("#hist").hidden) closeHistory();
    if (!$("#imp").hidden) closeImport();
    if (!$("#new").hidden) closeSheet("#new");
    if (!$("#edit").hidden) closeSheet("#edit");
    if (!$("#mail").hidden) closeSheet("#mail");
    if (!$("#del").hidden) closeSheet("#del");
    if (!$("#dealSheet").hidden) closeSheet("#dealSheet");
    if (!$("#companySheet").hidden) closeSheet("#companySheet");
  }
});

/* ---- command palette ---------------------------------------------------- */
let palItems = [], palIndex = 0;

function palCommands() {
  const commands = [
    { label: "Go to Records", kind: "go", run: () => go("records") },
    { label: "Go to Resolve", kind: "go", run: () => go("conflicts") },
    { label: "Go to Ledger", kind: "go", run: () => go("ledger") },
    { label: "Go to Workforce", kind: "go", run: () => go("workforce") },
    { label: "Go to Automate", kind: "go", run: () => go("automations") },
    { label: "Go to Pipeline", kind: "go", run: () => go("pipeline") },
    { label: "Go to Report", kind: "go", run: () => go("report") },
    { label: "Go to Settings", kind: "go", run: () => go("settings") },
    { label: "Import a CSV", kind: "action", run: () => { closePalette(); openImport(); } },
    { label: "Verify the ledger chain", kind: "action", run: () => { go("ledger"); $("#verify").click(); } },
    { label: "Export this record as JSON", kind: "action", run: () => $("#exportJson").click() },
    { label: "Copy a link to this record", kind: "action", run: () => $("#copyLink").click() },
    { label: "Toggle theme", kind: "action", run: () => $("#theme").click() },
    { label: "Resolve all conflicts on this record", kind: "action", run: () => resolveAll() },
  ];
  for (const record of allRecords()) {
    commands.push({ label: record.name, hint: record.company, kind: "record",
                    run: () => openRecord(record.id) });
  }
  return commands;
}

function openPalette() {
  $("#pal").hidden = false;
  sheetReturnFocus = document.activeElement;
  const input = $("#palInput");
  input.value = "";
  renderPalette("");
  input.focus();
}

function closePalette() {
  closeSheet("#pal");
}

function renderPalette(query) {
  const needle = query.trim().toLowerCase();
  palItems = palCommands().filter(item =>
    !needle || `${esc(item.label)} ${item.hint || ""}`.toLowerCase().includes(needle)).slice(0, 40);
  palIndex = 0;
  $("#palList").innerHTML = palItems.length
    ? palItems.map((item, index) => `
      <button class="pal-item" role="option" data-pal="${index}"
        aria-selected="${index === palIndex}">
        ${esc(item.label)}${item.hint ? ` <span class="mono">${esc(item.hint)}</span>` : ""}
        <span class="kind">${esc(item.kind)}</span>
      </button>`).join("")
    : `<p class="empty">Nothing matches “${esc(query)}”.</p>`;
  $$("[data-pal]").forEach(button => button.onclick = () => runPalette(Number(button.dataset.pal)));
}

function runPalette(index) {
  const item = palItems[index];
  if (!item) return;
  closePalette();
  item.run();
}

$("#palInput").oninput = event => renderPalette(event.target.value);
$("#palInput").onkeydown = event => {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    palIndex = Math.max(0, Math.min(palItems.length - 1,
      palIndex + (event.key === "ArrowDown" ? 1 : -1)));
    $$("[data-pal]").forEach((button, index) =>
      button.setAttribute("aria-selected", String(index === palIndex)));
    const active = $(`[data-pal="${palIndex}"]`);
    if (active) active.scrollIntoView({ block: "nearest" });
  }
  if (event.key === "Enter") { event.preventDefault(); runPalette(palIndex); }
};
$("#pal").onclick = event => { if (event.target.id === "pal") closePalette(); };

/* ---- a deal, with the same provenance a contact gets --------------------- */
async function openDeal(dealId) {
  const body = $("#dealBody");
  const deal = (state.engineDeals || []).find(item => item.id === dealId);
  $("#dealTitle").textContent = deal ? deal.name : "Deal";
  body.innerHTML = `<p class="note">Reading…</p>`;
  openSheet("#dealSheet");
  if (!(state.engine && state.engine.live)) {
    if (state.engine && state.engine.url) {
      body.innerHTML = `<p class="note">Waiting for the engine…</p>`;
      return;
    }
    body.innerHTML = deal ? renderDealFields(deal, null)
      : `<p class="note">No engine connected.</p>`;
    return;
  }
  try {
    const view = await engineFetch(`/v1/mesh/view/Deal/${dealId}`);
    body.innerHTML = renderDealFields(deal || {}, view);
  } catch (error) {
    body.innerHTML = `<p class="note">Could not read the deal: ${esc(error.message)}</p>`;
  }
}

const DEAL_LABELS = { name: "Name", stage: "Stage", amount_minor: "Amount",
                      currency: "Currency", company_ref: "Company" };

function renderDealFields(deal, view) {
  // the same rule as the record view: the engine's answer, not a second one
  const SHOWN = ["name", "stage", "amount_minor", "currency", "company_ref"];
  const rows = SHOWN.filter(field => (view && view.fields && view.fields[field]) || deal[field])
    .map(field => {
      const resolved = view && view.fields && view.fields[field];
      const value = resolved ? resolved.value : deal[field];
      const source = resolved ? `${sourceLabel(resolved.source)} · ${String(resolved.rule).replace(/_/g, " ")}`
                              : "from the engine";
      const label = DEAL_LABELS[field] || field.replace(/_/g, " ");
      let shown = value;
      if (field === "amount_minor") shown = formatValue("amount_minor", value);
      if (field === "company_ref") {
        // a uuid on a customer screen is a database leak, not information
        const match = (state.engineCompanies || []).find(item => `Company:${esc(item.id)}` === value);
        shown = match ? match.name : value;
      }
      return `<div class="frow" style="grid-template-columns:120px minmax(0,1fr) auto">
        <div class="k">${esc(label)}</div><div class="v">${esc(shown)}</div>
        <div class="src">${esc(source)}</div></div>`;
    }).join("");
  const nodes = view && view.nodes ? `<p class="note" style="margin-top:12px">Read from ${view.nodes.join(", ")}.</p>` : "";
  return rows + nodes;
}

$("#dealClose").onclick = () => closeSheet("#deal");
$("#dealSheet").onclick = event => { if (event.target.id === "dealSheet") closeSheet("#dealSheet"); };

/* ---- a company, with the same provenance a contact gets ------------------ */
async function openCompany(companyId) {
  const body = $("#companyBody");
  const company = (state.engineCompanies || []).find(item => item.id === companyId);
  $("#companyTitle").textContent = company ? company.name : "Company";
  body.innerHTML = `<p class="note">Reading…</p>`;
  openSheet("#companySheet");

  let view = null;
  if (state.engine && state.engine.live) {
    try { view = await engineFetch(`/v1/mesh/view/Company/${companyId}`); } catch { view = null; }
  }

  const ref = `Company:${companyId}`;
  const contacts = (state.engineRecords || []).filter(record => {
    const field = record.fields && record.fields.company_ref;
    return field && Object.values(field)[0] === ref;
  });
  const deals = (state.engineDeals || []).filter(deal => deal.company_ref === ref);

  const SHOWN = ["name", "domain", "industry"];
  const rows = SHOWN.filter(field => (view && view.fields && view.fields[field])
      || (company && company[field]))
    .map(field => {
      const resolved = view && view.fields && view.fields[field];
      const value = resolved ? resolved.value : company[field];
      const source = resolved
        ? `${sourceLabel(resolved.source)} · ${String(resolved.rule).replace(/_/g, " ")}`
        : "from the engine";
      return `<div class="frow" style="grid-template-columns:120px minmax(0,1fr) auto">
        <div class="k">${esc(field)}</div><div class="v">${esc(value)}</div>
        <div class="src">${esc(source)}</div></div>`;
    }).join("");

  body.innerHTML = rows + `
    <p class="note" style="margin:14px 0 6px">${esc(contacts.length)} contact${contacts.length === 1 ? "" : "s"}</p>
    ${contacts.map(record => `<button class="row" data-contact="${esc(record.id)}"
        style="width:100%;text-align:left;border-radius:8px;padding:6px 8px">
        <span>${esc(record.name)}</span>
        <span class="mono" style="margin-left:auto;font-size:11px">${esc(record.fields.email ? Object.values(record.fields.email)[0] : "")}</span>
      </button>`).join("") || `<p class="note">No contacts at this company.</p>`}
    <p class="note" style="margin:14px 0 6px">${esc(deals.length)} deal${deals.length === 1 ? "" : "s"}</p>
    ${deals.map(deal => `<button class="row" data-company-deal="${esc(deal.id)}"
        style="width:100%;text-align:left;border-radius:8px;padding:6px 8px">
        <span>${esc(deal.name)}</span>
        <span class="chip">${esc(deal.stage || "unknown")}</span>
        <span class="mono" style="margin-left:auto">${formatValue("amount_minor", deal.amount_minor || 0)}</span>
      </button>`).join("") || `<p class="note">No deals for this company.</p>`}`;

  $$("[data-contact]", body).forEach(button => button.onclick = () => {
    closeSheet("#companySheet");
    openRecord(button.dataset.contact);
  });
  $$("[data-company-deal]", body).forEach(button => button.onclick = () => {
    closeSheet("#companySheet");
    openDeal(button.dataset.companyDeal);
  });
}

$("#companyClose").onclick = () => closeSheet("#companySheet");
$("#companySheet").onclick = event => {
  if (event.target.id === "companySheet") closeSheet("#companySheet");
};

/* ---- tombstone a record --------------------------------------------------- */
function openDelete() {
  $("#delStatus").textContent = "";
  $("#delReason").value = "";
  openSheet("#del");
  $("#delReason").focus();
}

async function confirmDelete() {
  const status = $("#delStatus");
  const reason = ($("#delReason").value || "").trim();
  if (!reason) { status.textContent = "A reason is required."; return; }
  if (!(state.engine && state.engine.live)) {
    status.textContent = "Connect an engine first — a tombstone has to be recorded where the record lives.";
    return;
  }
  status.textContent = "Tombstoning…";
  try {
    const response = await fetch(`${state.engine.url}/v1/objects/Contact/${state.selected}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${state.engine.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const payload = await response.json();
    if (!response.ok) {
      status.textContent = payload.detail || payload.error || `Failed: ${response.status}`;
      return;
    }
    const name = activeRecord().name;
    closeSheet("#del");
    await loadEngineRecords();
    state.selected = (state.engineRecords[0] || {}).id || state.selected;
    RECORD = activeRecord().fields;
    ACTIVITY = activeRecord().activity;
    save();
    renderAll();
    go("records");
    toast(`${name} tombstoned — the reason is on the record`);
  } catch (error) {
    status.textContent = `Could not tombstone: ${esc(error.message)}`;
  }
}

$("#delClose").onclick = () => closeSheet("#del");
$("#delCancel").onclick = () => closeSheet("#del");
$("#delConfirm").onclick = confirmDelete;
$("#del").onclick = event => { if (event.target.id === "del") closeSheet("#del"); };

/* ---- log an email -------------------------------------------------------- */
function openMail() {
  $("#mailStatus").textContent = "";
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);
  $("#mailWhen").value = now;
  $("#mailSubject").value = "";
  $("#mailBody").value = "";
  openSheet("#mail");
  $("#mailSubject").focus();
}

async function saveMail() {
  const status = $("#mailStatus");
  const subject = ($("#mailSubject").value || "").trim();
  if (!subject) { status.textContent = "A subject is required."; $("#mailSubject").focus(); return; }
  const payload = {
    record: state.selected,
    direction: $("#mailDir").value,
    at: $("#mailWhen").value || new Date().toISOString(),
    subject,
    body: ($("#mailBody").value || "").trim(),
  };
  status.textContent = "Logging…";
  await enqueue("email.logged", "human", payload);
  closeSheet("#mail");
  renderTimeline();
  toast(`Email logged: ${subject}`);
}

$("#mailClose").onclick = () => closeSheet("#mail");
$("#mailCancel").onclick = () => closeSheet("#mail");
$("#mailSave").onclick = saveMail;
$("#mail").onclick = event => { if (event.target.id === "mail") closeSheet("#mail"); };

/* ---- edit one field ----------------------------------------------------- */
let editingField = null;

function openEdit(field) {
  editingField = field;
  const current = currentValue(field);
  $("#editLabel").textContent = field.replace(/_/g, " ");
  $("#editValue").value = current.value === null || current.value === undefined
    ? "" : String(current.value);
  $("#editWhere").textContent =
    `Currently ${current.value} from ${sourceLabel(current.node)}. A save writes to the system of record ` +
    `and the ledger records who changed it, what it was, and what it became.`;
  $("#editStatus").textContent = "";
  openSheet("#edit");
  $("#editValue").focus();
}

async function saveEdit() {
  const field = editingField;
  const status = $("#editStatus");
  const before = currentValue(field).value;
  let after = $("#editValue").value;
  if (field === "amount_minor") {
    const digits = String(after).replace(/[^0-9.]/g, "");
    after = Math.round(Number(digits) * 100);
    if (!Number.isFinite(after)) { status.textContent = "That is not an amount."; return; }
  }
  if (String(after) === String(before)) { status.textContent = "Unchanged."; return; }

  status.textContent = "Saving…";
  try {
    if (state.engine && state.engine.live) {
      const response = await fetch(
        `${state.engine.url}/v1/objects/Contact/${state.selected}/fields/${esc(field)}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${state.engine.token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ value: after }),
        });
      const payload = await response.json();
      if (!response.ok) {
        status.textContent = payload.detail || payload.error || `Failed: ${response.status}`;
        return;
      }
      await loadEngineRecords();
      state.selected = state.selected;
      RECORD = activeRecord().fields;
      ACTIVITY = activeRecord().activity;
      save();
      closeSheet("#edit");
      renderAll();
      toast(`${esc(field.replace(/_/g, " "))} saved to ${payload.node || "the system of record"}`,
            () => revertField(field, before));
    } else {
      const record = activeRecord();
      record.fields[field] = { native: after };
      save();
      closeSheet("#edit");
      renderAll();
      toast(`${esc(field.replace(/_/g, " "))} saved in this browser`, () => revertField(field, before));
    }
  } catch (error) {
    status.textContent = `Could not save: ${esc(error.message)}`;
  }
}

async function revertField(field, value) {
  try {
    if (state.engine && state.engine.live) {
      await fetch(`${state.engine.url}/v1/objects/Contact/${state.selected}/fields/${esc(field)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${state.engine.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      await loadEngineRecords();
    } else {
      activeRecord().fields[field] = { native: value };
      save();
    }
    renderAll();
    toast("Reverted — the change stays in the chain");
  } catch {
    toast("Could not revert");
  }
}

$("#editClose").onclick = () => closeSheet("#edit");
$("#editCancel").onclick = () => closeSheet("#edit");
$("#editSave").onclick = saveEdit;
$("#edit").onclick = event => { if (event.target.id === "edit") closeSheet("#edit"); };
$("#editValue").onkeydown = event => { if (event.key === "Enter") saveEdit(); };

/* ---- create a record ---------------------------------------------------- */
function openNew() {
  $("#newStatus").textContent = "";
  openSheet("#new");
}

async function createCustomer() {
  const status = $("#newStatus");
  const name = ($("#newName").value || "").trim();
  if (!name) { status.textContent = "A name is required."; $("#newName").focus(); return; }
  const body = {
    full_name: name,
    consent_state: $("#newConsent").value,
    lawful_basis: $("#newBasis").value,
    purpose_id: ($("#newPurpose").value || "sales").trim(),
  };
  const email = ($("#newEmail").value || "").trim();
  const phone = ($("#newPhone").value || "").trim();
  if (email) body.email = email;
  if (phone) body.phone = phone;

  status.textContent = "Creating…";
  try {
    if (state.engine && state.engine.live) {
      const response = await fetch(`${state.engine.url}/v1/objects/Contact`, {
        method: "POST",
        headers: { Authorization: `Bearer ${state.engine.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        status.textContent = payload.detail || payload.error || `Failed: ${response.status}`;
        return;
      }
      await loadEngineRecords();
      state.selected = payload.id;
      RECORD = activeRecord().fields;
      ACTIVITY = activeRecord().activity;
      save();
      closeSheet("#new");
      renderAll();
      go("unified");
      toast(`${name} created on ${payload.node}`);
    } else {
      // no engine: the console keeps it locally, and the queue says so
      const id = "c" + Date.now().toString(36);
      const record = { id, name, role: "created here", company: "-", health: 50,
                       fields: Object.fromEntries(Object.entries(body)
                         .filter(([field]) => field !== "full_name")
                         .map(([field, value]) => [field, { native: value }])),
                       activity: [] };
      record.fields.full_name = { native: name };
      state.customRecords = (state.customRecords || []).concat(record);
      save();
      closeSheet("#new");
      renderAll();
      toast(`${name} created in this browser`, async () => {
        state.customRecords = state.customRecords.filter(item => item.id !== id);
        save(); renderAll(); toast("Removed");
      });
    }
  } catch (error) {
    status.textContent = `Could not create: ${esc(error.message)}`;
  }
}

$("#newClose").onclick = () => closeSheet("#new");
$("#newCancel").onclick = () => closeSheet("#new");
$("#newSave").onclick = createCustomer;
$("#new").onclick = event => { if (event.target.id === "new") closeSheet("#new"); };

/* ---- CSV import --------------------------------------------------------- */
const IMPORT_FIELDS = ["full_name", "email", "phone", "company", "stage",
                       "amount_minor", "owner", "consent"];
const IMPORT_ALIASES = {
  "name": "full_name", "full name": "full_name", "fullname": "full_name",
  "contact": "full_name", "customer": "full_name",
  "email": "email", "e mail": "email", "email address": "email",
  "phone": "phone", "phone number": "phone", "mobile": "phone", "telephone": "phone",
  "company": "company", "company name": "company", "account": "company", "organisation": "company",
  "stage": "stage", "deal stage": "stage", "status": "stage",
  "amount": "amount_minor", "deal amount": "amount_minor", "value": "amount_minor",
  "owner": "owner", "record owner": "owner",
  "consent": "consent", "consent state": "consent",
};
let importState = { headers: [], rows: [], mapping: {}, valid: [], rejected: [], batch: null };

function normHeader(text) {
  return text.trim().toLowerCase().replace(/[-_/.]/g, " ").replace(/\s+/g, " ");
}

function parseCsv(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter(line => line.trim() !== "");
  if (!lines.length) return { headers: [], rows: [] };
  const split = line => {
    const out = []; let cell = ""; let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (quoted && line[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
      else if (ch === "," && !quoted) { out.push(cell); cell = ""; }
      else cell += ch;
    }
    out.push(cell);
    return out.map(c => c.trim());
  };
  const headers = split(lines[0]);
  const rows = lines.slice(1).map(split);
  return { headers, rows };
}

function openImport() {
  openSheet("#imp");
}
function closeImport() { closeSheet("#imp"); }

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

function previewImport() {
  const text = $("#impText").value;
  if (text.length > MAX_IMPORT_BYTES) {
    $("#impSummary").textContent =
      `That is ${(text.length / 1048576).toFixed(1)} MB. The limit is 2 MB — split the file.`;
    return;
  }
  const { headers, rows } = parseCsv(text);
  if (!headers.length) { $("#impSummary").textContent = "Paste a CSV first."; return; }

  const mapping = {};
  for (const header of headers) {
    const guess = IMPORT_ALIASES[normHeader(header)];
    if (guess) mapping[header] = guess;
  }
  importState = { headers, rows, mapping, valid: [], rejected: [], batch: null };

  $("#impMap").innerHTML = headers.map(header => `
    <div class="mapline">
      <span class="mono">${esc(header)}</span>
      <span class="arrow">→</span>
      <select data-map="${esc(header)}">
        <option value="">(ignore)</option>
        ${IMPORT_FIELDS.map(field =>
          `<option value="${esc(field)}" ${mapping[header] === field ? "selected" : ""}>${esc(field)}</option>`).join("")}
      </select>
    </div>`).join("");

  $$("[data-map]").forEach(select => select.onchange = () => {
    importState.mapping[select.dataset.map] = select.value;
    scoreImport();
  });
  scoreImport();
}

function scoreImport() {
  const { headers, rows, mapping } = importState;
  const valid = [], rejected = [];
  rows.forEach((row, index) => {
    const record = {};
    headers.forEach((header, column) => {
      const field = mapping[header];
      const value = row[column];
      if (!field || value === undefined || value === "") return;
      record[field] = field === "amount_minor" ? Number(value.replace(/[^0-9.]/g, "")) : value;
    });
    if (!record.full_name && !record.email) {
      rejected.push({ line: index + 2, why: "no name and no email" });
    } else {
      valid.push(record);
    }
  });
  importState.valid = valid;
  importState.rejected = rejected;

  $("#impSummary").textContent =
    `${valid.length} ready · ${rejected.length} rejected · ${rows.length} rows`;
  $("#impCommit").disabled = valid.length === 0;
  $("#impResult").innerHTML =
    valid.slice(0, 4).map((record, index) =>
      `<div class="prow"><span class="mono">+${index + 1}</span><span>${esc(record.full_name || "")} ${record.email ? "· " + esc(record.email) : ""}</span></div>`).join("") +
    rejected.slice(0, 4).map(item =>
      `<div class="prow bad"><span class="mono">line ${item.line}</span><span>${esc(item.why)}</span></div>`).join("");
}

async function commitImport() {
  const { valid } = importState;
  if (!valid.length) return;
  const batch = "imp-" + Date.now().toString(36);
  const created = valid.map((record, index) => {
    const id = `c${Date.now().toString(36)}${index}`;
    const fields = {};
    for (const [field, value] of Object.entries(record)) fields[field] = { native: value };
    return { id, name: record.full_name || record.email, role: "Imported",
             company: record.company || "—", health: 50, fields, activity: [] };
  });
  state.customRecords = (state.customRecords || []).concat(created);
  save();
  importState.batch = batch;
  for (const record of created) {
    await enqueue("record.imported", "human", { record: record.id, batch });
  }
  closeImport();
  renderAll();
  toast(`Imported ${created.length} customer${created.length > 1 ? "s" : ""}`, async () => {
    state.customRecords = (state.customRecords || []).filter(r => !created.some(c => c.id === r.id));
    save();
    await enqueue("import.rolled_back", "human", { batch, count: created.length });
    renderAll();
    toast("Import rolled back - the records are gone, the events remain");
  });
}

$("#impClose").onclick = closeImport;
$("#imp").onclick = event => { if (event.target.id === "imp") closeImport(); };
$("#impPreview").onclick = previewImport;
$("#impCommit").onclick = commitImport;
$("#impFile").onchange = event => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { $("#impText").value = reader.result; previewImport(); };
  reader.readAsText(file);
};

["#hist", "#imp", "#pal", "#new", "#edit", "#mail", "#del", "#dealSheet", "#companySheet"].forEach(id => trapFocus($(id)));

/* ---- navigation --------------------------------------------------------- */
function go(view, recordId) {
  $$(".view").forEach(section => section.toggleAttribute("data-active", section.id === view));
  $$("[data-go]").forEach(button => button.setAttribute("aria-current", String(button.dataset.go === view)));
  $("#main").scrollTop = 0;
  const target = view === "unified" ? `#unified/${state.selected}` : `#${view}`;
  // keep the query string: go() used to replace the whole URL, so a link opened
  // with ?engine=... lost its parameters the first time anything navigated.
  const full = location.pathname + location.search + target;
  if (location.hash !== target || location.search) history.replaceState(null, "", full);
}

function applyRoute() {
  const route = routeFromHash();
  if (!route) return;
  if (route.recordId && allRecords().some(r => r.id === route.recordId)) {
    state.selected = route.recordId;
    const record = activeRecord();
    RECORD = record.fields;
    ACTIVITY = record.activity;
    save();
    renderAll();
  }
  if (document.getElementById(route.view)) go(route.view);
  if (route.view === "records" && ["Contact", "Company", "Deal"].includes(route.recordId)) {
    // Drive the same path the tab drives. Setting state and calling renderAll from
    // here raced the engine connection and produced an empty list; a click cannot,
    // because it runs after everything else has settled.
    const tab = document.querySelector(`[data-object="${route.recordId}"]`);
    if (tab) tab.click();
    history.replaceState(null, "",
      location.pathname + location.search + `#records/${route.recordId}`);
  }
  if (route.view === "records" && route.recordId === "import") openImport();
  if (route.view === "deal" && route.recordId) openDeal(route.recordId);
  if (route.view === "command") openPalette();
}

function routeFromHash() {
  const raw = location.hash.replace("#", "");
  if (!raw) return null;
  const [view, recordId] = raw.split("/");
  return { view, recordId };
}

$$("[data-go]").forEach(button => button.onclick = () => go(button.dataset.go));
$("#backToList").onclick = () => go("records");
$$("[data-object]").forEach(button => button.onclick = () => {
  state.listObject = button.dataset.object;
  save();
  $$("[data-object]").forEach(other =>
    other.setAttribute("aria-pressed", String(other === button)));
  renderRecords();
  const count = listPool().length;
  toast(`${count} ${button.dataset.object.toLowerCase()}${count === 1 ? "" : "s"}`);
});

$$("[data-filter]").forEach(button => button.onclick = () => {
  state.view.filter = button.dataset.filter;
  save(); renderRecords(); syncViewBar();
});
$$("[data-sort]").forEach(button => button.onclick = () => {
  state.view.sort = button.dataset.sort;
  save(); renderRecords(); syncViewBar();
});
$("#openNew").onclick = openNew;
$("#openImport").onclick = openImport;
$("#saveView").onclick = () => {
  const name = ($("#viewName").value || "").trim();
  if (!name) { toast("Name the view first"); $("#viewName").focus(); return; }
  state.savedViews[name] = { ...state.view };
  $("#viewName").value = "";
  save(); renderSavedViews(); toast(`Saved view “${name}”`);
};
$("#savedViews").onchange = event => {
  const name = event.target.value;
  if (!name || !state.savedViews[name]) return;
  state.view = { ...state.savedViews[name] };
  save(); renderRecords(); syncViewBar(); toast(`View “${name}”`);
};

function syncViewBar() {
  $$("[data-object]").forEach(button =>
    button.setAttribute("aria-pressed", String(button.dataset.object === (state.listObject || "Contact"))));
  $$("[data-filter]").forEach(button =>
    button.setAttribute("aria-pressed", String(button.dataset.filter === state.view.filter)));
  $$("[data-sort]").forEach(button =>
    button.setAttribute("aria-pressed", String(button.dataset.sort === state.view.sort)));
}

function renderSavedViews() {
  const select = $("#savedViews");
  const names = Object.keys(state.savedViews || {});
  select.innerHTML = `<option value="">Saved views…</option>` +
    names.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join("");
  select.disabled = names.length === 0;
}

/* ---- export and deep links --------------------------------------------- */
function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function unifiedPayload() {
  const record = activeRecord();
  return {
    id: record.id,
    name: record.name,
    role: record.role,
    company: record.company,
    relationship_health: record.health,
    exported_at: new Date().toISOString(),
    fields: Object.fromEntries(Object.keys(record.fields).map(field => {
      const chosen = currentValue(field);
      return [field, { value: chosen.value, source: chosen.node, rule: chosen.rule }];
    })),
    conflicts_open: Object.keys(record.fields).filter(isConflict),
  };
}

$("#exportJson").onclick = () => {
  const payload = unifiedPayload();
  download(`tessera-${payload.id}.json`, JSON.stringify(payload, null, 2), "application/json");
  enqueue("record.exported", "human", { record: payload.id, format: "json" });
  toast("Exported as JSON");
};

$("#exportCsv").onclick = () => {
  const payload = unifiedPayload();
  const fields = Object.keys(payload.fields);
  const head = ["id", "name", ...fields, "conflicts_open"].join(",");
  const row = [payload.id, `"${payload.name}"`,
    ...fields.map(field => `"${String(payload.fields[field].value).replace(/"/g, '""')}"`),
    payload.conflicts_open.length].join(",");
  download(`tessera-${payload.id}.csv`, head + "\n" + row + "\n", "text/csv");
  enqueue("record.exported", "human", { record: payload.id, format: "csv" });
  toast("Exported as CSV");
};

$("#noteAdd").onclick = addNote;
$("#noteText").onkeydown = event => { if (event.key === "Enter") addNote(); };

$("#engineConnect").onclick = connectEngine;
$("#engineDisconnect").onclick = disconnectEngine;

$("#exportWorkspace").onclick = () => {
  const bundle = { app: "tessera-console", version: "1.9.0",
                   exported_at: new Date().toISOString(), state };
  download(`tessera-workspace-${bundle.exported_at.slice(0, 10)}.json`,
           JSON.stringify(bundle, null, 2), "application/json");
  toast("Workspace downloaded");
};

$("#importWorkspace").onclick = () => $("#workspaceFile").click();
$("#workspaceFile").onchange = event => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const bundle = JSON.parse(reader.result);
      const incoming = bundle.state || bundle;
      if (!incoming || typeof incoming !== "object" || !Array.isArray(incoming.customRecords || [])) {
        toast("That file is not a TESSERA workspace");
        return;
      }
      const before = structuredClone(state);
      state = mergeState(incoming);
      save();
      RECORD = activeRecord().fields;
      ACTIVITY = activeRecord().activity;
      applyTheme(state.theme); applyDensity(state.density);
      $("#search").value = state.query || "";
      renderAll(); renderSavedViews(); syncViewBar(); refreshStorage();
      toast("Workspace restored", () => {
        state = before; save(); renderAll(); refreshStorage(); toast("Restore undone");
      });
    } catch { toast("That file could not be read"); }
  };
  reader.readAsText(file);
};

$("#reloadNow").onclick = () => {
  sessionStorage.setItem("tessera.reloaded", "1");
  location.reload();
};

$("#logMail").onclick = openMail;
$("#delRecord").onclick = openDelete;

$("#printOne").onclick = () => {
  enqueue("record.printed", "human", { record: state.selected });
  window.print();
};

$("#copyLink").onclick = async () => {
  const url = `${location.origin}${location.pathname}#unified/${state.selected}`;
  try {
    await navigator.clipboard.writeText(url);
    toast("Link copied");
  } catch {
    toast(url);
  }
};

$("#search").oninput = event => {
  state.query = event.target.value;
  save();
  renderRecords();
};
$("#search").onkeydown = event => {
  if (event.key === "Enter") {
    const first = $("#recordList [data-open]");
    if (first) first.click();
  }
};

/* ---- settings ----------------------------------------------------------- */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  state.theme = theme; save();
  $$("[data-theme-set]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.themeSet === theme)));
}
function applyDensity(density) {
  document.documentElement.dataset.density = density;
  state.density = density; save();
  $$("[data-density-set]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.densitySet === density)));
}
$$("[data-theme-set]").forEach(b => b.onclick = () => applyTheme(b.dataset.themeSet));
$$("[data-density-set]").forEach(b => b.onclick = () => applyDensity(b.dataset.densitySet));
$("#theme").onclick = () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");

/* ---- ledger actions ----------------------------------------------------- */
$("#verify").onclick = async () => {
  const result = await verifyChain();
  const chip = $("#chainState");
  if (result.ok) {
    chip.textContent = `verified · ${result.count} events`;
    chip.className = "chip ok";
    toast("Chain verified in your browser");
  } else {
    chip.textContent = `broken at #${result.at}`;
    chip.className = "chip bad";
    $$(`#ledgerRows tr[data-seq="${result.at}"]`).forEach(row => row.dataset.bad = "1");
    toast(`Verification failed at event ${result.at}: ${result.why}`);
  }
};
$("#tamper").onclick = async () => {
  const events = await ensureLedger();
  if (!events.length) return;
  const index = Math.min(2, events.length - 1);
  events[index].payload = { ...events[index].payload, value: "tampered@acme.example" };
  save(); renderLedger();
  $("#chainState").textContent = "not verified";
  $("#chainState").className = "chip";
  toast(`Event ${events[index].seq} was altered. Run verify to see it fail.`);
};
$("#reset").onclick = async () => {
  localStorage.removeItem("tessera.console.v1");
  state = load();
  state.ledger = null;
  await ensureLedger();
  applyTheme(state.theme); applyDensity(state.density);
  renderAll();
  toast("Demo reset");
};

/* ---- workforce actions -------------------------------------------------- */
$("#resolveAll").onclick = () => resolveAll();

async function assignTo(seatName, occupant, actor) {
  const before = state.assigned;
  state.assigned = seatName;
  save(); renderRouting();
  await enqueue("task.assigned", actor, { seat: seatName, occupant });
  toast(`Assigned to ${seatName}`, async () => {
    state.assigned = before;
    save(); renderRouting();
    await enqueue("task.unassigned", "human", { seat: seatName });
    toast("Unassigned");
  });
}

$("#assign").onclick = () => {
  const best = SEATS.map(seat => ({ seat, ...routeScore({
    capability_match: seat.capability, authority_match: 1, sla_headroom: 1 - seat.load,
    trust_score: seat.trust, utilization: 1 - seat.load, cost_efficiency: seat.cost,
    data_freshness: 0.9, cross_boundary_penalty: seat.kind === "agent" ? 0.2 : 0,
  }) })).sort((a, b) => b.score - a.score)[0];
  assignTo(best.seat.name, best.seat.occupant, "system");
};

$("#assignMe").onclick = () => {
  const mine = SEATS.find(seat => seat.kind === "human") || SEATS[0];
  assignTo(mine.name, "you", "human");
};
$("#escalate").onclick = async () => {
  if (!state.assigned) { toast("Assign the task first"); return; }
  const packet = {
    task: "Delivery address change",
    from: state.assigned,
    to: "Escalation",
    state: Object.fromEntries(Object.keys(RECORD).map(f => [f, currentValue(f).value])),
    issued: new Date().toISOString(),
  };
  const signature = (await sha256(canonicalJSON(packet))).slice(0, 32);
  $("#packet").textContent =
    `handoff packet\n  ${Object.entries(packet).filter(([k]) => k !== "state").map(([k, v]) => `${k.padEnd(8)} ${v}`).join("\n  ")}\n` +
    `  fields   ${Object.keys(packet.state).length}\n  sig      ${signature}…\n` +
    `the receiver needs nothing but this packet`;
  const before = state.escalated;
  state.escalated = signature;
  save();
  await enqueue("task.escalated", "system", { to: "Escalation", signature: signature.slice(0, 12) });
  toast("Escalated with a signed packet", async () => {
    state.escalated = before;
    save();
    $("#packet").textContent = "";
    await enqueue("task.escalation_withdrawn", "human", { signature: signature.slice(0, 12) });
    toast("Escalation withdrawn");
  });
};

/* ---- keyboard ----------------------------------------------------------- */
document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openPalette();
    return;
  }
  if (event.key === "Escape" && !$("#pal").hidden) { closePalette(); return; }
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const order = ["unified", "records", "conflicts", "ledger", "workforce", "automations", "settings"];
  const index = Number(event.key);
  if (index >= 1 && index <= order.length) { go(order[index - 1]); event.preventDefault(); }
  if (event.key === "t") { $("#theme").click(); }
  if (event.key === "/") {
    event.preventDefault();
    go("records");
    const search = $("#search");
    search.focus();
    search.select();
  }
});

/* ---- boot --------------------------------------------------------------- */
(async function boot() {
  // Paint first, hydrate second. Awaiting storage before the first render leaves
  // an empty shell for however long IndexedDB takes - and forever if it is
  // blocked, which is exactly what a private window does.
  applyTheme(state.theme);
  applyDensity(state.density);
  renderAll();
  syncViewBar();
  renderSavedViews();
  applyRoute();


  // The chain is not needed to render a record. Kick it off and let boot finish;
  // hashing five events takes milliseconds in a browser and can hang outright in
  // an environment without a real clock, and neither should hold up the screen.
  ensureLedger().then(() => flushOutbox()).then(() => { renderLedger(); renderQueue(); }).catch(() => {});
  renderQueue();

  const beforeHydration = JSON.stringify(state);
  const liveEngine = state.engine && state.engine.live ? state.engine : null;
  state = await loadState();
  // a connection made during boot outranks the stored one: hydration must not
  // turn a live engine back into "not connected"
  if (liveEngine) state.engine = liveEngine;
  const changed = JSON.stringify(state) !== beforeHydration;
  applyTheme(state.theme);
  applyDensity(state.density);
  $("#search").value = state.query || "";
  const record = activeRecord();
  RECORD = record.fields;
  ACTIVITY = record.activity;
  // a first load with nothing stored hydrates to the defaults that are already
  // painted; repainting them moves the page for no reason
  if (changed) renderAll();

  // ?engine=<url>&token=<t> connects on load: a demo link that shows live data.
  // After hydration, not before - loadState() replaces the state object wholesale.
  const query = new URLSearchParams(location.search);
  if (query.get("engine")) {
    $("#engineUrl").value = query.get("engine");
    $("#engineToken").value = query.get("token") || "";
    // Strip the token from the URL before anything else happens: a token in the
    // address bar is in the history, in a screenshot, and in the Referer header
    // of any outbound link the page sends.
    history.replaceState(null, "", location.pathname + location.hash);
    // a deep link into a deal or a record resolves before the engine is
    // connected, so the route has to be applied again once it is
    connectEngine().then(() => applyRoute());
  }

  // a shared link or text from the OS share sheet lands in the search box
  const shared = new URLSearchParams(location.search);
  const sharedText = (shared.get("text") || shared.get("title") || "").trim();
  if (sharedText) {
    state.query = sharedText.slice(0, 60);
    save();
    go("records");
    toast(`Searching for “${state.query}”`);
  }

  applyRoute();
  syncViewBar();
  renderSavedViews();
  // deferred: the report is decoration, and a storage API that stalls must never
  // sit between the first paint and the rest of the boot
  setTimeout(refreshStorage, 0);
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").then(registration => {
      registration.update().catch(() => {});
      registration.addEventListener("updatefound", () => {
        const fresh = registration.installing;
        if (!fresh) return;
        fresh.addEventListener("statechange", () => {
          // a worker that reaches "installed" while one already controls this page
          // is a new version, and the honest thing is to say so rather than swap
          // the code underneath a half-finished edit.
          if (fresh.state === "installed" && navigator.serviceWorker.controller) {
            $("#update").hidden = false;
          }
        });
      });
    }).catch(() => {});
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (sessionStorage.getItem("tessera.reloaded")) {
        sessionStorage.removeItem("tessera.reloaded");
        toast("Updated");
      }
    });
  }
})();
