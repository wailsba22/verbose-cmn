# Stock (DZ) – stock & sales manager for small shops

Next.js 14 + MongoDB (Mongoose). Prices in DA.

## Run
1. `npm install`
2. `cp .env.example .env.local` and set `MONGODB_URI` (local MongoDB or Atlas)
3. `npm run dev` → http://localhost:3000

Camera scanning needs HTTPS or localhost. To test on a phone, deploy (e.g. Vercel + Atlas)
or run `npx next dev --experimental-https`.
USB barcode scanners also work: click the search bar on the sale screen and scan.

## Screens
- `/` Sale: camera, search, cart, total. Center button = Save (elsewhere = back to Sale)
- `/inventory` list + search + scan, `/inventory/[id]` edit
- `/add` add product (up to 3 barcodes, duplicate warning, auto barcode)
- `/analytics` Monthly · Daily · Out of stock · Best sellers
- `/sales` Sales log (edit / delete, stock adjusts automatically)
