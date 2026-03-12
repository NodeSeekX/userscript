import { defineConfig } from "vite";
import fs from "node:fs";

function userscriptBannerPlugin() {
  const VIRTUAL_ID = "\0virtual:userscript-banner";
  let banner = "";
  const META_FILE = "src/meta.user.js";
  const USER_SCRIPT_RE = /\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==/;

  return {
    name: "userscript-banner",
    enforce: "pre",

    buildStart() {
      try {
        const raw = fs.readFileSync(META_FILE, "utf8");
        const m = raw.match(USER_SCRIPT_RE);
        banner = (m ? m[0] : raw).trimEnd() + "\n\n";
      } catch (e) {
        banner = "";
      }
    },

    resolveId(id) {
      if (id === "virtual:userscript-banner") return VIRTUAL_ID;
    },

    load(id) {
      if (id === VIRTUAL_ID) return banner;
    },

    generateBundle(_, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === "chunk" && file.isEntry) {
          file.code = banner + file.code.replace(banner, "");
        }
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const isMin = mode === "min";

  return {
    build: {
      target: "esnext",
      sourcemap: false,
      minify: isMin ? "esbuild" : false,
      emptyOutDir: !isMin,  // min 模式不清空，保留未压缩版本
      modulePreload: false,
      rollupOptions: {
        input: "src/entry.user.js",
        output: {
          format: "iife",
          entryFileNames: isMin ? "NodeSeekX.min.user.js" : "NodeSeekX.user.js",
          inlineDynamicImports: true
        }
      }
    },
    plugins: [userscriptBannerPlugin()]
  };
});
