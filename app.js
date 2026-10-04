const products = [
  { id:"JPL510", sku:"JPL510", name:'10-inch Five-Compartment Sugarcane Bagasse Plate', category:"Plates & Bowls", material:"Sugarcane Bagasse", size:"10 inches", color:"Natural/White", caseQuantity:"500 plates", compartments:"5", suitableUse:"Hot & cold foods" },
  { id:"JPL310", sku:"JPL310", name:'10-inch Three-Compartment Sugarcane Bagasse Plate', category:"Plates & Bowls", material:"Sugarcane Bagasse", size:"10 inches", color:"Natural/White", caseQuantity:"500 plates", compartments:"3", suitableUse:"Hot & cold foods" },
  { id:"JBWL12", sku:"JBWL12", name:"12 oz Sugarcane Bagasse Bowl", category:"Plates & Bowls", material:"Sugarcane Bagasse", capacity:"12 oz (360 ml)", color:"Natural/White", caseQuantity:"1,000 bowls", suitableUse:"Hot & cold foods" },
  { id:"JPL7", sku:"JPL7", name:'7-inch Round Sugarcane Bagasse Plate', category:"Plates & Bowls", material:"Sugarcane Bagasse", size:"7 inches", color:"Natural/White", caseQuantity:"500 plates" },
  { id:"JPL9", sku:"JPL9", name:'9-inch Round Sugarcane Bagasse Plate', category:"Plates & Bowls", material:"Sugarcane Bagasse", size:"9 inches", caseQuantity:"500 plates" },
  { id:"JPL10", sku:"JPL10", name:'10-inch Round Sugarcane Bagasse Plate', category:"Plates & Bowls", material:"Sugarcane Bagasse", size:"10 inches", caseQuantity:"500 plates" },
  { id:"JMF24", sku:"JMF24", name:"24 oz Rectangular Plastic Container", category:"Containers", material:"Plastic", capacity:"24 oz (710 ml)", caseQuantity:"150 containers" },
  { id:"J262TW", sku:"J262TW", name:"Food-Grade Plastic Spoon — Medium", category:"Cutlery", material:"Food-Grade Plastic", caseQuantity:"1,000 spoons" },
  { id:"J286TWH", sku:"J286TWH", name:"Food-Grade Plastic Spoon — Heavy Duty", category:"Cutlery", material:"Food-Grade Plastic", caseQuantity:"1,000 spoons" },
  { id:"JSS600", sku:"JSS600", name:"6 × 6 × 3-inch Hinged Sugarcane Bagasse Container", category:"Containers", material:"Sugarcane Bagasse", size:"6 × 6 × 3 inches", caseQuantity:"400 containers" },
  { id:"JSS960", sku:"JSS960", name:"9 × 6 × 3-inch Hinged Sugarcane Bagasse Container", category:"Containers", material:"Sugarcane Bagasse", size:"9 × 6 × 3 inches", caseQuantity:"200 containers" },
  { id:"JSS900", sku:"JSS900", name:"9 × 9 × 3-inch Hinged Sugarcane Bagasse Container", category:"Containers", material:"Sugarcane Bagasse", size:"9 × 9 × 3 inches", caseQuantity:"200 containers" },
  { id:"J350-08", sku:"J350-08", name:"8 oz Coffee Cups — White Plain", category:"Cups", capacity:"8 oz", color:"White", caseQuantity:"1,000 cups" },
  { id:"JPDC09", sku:"JPDC09", name:"9 oz Clear Plastic Water Cups", category:"Cups", material:"Plastic", capacity:"9 oz", color:"Clear", caseQuantity:"960 cups (12 × 80 packs)" },
  { id:"JCW12", sku:"JCW12", name:"12 oz Hot Cup — White Plain", category:"Cups", capacity:"12 oz", color:"White", caseQuantity:"1,000 cups" },
  { id:"J261FW", sku:"J261FW", name:"Food-Grade Plastic Fork — Medium", category:"Cutlery", material:"Food-Grade Plastic", caseQuantity:"1,000 forks" },
  { id:"J285FWH", sku:"J285FWH", name:"Food-Grade Plastic Fork — Heavy Duty", category:"Cutlery", material:"Food-Grade Plastic", caseQuantity:"1,000 forks" },
  { id:"JYT08", sku:"JYT08", name:"Deli Plastic Container — White", category:"Containers", material:"Plastic", capacity:"8 oz", color:"White", caseQuantity:"240 containers" },
  { id:"JYT16", sku:"JYT16", name:"Deli Plastic Container — White", category:"Containers", material:"Plastic", capacity:"16 oz", color:"White", caseQuantity:"240 containers" },
  { id:"JYT32", sku:"JYT32", name:"Deli Plastic Container — White", category:"Containers", material:"Plastic", capacity:"32 oz", color:"White", caseQuantity:"240 containers" },
  { id:"JMY900", sku:"JMY900", name:"Round Black Combo Container", category:"Containers", size:"7 inches", capacity:"32 oz", color:"Black", caseQuantity:"150 containers" },
  { id:"JMY650", sku:"JMY650", name:"Round Black Combo Container", category:"Containers", size:"7 inches", capacity:"24 oz", color:"Black", caseQuantity:"150 containers" },
  { id:"JFST-HD", sku:"JFST-HD", name:"Full-Size Aluminum Pan — Deep Heavy Duty", category:"Trays", material:"Aluminum", size:"Full size, deep", caseQuantity:"50 pans" },
  { id:"JFST(S)-HD", sku:"JFST(S)-HD", name:"Full-Size Aluminum Pan — Shallow Heavy Duty", category:"Trays", material:"Aluminum", size:"Full size, shallow", caseQuantity:"50 pans" },
  { id:"J2667", sku:"J2667", name:"6-Piece Cutlery Kit — Medium White", category:"Cutlery", color:"White", caseQuantity:"250 kits" },
  { id:"J2668", sku:"J2668", name:"6-Piece Cutlery Kit — Heavy Duty White", category:"Cutlery", color:"White", caseQuantity:"250 kits" },
  { id:"J9931B", sku:"J9931B", name:"1-Compartment 9 × 9 × 3-inch Hinged Container", category:"Containers", size:"9 × 9 × 3 inches", caseQuantity:"150 containers", compartments:"1", suitableUse:"Hot & cold food service" },
  { id:"J8831B", sku:"J8831B", name:"1-Compartment 8 × 8 × 3-inch Hinged Container", category:"Containers", size:"8 × 8 × 3 inches", caseQuantity:"150 containers", compartments:"1", suitableUse:"Hot & cold food service" },
  { id:"J6631", sku:"J6631", name:"1-Compartment 6 × 6 × 3-inch Hinged Container", category:"Containers", size:"6 × 6 × 3 inches", caseQuantity:"250 containers", compartments:"1", suitableUse:"Hot & cold food service" },
  { id:"J962.5", sku:"J962.5", name:"1-Compartment Hinged Container", category:"Containers", caseQuantity:"150 containers", compartments:"1", suitableUse:"Hot & cold food service" },
  { id:"ppe-gloves", name:"Nitrile Gloves", category:"PPE & Cleanroom", image:"assets/ppe/nitrile-gloves.webp" },
  { id:"ppe-masks", name:"Disposable Masks", category:"PPE & Cleanroom", image:"assets/ppe/masks.webp" },
  { id:"ppe-lab-coats", name:"Disposable Lab Coats", category:"PPE & Cleanroom", image:"assets/ppe/lab-coat.webp" },
  { id:"ppe-hair-nets", name:"Disposable Hair Nets", category:"PPE & Cleanroom", image:"assets/ppe/hair-nets.webp" },
  { id:"ppe-shoe-covers", name:"Disposable Shoe Covers", category:"PPE & Cleanroom", image:"assets/ppe/shoe-covers.webp" },
  { id:"ppe-beard-covers", name:"Disposable Beard Covers", category:"PPE & Cleanroom", image:"assets/ppe/beard-covers.webp" },
  { id:"ppe-sleeve-covers", name:"Disposable Sleeve Covers", category:"PPE & Cleanroom", image:"assets/ppe/sleeve-covers.webp" }
].map((product,index)=>({ ...product, image:product.image||`assets/products/${String(index+1).padStart(2,"0")}.jpg` }));

const catalogue=document.querySelector("#catalogue");
const count=document.querySelector("#result-count");
const search=document.querySelector("#search");
const dialog=document.querySelector("#product-dialog");
const dialogContent=document.querySelector("#dialog-content");
let selectedCategory="All";
let lastFocused=null;
let hasInteracted=false;

const escapeHtml=value=>String(value).replace(/[&<>'"]/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[character]);
const confirmedFields=[
  ["Material","material"],
  ["Size","size"],
  ["Capacity","capacity"],
  ["Color","color"],
  ["Case quantity","caseQuantity"],
  ["Compartments","compartments"],
  ["Suitable use","suitableUse"],
  ["SKU / product number","sku"]
];

function productSearchText(product){
  return [product.sku,product.name,product.category,...confirmedFields.map(([,key])=>product[key])].filter(Boolean).join(" ").toLowerCase();
}

function filtered(){
  const query=search.value.trim().toLowerCase();
  return products.filter(product=>(selectedCategory==="All"||product.category===selectedCategory)&&(!query||productSearchText(product).includes(query)));
}

function cardSummary(product){
  return [product.size,product.capacity,product.caseQuantity].filter(Boolean).join(" · ")||"Details available on request";
}

function render(){
  const shown=filtered();
  count.textContent=`${shown.length} product${shown.length===1?"":"s"}`;
  count.setAttribute("aria-live",hasInteracted?"polite":"off");
  catalogue.innerHTML=shown.length?shown.map(product=>`<article class="product"><button class="product-open" data-id="${escapeHtml(product.id)}" aria-label="View details for ${escapeHtml(product.name)}"><div class="product-visual"><img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" width="900" height="900"><b class="badge">${escapeHtml(product.category)}</b></div><div class="product-body">${product.sku?`<span class="sku">${escapeHtml(product.sku)}</span>`:""}<h3>${escapeHtml(product.name)}</h3><p class="meta">${escapeHtml(cardSummary(product))}</p><span class="detail-link">View specifications →</span></div></button></article>`).join(""):`<p class="empty">No products match your search. Try another term or <a href="#contact">contact us</a>.</p>`;
}

function openProduct(id){
  const product=products.find(item=>item.id===id);
  if(!product)return;
  lastFocused=document.activeElement;
  const rows=confirmedFields.filter(([,key])=>product[key]).map(([label,key])=>`<div><dt>${label}</dt><dd>${escapeHtml(product[key])}</dd></div>`).join("");
  const reference=product.sku?`${product.sku} · ${product.category}`:product.category;
  const message=encodeURIComponent(`Hi, I'm interested in ${product.name}${product.sku?` (${product.sku})`:""}. Please share availability and details.`);
  const specificationNote=rows
    ? `<p class="confirmation-note">Need another product detail? Contact us to confirm specifications for your order.</p>`
    : `<p class="confirmation-note">Material, size, quantity and product number are available on request. Contact us to confirm specifications for your order.</p>`;
  dialogContent.innerHTML=`<div class="dialog-grid"><img src="${product.image}" alt="${escapeHtml(product.name)}" width="900" height="900"><div><span class="sku">${escapeHtml(reference)}</span><h2 id="dialog-title">${escapeHtml(product.name)}</h2>${rows?`<dl>${rows}</dl>`:""}${specificationNote}<p>Contact JIJA Services for availability, options and current pricing.</p><a class="button primary" href="https://wa.me/17325358584?text=${message}" target="_blank" rel="noopener">Ask on WhatsApp ↗</a></div></div>`;
  dialog.showModal();
  document.body.classList.add("no-scroll");
  document.querySelector(".dialog-close").focus();
}

document.querySelectorAll(".filters button").forEach(button=>button.addEventListener("click",()=>{
  document.querySelectorAll(".filters button").forEach(item=>{
    item.classList.toggle("active",item===button);
    item.setAttribute("aria-pressed",String(item===button));
  });
  selectedCategory=button.dataset.category;
  hasInteracted=true;
  render();
}));

search.addEventListener("input",()=>{hasInteracted=true;render()});
catalogue.addEventListener("click",event=>{const button=event.target.closest(".product-open");if(button)openProduct(button.dataset.id)});
document.querySelector(".dialog-close").addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close()});
dialog.addEventListener("cancel",event=>{event.preventDefault();dialog.close()});
dialog.addEventListener("close",()=>{document.body.classList.remove("no-scroll");if(lastFocused?.isConnected)lastFocused.focus()});
dialog.addEventListener("keydown",event=>{
  if(event.key!=="Tab")return;
  const focusable=[...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])')];
  if(!focusable.length)return;
  const first=focusable[0];
  const last=focusable.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
});

const menu=document.querySelector(".menu");
const nav=document.querySelector("#nav");
function setMenu(open,{returnFocus=false}={}){
  nav.classList.toggle("open",open);
  menu.setAttribute("aria-expanded",String(open));
  if(open)nav.querySelector("a").focus();
  else if(returnFocus)menu.focus();
}
menu.addEventListener("click",()=>setMenu(!nav.classList.contains("open")));
nav.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>setMenu(false)));
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&nav.classList.contains("open"))setMenu(false,{returnFocus:true})});
document.addEventListener("click",event=>{if(nav.classList.contains("open")&&!nav.contains(event.target)&&event.target!==menu)setMenu(false)});
window.addEventListener("resize",()=>{if(window.innerWidth>900&&nav.classList.contains("open"))setMenu(false)});
render();
