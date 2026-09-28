/**
 * Construction du site ML Padel.
 *
 * Compile src/app.jsx une fois pour toutes, au lieu de laisser Babel le faire
 * dans le navigateur de chaque visiteur, puis assemble dist/ pour Vercel.
 */
import { build as esbuild } from "esbuild";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const RACINE = path.dirname(new URL(import.meta.url).pathname);
const DIST = path.join(RACINE, "dist");

/* Ce qui ne doit jamais atterrir dans le site publié. */
const EXCLUS = new Set([
  "dist", "src", "node_modules", ".git", ".github", ".vercel",
  "build.mjs", "package.json", "package-lock.json", "vercel.json",
  ".gitignore", "README.md", "BUILD.md",
]);

async function compilerApp() {
  const res = await esbuild({
    entryPoints: [path.join(RACINE, "src/app.jsx")],
    bundle: false,          // aucun import dans le source : rien à regrouper
    minify: true,
    target: ["es2018"],     // couvre Safari iOS 12+, largement au-delà du parc réunionnais
    loader: { ".jsx": "jsx" },
    jsx: "transform",       // produit React.createElement, comme Babel aujourd'hui
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
    charset: "utf8",
    legalComments: "none",
    write: false,
  });
  return res.outputFiles[0].text;
}

async function copierStatiques() {
  for (const nom of await readdir(RACINE)) {
    if (EXCLUS.has(nom) || nom === "index.html") continue;
    await cp(path.join(RACINE, nom), path.join(DIST, nom), { recursive: true });
  }
}

async function main() {
  const t0 = Date.now();
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const code = await compilerApp();
  const hash = createHash("sha256").update(code).digest("hex").slice(0, 8);
  const fichier = `app.${hash}.js`;   // le hash purge le cache à chaque changement
  await mkdir(path.join(DIST, "assets"), { recursive: true });
  await writeFile(path.join(DIST, "assets", fichier), code);

  const gabarit = await readFile(path.join(RACINE, "src/index.template.html"), "utf8");
  if (!gabarit.includes("<!--APP_SCRIPT-->")) {
    throw new Error("Marqueur <!--APP_SCRIPT--> absent du gabarit");
  }
  const html = gabarit.replace(
    "<!--APP_SCRIPT-->",
    `<script src="/assets/${fichier}"></script>`
  );
  await writeFile(path.join(DIST, "index.html"), html);

  await copierStatiques();

  const ko = (Buffer.byteLength(code) / 1024).toFixed(0);
  console.log(`✓ assets/${fichier} — ${ko} Ko compilés et minifiés`);
  console.log(`✓ dist/ prêt en ${Date.now() - t0} ms`);
}

main().catch((e) => { console.error("✗ Échec de la construction :", e.message); process.exit(1); });
