/**
 * Reports message keys a route tree calls but the th/en message files do not define, plus keys the
 * files define that nothing calls. next-intl throws at render time on a missing key, so a page with
 * one typo is a blank screen — this is the cheapest check that catches it before the browser does.
 *
 * Usage: bun scripts/check-i18n-keys.mjs <routeDir> <messageFileBasename> [extraNamespaceFile…]
 *   bun scripts/check-i18n-keys.mjs "app/[locale]/(admin)/admin/(backoffice)/order/purchase" page-order-purchase
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const [routeDir, messageBase, ...extras] = process.argv.slice(2);
if (!routeDir || !messageBase) {
  console.error("usage: check-i18n-keys.mjs <routeDir> <messageFileBasename> [extra…]");
  process.exit(2);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (path.endsWith(".tsx") || path.endsWith(".ts")) out.push(path);
  }
  return out;
}

function flatten(obj, prefix = "") {
  const out = new Set();
  for (const [key, value] of Object.entries(obj)) {
    const path = `${prefix}${key}`;
    if (value && typeof value === "object") {
      for (const nested of flatten(value, `${path}.`)) out.add(nested);
    } else {
      out.add(path);
    }
  }
  return out;
}

function loadKeys(basename) {
  const raw = JSON.parse(readFileSync(`messages/th/${basename}.json`, "utf8"));
  return flatten(raw);
}

const defined = new Set([...loadKeys(messageBase)]);
const ownKeys = new Set(defined);
for (const extra of extras) {
  for (const key of loadKeys(extra)) defined.add(key);
}

const used = new Set();
const dynamic = [];
for (const file of walk(routeDir)) {
  const src = readFileSync(file, "utf8");
  const namespaces = new Map();
  for (const m of src.matchAll(/const (\w+) = useTranslations\("([^"]+)"\)/g)) {
    namespaces.set(m[1], m[2]);
  }
  for (const [variable, prefix] of namespaces) {
    for (const m of src.matchAll(new RegExp(`\\b${variable}\\("([^"]+)"`, "g"))) {
      used.add(`${prefix}.${m[1]}`);
    }
    // Template keys (`status.${x}`) can only be checked by prefix, so collect them separately.
    for (const m of src.matchAll(new RegExp(`\\b${variable}\\(\`([^\`]+)\``, "g"))) {
      dynamic.push({ file, prefix, template: m[1] });
    }
  }
}

const missing = [...used].filter((key) => !defined.has(key)).sort();
const unused = [...ownKeys]
  .filter((key) => {
    if (used.has(key)) return false;
    // A key reachable through a template literal counts as used.
    return !dynamic.some(({ prefix, template }) => {
      const literal = template.slice(0, template.indexOf("${"));
      return literal && key.startsWith(`${prefix}.${literal}`);
    });
  })
  .sort();

if (missing.length) {
  console.log(`missing ${missing.length} key(s):`);
  for (const key of missing) console.log(`  ${key}`);
}
if (unused.length) {
  console.log(`\nunused ${unused.length} key(s) in ${messageBase}:`);
  for (const key of unused) console.log(`  ${key}`);
}
if (dynamic.length) {
  console.log("\ndynamic key prefixes (verify their enum values by hand):");
  const seen = new Set();
  for (const { prefix, template } of dynamic) {
    const label = `${prefix}.${template}`;
    if (!seen.has(label)) {
      seen.add(label);
      console.log(`  ${label}`);
    }
  }
}
if (!missing.length) console.log("\nno missing keys");
process.exit(missing.length ? 1 : 0);
