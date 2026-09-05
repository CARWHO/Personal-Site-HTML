# Build

The site is plain HTML and needs no build. Two helper scripts:

- `shrink-images.py SRC DST` downscales images (max 1200 px wide, JPEG). Run
  once when adding images.
- `encrypt-dawn.mjs` produces `dawn-aerospace.html` from
  `private/dawn-aerospace.html`, inlining the images in
  `private/images-small/` and encrypting the page with AES-256-GCM:

      DAWN_PASSWORD='the password' node build/encrypt-dawn.mjs

`private/` is gitignored. The plaintext page, the Dawn images, and the
password never go in the repo. Only the encrypted output at the repo root does.
