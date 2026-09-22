# S&K Register

Offline merchandise till for the S&K gas station counter in Pangasinan. It rings snacks, drinks, cigarettes, oil, and load — not the fuel pumps. Prices are in pesos. No account and no monthly fee.

Open it on the iPad or phone:

https://jcm85.github.io/sk-register/

In Safari: Share → Add to Home Screen. Open the icon once while you have signal. After that it still works when the connection drops. Sales stay on that device.

## Ring a sale

1. Set **Dami** if they bought more than one, then tap the product. Use + or − on the cart to fix a line.
2. Tap **Cash**, **GCash**, or **Other**. On a phone, tap the **Bayad** bar first so the tender sheet opens.
3. Enter **Bayad** (money received). Tap **Sakto** when the payment is exact. Read **Sukli** before you hand change back.
4. Tap **SAVE SALE · I-SAVE**. The **Resibo #** is on the receipt and under **Resibo**.

## After the sale

- **Resibo** — the journal. Void a receipt if you rang it by mistake. Stock goes back.
- **Close** — that day’s total split into Cash and GCash. Type the opening float and the cash you counted. Expected cash is the float plus cash sales. GCash is not in the drawer.
- **Stock** — what is left. **KULANG** means on hand is at or below the reorder number. Tap + when a delivery comes in.
- **Catalog** — change **Presyo** or add a real item. Practice rows are marked **SAMPLE**. Tap **Mark real** when that price is the one you charge.

## Backup

Backup → **Export JSON**, then put the file in the Google Drive folder **S&K Register**.

To restore this iPad, choose **Import backup** and pick that file.

Two devices do not share one book. Export and import when you want a copy on another phone.

## Publish

GitHub Pages already publishes branch `main`, folder `/ (root)`. Push to `main` and wait for the Pages build. The site is static HTML, CSS, and JavaScript, so it loads at https://jcm85.github.io/sk-register/ with no build step.

The old Actions deploy workflow was removed. Pages is set to deploy from the branch, and that workflow could not publish while the source stayed on the branch.
