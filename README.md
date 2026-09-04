# QR Mogging

Make prettier QR codes fastererer.

An internal PostHog tool: enter a web URL, choose a center image, and download
a 1080 x 1080 PNG. The color PostHog logomark is selected by default.

Live at [qr-mogging.hosthog.dev](https://qr-mogging.hosthog.dev/), with access
managed by HostHog.

## Development

Requires Node.js 22.13 or newer and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by the development server.

```sh
npm run lint
npm test
npm run build
```

The production build is a static site in `dist/client`. Upload that directory's
contents to a static host. No application server is needed in production.

The UI uses React and Vinext, with a locally bundled QR encoder. It is not a
dependency-free source project. QR generation and image selection run locally
in the browser.

## Behavior

- Supports HTTP and HTTPS URLs; missing schemes default to HTTPS.
- Accepts PNG, JPEG, WebP, GIF, and SVG images up to 5 MB. GIFs become a static image.
- Keeps the selected image if a replacement cannot be decoded.
- Adjusts the center image from 10% to 30% of the QR width (22% by default).
- Larger images cover more QR data and can reduce scan reliability, even with high error correction.
- Enables Download only for a complete result matching the current URL, image, and size.
- Uses high QR error correction and a four-module clear margin.

The tests decode the actual generated PNGs, including long URLs, different logo
shapes, and overlapping renders. Test a physical scan before a large print run.

## Source layout

- `app/page.tsx`: interface and current preview state.
- `app/globals.css`: layout and PostHog styling.
- `lib/qr-code.ts`: URL validation, image loading, and PNG rendering.
- `tests/qr-code.test.mjs`: regression and QR decoding tests.

## License

Source code is [MIT licensed](LICENSE). PostHog brand assets and third-party
components retain their own terms; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
