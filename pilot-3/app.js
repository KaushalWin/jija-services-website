const products = [
  ['JPL510','10” Five-Compartment Sugarcane Bagasse Plate','tableware','10 in · Case 500','🍽️'],
  ['JPL310','10” Three-Compartment Sugarcane Bagasse Plate','tableware','10 in · Case 500','🍽️'],
  ['JBWL12','12 oz Sugarcane Bagasse Bowls','tableware','12 oz · Case 1,000','🥣'],
  ['JPL7','7” Round Sugarcane Bagasse Plates','tableware','7 in · Case 500','🍽️'],
  ['JPL9','9” Round Sugarcane Bagasse Plates','tableware','9 in · Case 500','🍽️'],
  ['JPL10','10” Round Sugarcane Bagasse Plates','tableware','10 in · Case 500','🍽️'],
  ['JMF24','Rectangle Container','container','24 oz · Case 150','▱'],
  ['J262TW','Food-Grade Plastic Spoons — Medium','cutlery','Case 1,000','🥄'],
  ['J286TWH','Food-Grade Plastic Spoons — Heavy Duty','cutlery','Case 1,000','🥄'],
  ['JSS600','6 × 6 × 3 in Hinged Bagasse Container','container','Case 400','▰'],
  ['JSS960','9 × 6 × 3 in Hinged Bagasse Container','container','Case 200','▰'],
  ['JSS900','9 × 9 × 3 in Hinged Bagasse Container','container','Case 200','▰'],
  ['J350-08','8 oz White Coffee Cups','cup','Plain · Case 1,000','🥤'],
  ['JPDC09','9 oz Clear Plastic Water Cups','cup','12 × 80 pack · Case 960','🥛'],
  ['JCW12','12 oz White Hot Cups','cup','Plain · Case 1,000','☕'],
  ['J261FW','Food-Grade Plastic Fork — Medium','cutlery','Case 1,000','🍴'],
  ['J285FWH','Food-Grade Plastic Fork — Heavy Duty','cutlery','Case 1,000','🍴'],
  ['JYT08','White Deli Plastic Container','container','8 oz · Case 240','🥡'],
  ['JYT16','White Deli Plastic Container','container','16 oz · Case 240','🥡'],
  ['JYT32','White Deli Plastic Container','container','32 oz · Case 240','🥡'],
  ['JMY900','Round Black Combo Container','container','7 in · 32 oz · Case 150','●'],
  ['JMY650','Round Black Combo Container','container','7 in · 24 oz · Case 150','●'],
  ['JFST-HD','Full Size Deep Aluminum Pan — Heavy Duty','tray','Case 50','▤'],
  ['JFST(S)-HD','Full Size Shallow Aluminum Pan — Heavy Duty','tray','Case 50','▤'],
  ['J2667','6-Piece Cutlery Kit — Medium White','cutlery','Case 250','🍴'],
  ['J2668','6-Piece Cutlery Kit — Heavy Duty White','cutlery','Case 250','🍴'],
  ['J9931B','1-Comp. 9 × 9 × 3 Hot & Cold Hinged Container','container','Case 150','▰'],
  ['J8831B','1-Comp. 8 × 8 × 3 Hot & Cold Hinged Container','container','Case 150','▰'],
  ['J6631','1-Comp. 6 × 6 × 3 Hot & Cold Hinged Container','container','Case 250','▰'],
  ['J962.5','1-Comp. Hinged Hot & Cold Food Container','container','Case 150','▰'],
  ['PPE','Gloves','ppe','Contact us for product details','✚'], ['PPE','Masks','ppe','Contact us for product details','✚'],
  ['PPE','Lab Coats','ppe','Contact us for product details','✚'], ['PPE','Hair Nets','ppe','Contact us for product details','✚'],
  ['PPE','Shoe Covers','ppe','Contact us for product details','✚'], ['PPE','Beard Covers','ppe','Contact us for product details','✚'],
  ['PPE','Sleeve Covers','ppe','Contact us for product details','✚']
];
const grid = document.querySelector('#product-grid');
function render(filter='all'){
  grid.innerHTML = products.filter(p=>filter==='all'||p[2]===filter).map(p=>{const imageNumber=products.indexOf(p)+1;const visual=imageNumber<=30?`<img src="assets/products/${String(imageNumber).padStart(2,'0')}.jpg" alt="${p[1]}" loading="lazy">`:'<span aria-hidden="true" style="font-size:3rem">✚</span>';return `<article class="product"><div class="product-image">${visual}</div><small>${p[0]}</small><h3>${p[1]}</h3><div class="meta">${p[3]}</div><div class="bottom"><span class="price">Request product details</span><a class="enquire" href="https://wa.me/17325358584?text=${encodeURIComponent(`Hello JIJA Services, I'm interested in ${p[0]} — ${p[1]}.`)}" target="_blank" rel="noopener">Contact us →</a></div></article>`}).join('');
}
render();
document.querySelectorAll('.filters button').forEach(button=>button.addEventListener('click',()=>{document.querySelector('.filters .active').classList.remove('active');button.classList.add('active');render(button.dataset.filter)}));
const menu=document.querySelector('.menu'), nav=document.querySelector('#nav');
menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',open)});
nav.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false')});
