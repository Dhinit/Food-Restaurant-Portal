const $=s=>document.querySelector(s);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const RT={};const DOT={veg:"#22c55e",egg:"#f5b301",nonveg:"#ef4444"};
let _d;const getDishes=async()=>_d||(_d=await(async()=>{const [d,r]=await Promise.all([fetch("/api/dishes").then(x=>x.json()),fetch("/api/ratings").then(x=>x.json()).catch(()=>({}))]);Object.assign(RT,r);return d})());
let favs=new Set();try{favs=new Set(JSON.parse(localStorage.getItem("favs")||"[]"))}catch{}
const toggleFav=id=>{favs.has(id)?favs.delete(id):favs.add(id);try{localStorage.setItem("favs",JSON.stringify([...favs]))}catch{}
 document.querySelectorAll(`.heart[data-h="${id}"]`).forEach(h=>{h.classList.toggle("on",favs.has(id));h.textContent=favs.has(id)?"♥":"♡"});window.onFav&&onFav()};
const art=d=>`<div class="art" style="--c1:${d.c1};--c2:${d.c2}"><em>${d.emoji}</em><img src="${esc(d.photo||"/images/"+d.id+".jpg")}" data-w="${esc(d.wiki||d.name)}" data-m="${esc(d.meal||d.wiki||d.name)}" alt="${esc(d.name)}" loading="lazy" onerror="imgFail(this)"></div>`;
const cardHTML=d=>`<a class="card" href="dish.html?id=${d.id}" style="--c1:${d.c1}66;--a:${d.c1};--b:${d.c2}"><span class="chip">${esc(d.category)}</span><span class="heart ${favs.has(d.id)?"on":""}" data-h="${d.id}" role="button" aria-label="Save ${esc(d.name)}">${favs.has(d.id)?"♥":"♡"}</span>${art(d)}<div class="info"><h3><i class="dot" style="--d:${DOT[d.diet]||DOT.veg}" title="${d.diet}"></i>${esc(d.name)}</h3><small><span>${esc(d.origin)}${d.spice?" · "+"🌶".repeat(d.spice):""}${RT[d.id]?" · ★ "+RT[d.id].avg.toFixed(1):""}</span><span>₹${d.price}</span></small><span class="qa" role="button" data-add="${d.id}">＋ Add to cart</span></div></a>`;
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.1});
const watch=()=>{document.querySelectorAll(".card:not(.in),.rv:not(.in)").forEach(el=>io.observe(el));hydrate()};
const wire=(sel,url,ok)=>{const f=$(sel),s=f.querySelector(".status");f.addEventListener("submit",async e=>{e.preventDefault();s.className="status";s.textContent="Sending...";
 try{const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(f)))});const j=await r.json();if(!r.ok)throw new Error(j.error);s.className="status ok";s.textContent=ok;f.reset()}
 catch(x){s.className="status err";s.textContent=x.message||"Could not send. Try again."}})};

const here=location.pathname.split("/").pop()||"index.html",sec=new URLSearchParams(location.search).get("s");
const TOP={cook:[["heat","Respect the heat"],["fresh","Fresh and seasonal"],["plate","Plate for the eye"],["layers","Season in layers"],["prep","Prep like a pro"],["spices","Bloom your spices"],["rest","Rest your food"],["waste","Waste nothing"]],
 know:[["booking","Booking a table"],["ordering","Delivery, takeaway & dine-in"],["payments","Coupons & payments"],["diet","Menu, diet & allergies"],["reviews","Reviews & privacy"],["visit","Hours & location"]]};
const NAVITEMS=[["index.html","Home"],
 ["menu.html","Menu",[["menu.html","Full menu"],["menu.html?c=Breakfast","Breakfast"],["menu.html?c=Starter","Starters"],["menu.html?c=Main","Mains"],["menu.html?c=Snack","Snacks"],["menu.html?c=Dessert","Desserts"],["menu.html?c=Drink","Drinks"],["ingredients.html","Ingredient finder"]]],
 ["cook.html","How I Cook",[["cook.html","Overview"],...TOP.cook.map(([i,t])=>["topic.html?s=cook&id="+i,t])]],
 ["reviews.html","Kind Words",[["reviews.html","All reviews"],["reviews.html?kind=Food","Food reviews"],["reviews.html?kind=Service","Service reviews"],["reviews.html?kind=Ambience","Ambience reviews"],["reviews.html?kind=Delivery","Delivery reviews"],["reviews.html?kind=Verified","Verified reviews"],["reviews.html#write","Write a review"]]],
 ["faq.html","Good to Know",[["faq.html","Overview & FAQ"],...TOP.know.map(([i,t])=>["topic.html?s=know&id="+i,t])]],
 ["about.html","About"],["contact.html","Contact"]];
const act=h=>h===here||(h==="menu.html"&&["dish.html","ingredients.html"].includes(here))||(h==="cook.html"&&here==="topic.html"&&sec==="cook")||(h==="faq.html"&&here==="topic.html"&&sec==="know");
const navHTML=()=>NAVITEMS.map(([h,t,sub])=>sub?`<div class="dd"><a href="${h}" class="${act(h)?"on":""}" aria-haspopup="true">${t} <span class="car">▾</span></a><div class="dm">${sub.map(([a,b])=>`<a href="${a}">${b}</a>`).join("")}</div></div>`:`<a href="${h}" class="${act(h)?"on":""}">${t}</a>`).join("");
const tc=(k,t)=>`<a class="tc" style="--a:${t.c1};--b:${t.c2}" href="topic.html?s=${k}&id=${t.id}"><em>${t.emoji}</em><h3>${esc(t.title)}</h3><p>${esc(t.intro.length>115?t.intro.slice(0,112)+"…":t.intro)}</p><span>Read more →</span></a>`;
const links=[["index.html","Home"],["menu.html","Menu"],["ingredients.html","Ingredients"],["cook.html","How I Cook"],["reviews.html","Kind Words"],["faq.html","Good to Know"],["about.html","About"],["contact.html","Contact"]];
document.body.insertAdjacentHTML("afterbegin",`<a class="skip" href="#pg">Skip to content</a><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div><div class="blob b4"></div><div id="glow"></div><div class="bar" id="bar"></div>
<nav><b><a href="index.html">Flavour<span>Lab</span></a></b><div class="links">${navHTML()}<a href="book.html" class="onlym">Book a table</a></div><button class="ic" id="th" aria-label="Switch light or dark theme">🌓</button><a class="cart" href="cart.html" aria-label="Cart">🛒 <span id="cc">0</span></a><a class="btn cta" href="book.html">Book a table</a><button class="ic mb" id="mb" aria-label="Open menu" aria-expanded="false">☰</button></nav>`);
document.body.insertAdjacentHTML("beforeend",`<footer class="foot"><div class="wrap"><div class="fg">
 <div><b style="font:800 1.3rem var(--h)">Flavour<span class="grad">Lab</span></b><p style="margin-top:.6rem">Recipes, tastings and food stories from around the world.</p></div>
 <div><h4>Explore</h4>${links.map(([h,t])=>`<a href="${h}">${t}</a>`).join("")}</div>
 <div><h4>Follow</h4><a href="https://www.instagram.com/" target="_blank" rel="noopener">Instagram ↗</a><a href="https://www.youtube.com/" target="_blank" rel="noopener">YouTube ↗</a><a href="https://www.pinterest.com/" target="_blank" rel="noopener">Pinterest ↗</a></div>
 <div><h4>Get new recipes</h4><form id="nl" class="nl" novalidate><input name="email" type="email" placeholder="you@email.com" aria-label="Email"><button class="btn sm" type="submit">Join</button><p class="status" role="status" style="width:100%"></p></form></div>
 </div><p style="text-align:center;margin-top:2rem;font-size:.9rem">© Flavour Lab · Built with Node.js + Express · v7.0</p></div></footer>`);
wire("#nl","/api/subscribe","You're in. Thank you!");
document.getElementById("nl").style.flexWrap="wrap";
addEventListener("click",e=>{const h=e.target.closest(".heart");if(h){e.preventDefault();e.stopPropagation();toggleFav(h.dataset.h);toast(favs.has(h.dataset.h)?"Saved to favourites ♥":"Removed from favourites");return}
 const q=e.target.closest(".qa");if(q){e.preventDefault();e.stopPropagation();addCart(q.dataset.add);toast("Added to cart 🛒")}},true);
document.addEventListener("mousemove",e=>{const c=e.target.closest&&e.target.closest(".card");if(!c||!c.classList.contains("in"))return;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform=`rotateY(${x*10}deg) rotateX(${-y*10}deg) translateY(-6px)`});
document.addEventListener("mouseout",e=>{const c=e.target.closest&&e.target.closest(".card");if(c)c.style.transform=""});
addEventListener("pointermove",e=>{const g=$("#glow");g.style.left=e.clientX+"px";g.style.top=e.clientY+"px"});
addEventListener("scroll",()=>{const h=document.documentElement;$("#bar").style.width=(h.scrollTop/Math.max(1,h.scrollHeight-h.clientHeight)*100)+"%"});
const so=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;so.unobserve(e.target);const n=+e.target.dataset.n,t0=performance.now();
 const tick=t=>{const p=Math.min((t-t0)/1400,1);e.target.textContent=Math.round(n*(1-Math.pow(1-p,3)))+(n>100?"+":"");p<1&&requestAnimationFrame(tick)};requestAnimationFrame(tick)}));
document.querySelectorAll("[data-n]").forEach(el=>so.observe(el));

/* photos: local /images/<id>.jpg (auto-saved by the server) -> Wikipedia -> TheMealDB -> emoji */
const PH={};try{Object.assign(PH,JSON.parse(localStorage.getItem("ph")||"{}"))}catch{}
const keep=(k,u)=>{PH[k]=u;try{localStorage.setItem("ph",JSON.stringify(PH))}catch{}return u};
async function photoFor(t){if(PH[t])return PH[t];try{
 const j=await(await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(t.replace(/ /g,"_")))).json();
 const o=j.originalimage,h=j.thumbnail;const u=o&&o.width<=1280?o.source:h?h.source.replace(/\/\d+px-/,"/960px-"):o?o.source:"";
 return u?keep(t,u):""}catch{return ""}}
async function mealFor(t){const k="m:"+t;if(PH[k])return PH[k];try{
 const j=await(await fetch("https://www.themealdb.com/api/json/v1/1/search.php?s="+encodeURIComponent(t))).json();
 const u=j.meals&&j.meals[0]&&j.meals[0].strMealThumb||"";return u?keep(k,u):""}catch{return ""}}
async function imgFail(i){const st=+(i.dataset.s||0);i.dataset.s=st+1;let u="";
 if(st===0){u=await photoFor(i.dataset.w);if(!u){i.dataset.s=2;u=await mealFor(i.dataset.m)}}else if(st===1)u=await mealFor(i.dataset.m);
 u?i.src=u:i.remove()}
function hydrate(){}
/* cart */
let cart={};try{cart=JSON.parse(localStorage.getItem("cart")||"{}")}catch{}
function updCart(){const c=$("#cc");if(c)c.textContent=Object.values(cart).reduce((a,b)=>a+b,0)}
const saveCart=()=>{try{localStorage.setItem("cart",JSON.stringify(cart))}catch{}updCart()};
const addCart=(id,n=1)=>{cart[id]=Math.min(20,(cart[id]||0)+n);if(cart[id]<=0)delete cart[id];saveCart()};
const post=async(url,body)=>{const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j.error||"Something went wrong");return j};

/* theme, toast, back-to-top */
const setTheme=t=>{document.documentElement.dataset.theme=t;try{localStorage.setItem("theme",t)}catch{}};
let _t="dark";try{_t=localStorage.getItem("theme")||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark")}catch{}setTheme(_t);
$("#th").onclick=()=>setTheme(document.documentElement.dataset.theme==="light"?"dark":"light");
document.body.insertAdjacentHTML("beforeend",'<div id="toast" role="status"></div><button id="top" aria-label="Back to top">↑</button>');
let _tt;const toast=m=>{const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove("on"),1900)};
$("#top").onclick=()=>scrollTo({top:0,behavior:"smooth"});
addEventListener("scroll",()=>$("#top").classList.toggle("on",scrollY>700));

/* mobile menu */
$("#mb").onclick=()=>{const n=document.querySelector("nav"),o=n.classList.toggle("open");$("#mb").setAttribute("aria-expanded",o)};
document.querySelector(".links").addEventListener("click",e=>{const a=e.target.closest("a");if(!a)return;
 if(a.parentElement.classList.contains("dd")&&a===a.parentElement.firstElementChild&&innerWidth<=1180){e.preventDefault();a.parentElement.classList.toggle("open");return}
 document.querySelector("nav").classList.remove("open")});
/* star picker + remember-me */
function stars(el,val=5){el.innerHTML='<input type="hidden" name="rating" value="'+val+'">'+[1,2,3,4,5].map(n=>`<button type="button" class="st" data-n="${n}" aria-label="${n} star${n>1?"s":""}">★</button>`).join("");
 const paint=n=>{el.querySelectorAll(".st").forEach(b=>b.classList.toggle("on",+b.dataset.n<=n));el.querySelector("input").value=n};paint(val);
 el.onclick=e=>{const b=e.target.closest(".st");if(b)paint(+b.dataset.n)}}
const ME=(()=>{try{return JSON.parse(localStorage.getItem("me")||"{}")}catch{return{}}})();
function autofill(sel){const f=$(sel);if(!f)return;const K=["name","email","phone","address"];
 K.forEach(k=>{const i=f.elements[k];if(i&&!i.value&&ME[k])i.value=ME[k]});
 f.addEventListener("submit",()=>{K.forEach(k=>{const i=f.elements[k];if(i&&i.value)ME[k]=i.value});try{localStorage.setItem("me",JSON.stringify(ME))}catch{}},true)}
updCart();watch();
