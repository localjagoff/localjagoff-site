# 724 And Hoodie Additions - September 20, 2026

Owner authorized website approval and collection placement for six existing Printful products in store 18032822. No provider artwork, placement, variants or prices were changed.

| Product | Public name | Collections | Garment | S-XL / 2XL / 3XL |
| --- | --- | --- | --- | --- |
| 473981186 | Crowned 724 Hoodie | 724, Hoodies | Cotton Heritage M2580 | $50 / $52 / $54 |
| 473991005 | Smoking 724 Smiley Hoodie | 724, Hoodies | Cotton Heritage M2580 | $50 / $52 / $54 |
| 473985115 | Smoking 724 Smiley Tee | 724, T-Shirts | Cotton Heritage MC1082 | $30 / $32 / $34 |
| 473987159 | 412 Snapback Smiley Hoodie | Hoodies | Cotton Heritage M2580 | $50 / $52 / $54 |
| 473987719 | 412 Smiley Hoodie | Hoodies | Cotton Heritage M2580 | $50 / $52 / $54 |
| 473990688 | Smoking 412 Smiley Hoodie | Hoodies | Cotton Heritage M2580 | $50 / $52 / $54 |

All six have Black S-3XL. Public names and individual descriptions use the existing shared merchandising layer. In particular, the provider title "412 Smiley Tee Unisex Hoodie" is presented accurately as a hoodie. Provider titles were not changed.

## Imagery And Review

Original saved Printful 800px front/back preview renders were downloaded through the normal desktop Design Maker, then flattened onto white, padded and JPEG-optimized. No regeneration, artwork edits or placement saves. Reproduce with `scripts/prepare-724-hoodie-images.cjs` and the original downloads. All artwork is complete in the reviewed mockups.

Printful reported Good resolution: Crowned 724 417 DPI; Smoking 724 hoodie 474 DPI; Smoking 724 tee 417 DPI; Snapback hoodie 477 DPI; 412 Smiley hoodie 446 DPI; Smoking 412 hoodie 515 DPI. Crowned 724 displays an outside-print-area layer warning; its full rendered artwork is intact. No placement was adjusted. Digital mockup review is not physical print proof or legal/IP clearance.

## Safety And Collections

- `/724` is a separate regional collection, linked in desktop/mobile navigation, collection tabs and footer. It includes existing Crowned 724 Tee plus the three new 724 designs.
- Explicit garment categories keep 724 hoodies out of T-Shirts while including them in both 724 and Hoodies.
- Explicit shipping classes preserve the current Standard rates and free US Standard shipping at $60 before discounts/tax/shipping.
- Existing 20-product snapshot remains available through the normal complete 26-product refresh. No manual D1 publication, freshness extension, cron change or credential change.
- Google approval list remains unchanged. New items are not released to Google. Existing ad product-set configuration is untouched.
- Production's staged snapshot path remains active. The historical bounded-loader performance benchmark retains its 20-product workload; its 24-product request bound was not expanded.

## Deployment

328 tests and production build passed. Deployed source `ca843fc`; Worker `d4b2a710-476f-4842-a217-27c1eb64038e`; build `RX_HbDUBQIf5I-YTuKx--`.

Atomic scheduled publication completed at 2026-09-20T18:47:11.731Z with source timestamp 2026-09-20T18:20:37.880Z. Live verification passed at 18:48:37.703Z: 26 products / 156 variants; previous 20 products deep-identical; all six product pages HTTP 200; all twelve optimized image bytes match local assets; Meta feed 156 offers; Google feed byte-identical at 13 product groups / 72 offers. Google SHA256: `073a29b0f67a1a3b3f093fa4fb1f973f8b0ce2918e9bec9280f7bc43e0c5c230`.

Live browser QA: 724 displays four correctly imaged styles, Hoodies eight including all five additions, T-Shirts sixteen including the new 724 tee. Mobile tee images load with no horizontal overflow; gallery changes front/back and 3XL updates $30 to $34. Hoodie gallery and S/3XL pricing $50/$54 work. One $50 hoodie shows $10 remaining to free shipping and $8.79 Standard shipping; quantity two shows $100 and FREE shipping. Test cart restored empty. No checkout, payment or order created. Meta feed health is verified, not a claim of completed Meta ingestion or mobile Shop rendering. Ads and Google configuration were untouched.
