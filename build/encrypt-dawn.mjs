// Builds dawn-aerospace.html from private/dawn-aerospace.html.
//
//   DAWN_PASSWORD='...' node build/encrypt-dawn.mjs
//
// Every <img src="images/..."> in the private page is inlined as a data URI
// (from private/images-small/), then the whole page is encrypted with
// AES-256-GCM under a key derived from the password with PBKDF2-SHA256.
// The published file holds only ciphertext plus a password form; the browser
// decrypts in place with WebCrypto. No dependencies beyond Node itself.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, pbkdf2Sync, createCipheriv } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const password = process.env.DAWN_PASSWORD || process.argv[2];
if (!password) {
  console.error("Set DAWN_PASSWORD (or pass the password as the first argument).");
  process.exit(1);
}

const src = resolve(root, "private/dawn-aerospace.html");
const imgDir = resolve(root, "private/images-small");
const out = resolve(root, "dawn-aerospace.html");
const ITER = 600000;

const mime = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml" };
let inlined = 0;
const html = readFileSync(src, "utf8").replace(/src="images\/([^"]+)"/g, (_, name) => {
  const data = readFileSync(resolve(imgDir, name));
  inlined++;
  return `src="data:${mime[extname(name).toLowerCase()]};base64,${data.toString("base64")}"`;
});

const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(password, salt, ITER, 32, "sha256");
const cipher = createCipheriv("aes-256-gcm", key, iv);
const ct = Buffer.concat([cipher.update(html, "utf8"), cipher.final(), cipher.getAuthTag()]);

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Dawn Aerospace</title>
</head>
<body leftmargin="32" rightmargin="32">

<p><a href="index.html">Kahu Hutton</a></p>

<h1>Dawn Aerospace</h1>
<p>This page is encrypted. It names components and shows test results from my internship that are not public. <a href="mailto:kahuhutton.business@gmail.com">Email me</a> for the password.</p>

<form id="f">
<label>Password <input id="p" type="password" autocomplete="off" autofocus></label>
<button type="submit">Open</button>
</form>
<p id="m"></p>

<script>
var salt = "${salt.toString("base64")}", iv = "${iv.toString("base64")}", ct = "${ct.toString("base64")}";
function b64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
document.getElementById("f").addEventListener("submit", function (e) {
  e.preventDefault();
  var m = document.getElementById("m");
  m.textContent = "Decrypting...";
  var enc = new TextEncoder();
  crypto.subtle.importKey("raw", enc.encode(document.getElementById("p").value), "PBKDF2", false, ["deriveKey"])
    .then(function (k) { return crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(salt), iterations: ${ITER}, hash: "SHA-256" }, k, { name: "AES-GCM", length: 256 }, false, ["decrypt"]); })
    .then(function (k) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(iv) }, k, b64(ct)); })
    .then(function (buf) { var html = new TextDecoder().decode(buf); document.open(); document.write(html); document.close(); })
    .catch(function () { m.textContent = "Wrong password."; });
});
</script>

</body>
</html>
`;
writeFileSync(out, page);
console.log(`inlined ${inlined} images, wrote ${out} (${(page.length / 1024 / 1024).toFixed(2)} MB)`);
