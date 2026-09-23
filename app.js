const products = [
 {sku:"JPL510",name:'10" Five-Compartment Sugarcane Bagasse Plate',category:"Plates & Bowls",spec:"10 in · Case 500",use:"Multiple-item meals, catering and events"},
 {sku:"JPL310",name:'10" Three-Compartment Sugarcane Bagasse Plate',category:"Plates & Bowls",spec:"10 in · Case 500",use:"Portioned meals, catering and takeout"},
 {sku:"JBWL12",name:"12 oz Sugarcane Bagasse Bowl",category:"Plates & Bowls",spec:"12 oz (360 ml) · Case 1,000",use:"Soups, sides and desserts"},
 {sku:"JPL7",name:'7" Round Sugarcane Bagasse Plates',category:"Plates & Bowls",spec:"7 in · Case 500",use:"Snacks, desserts and light servings"},
 {sku:"JPL9",name:'9" Round Sugarcane Bagasse Plates',category:"Plates & Bowls",spec:"9 in · Case 500",use:"Everyday meals and events"},
 {sku:"JPL10",name:'10" Round Sugarcane Bagasse Plates',category:"Plates & Bowls",spec:"10 in · Case 500",use:"Full meals, catering and gatherings"},
 {sku:"JMF24",name:"24 oz Rectangular Container",category:"Containers",spec:"24 oz (710 ml) · Case 150",use:"Prepared food, takeaway and meal service"},
 {sku:"J262TW",name:"Food-Grade Plastic Spoons — Medium",category:"Cutlery",spec:"Case 1,000",use:"Everyday food service and events"},
 {sku:"J286TWH",name:"Food-Grade Plastic Spoons — Heavy Duty",category:"Cutlery",spec:"Case 1,000",use:"Catering, takeout and heavier foods"},
 {sku:"JSS600",name:"6 × 6 × 3 in Hinged Bagasse Container",category:"Containers",spec:"Case 400",use:"Compact takeout portions and sides"},
 {sku:"JSS960",name:"9 × 6 × 3 in Hinged Bagasse Container",category:"Containers",spec:"Case 200",use:"Takeout meals and food service"},
 {sku:"JSS900",name:"9 × 9 × 3 in Hinged Bagasse Container",category:"Containers",spec:"Case 200",use:"Full takeout meals and catering"},
 {sku:"J350-08",name:"8 oz Coffee Cups — White Plain",category:"Cups",spec:"Case 1,000",use:"Coffee, tea and hot drinks"},
 {sku:"JPDC09",name:"9 oz Clear Plastic Water Cups",category:"Cups",spec:"12 × 80 pack · Case 960",use:"Cold drinks, offices and events"},
 {sku:"JCW12",name:"12 oz Hot Cup — White Plain",category:"Cups",spec:"Case 1,000",use:"Coffee, tea and hot drinks"},
 {sku:"J261FW",name:"Food-Grade Plastic Fork — Medium",category:"Cutlery",spec:"Case 1,000",use:"Everyday food service and events"},
 {sku:"J285FWH",name:"Food-Grade Plastic Fork — Heavy Duty",category:"Cutlery",spec:"Case 1,000",use:"Catering, takeout and heavier foods"},
 {sku:"JYT08",name:"Deli Plastic Container — White",category:"Containers",spec:"8 oz · Case 240",use:"Deli sides, prepared foods and storage"},
 {sku:"JYT16",name:"Deli Plastic Container — White",category:"Containers",spec:"16 oz · Case 240",use:"Deli foods, takeout and storage"},
 {sku:"JYT32",name:"Deli Plastic Container — White",category:"Containers",spec:"32 oz · Case 240",use:"Larger deli portions and prepared foods"},
 {sku:"JMY900",name:"Round Black Combo Container",category:"Containers",spec:"7 in / 32 oz · Case 150",use:"Meal prep, takeout and presentation"},
 {sku:"JMY650",name:"Round Black Combo Container",category:"Containers",spec:"7 in / 24 oz · Case 150",use:"Meal prep, takeout and presentation"},
 {sku:"JFST-HD",name:"Full Size Aluminum Pan — Deep Heavy Duty",category:"Trays",spec:"Case 50",use:"Catering, baking and bulk food service"},
 {sku:"JFST(S)-HD",name:"Full Size Aluminum Pan — Shallow Heavy Duty",category:"Trays",spec:"Case 50",use:"Catering, warming and food service"},
 {sku:"J2667",name:"6-Piece Cutlery Kit — Medium White",category:"Cutlery",spec:"Case 250",use:"Takeout, catering and packed meals"},
 {sku:"J2668",name:"6-Piece Cutlery Kit — Heavy Duty White",category:"Cutlery",spec:"Case 250",use:"Takeout, catering and packed meals"},
 {sku:"J9931B",name:"1 Comp. 9 × 9 × 3 Hot & Cold Hinged Container",category:"Containers",spec:"Case 150",use:"Full-size takeout meals"},
 {sku:"J8831B",name:"1 Comp. 8 × 8 × 3 Hot & Cold Hinged Container",category:"Containers",spec:"Case 150",use:"Takeout meals and prepared foods"},
 {sku:"J6631",name:"1 Comp. 6 × 6 × 3 Hot & Cold Hinged Container",category:"Containers",spec:"Case 250",use:"Compact takeout portions and sides"},
 {sku:"J962.5",name:"1 Comp. Hinged Hot & Cold Food Container",category:"Containers",spec:"Case 150",use:"Takeout and hot or cold food service"},
 {sku:"PPE-GLV",name:"Nitrile Gloves",category:"PPE & Cleanroom",spec:"Contact us for sizes and availability",use:"Food handling, cleaning and general workplace use",image:"assets/ppe/nitrile-gloves.png"},
 {sku:"PPE-MSK",name:"Disposable Masks",category:"PPE & Cleanroom",spec:"Contact us for product details",use:"Everyday workplace and hygiene needs",image:"assets/ppe/masks.png"},
 {sku:"PPE-LBC",name:"Disposable Lab Coats",category:"PPE & Cleanroom",spec:"Contact us for sizes and availability",use:"Clean work areas and general protective wear",image:"assets/ppe/lab-coat.png"},
 {sku:"PPE-HNT",name:"Disposable Hair Nets",category:"PPE & Cleanroom",spec:"Contact us for product details",use:"Food service, production and clean work areas",image:"assets/ppe/hair-nets.png"},
 {sku:"PPE-SHC",name:"Disposable Shoe Covers",category:"PPE & Cleanroom",spec:"Contact us for product details",use:"Clean work areas and visitor protection",image:"assets/ppe/shoe-covers.png"},
 {sku:"PPE-BRD",name:"Disposable Beard Covers",category:"PPE & Cleanroom",spec:"Contact us for product details",use:"Food service, production and clean work areas",image:"assets/ppe/beard-covers.png"},
 {sku:"PPE-SLV",name:"Disposable Sleeve Covers",category:"PPE & Cleanroom",spec:"Contact us for product details",use:"Food handling and clean work areas",image:"assets/ppe/sleeve-covers.png"}
].map((p,i)=>({...p,image:p.image||`assets/products/${String(i+1).padStart(2,"0")}.jpg`}));

const catalogue=document.querySelector("#catalogue"), count=document.querySelector("#result-count"), search=document.querySelector("#search"), dialog=document.querySelector("#product-dialog"), dialogContent=document.querySelector("#dialog-content");
let selectedCategory="All";
const escapeHtml=value=>String(value).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);
function filtered(){const q=search.value.trim().toLowerCase();return products.filter(p=>(selectedCategory==="All"||p.category===selectedCategory)&&(!q||`${p.sku} ${p.name} ${p.category} ${p.spec} ${p.use}`.toLowerCase().includes(q)))}
function render(){const shown=filtered();count.textContent=`${shown.length} product${shown.length===1?"":"s"}`;catalogue.innerHTML=shown.length?shown.map(p=>`<article class="product"><button class="product-open" data-sku="${escapeHtml(p.sku)}" aria-label="View details for ${escapeHtml(p.name)}"><div class="product-visual"><img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" width="500" height="500"><b class="badge">${escapeHtml(p.category)}</b></div><div class="product-body"><span class="sku">${escapeHtml(p.sku)}</span><h3>${escapeHtml(p.name)}</h3><p class="meta">${escapeHtml(p.spec)}</p><p class="use">${escapeHtml(p.use)}</p><span class="detail-link">View details →</span></div></button></article>`).join(""):`<p class="empty">No products match your search. Try another term or <a href="#contact">contact us</a>.</p>`}
function openProduct(sku){const p=products.find(x=>x.sku===sku);if(!p)return;const message=encodeURIComponent(`Hi, I'm interested in ${p.sku} — ${p.name}. Please share availability and details.`);dialogContent.innerHTML=`<div class="dialog-grid"><img src="${p.image}" alt="${escapeHtml(p.name)}"><div><span class="sku">${escapeHtml(p.sku)} · ${escapeHtml(p.category)}</span><h2 id="dialog-title">${escapeHtml(p.name)}</h2><dl><div><dt>Product details</dt><dd>${escapeHtml(p.spec)}</dd></div><div><dt>Common use</dt><dd>${escapeHtml(p.use)}</dd></div></dl><p>Contact JIJA Services for availability, options and current pricing.</p><a class="button primary" href="https://wa.me/17325358584?text=${message}" target="_blank" rel="noopener">Ask on WhatsApp ↗</a></div></div>`;dialog.showModal();document.body.classList.add("no-scroll")}
document.querySelectorAll(".filters button").forEach(btn=>btn.addEventListener("click",()=>{document.querySelector(".filters .active").classList.remove("active");btn.classList.add("active");selectedCategory=btn.dataset.category;render()}));
search.addEventListener("input",render);catalogue.addEventListener("click",e=>{const button=e.target.closest(".product-open");if(button)openProduct(button.dataset.sku)});document.querySelector(".dialog-close").addEventListener("click",()=>dialog.close());dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});dialog.addEventListener("close",()=>document.body.classList.remove("no-scroll"));
const menu=document.querySelector(".menu"),nav=document.querySelector("#nav");menu.addEventListener("click",()=>{const open=nav.classList.toggle("open");menu.setAttribute("aria-expanded",open)});nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("open");menu.setAttribute("aria-expanded","false")}));render();
