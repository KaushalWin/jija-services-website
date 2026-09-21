const products = [
  ["JPL510","10\" Five-Compartment Sugarcane Bagasse Plate","Plates & Bowls","10 in · Case 500",7,"🍽️"],
  ["JPL310","10\" Three-Compartment Sugarcane Bagasse Plate","Plates & Bowls","10 in · Case 500",7,"🍽️"],
  ["JBWL12","12 oz Sugarcane Bagasse Bowl","Plates & Bowls","12 oz · Case 1,000",5,"🥣"],
  ["JPL7","7\" Round Sugarcane Bagasse Plates","Plates & Bowls","7 in · Case 500",3.5,"🍽️"],
  ["JPL9","9\" Round Sugarcane Bagasse Plates","Plates & Bowls","9 in · Case 500",6,"🍽️"],
  ["JPL10","10\" Round Sugarcane Bagasse Plates","Plates & Bowls","10 in · Case 500",6,"🍽️"],
  ["JMF24","24 oz Rectangular Container","Containers","24 oz · Case 150",8,"🥡"],
  ["J262TW","Food-Grade Plastic Spoons — Medium","Cutlery","Case 1,000",2,"🥄"],
  ["J286TWH","Food-Grade Plastic Spoons — Heavy Duty","Cutlery","Case 1,000",null,"🥄"],
  ["JSS600","6 × 6 × 3 in Hinged Bagasse Container","Containers","Case 400",null,"🥡"],
  ["JSS960","9 × 6 × 3 in Hinged Bagasse Container","Containers","Case 200",null,"🥡"],
  ["JSS900","9 × 9 × 3 in Hinged Bagasse Container","Containers","Case 200",null,"🥡"],
  ["J350-08","8 oz Coffee Cups — White Plain","Cups","Case 1,000",4,"☕"],
  ["JPDC09","9 oz Clear Plastic Water Cups","Cups","12 × 80 pack · Case 960",5,"🥤"],
  ["JCW12","12 oz Hot Cup — White Plain","Cups","Case 1,000",5,"☕"],
  ["J261FW","Food-Grade Plastic Fork — Medium","Cutlery","Case 1,000",null,"🍴"],
  ["J285FWH","Food-Grade Plastic Fork — Heavy Duty","Cutlery","Case 1,000",null,"🍴"],
  ["JYT08","Deli Plastic Container — White","Containers","8 oz · Case 240",6,"🥣"],
  ["JYT16","Deli Plastic Container — White","Containers","16 oz · Case 240",8,"🥣"],
  ["JYT32","Deli Plastic Container — White","Containers","32 oz · Case 240",null,"🥣"],
  ["JMY900","Round Black Combo Container","Containers","7 in / 32 oz · Case 150",null,"🥡"],
  ["JMY650","Round Black Combo Container","Containers","7 in / 24 oz · Case 150",null,"🥡"],
  ["JFST-HD","Full Size Aluminum Pan — Deep Heavy Duty","Trays","Case 50",5,"▱"],
  ["JFST(S)-HD","Full Size Aluminum Pan — Shallow Heavy Duty","Trays","Case 50",null,"▱"],
  ["J2667","6-Piece Cutlery Kit — Medium White","Cutlery","Case 250",null,"🍴"],
  ["J2668","6-Piece Cutlery Kit — Heavy Duty White","Cutlery","Case 250",null,"🍴"],
  ["J9931B","1 Comp. 9 × 9 × 3 Hot & Cold Hinged Container","Containers","Case 150",null,"🥡"],
  ["J8831B","1 Comp. 8 × 8 × 3 Hot & Cold Hinged Container","Containers","Case 150",null,"🥡"],
  ["J6631","1 Comp. 6 × 6 × 3 Hot & Cold Hinged Container","Containers","Case 250",null,"🥡"],
  ["J962.5","1 Comp. Hinged Hot & Cold Food Container","Containers","Case 150",null,"🥡"]
];
const catalogue=document.querySelector('#catalogue');
function render(category='All'){
  const shown=products.filter(p=>category==='All'||p[2]===category);
  document.querySelector('#result-count').textContent=`${shown.length} product${shown.length===1?'':'s'}`;
  catalogue.innerHTML=shown.map(([sku,name,cat,meta,price,icon])=>`<article class="product"><div class="product-visual"><span aria-hidden="true">${icon}</span><b class="badge">${cat}</b></div><div class="product-body"><span class="sku">${sku}</span><h3>${name}</h3><p class="meta">${meta}</p><div class="product-footer"><span class="price">${price?`From $${price.toFixed(2)}`:'Ask for price'}</span><a class="inquire" href="https://wa.me/17325358584?text=${encodeURIComponent(`Hi, I'm interested in ${sku} — ${name}.`)}" target="_blank" rel="noopener">Ask on WhatsApp →</a></div></div></article>`).join('');
}
document.querySelectorAll('.filters button').forEach(btn=>btn.addEventListener('click',()=>{document.querySelector('.filters .active').classList.remove('active');btn.classList.add('active');render(btn.dataset.category)}));
const menu=document.querySelector('.menu'),nav=document.querySelector('#nav');menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',open)});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false')}));
render();
