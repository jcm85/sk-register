"use strict";

const KEY = "sk-register";
const CAT_ORDER = ["Drinks", "Beer", "Snacks", "Cigarettes", "Motor", "Load"];
const CAT_COLOR = {
  Drinks: "#1B4D3E",
  Beer: "#8C4A1F",
  Snacks: "#A15C07",
  Cigarettes: "#5C5346",
  Motor: "#1F4E79",
  Load: "#0B5FFF"
};

const SAMPLE = [
  { id: "COKE8", name: "Coke Mismo 8oz", category: "Drinks", unit: "btl", price: 22, stock: 48, reorder: 12, keys: "coke,kola,mismo,red,softdrinks,bote", trackStock: true },
  { id: "COKE15", name: "Coke 1.5L", category: "Drinks", unit: "btl", price: 78, stock: 12, reorder: 4, keys: "coke,liter,1.5,family", trackStock: true },
  { id: "PEPSI8", name: "Pepsi bottle", category: "Drinks", unit: "btl", price: 22, stock: 36, reorder: 12, keys: "pepsi,kola,blue", trackStock: true },
  { id: "RC8", name: "RC Cola bottle", category: "Drinks", unit: "btl", price: 20, stock: 24, reorder: 8, keys: "rc,cola,kola", trackStock: true },
  { id: "C2", name: "C2 Apple 500ml", category: "Drinks", unit: "btl", price: 28, stock: 18, reorder: 6, keys: "c2,apple,juice", trackStock: true },
  { id: "WATER", name: "Nature Spring 500ml", category: "Drinks", unit: "btl", price: 16, stock: 24, reorder: 8, keys: "water,tubig,nature", trackStock: true },
  { id: "SML", name: "San Mig Light 330ml", category: "Beer", unit: "btl", price: 52, stock: 24, reorder: 8, keys: "san mig,beer,light", trackStock: true },
  { id: "RH", name: "Red Horse 330ml", category: "Beer", unit: "btl", price: 58, stock: 24, reorder: 8, keys: "red horse,beer,kabayo", trackStock: true },
  { id: "LUCKY", name: "Lucky Me Pancit Canton", category: "Snacks", unit: "pack", price: 20, stock: 30, reorder: 10, keys: "lucky,canton,noodles,pancit", trackStock: true },
  { id: "NOVA", name: "Nova Country Cheddar", category: "Snacks", unit: "pack", price: 25, stock: 15, reorder: 6, keys: "nova,chips,chichirya", trackStock: true },
  { id: "KOPIKO", name: "Kopiko 78", category: "Snacks", unit: "cup", price: 28, stock: 12, reorder: 4, keys: "kopiko,kape,coffee", trackStock: true },
  { id: "MARL", name: "Marlboro Red pack", category: "Cigarettes", unit: "pack", price: 185, stock: 20, reorder: 5, keys: "marlboro,yosi,cig,red,pack", trackStock: true },
  { id: "FORT", name: "Fortune Red pack", category: "Cigarettes", unit: "pack", price: 120, stock: 20, reorder: 5, keys: "fortune,yosi,cig", trackStock: true },
  { id: "MIGHTY", name: "Mighty Red pack", category: "Cigarettes", unit: "pack", price: 90, stock: 15, reorder: 5, keys: "mighty,yosi,cig", trackStock: true },
  { id: "OIL2T", name: "2T motor oil sachet", category: "Motor", unit: "sachet", price: 35, stock: 20, reorder: 6, keys: "oil,2t,motor", trackStock: true },
  { id: "LOAD50", name: "E-load ₱50", category: "Load", unit: "pc", price: 50, stock: 0, reorder: 0, keys: "load,eload,globe,smart,50", trackStock: false },
  { id: "LOAD100", name: "E-load ₱100", category: "Load", unit: "pc", price: 100, stock: 0, reorder: 0, keys: "load,eload,promo,100", trackStock: false }
].map((item) => ({ ...item, sample: true, active: true }));

const $ = (id) => document.getElementById(id);
const pesoFmt = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

let db = blank();
let activeCat = "All";
let journalMode = "today";
let saving = false;
let memoryOnly = false;

function blank() {
  return {
    version: 1,
    nextReceipt: 1001,
    catalog: SAMPLE.map((item) => ({ ...item })),
    receipts: [],
    closes: {},
    cart: [],
    pay: "Cash",
    lastFloat: null
  };
}

function money(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

function peso(n) {
  return pesoFmt.format(money(n));
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function manilaNow() {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  const parts = {};
  for (const p of fmt.formatToParts(new Date())) parts[p.type] = p.value;
  let hour = String(parts.hour || "00").padStart(2, "0");
  if (hour === "24") hour = "00";
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${hour}:${String(parts.minute || "00").padStart(2, "0")}`
  };
}

function prettyDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return iso || "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function readQty(value) {
  const n = Math.floor(Number(String(value ?? "").replace(/[^\d]/g, "")));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 999);
}

function readMoneyOrNull(value) {
  const raw = String(value ?? "").replace(/,/g, "").trim();
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 10000000) return null;
  return money(n);
}

function lineCents(line) {
  return Math.round(Number(line.price) * Number(line.qty) * 100);
}

function cartTotal() {
  return db.cart.reduce((sum, line) => sum + lineCents(line), 0) / 100;
}

function findItem(id) {
  return db.catalog.find((item) => item.id === id);
}

function slug(name) {
  const base = String(name || "").toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 12);
  return base || "ITEM";
}

function uniqueId(name) {
  let id = slug(name);
  let n = 2;
  while (db.catalog.some((item) => item.id === id)) {
    id = slug(name).slice(0, 10) + n;
    n += 1;
  }
  return id;
}

function orderedCats(items) {
  const present = new Set(items.map((item) => item.category).filter(Boolean));
  const known = CAT_ORDER.filter((cat) => present.has(cat));
  const extra = [...present].filter((cat) => !CAT_ORDER.includes(cat)).sort();
  return [...known, ...extra];
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw);
    return normalizeDb(parsed);
  } catch (err) {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) localStorage.setItem(KEY + "-bad", raw);
    } catch (e) { /* keep going with a fresh book */ }
    return blank();
  }
}

function normalizeDb(raw) {
  const next = blank();
  if (!raw || typeof raw !== "object") return next;
  if (Array.isArray(raw.catalog)) {
    const seen = new Set();
    next.catalog = [];
    for (const item of raw.catalog.map(cleanItem).filter(Boolean)) {
      if (seen.has(item.id)) {
        const ix = next.catalog.findIndex((row) => row.id === item.id);
        next.catalog[ix] = item;
      } else {
        seen.add(item.id);
        next.catalog.push(item);
      }
    }
  }
  next.receipts = Array.isArray(raw.receipts) ? raw.receipts.map(cleanReceipt).filter(Boolean) : [];
  next.cart = Array.isArray(raw.cart) ? raw.cart.map(cleanCartLine).filter(Boolean) : [];
  next.closes = {};
  if (raw.closes && typeof raw.closes === "object") {
    for (const [date, rec] of Object.entries(raw.closes)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !rec || typeof rec !== "object") continue;
      next.closes[date] = {
        float: rec.float == null ? null : money(rec.float),
        counted: rec.counted == null ? null : money(rec.counted)
      };
    }
  }
  const maxRcpt = next.receipts.reduce((max, rec) => Math.max(max, rec.receipt), 1000);
  next.nextReceipt = Math.max(Math.trunc(Number(raw.nextReceipt)) || 1001, maxRcpt + 1);
  next.pay = ["Cash", "GCash", "Other"].includes(raw.pay) ? raw.pay : "Cash";
  next.lastFloat = raw.lastFloat == null ? null : money(raw.lastFloat);
  next.version = 1;
  return next;
}

function cleanItem(raw) {
  if (!raw || typeof raw.name !== "string" || !raw.name.trim()) return null;
  const price = money(raw.price);
  if (price < 0 || price > 1000000) return null;
  const id = String(raw.id || slug(raw.name)).replace(/[^\w-]/g, "").slice(0, 32);
  if (!id) return null;
  return {
    id,
    name: raw.name.trim().slice(0, 80),
    category: String(raw.category || "General").trim().slice(0, 40) || "General",
    unit: String(raw.unit || "pc").trim().slice(0, 16) || "pc",
    price,
    stock: Number.isFinite(Number(raw.stock)) ? Math.trunc(Number(raw.stock)) : 0,
    reorder: Number.isFinite(Number(raw.reorder)) ? Math.max(0, Math.trunc(Number(raw.reorder))) : 0,
    keys: String(raw.keys || "").toLowerCase().slice(0, 200),
    trackStock: raw.trackStock !== false,
    sample: raw.sample === true,
    active: raw.active !== false
  };
}

function cleanCartLine(raw) {
  if (!raw || !raw.id) return null;
  const qty = readQty(raw.qty);
  const price = money(raw.price);
  if (price < 0) return null;
  return { id: String(raw.id).slice(0, 32), name: String(raw.name || raw.id).slice(0, 80), price, qty };
}

function cleanReceipt(raw) {
  if (!raw || !Array.isArray(raw.lines)) return null;
  const lines = raw.lines.map((line) => {
    if (!line || !line.name) return null;
    const qty = Math.trunc(Number(line.qty));
    const price = money(line.price);
    if (!qty || qty < 1 || qty > 999 || price < 0) return null;
    return {
      id: String(line.id || "").slice(0, 32),
      name: String(line.name).slice(0, 80),
      qty,
      price,
      line: money(price * qty)
    };
  }).filter(Boolean);
  if (!lines.length) return null;
  const total = lines.reduce((sum, line) => sum + Math.round(line.line * 100), 0) / 100;
  const payment = ["Cash", "GCash", "Other"].includes(raw.payment) ? raw.payment : "Cash";
  const tendered = raw.tendered == null ? total : money(raw.tendered);
  return {
    receipt: Math.max(1, Math.trunc(Number(raw.receipt)) || 0),
    date: /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : manilaNow().date,
    time: /^\d{2}:\d{2}$/.test(raw.time) ? raw.time : "00:00",
    payment,
    tendered,
    change: money(raw.change != null ? raw.change : tendered - total),
    total,
    voided: raw.voided === true,
    lines
  };
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (err) {
    memoryOnly = true;
    paintNet();
  }
}

function paintNet() {
  const el = $("net");
  if (!el) return;
  const when = manilaNow();
  const where = memoryOnly ? "Not saved — storage is blocked" : (navigator.onLine ? "Saved on this device" : "Offline · saved on this device");
  el.textContent = prettyDate(when.date) + " · " + where;
}

function visibleItems() {
  const q = $("search").value.trim().toLowerCase();
  return db.catalog.filter((item) => {
    if (item.active === false) return false;
    if (activeCat !== "All" && item.category !== activeCat) return false;
    if (!q) return true;
    const hay = [item.name, item.category, item.unit, item.keys, item.id].join(" ").toLowerCase();
    return q.split(/\s+/).every((word) => hay.includes(word));
  }).sort((a, b) => {
    const ca = CAT_ORDER.indexOf(a.category);
    const cb = CAT_ORDER.indexOf(b.category);
    const oa = ca === -1 ? 99 : ca;
    const ob = cb === -1 ? 99 : cb;
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name);
  });
}

function renderHeader() {
  $("headRcpt").textContent = String(db.nextReceipt);
  const samples = db.catalog.some((item) => item.sample && item.active !== false);
  $("sampleNote").textContent = samples ? "SAMPLE prices. Palitan sa Catalog bago ang tunay na benta." : "";
  renderLastSale();
  paintNet();
}

function renderLastSale() {
  const last = db.receipts[db.receipts.length - 1];
  const el = $("lastSale");
  if (!last) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const tag = last.voided ? "Void" : "Last";
  el.textContent = `${tag} resibo #${last.receipt} · ${last.payment} · Kabuuan ${peso(last.total)} · Sukli ${peso(last.change)}`;
}

function renderChips() {
  const cats = ["All", ...orderedCats(db.catalog.filter((item) => item.active !== false))];
  if (!cats.includes(activeCat)) activeCat = "All";
  $("chips").innerHTML = cats.map((cat) =>
    `<button type="button" class="chip ${cat === activeCat ? "on" : ""}" data-cat="${esc(cat)}">${esc(cat)}</button>`
  ).join("");
}

function renderGrid() {
  const items = visibleItems();
  if (!items.length) {
    $("grid").innerHTML = '<p class="muted empty">Walang tugma. Add it in Catalog.</p>';
    return;
  }
  $("grid").innerHTML = items.map((item) => {
    const low = item.trackStock !== false && item.stock <= item.reorder;
    const oh = item.trackStock === false ? "No stock count" : (low ? `${item.stock} left · KULANG` : `${item.stock} on hand`);
    const strip = CAT_COLOR[item.category] || "#1B4D3E";
    return `<button type="button" class="tile${low ? " low" : ""}" data-add="${esc(item.id)}" style="--strip:${strip}">
      <span class="name">${esc(item.name)}</span>
      <span class="meta">${esc(item.category)}${item.sample ? " · SAMPLE" : ""}</span>
      <span class="price">${peso(item.price)}</span>
      <span class="oh">${esc(oh)}</span>
    </button>`;
  }).join("");
}

function renderCart() {
  const el = $("cart");
  if (!db.cart.length) {
    el.innerHTML = '<p class="muted empty">Wala pang item. Tap a product.</p>';
  } else {
    el.innerHTML = db.cart.map((line) => {
      const item = findItem(line.id);
      const over = item && item.trackStock !== false && line.qty > Number(item.stock);
      return `<div class="line">
        <div class="line-name">
          <b>${esc(line.name)}</b>
          <span class="muted">${peso(line.price)} presyo</span>
          ${over ? '<div class="warn">Kulang ang stock</div>' : ""}
        </div>
        <div class="line-controls">
          <div class="stepper">
            <button type="button" data-act="minus" data-id="${esc(line.id)}" aria-label="Less">−</button>
            <input class="line-qty" data-id="${esc(line.id)}" inputmode="numeric" value="${line.qty}" aria-label="Dami">
            <button type="button" data-act="plus" data-id="${esc(line.id)}" aria-label="More">+</button>
          </div>
          <div class="line-amt"><b>${peso(lineCents(line) / 100)}</b>
            <button type="button" class="icon-btn" data-act="remove" data-id="${esc(line.id)}" aria-label="Remove">✕</button>
          </div>
        </div>
      </div>`;
    }).join("");
  }
  const total = cartTotal();
  $("total").textContent = peso(total);
  $("miniTotal").textContent = peso(total);
  $("miniBar").classList.toggle("empty", db.cart.length === 0);
  $("saveBtn").disabled = db.cart.length === 0;
  document.querySelectorAll(".pay").forEach((btn) => btn.classList.toggle("on", btn.dataset.pay === db.pay));
  paintPay();
}

function paintPay() {
  const total = cartTotal();
  const tender = readMoneyOrNull($("tender").value);
  const changeEl = $("change");
  const hint = $("payHint");
  $("saveMsg").hidden = true;
  if (tender == null) {
    changeEl.textContent = "—";
    changeEl.className = "";
    $("miniChange").textContent = "—";
    hint.textContent = db.pay === "Cash"
      ? "Ilagay ang natanggap."
      : "Blank GCash or Other counts as Sakto when you save.";
    return;
  }
  const change = money(tender - total);
  changeEl.textContent = peso(change);
  $("miniChange").textContent = peso(change);
  if (change < 0) {
    changeEl.className = "short";
    hint.textContent = "Kulang ang bayad.";
  } else {
    changeEl.className = "ok";
    hint.textContent = change === 0 ? "Sakto." : "Sukli to hand back.";
  }
}

function renderSell() {
  renderChips();
  renderGrid();
  renderCart();
}

function addToCart(id, qty) {
  const item = findItem(id);
  if (!item || item.active === false) return;
  const line = db.cart.find((row) => row.id === id);
  if (line) line.qty = Math.min(999, line.qty + qty);
  else db.cart.push({ id: item.id, name: item.name, price: item.price, qty });
  save();
  renderCart();
  renderGrid();
}

function setLineQty(id, qty) {
  const line = db.cart.find((row) => row.id === id);
  if (!line) return;
  if (qty < 1) db.cart = db.cart.filter((row) => row.id !== id);
  else line.qty = qty;
  save();
  renderCart();
}

function saveSale() {
  if (saving) return;
  saving = true;
  try {
    if (!db.cart.length) return;
    const total = cartTotal();
    let tender = readMoneyOrNull($("tender").value);
    if ($("tender").value.trim() !== "" && tender == null) {
      showSaveMsg("Bayad is not a number.");
      return;
    }
    if (tender == null) {
      if (db.pay === "Cash" && total > 0) {
        showSaveMsg("Ilagay ang bayad.");
        $("tender").focus();
        return;
      }
      tender = total;
    }
    if (tender + 0.001 < total) {
      showSaveMsg("Kulang ang bayad.");
      return;
    }
    const short = db.cart.filter((line) => {
      const item = findItem(line.id);
      return item && item.trackStock !== false && Number(item.stock) < line.qty;
    });
    if (short.length) {
      const names = short.map((line) => line.name).join(", ");
      if (!confirm("Kulang ang stock: " + names + ". Sell anyway?")) return;
    }
    const when = manilaNow();
    const lines = db.cart.map((line) => ({
      id: line.id,
      name: line.name,
      qty: line.qty,
      price: line.price,
      line: lineCents(line) / 100
    }));
    const receipt = {
      receipt: db.nextReceipt,
      date: when.date,
      time: when.time,
      payment: db.pay,
      tendered: tender,
      change: money(tender - total),
      total,
      voided: false,
      lines
    };
    for (const line of lines) {
      const item = findItem(line.id);
      if (item && item.trackStock !== false) item.stock = Number(item.stock) - line.qty;
    }
    db.receipts.push(receipt);
    db.nextReceipt += 1;
    db.cart = [];
    $("tender").value = "";
    $("qty").value = "1";
    $("search").value = "";
    activeCat = "All";
    save();
    renderAll();
    openReceipt(receipt);
  } finally {
    saving = false;
  }
}

function showSaveMsg(text) {
  const el = $("saveMsg");
  el.hidden = false;
  el.textContent = text;
}

function voidReceipt(num) {
  const receipt = db.receipts.find((row) => row.receipt === num && !row.voided);
  if (!receipt) return;
  if (!confirm("Void resibo #" + num + "? Stock goes back.")) return;
  receipt.voided = true;
  for (const line of receipt.lines) {
    const item = findItem(line.id);
    if (item && item.trackStock !== false) item.stock = Number(item.stock) + Number(line.qty);
  }
  save();
  renderAll();
}

function openReceipt(receipt) {
  $("mRcpt").textContent = "#" + receipt.receipt;
  $("mWhen").textContent = prettyDate(receipt.date) + " · " + receipt.time + " · " + receipt.payment;
  $("mLines").innerHTML = receipt.lines.map((line) =>
    `<div class="m-line"><span>${esc(line.name)}<br><span class="muted">${line.qty} × ${peso(line.price)}</span></span><b>${peso(line.line)}</b></div>`
  ).join("");
  $("mTotal").textContent = peso(receipt.total);
  $("mPay").textContent = "Bayad · " + receipt.payment;
  $("mTender").textContent = peso(receipt.tendered);
  $("mChange").textContent = peso(receipt.change);
  $("mVoided").hidden = !receipt.voided;
  $("modal").hidden = false;
  $("mNext").focus();
}

function renderCatalog() {
  const names = orderedCats(db.catalog);
  $("catList").innerHTML = names.map((cat) => `<option value="${esc(cat)}"></option>`).join("");
  const q = $("catalogFilter").value.trim().toLowerCase();
  const items = db.catalog.filter((item) => {
    if (!q) return true;
    return [item.name, item.category, item.id, item.keys].join(" ").toLowerCase().includes(q);
  });
  $("catalogList").innerHTML = items.map((item) => `
    <article class="card item-edit${item.active === false ? " is-off" : ""}" data-id="${esc(item.id)}">
      <div>${item.sample ? '<span class="tag">SAMPLE</span>' : ""}${item.active === false ? '<span class="tag off">Hidden</span>' : ""}<span class="muted"> ${esc(item.category)} · ${esc(item.id)}</span></div>
      <label>Name <input class="ylw name-in" value="${esc(item.name)}" autocomplete="off"></label>
      <label>Keywords <input class="ylw keys-in" value="${esc(item.keys)}" autocomplete="off"></label>
      <div class="row">
        <label>Presyo <input class="ylw price-in" inputmode="decimal" value="${esc(item.price)}"></label>
        <label>Stock <input class="ylw stock-in" inputmode="numeric" value="${item.trackStock === false ? "" : esc(item.stock)}" ${item.trackStock === false ? "disabled" : ""}></label>
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-green" data-act="save">Save</button>
        <button type="button" class="btn btn-ghost" data-act="real">${item.sample ? "Mark real" : "Mark SAMPLE"}</button>
        <button type="button" class="btn btn-ghost" data-act="hide">${item.active === false ? "Show" : "Hide"}</button>
        <button type="button" class="btn btn-danger" data-act="del">Remove</button>
      </div>
    </article>
  `).join("") || '<p class="muted">No items.</p>';
}

function readCard(card) {
  const item = findItem(card.dataset.id);
  if (!item) return null;
  const name = card.querySelector(".name-in").value.trim();
  const price = readMoneyOrNull(card.querySelector(".price-in").value);
  const keys = card.querySelector(".keys-in").value.trim().toLowerCase();
  let stock = item.stock;
  const stockEl = card.querySelector(".stock-in");
  if (item.trackStock !== false && stockEl && !stockEl.disabled) {
    const n = Math.trunc(Number(stockEl.value));
    if (!Number.isFinite(n)) return { error: "Stock is not a number." };
    stock = n;
  }
  if (!name) return { error: "Need a name." };
  if (price == null) return { error: "Presyo is not a number." };
  return { item, name, price, keys, stock };
}

function applyCard(card, patch) {
  const read = readCard(card);
  if (!read || read.error) {
    $("addMsg").textContent = read ? read.error : "Item missing.";
    $("addMsg").className = "warn";
    return null;
  }
  read.item.name = read.name.slice(0, 80);
  read.item.price = read.price;
  read.item.keys = read.keys.slice(0, 200);
  if (read.item.trackStock !== false) read.item.stock = read.stock;
  Object.assign(read.item, patch || {});
  const cartLine = db.cart.find((line) => line.id === read.item.id);
  if (cartLine) {
    cartLine.name = read.item.name;
    cartLine.price = read.item.price;
  }
  return read.item;
}

function addItem() {
  const name = $("newName").value.trim();
  const price = readMoneyOrNull($("newPrice").value);
  if (!name) {
    $("addMsg").textContent = "Need a name.";
    $("addMsg").className = "warn";
    return;
  }
  if (price == null) {
    $("addMsg").textContent = "Need a presyo.";
    $("addMsg").className = "warn";
    return;
  }
  const track = $("newTrack").checked;
  const stock = track ? Math.trunc(Number($("newStock").value) || 0) : 0;
  const reorder = Math.max(0, Math.trunc(Number($("newReo").value) || 0));
  db.catalog.push({
    id: uniqueId(name),
    name: name.slice(0, 80),
    category: ($("newCat").value.trim() || "General").slice(0, 40),
    unit: "pc",
    price,
    stock: Number.isFinite(stock) ? stock : 0,
    reorder,
    keys: $("newKeys").value.trim().toLowerCase().slice(0, 200),
    trackStock: track,
    sample: false,
    active: true
  });
  $("newName").value = "";
  $("newPrice").value = "";
  $("newKeys").value = "";
  $("newStock").value = "0";
  $("addMsg").textContent = "Added.";
  $("addMsg").className = "ok";
  save();
  renderAll();
}

function renderJournalList() {
  const q = $("journalFind").value.trim().toLowerCase();
  const today = manilaNow().date;
  let rows = db.receipts.slice().sort((a, b) => b.receipt - a.receipt);
  if (journalMode === "today") rows = rows.filter((row) => row.date === today);
  if (q) {
    rows = rows.filter((row) => {
      const blob = [row.receipt, row.payment, row.date, ...row.lines.map((line) => line.name + " " + line.id)].join(" ").toLowerCase();
      return blob.includes(q);
    });
  }
  $("journalToday").classList.toggle("on", journalMode === "today");
  $("journalAll").classList.toggle("on", journalMode === "all");
  if (!rows.length) {
    $("journalList").innerHTML = '<p class="muted">Wala pang resibo.</p>';
    return;
  }
  $("journalList").innerHTML = rows.map((row) => {
    const payClass = row.voided ? "voided" : row.payment === "GCash" ? "gcash" : row.payment === "Other" ? "other" : "";
    const lines = row.lines.map((line) =>
      `<div class="m-line"><span>${esc(line.name)} × ${line.qty}</span><b>${peso(line.line)}</b></div>`
    ).join("");
    return `<article class="card receipt ${payClass}">
      <div class="receipt-top">
        <h3>Resibo #${row.receipt}</h3>
        ${row.voided ? '<span class="tag void">VOID</span>' : ""}
      </div>
      <p class="muted">${esc(prettyDate(row.date))} · ${esc(row.time)} · ${esc(row.payment)}</p>
      ${lines}
      <div class="sheet-row"><span>Kabuuan</span><b>${peso(row.total)}</b></div>
      <div class="sheet-row"><span>Bayad</span><b>${peso(row.tendered)}</b></div>
      <div class="sheet-row"><span>Sukli</span><b>${peso(row.change)}</b></div>
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" data-act="view" data-rcpt="${row.receipt}">Show</button>
        ${row.voided ? "" : `<button type="button" class="btn btn-danger" data-act="void" data-rcpt="${row.receipt}">Void</button>`}
      </div>
    </article>`;
  }).join("");
}

function dayReceipts(date, includeVoided) {
  return db.receipts.filter((row) => row.date === date && (includeVoided || !row.voided));
}

function sumReceipts(rows, pick) {
  return rows.reduce((sum, row) => sum + Math.round(pick(row) * 100), 0) / 100;
}

function renderClose() {
  const input = $("closeDate");
  if (!input.value) input.value = manilaNow().date;
  const date = input.value;
  const rec = db.closes[date] || {};
  if (document.activeElement !== $("floatIn")) $("floatIn").value = rec.float == null ? "" : rec.float;
  if (document.activeElement !== $("countIn")) $("countIn").value = rec.counted == null ? "" : rec.counted;
  paintClose();
}

function paintClose() {
  const date = $("closeDate").value || manilaNow().date;
  const rows = dayReceipts(date, false);
  const voided = dayReceipts(date, true).filter((row) => row.voided).length;
  const total = sumReceipts(rows, (row) => row.total);
  const cash = sumReceipts(rows, (row) => row.payment === "Cash" ? row.total : 0);
  const gcash = sumReceipts(rows, (row) => row.payment === "GCash" ? row.total : 0);
  const other = sumReceipts(rows, (row) => row.payment === "Other" ? row.total : 0);
  $("closeKpis").innerHTML = `
    <div><span>Kabuuan</span><b>${peso(total)}</b></div>
    <div><span>Resibo</span><b>${rows.length}</b></div>
    <div class="cash"><span>Cash</span><b>${peso(cash)}</b></div>
    <div class="gcash"><span>GCash</span><b>${peso(gcash)}</b></div>
    <div><span>Other</span><b>${peso(other)}</b></div>
    <div><span>Voided</span><b>${voided}</b></div>`;
  const by = new Map();
  for (const row of rows) {
    for (const line of row.lines) {
      const cur = by.get(line.name) || { qty: 0, peso: 0 };
      cur.qty += line.qty;
      cur.peso = money(cur.peso + line.line);
      by.set(line.name, cur);
    }
  }
  const body = [...by.entries()].sort((a, b) => b[1].peso - a[1].peso).map(([name, cur]) =>
    `<tr><td>${esc(name)}</td><td>${cur.qty}</td><td>${peso(cur.peso)}</td></tr>`
  ).join("");
  $("closeItems").innerHTML = `<thead><tr><th>Item</th><th>Dami</th><th>Sales</th></tr></thead><tbody>${body || '<tr><td colspan="3">No sales this date.</td></tr>'}</tbody>`;
  const floatRaw = $("floatIn").value;
  const countedRaw = $("countIn").value;
  const floatParsed = readMoneyOrNull(floatRaw);
  const counted = readMoneyOrNull(countedRaw);
  const expectEl = $("closeExpect");
  if (floatRaw.trim() !== "" && floatParsed == null) {
    expectEl.className = "expect bad";
    expectEl.textContent = "Opening float is not a number.";
    return;
  }
  if (countedRaw.trim() !== "" && counted == null) {
    expectEl.className = "expect bad";
    expectEl.textContent = "Counted cash is not a number.";
    return;
  }
  const floatVal = floatParsed ?? 0;
  const expected = money(floatVal + cash);
  const floatNote = floatRaw.trim() === "" ? " Float counted as ₱0.00." : "";
  if (counted == null) {
    expectEl.className = "expect";
    expectEl.textContent = `Expected cash in drawer ${peso(expected)}.${floatNote} GCash ${peso(gcash)} is not in the drawer.`;
  } else {
    const diff = money(counted - expected);
    expectEl.className = "expect " + (diff < 0 ? "bad" : "ok");
    const word = diff < 0 ? "Kulang" : diff > 0 ? "Sobra" : "Sakto ang drawer";
    const amount = diff === 0 ? "" : " " + peso(Math.abs(diff));
    expectEl.textContent = `Expected ${peso(expected)}. ${word}${amount}.${floatNote} GCash is not in the drawer.`;
  }
}

function saveClose() {
  const date = $("closeDate").value;
  if (!date) return;
  const floatVal = readMoneyOrNull($("floatIn").value);
  const counted = readMoneyOrNull($("countIn").value);
  db.closes[date] = { float: floatVal, counted };
  if (floatVal != null) db.lastFloat = floatVal;
  save();
  paintClose();
}

function renderStock() {
  const q = $("stockFilter").value.trim().toLowerCase();
  const items = db.catalog.filter((item) => {
    if (!q) return true;
    return [item.name, item.category, item.id].join(" ").toLowerCase().includes(q);
  }).slice().sort((a, b) => {
    const la = a.trackStock !== false && a.stock <= a.reorder ? 0 : 1;
    const lb = b.trackStock !== false && b.stock <= b.reorder ? 0 : 1;
    if (la !== lb) return la - lb;
    return a.name.localeCompare(b.name);
  });
  const lows = db.catalog.filter((item) => item.active !== false && item.trackStock !== false && item.stock <= item.reorder);
  $("stockAlert").textContent = lows.length
    ? lows.length + " low / KULANG. Tap + when a delivery comes in."
    : "Nothing is at the reorder line.";
  const today = manilaNow().date;
  $("stockList").innerHTML = items.map((item) => {
    const sold = db.receipts.filter((row) => row.date === today && !row.voided)
      .flatMap((row) => row.lines)
      .filter((line) => line.id === item.id)
      .reduce((sum, line) => sum + line.qty, 0);
    if (item.trackStock === false) {
      return `<article class="card stock-card"><b>${esc(item.name)}</b>${item.sample ? '<span class="tag">SAMPLE</span>' : ""}<p class="muted">${esc(item.category)} · stock not tracked · sold today ${sold}</p></article>`;
    }
    const low = item.stock <= item.reorder;
    return `<article class="card stock-card" data-id="${esc(item.id)}">
      <b>${esc(item.name)}</b>${item.sample ? '<span class="tag">SAMPLE</span>' : ""}${low ? '<span class="tag void">KULANG</span>' : ""}
      <p class="muted">${esc(item.category)} · reorder ${item.reorder} · sold today ${sold}</p>
      <div class="oh-num">${item.stock} <span class="muted">on hand</span></div>
      <div class="stock-actions">
        <button type="button" data-act="minus" data-id="${esc(item.id)}">−</button>
        <input class="ylw stock-set" data-id="${esc(item.id)}" inputmode="numeric" value="${item.stock}" aria-label="On hand">
        <button type="button" data-act="plus" data-n="1" data-id="${esc(item.id)}">+</button>
        <button type="button" data-act="plus" data-n="10" data-id="${esc(item.id)}">+10</button>
      </div>
    </article>`;
  }).join("");
}

function adjustStock(id, delta) {
  const item = findItem(id);
  if (!item || item.trackStock === false) return;
  item.stock = Number(item.stock) + delta;
  save();
  renderStock();
  renderGrid();
}

function setStock(id, value) {
  const item = findItem(id);
  if (!item || item.trackStock === false) return;
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return;
  item.stock = n;
  save();
  renderStock();
  renderGrid();
}

function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

function csvCell(value) {
  const s = String(value ?? "");
  const safe = /^[=+\-@]/.test(s) ? "'" + s : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

function exportJson() {
  const payload = {
    app: "sk-register",
    exported: new Date().toISOString(),
    version: 1,
    nextReceipt: db.nextReceipt,
    catalog: db.catalog,
    receipts: db.receipts,
    closes: db.closes,
    cart: db.cart,
    pay: db.pay,
    lastFloat: db.lastFloat
  };
  download("sk-register-" + manilaNow().date + ".json", JSON.stringify(payload, null, 2), "application/json");
  $("backupMsg").textContent = "JSON downloaded. Save it in Drive folder S&K Register.";
  $("backupMsg").className = "ok";
}

function exportCsv() {
  const head = ["Receipt", "Date", "Time", "Payment", "Item", "Qty", "UnitPrice", "LineTotal", "ReceiptTotal", "Tendered", "Change", "Voided"];
  const lines = [head.map(csvCell).join(",")];
  for (const row of db.receipts) {
    for (const line of row.lines) {
      lines.push([
        row.receipt, row.date, row.time, row.payment, line.name, line.qty, line.price, line.line,
        row.total, row.tendered, row.change, row.voided ? "yes" : "no"
      ].map(csvCell).join(","));
    }
  }
  download("sk-register-sales-" + manilaNow().date + ".csv", lines.join("\n"), "text/csv");
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      if (!data || !Array.isArray(data.catalog) || !Array.isArray(data.receipts)) throw new Error("bad");
      if (!confirm("Replace this device's catalog, sales, and stock with the file?")) return;
      db = normalizeDb(data);
      save();
      activeCat = "All";
      renderAll();
      $("backupMsg").textContent = "Imported.";
      $("backupMsg").className = "ok";
    } catch (err) {
      $("backupMsg").textContent = "That file is not an S&K backup.";
      $("backupMsg").className = "warn";
    }
  };
  reader.readAsText(file);
}

function clearSales() {
  if (!db.receipts.length) return;
  if (!confirm("Clear every receipt? Stock from those sales is put back. Export a backup first if you still need the journal.")) return;
  for (const row of db.receipts) {
    if (row.voided) continue;
    for (const line of row.lines) {
      const item = findItem(line.id);
      if (item && item.trackStock !== false) item.stock = Number(item.stock) + Number(line.qty);
    }
  }
  db.receipts = [];
  db.closes = {};
  save();
  renderAll();
  $("backupMsg").textContent = "Sales cleared. Stock from those sales was put back.";
  $("backupMsg").className = "ok";
}

function resetSamples() {
  if (!confirm("Reset SAMPLE names, prices, and stock to the practice list? Items you added stay. Saved receipts stay.")) return;
  for (const seed of SAMPLE) {
    const ix = db.catalog.findIndex((item) => item.id === seed.id);
    if (ix >= 0) db.catalog[ix] = { ...seed };
    else db.catalog.push({ ...seed });
  }
  for (const line of db.cart) {
    const item = findItem(line.id);
    if (item) {
      line.name = item.name;
      line.price = item.price;
    }
  }
  save();
  renderAll();
}

function renderAll() {
  renderHeader();
  renderSell();
  renderCatalog();
  renderJournalList();
  renderClose();
  renderStock();
}

function showPage(name) {
  document.querySelectorAll(".page").forEach((page) => page.classList.toggle("on", page.id === "page-" + name));
  document.querySelectorAll(".tab").forEach((tab) => {
    const on = tab.dataset.page === name;
    tab.classList.toggle("on", on);
    tab.setAttribute("aria-current", on ? "page" : "false");
  });
  $("backupBtn").classList.toggle("on", name === "backup");
  if (name === "sell") renderSell();
  if (name === "catalog") renderCatalog();
  if (name === "journal") renderJournalList();
  if (name === "close") renderClose();
  if (name === "stock") renderStock();
  window.scrollTo(0, 0);
}

function bind() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => showPage(tab.dataset.page));
  });
  $("backupBtn").addEventListener("click", () => showPage("backup"));
  $("search").addEventListener("input", renderGrid);
  $("search").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const first = $("grid").querySelector("[data-add]");
    if (first) first.click();
  });
  $("chips").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-cat]");
    if (!btn) return;
    activeCat = btn.dataset.cat;
    renderChips();
    renderGrid();
  });
  $("grid").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-add]");
    if (!btn) return;
    addToCart(btn.dataset.add, readQty($("qty").value));
    $("qty").value = "1";
  });
  $("qtyMinus").addEventListener("click", () => {
    $("qty").value = String(Math.max(1, readQty($("qty").value) - 1));
  });
  $("qtyPlus").addEventListener("click", () => {
    $("qty").value = String(Math.min(999, readQty($("qty").value) + 1));
  });
  $("cart").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-act]");
    if (!btn) return;
    const id = btn.dataset.id;
    const line = db.cart.find((row) => row.id === id);
    if (!line) return;
    if (btn.dataset.act === "plus") setLineQty(id, Math.min(999, line.qty + 1));
    if (btn.dataset.act === "minus") setLineQty(id, line.qty - 1);
    if (btn.dataset.act === "remove") setLineQty(id, 0);
  });
  $("cart").addEventListener("change", (event) => {
    const input = event.target.closest(".line-qty");
    if (!input) return;
    setLineQty(input.dataset.id, readQty(input.value));
  });
  document.querySelectorAll(".pay").forEach((btn) => {
    btn.addEventListener("click", () => {
      db.pay = btn.dataset.pay;
      save();
      renderCart();
    });
  });
  $("tender").addEventListener("input", paintPay);
  $("tender").addEventListener("focus", () => $("tender").select());
  $("tender").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveSale();
    }
  });
  $("exactBtn").addEventListener("click", () => {
    $("tender").value = String(cartTotal());
    paintPay();
  });
  $("bills").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-bill]");
    if (!btn) return;
    $("tender").value = btn.dataset.bill === "1000" ? "1000" : btn.dataset.bill;
    paintPay();
  });
  $("saveBtn").addEventListener("click", saveSale);
  $("miniJump").addEventListener("click", () => {
    $("payPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    $("tender").focus();
  });
  $("addItem").addEventListener("click", addItem);
  $("catalogFilter").addEventListener("input", renderCatalog);
  $("catalogList").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-act]");
    if (!btn) return;
    const card = btn.closest(".item-edit");
    if (!card) return;
    if (btn.dataset.act === "save") {
      if (!applyCard(card)) return;
      $("addMsg").textContent = "Saved.";
      $("addMsg").className = "ok";
      save();
      renderHeader();
      renderSell();
      renderStock();
      return;
    }
    if (btn.dataset.act === "real") {
      const item = applyCard(card);
      if (!item) return;
      item.sample = !item.sample;
      save();
      renderAll();
      return;
    }
    if (btn.dataset.act === "hide") {
      const item = applyCard(card);
      if (!item) return;
      item.active = item.active === false;
      if (item.active === false) db.cart = db.cart.filter((line) => line.id !== item.id);
      save();
      renderAll();
      return;
    }
    if (btn.dataset.act === "del") {
      const item = findItem(card.dataset.id);
      if (!item) return;
      if (!confirm("Remove " + item.name + "?")) return;
      db.catalog = db.catalog.filter((row) => row.id !== item.id);
      db.cart = db.cart.filter((line) => line.id !== item.id);
      save();
      renderAll();
    }
  });
  $("journalFind").addEventListener("input", renderJournalList);
  $("journalToday").addEventListener("click", () => { journalMode = "today"; renderJournalList(); });
  $("journalAll").addEventListener("click", () => { journalMode = "all"; renderJournalList(); });
  $("journalList").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-act]");
    if (!btn) return;
    const num = Number(btn.dataset.rcpt);
    const receipt = db.receipts.find((row) => row.receipt === num);
    if (!receipt) return;
    if (btn.dataset.act === "view") openReceipt(receipt);
    if (btn.dataset.act === "void") voidReceipt(num);
  });
  $("closeDate").addEventListener("change", renderClose);
  $("floatIn").addEventListener("input", saveClose);
  $("countIn").addEventListener("input", saveClose);
  $("stockFilter").addEventListener("input", renderStock);
  $("stockList").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-act]");
    if (!btn) return;
    const card = btn.closest(".stock-card");
    const input = card && card.querySelector(".stock-set");
    if (input) setStock(btn.dataset.id, input.value);
    const n = Number(btn.dataset.n || 1);
    adjustStock(btn.dataset.id, btn.dataset.act === "minus" ? -n : n);
  });
  $("stockList").addEventListener("change", (event) => {
    const input = event.target.closest(".stock-set");
    if (!input) return;
    setStock(input.dataset.id, input.value);
  });
  $("expJson").addEventListener("click", exportJson);
  $("expCsv").addEventListener("click", exportCsv);
  $("impFile").addEventListener("change", () => {
    const file = $("impFile").files && $("impFile").files[0];
    $("impFile").value = "";
    if (file) importBackup(file);
  });
  $("clearSales").addEventListener("click", clearSales);
  $("resetSamples").addEventListener("click", resetSamples);
  $("mNext").addEventListener("click", () => { $("modal").hidden = true; });
  $("mPrint").addEventListener("click", () => window.print());
  $("modal").addEventListener("click", (event) => {
    if (event.target === $("modal")) $("modal").hidden = true;
  });
  window.addEventListener("online", paintNet);
  window.addEventListener("offline", paintNet);
  if ("IntersectionObserver" in window) {
    const watcher = new IntersectionObserver((entries) => {
      $("miniBar").classList.toggle("seen", entries.some((entry) => entry.isIntersecting));
    }, { threshold: 0.35 });
    watcher.observe($("payPanel"));
  }
}

db = load();
bind();
renderAll();
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
