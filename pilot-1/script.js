const products = [
  ['JPL510','10” Five-Compartment Sugarcane Bagasse Plate','plates','10 in · Case 500'],
  ['JPL310','10” Three-Compartment Sugarcane Bagasse Plate','plates','10 in · Case 500'],
  ['JBWL12','12 oz Sugarcane Bagasse Bowl','plates','12 oz / 360 ml · Case 1,000'],
  ['JPL7','7” Round Sugarcane Bagasse Plate','plates','7 in · Case 500'],
  ['JPL9','9” Round Sugarcane Bagasse Plate','plates','9 in · Case 500'],
  ['JPL10','10” Round Sugarcane Bagasse Plate','plates','10 in · Case 500'],
  ['JMF24','24 oz Rectangular Food Container','containers','24 oz / 710 ml · Case 150'],
  ['J262TW','Food-Grade Plastic Spoons — Medium','cutlery','Case 1,000'],
  ['J286TWH','Food-Grade Plastic Spoons — Heavy Duty','cutlery','Case 1,000'],
  ['JSS600','6 × 6 × 3 in Hinged Bagasse Container','containers','Case 400'],
  ['JSS960','9 × 6 × 3 in Hinged Bagasse Container','containers','Case 200'],
  ['JSS900','9 × 9 × 3 in Hinged Bagasse Container','containers','Case 200'],
  ['J350-08','8 oz Coffee Cups — White, Plain','drinkware','Case 1,000'],
  ['JPDC09','9 oz Clear Plastic Water Cups','drinkware','12 × 80 packs · Case 960'],
  ['JCW12','12 oz Hot Cups — White, Plain','drinkware','Case 1,000'],
  ['J261FW','Food-Grade Plastic Forks — Medium','cutlery','Case 1,000'],
  ['J285FWH','Food-Grade Plastic Forks — Heavy Duty','cutlery','Case 1,000'],
  ['JYT08','White Deli Plastic Container — 8 oz','containers','Case 240'],
  ['JYT16','White Deli Plastic Container — 16 oz','containers','Case 240'],
  ['JYT32','White Deli Plastic Container — 32 oz','containers','Case 240'],
  ['JMY900','Round Black Combo Container — 7 in / 32 oz','containers','Case 150'],
  ['JMY650','Round Black Combo Container — 7 in / 24 oz','containers','Case 150'],
  ['JFST-HD','Full-Size Heavy-Duty Aluminum Pan','trays','Case 50'],
  ['JFST(S)-HD','Full-Size Shallow Heavy-Duty Aluminum Pan','trays','Case 50'],
  ['J2667','6-Piece Cutlery Kit — Medium, White','cutlery','Case 250'],
  ['J2668','6-Piece Cutlery Kit — Heavy Duty, White','cutlery','Case 250'],
  ['J9931B','1-Compartment 9 × 9 × 3 Hot & Cold Hinged Container','containers','Case 150'],
  ['J8831B','1-Compartment 8 × 8 × 3 Hot & Cold Hinged Container','containers','Case 150'],
  ['J6631','1-Compartment 6 × 6 × 3 Hot & Cold Hinged Container','containers','Case 250'],
  ['J962.5','1-Compartment Hinged Hot & Cold Food Container','containers','Case 150'],
  ['PPE','Gloves','ppe','Contact us for product details'], ['PPE','Masks','ppe','Contact us for product details'],
  ['PPE','Lab Coats','ppe','Contact us for product details'], ['PPE','Hair Nets','ppe','Contact us for product details'],
  ['PPE','Shoe Covers','ppe','Contact us for product details'], ['PPE','Beard Covers','ppe','Contact us for product details'],
  ['PPE','Sleeve Covers','ppe','Contact us for product details']
];
const grid=document.querySelector('#product-grid'), empty=document.querySelector('#empty'), search=document.querySelector('#search');
let filter='all';
function render(){const q=search.value.toLowerCase().trim();const visible=products.filter(p=>(filter==='all'||p[2]===filter)&&(`${p[0]} ${p[1]}`.toLowerCase().includes(q)));grid.innerHTML=visible.map((p)=>{const i=products.indexOf(p)+1;const visual=i<=30?`style="background-image:url('assets/products/${String(i).padStart(2,'0')}.jpg')"`:'data-ppe="true"';return `<article class="product-card"><div class="product-image" ${visual}><span class="product-code">${p[0]}</span>${i>30?'<span aria-hidden="true" style="font-size:3rem">✚</span>':''}</div><div class="product-info"><h3>${p[1]}</h3><div class="meta">${p[3]}</div><div class="price-row"><span class="ask">Request product details</span><a class="card-link" href="https://wa.me/17325358584?text=${encodeURIComponent('Hi JIJA Services, I’m interested in '+p[0]+' — '+p[1]+'.')}">Contact us →</a></div></div></article>`}).join('');empty.hidden=visible.length>0}
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelector('[data-filter].active').classList.remove('active');b.classList.add('active');filter=b.dataset.filter;render()}));search.addEventListener('input',render);
const menu=document.querySelector('.menu'), header=document.querySelector('.site-header');menu.addEventListener('click',()=>{const open=header.classList.toggle('open');menu.setAttribute('aria-expanded',open)});document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>header.classList.remove('open')));document.querySelector('#year').textContent=new Date().getFullYear();render();
