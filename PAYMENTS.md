# Payments: architecture for the RM150 / RM399 checkout

Status (2 Oct 2026): **not built.** Every booking button opens WhatsApp with the message already
written. The page is ready for checkout to be switched on without a redesign; the server side
below has to exist first.

## What CHIP actually supports (read from CHIP's OpenAPI spec, 2 Oct 2026)

Source: `https://docs.chip-in.asia/openapi/chip-collect.yaml` (CHIP Collect, base
`https://gate.chip-in.asia/api/v1`, `Authorization: Bearer <secret key>`).

| Need | CHIP feature | Notes |
|---|---|---|
| Create a payment | `POST /purchases/` | Returns `checkout_url`. Takes `success_redirect`, `failure_redirect`, `success_callback`. |
| Branded / embedded card form | **Direct Post**: our own HTML form posts card fields to the purchase's `direct_post_url` | Card only. Raises PCI scope to **SAQ A-EP** (our page hosts the form, our server never sees card data). |
| FPX (online banking), DuitNow, e-wallets | Hosted `checkout_url`, optionally `?preferred=<method>` | **Always leaves our site** for the bank or wallet's own authentication. "Zero redirect" is not possible for these. |
| Confirmation (source of truth) | `success_callback` URL and/or `Webhook` (`purchase.paid` etc.) | Each callback carries `X-Signature`: base64 RSA PKCS#1 v1.5 signature of the SHA256 of the raw body. Public key from `GET /public_key/` (success callbacks) or `Webhook.public_key` (webhooks). |
| Refunds | `POST /purchases/{id}/refund/` | |

Honest wording for the site once live: "Bayar dengan kad di laman ini, atau FPX / e-dompet melalui
halaman bank anda." Never claim the whole payment stays on our page.

## Target flow

```
Visitor taps "Tempah Rawatan RM150" (data-offer="rdt-1") or "Tempah Pakej RM399" (data-offer="rdt-3")
  → (later) short booking sheet on our page: nama, telefon, online/bersemuka, keadaan ringkas
  → browser POSTs { offer, lang, booking fields } to OUR server: POST /api/checkout
  → server looks up the price itself (rdt-1 = 15000 sen, rdt-3 = 39900 sen), creates the CHIP purchase
      with success_redirect, failure_redirect, success_callback and our booking id in `reference`
  → returns { checkoutUrl }  (or a direct_post_url for the card form)
  → visitor pays (card on our page, or FPX/e-wallet at the bank)
  → CHIP calls our success_callback / webhook  ← THE ONLY thing that marks a booking paid
  → server verifies X-Signature, checks amount and reference, marks booking paid (idempotent on purchase id)
  → server sends the confirmation by WhatsApp (and email if given) and alerts the perawat on duty
  → visitor lands on success_redirect, which reads the booking status from the server
      (it shows "menunggu pengesahan" until the callback has arrived; it never trusts the redirect itself)
```

## Rules

1. **No secrets in the browser.** The CHIP secret key and brand id live only in server environment
   variables (Coolify), never in `assets/js/config.js` or any page.
2. **The browser never sends a price.** It sends an offer id; the server owns the price table.
3. **The callback is the source of truth.** A redirect to a "success" URL proves nothing; only a
   signature-verified callback for the right amount marks a booking paid. No fake success states.
4. **Idempotent.** CHIP may retry callbacks; key on the CHIP purchase id.
5. **Fallback.** If `/api/checkout` fails, the button opens WhatsApp as today (already built into
   `site.js`), so no visitor is ever stranded.

## Where the server should live (decision for Aiman)

The site itself stays static. The checkout endpoint and callback need a small server. Options:

- **Recommended: inside As-Salam Logger** (`logger.ahader.cloud`). It already records CHIP payments
  and has the person/booking model, so a paid booking lands where the team already works. Expose
  `POST /api/public/checkout` and `POST /api/public/chip-callback` with CORS limited to
  `https://dzikirassalam.com`. Remember the shared-stack rule: never export non-handlers from a
  `route.ts`.
- A separate tiny service on the same VPS: simpler isolation, but a second place where bookings live.

This is an architecture decision with payment and security weight, so it is Aiman's call before
any code is written.

## Switching it on (once the server exists)

In `assets/js/config.js`:

```js
checkout: { mode: "api", endpoint: "https://logger.ahader.cloud/api/public/checkout" }
```

`site.js` then intercepts any link with `data-offer`, POSTs `{ offer, lang }`, and follows the
returned `checkoutUrl` (https only). The booking-details sheet is the next front-end piece; it is
deliberately not built until the endpoint and its fields are agreed.

## Open questions

- Package terms for RM399: validity period, whether sessions can be shared with family,
  refund rule. Not stated anywhere yet; the page makes no claim about them.
- Who receives the "paid" alert, and the reply time the site may promise.
