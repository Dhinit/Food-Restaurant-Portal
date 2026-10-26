const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const D = f => path.join(__dirname, "data", f);
const DISHES = D("dishes.json");
const FILES = { messages: D("messages.json"), bookings: D("bookings.json"), orders: D("orders.json"), reviews: D("reviews.json"), subscribers: D("subscribers.json") };
const SLOTS = ["12:00", "13:00", "14:00", "19:00", "20:00", "21:00"];
const CAPACITY = 4; // tables per time slot

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

const readJson = async (file, fallback) => { try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return fallback; } };
const save = (type, list) => fs.writeFile(FILES[type], JSON.stringify(list, null, 2));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const code = p => p + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
const add = async (type, rec) => { const l = await readJson(FILES[type], []); const r = { id: uid(), ...rec, at: new Date().toISOString() }; l.push(r); await save(type, l); return r; };
const okEmail = e => /^\S+@\S+\.\S+$/.test(e || "");
const str = (v, n = 300) => String(v ?? "").trim().slice(0, n);
const today = () => new Date().toISOString().slice(0, 10);

// ---------- Menu ----------
app.get("/api/dishes", async (req, res) => {
  let d = await readJson(DISHES, []);
  if (req.query.category) d = d.filter(x => x.category === req.query.category);
  res.json(d);
});
app.get("/api/dishes/:id", async (req, res) => {
  const d = (await readJson(DISHES, [])).find(x => x.id === req.params.id);
  d ? res.json(d) : res.status(404).json({ error: "Dish not found" });
});

// ---------- Page content (How I Cook / Good to Know topics) ----------
app.get("/api/content", async (req, res) => res.json(await readJson(D("content.json"), { cook: [], know: [] })));

// ---------- Contact ----------
app.post("/api/contact", async (req, res) => {
  const b = req.body || {};
  if (!str(b.name) || !okEmail(b.email) || str(b.message, 2000).length < 5)
    return res.status(400).json({ error: "Enter your name, a valid email and a message of at least 5 characters." });
  await add("messages", { name: str(b.name, 100), email: str(b.email, 150), message: str(b.message, 2000) });
  console.log(`New message from ${str(b.name, 100)} <${str(b.email, 150)}>`);
  res.status(201).json({ ok: true });
});

// ---------- Newsletter ----------
app.post("/api/subscribe", async (req, res) => {
  const email = str(req.body && req.body.email, 150);
  if (!okEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (!(await readJson(FILES.subscribers, [])).some(x => x.email === email)) await add("subscribers", { email });
  res.status(201).json({ ok: true });
});

// ---------- Bookings ----------
const taken = async date => {
  const c = {}; (await readJson(FILES.bookings, [])).filter(b => b.date === date && b.status !== "cancelled").forEach(b => c[b.time] = (c[b.time] || 0) + 1);
  return c;
};
app.get("/api/slots", async (req, res) => {
  const date = str(req.query.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today()) return res.status(400).json({ error: "Pick today or a future date." });
  const t = await taken(date);
  res.json(SLOTS.map(time => ({ time, left: Math.max(0, CAPACITY - (t[time] || 0)) })));
});
app.post("/api/bookings", async (req, res) => {
  const b = req.body || {}, guests = parseInt(b.guests, 10);
  if (!str(b.name) || !okEmail(b.email) || !/^\d{4}-\d{2}-\d{2}$/.test(b.date || "") || b.date < today() || !SLOTS.includes(b.time) || !(guests >= 1 && guests <= 12))
    return res.status(400).json({ error: "Enter your name, a valid email, a date from today onwards, a time slot and 1 to 12 guests." });
  if (((await taken(b.date))[b.time] || 0) >= CAPACITY) return res.status(409).json({ error: "That time is fully booked. Please pick another slot." });
  const pre = await priceItems(b.items);
  const r = await add("bookings", { ref: code("FL"), name: str(b.name, 100), email: str(b.email, 150), phone: str(b.phone, 20), date: b.date, time: b.time, guests, occasion: str(b.occasion, 40), note: str(b.note, 500), status: "pending", items: pre, preTotal: pre.reduce((s, i) => s + i.price * i.qty, 0) });
  console.log(`New booking ${r.ref}: ${r.name} on ${r.date} ${r.time} for ${guests}`);
  res.status(201).json({ ref: r.ref, date: r.date, time: r.time, guests, preTotal: r.preTotal });
});
app.get("/api/bookings/lookup", async (req, res) => {
  const ref = str(req.query.ref, 20).toUpperCase(), email = str(req.query.email, 150).toLowerCase();
  const b = (await readJson(FILES.bookings, [])).find(x => x.ref === ref && x.email.toLowerCase() === email);
  b ? res.json({ ref: b.ref, date: b.date, time: b.time, guests: b.guests, status: b.status, items: b.items || [] }) : res.status(404).json({ error: "No booking found for that reference and email." });
});

// ---------- Orders (coupons + delivery fee, all priced on the server) ----------
const priceItems = async raw => {
  const menu = await readJson(DISHES, []);
  return (Array.isArray(raw) ? raw : []).map(i => {
    const d = menu.find(x => x.id === (i && i.id)), qty = parseInt(i && i.qty, 10);
    return d && qty >= 1 && qty <= 20 ? { id: d.id, name: d.name, price: d.price, qty } : null;
  }).filter(Boolean);
};
const COUPONS = {
  FLAVOUR10: { label: "10% off (max Rs 200)", off: s => Math.min(200, Math.round(s * 0.1)) },
  WELCOME50: { label: "Rs 50 off orders above Rs 300", off: s => (s >= 300 ? 50 : 0) },
};
const quote = (items, code, type = "delivery") => {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const key = str(code, 20).toUpperCase(), c = COUPONS[key];
  const discount = c ? c.off(subtotal) : 0, fee = type !== "delivery" || subtotal >= 500 || !subtotal ? 0 : 40;
  return { subtotal, discount, fee, total: subtotal - discount + fee, coupon: discount ? key : "",
    msg: key ? (c ? (discount ? c.label + " applied" : "Coupon needs a higher order value") : "Invalid coupon code") : "" };
};
app.post("/api/quote", async (req, res) => res.json(quote(await priceItems(req.body && req.body.items), req.body && req.body.coupon, req.body && req.body.type)));
app.post("/api/orders", async (req, res) => {
  const b = req.body || {}, items = await priceItems(b.items);
  const type = ["delivery", "takeaway", "dinein"].includes(b.type) ? b.type : "delivery";
  if (!items.length) return res.status(400).json({ error: "Your cart is empty." });
  if (!str(b.name) || !okEmail(b.email) || str(b.phone, 20).length < 7)
    return res.status(400).json({ error: "Enter your name, a valid email and a phone number." });
  if (type === "delivery" && str(b.address, 300).length < 5) return res.status(400).json({ error: "Enter a delivery address." });
  const q = quote(items, b.coupon, type);
  const extra = type === "delivery" ? { address: str(b.address, 300) }
    : type === "takeaway" ? { pickup: str(b.pickup, 60) || "ASAP" }
    : { guests: Math.min(12, Math.max(1, parseInt(b.guests, 10) || 2)), bookingRef: str(b.bookingRef, 20).toUpperCase() };
  const r = await add("orders", { ref: code("ORD"), type, name: str(b.name, 100), email: str(b.email, 150), phone: str(b.phone, 20), note: str(b.note, 300), payment: str(b.payment, 50), ...extra, items, subtotal: q.subtotal, discount: q.discount, fee: q.fee, coupon: q.coupon, total: q.total, status: "new" });
  console.log(`New ${type} order ${r.ref}: Rs ${q.total}`);
  res.status(201).json({ ref: r.ref, total: q.total, type });
});
app.get("/api/orders/lookup", async (req, res) => {
  const ref = str(req.query.ref, 20).toUpperCase(), email = str(req.query.email, 150).toLowerCase();
  const o = (await readJson(FILES.orders, [])).find(x => x.ref === ref && x.email.toLowerCase() === email);
  o ? res.json({ ref: o.ref, type: o.type, status: o.status, total: o.total, items: o.items.reduce((s, i) => s + i.qty, 0) }) : res.status(404).json({ error: "No order found for that reference and email." });
});

// ---------- Reviews ----------
app.get("/api/reviews", async (req, res) => {
  const l = (await readJson(FILES.reviews, [])).filter(r => r.dish === req.query.dish);
  const avg = l.length ? l.reduce((s, r) => s + r.rating, 0) / l.length : 0;
  res.json({ count: l.length, avg, list: l.slice().reverse().slice(0, 30).map(({ name, rating, comment, at }) => ({ name, rating, comment, at })) });
});
app.post("/api/reviews", async (req, res) => {
  const b = req.body || {}, rating = parseInt(b.rating, 10), dish = str(b.dish, 40) || "site";
  if ((dish !== "site" && !(await readJson(DISHES, [])).some(d => d.id === dish)) || !str(b.name) || !(rating >= 1 && rating <= 5) || str(b.comment, 600).length < 3)
    return res.status(400).json({ error: "Enter your name, a star rating and a short comment." });
  const ref = str(b.ref, 20).toUpperCase(), em = str(b.email, 150).toLowerCase();
  const pool = ref && em ? [...(await readJson(FILES.orders, [])), ...(await readJson(FILES.bookings, []))] : [];
  const verified = pool.some(x => x.ref === ref && (x.email || "").toLowerCase() === em);
  await add("reviews", { dish, name: str(b.name, 60), rating, comment: str(b.comment, 600), kind: ["Food", "Service", "Ambience", "Delivery", "Overall"].includes(b.kind) ? b.kind : "Overall", verified, helpful: 0 });
  res.status(201).json({ ok: true, verified });
});
app.get("/api/reviews/all", async (req, res) => {
  const menu = await readJson(DISHES, []), l = await readJson(FILES.reviews, []);
  const dist = [1, 2, 3, 4, 5].map(n => l.filter(r => r.rating === n).length);
  res.json({ count: l.length, avg: l.length ? l.reduce((s, r) => s + r.rating, 0) / l.length : 0, dist,
    list: l.slice().reverse().slice(0, 80).map(r => ({ id: r.id, name: r.name, rating: r.rating, comment: r.comment, kind: r.kind || "Food", verified: !!r.verified, helpful: r.helpful || 0, at: r.at, dishName: r.dish === "site" ? "Overall experience" : (menu.find(d => d.id === r.dish) || {}).name || "a dish" })) });
});
app.post("/api/reviews/:id/helpful", async (req, res) => {
  const l = await readJson(FILES.reviews, []), r = l.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: "Not found" });
  r.helpful = (r.helpful || 0) + 1; await save("reviews", l); res.json({ ok: true });
});

app.get("/api/ratings", async (req, res) => {
  const out = {};
  (await readJson(FILES.reviews, [])).forEach(r => { const o = out[r.dish] || (out[r.dish] = { sum: 0, count: 0 }); o.sum += r.rating; o.count++; });
  Object.keys(out).forEach(k => out[k] = { avg: out[k].sum / out[k].count, count: out[k].count });
  res.json(out);
});
app.get("/api/reviews/latest", async (req, res) => {
  const menu = await readJson(DISHES, []);
  res.json((await readJson(FILES.reviews, [])).slice(-3).reverse().map(r => ({ name: r.name, rating: r.rating, comment: r.comment, dishName: r.dish === "site" ? "Flavour Lab" : (menu.find(d => d.id === r.dish) || {}).name || "a dish" })));
});

// ---------- Admin (password: ADMIN_PASSWORD env var, default admin123) ----------
const auth = (req, res, next) => req.get("x-admin-password") === (process.env.ADMIN_PASSWORD || "admin123") ? next() : res.status(401).json({ error: "Wrong password" });
const valid = (req, res, next) => FILES[req.params.type] ? next() : res.status(404).json({ error: "Unknown list" });
app.get("/api/admin/:type", auth, valid, async (req, res) =>
  res.json((await readJson(FILES[req.params.type], [])).map(m => ({ ...m, id: m.id || m.at })).reverse()));
app.patch("/api/admin/:type/:id", auth, valid, async (req, res) => {
  const l = await readJson(FILES[req.params.type], []), m = l.find(x => (x.id || x.at) === req.params.id);
  if (!m) return res.status(404).json({ error: "Not found" });
  m.status = str(req.body && req.body.status, 20); await save(req.params.type, l); res.json({ ok: true });
});
app.delete("/api/admin/:type/:id", auth, valid, async (req, res) => {
  await save(req.params.type, (await readJson(FILES[req.params.type], [])).filter(m => (m.id || m.at) !== req.params.id));
  res.json({ ok: true });
});

// ---------- 404 and error handling ----------
app.use((req, res) => req.path.startsWith("/api/")
  ? res.status(404).json({ error: "Not found" })
  : res.status(404).sendFile(path.join(__dirname, "public", "404.html")));
app.use((err, req, res, next) => res.status(400).json({ error: "Bad request" }));

// ---------- Photos: saved once into public/images so the site works fast and offline ----------
const IMG = path.join(__dirname, "public", "images");
const UA = { "User-Agent": "FlavourLab/1.0 (student project)" };
const exists = f => fs.access(f).then(() => true, () => false);
async function findPhoto(d) {
  try {
    const j = await (await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent((d.wiki || d.name).replace(/ /g, "_")), { headers: UA })).json();
    const o = j.originalimage, t = j.thumbnail;
    const u = o && o.width <= 1280 ? o.source : t ? t.source.replace(/\/\d+px-/, "/960px-") : o && o.source;
    if (u) return u;
  } catch {}
  try {
    const j = await (await fetch("https://www.themealdb.com/api/json/v1/1/search.php?s=" + encodeURIComponent(d.meal || d.wiki || d.name))).json();
    if (j.meals && j.meals[0]) return j.meals[0].strMealThumb;
  } catch {}
  return null;
}
async function fetchPhotos() {
  await fs.mkdir(IMG, { recursive: true });
  for (const d of await readJson(DISHES, [])) {
    const f = path.join(IMG, d.id + ".jpg");
    if (await exists(f)) continue;
    try {
      const u = await findPhoto(d);
      if (!u) { console.log("No photo found for " + d.id); continue; }
      const r = await fetch(u, { headers: UA }), type = r.headers.get("content-type") || "";
      if (!r.ok || !type.startsWith("image/") || type.includes("svg")) { console.log("Photo download failed for " + d.id); continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 6e6) continue;
      await fs.writeFile(f, buf);
      console.log("Saved photo: " + d.id);
    } catch (e) { console.log("Photo error for " + d.id + ": " + e.message); }
    await new Promise(r => setTimeout(r, 400));
  }
  console.log("Photo check finished.");
}

app.listen(PORT, () => {
  console.log(`Flavour Lab running at http://localhost:${PORT}`);
  setTimeout(() => fetchPhotos().catch(e => console.log("Photos skipped: " + e.message)), 500);
});
