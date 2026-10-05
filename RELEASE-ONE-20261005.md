# Release one: customer website feedback

Baseline and rollback: `a6cb5715e3f801d0683c97c0c0870fb20a50a41b`.

| Customer feedback | Implementation |
| --- | --- |
| Complete products 4–30 | `app.js`: all 182 supplied field values across 27 records; first three records retained |
| Additional specification fields | Shape, Grade, Dimensions, Closure, Design, Packaging, Pieces, Style and Temperature Use appear in details and search |
| Combo quantities/capacities | JMY900 32 oz and JMY650 24 oz, both 150 sets |
| Actual JMF24 | Existing corrected photo retained, Plastic material retained, customer Natural/White and Rectangular fields added |
| Honest PPE data | Seven existing PPE entries retain contact action; no invented official SKU, case count or certification |
| More imagery | Product imagery in hero, eco and healthcare sections and catalogue panel |
| Retail and wholesale | Prominent retail 50 / wholesale 500 (10 × 50) packaging guidance, separate SKU case quantities |
| Business audiences | Restaurants & Cafés, Caterers, Food Trucks, Grocery Stores, Hotels, Event Companies, Distributors & Wholesalers; retailers added |
| Healthcare audiences | Healthcare Facilities (pharmaceuticals and laboratories), Medical / Dental / Eye Care Clinics, Cleanroom Operations |
| Seasonal/events | Colorful archived original festival artwork with view/download and availability/pricing confirmation |
| Original card | Approved cropped card PNG/PDF copied unchanged to public brand assets; quiet product-modal card and About card |
| Catalog | Original PDF view/download retained; SHA-256 `7e2db5111edf60ef233aca42fc5976ec90a5c5d51253e0b2b54d11dc59262b17` |
| Safe deployment | Existing Wrangler automatic allowlisted `dist` build retained |
| Reviews separation | No review UI, admin routes, backend or database in release one |

## Remaining supplied-source gaps

- Original Halloween/Diwali promotional artwork and nine-compartment party plate / six-ounce bowl artwork were present only inside private WhatsApp screenshots. Those screenshots are not public assets; original files are needed before those exact images can be published.
- Official PPE product numbers, material/size/color, case quantities and clinical certifications/sterility/procedure suitability have not been supplied. Customers can request details directly.
- Retail/wholesale pack guidance does not replace individual catalog case quantities.
