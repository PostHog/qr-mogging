# QR Mogging

Make prettier QR codes fastererer.

An internal PostHog tool: enter a web URL, choose a center image, and download
a 1080 x 1080 PNG. The color PostHog logomark is selected by default.

Live at [qr-mogging.hosthog.dev](https://qr-mogging.hosthog.dev/), with access
managed by HostHog.

## Development

The site is plain HTML, CSS, and JavaScript in `public/`. Serve that folder
with any static web server. No package install or build is required.

For the included local server, use Node.js 22.13 or newer:

```sh
npm run dev
```

Open the local URL printed by the server. Refresh after editing.

Only the automated tests need npm packages:

```sh
npm ci
npm run check
npm test
npm run build
```

`npm run build` just copies the site and license notices into `dist/` for
deployment. Upload that directory's contents to a static host.

There are no npm runtime dependencies, frameworks, bundlers, or CDN requests.
The proven `qrcode-generator` 1.4.4 encoder is vendored locally with its license;
it is still third-party code. The two dev dependencies, native canvas and jsQR,
are used only to test the generated images and are never shipped to the browser.

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

- `public/index.html`: the interface.
- `public/styles.css`: layout and PostHog styling.
- `public/app.js`: events and current preview state.
- `public/qr-code.js`: URL validation, image loading, and PNG rendering.
- `public/vendor/qrcode.js`: the QR encoder (only its module export is adapted).
- `scripts/`: dependency-free preview and deployment-copy helpers.
- `tests/`: regression and QR decoding tests.

## License

Source code is [MIT licensed](LICENSE). PostHog brand assets and third-party
components retain their own terms; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
