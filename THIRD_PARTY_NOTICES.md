# Third-party notices

## PostHog brand assets

The PostHog logos and RoundHog fonts in `public/` are PostHog brand assets. They
are excluded from this repository's MIT source-code license. PostHog retains
the relevant copyrights and trademark rights.

RoundHog regular and semibold were obtained from PostHog's website. Refer to
the [PostHog website license](https://github.com/PostHog/posthog.com/blob/master/LICENSE)
for the original asset terms. The MIT license does not grant rights to use the
PostHog name, logos, or fonts outside their permitted use.

## QR encoder and icons

`public/vendor/qrcode.js` is qrcode-generator 1.4.4 by Kazuhiko Arase,
licensed under MIT. Its AMD/CommonJS export wrapper was replaced with an ES
module export; the encoder itself is unchanged.

Copyright (c) 2009 Kazuhiko Arase

The inline link icon is derived from Feather, via Lucide, under MIT.

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

The inline interface icons are from Lucide 1.31.0, under the ISC license:

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

## Test-only package dependencies

`@napi-rs/canvas` and `jsqr` retain their own licenses, distributed in their
npm packages. Neither is shipped to the browser.
