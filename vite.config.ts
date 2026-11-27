import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import postcss, { type Rule } from "postcss";
import { defineConfig, type Plugin } from "vite";
import jahia from "@jahia/vite-federation-plugin";
import { MOONSTONE_SCOPE_ATTRIBUTE } from "./src/javascript/moonstoneScope.ts";

const MOONSTONE_SCOPED_CSS = createRequire(import.meta.url).resolve("@jahia/moonstone/scoped.css");
const MOONSTONE_GLOBAL_CSS = /\/@jahia\/moonstone\/dist\/legacy-global-bundle\.css$/;
const MOONSTONE_JS = /\/@jahia\/moonstone\/dist\/.*\.js$/;
// A class or keyframes name of the scoped stylesheet, such as _moonstone-TableRow_cb6f0ca.
const HASHED_NAME = /(?<![\w-])_[A-Za-z][\w-]*_[0-9a-f]{7}(?![\w-])/g;
const PREFIX = "sitehis";

const isInKeyframes = (rule: Rule): boolean =>
  rule.parent?.type === "atrule" && /keyframes$/.test((rule.parent as { name: string }).name);

// The entry of moonstone imports its global stylesheet, whose rules match every moonstone element of the page.
// The scoped stylesheet hashes its names, but an app shell with the same moonstone carries the same hashes,
// so a rule of this bundle would still reach the elements of jContent. The plugin gives the bundle the scoped
// stylesheet, and it prefixes each hashed name with sitehis in the stylesheet and in the class maps of moonstone.
// The tokens on :root apply while Site history is open, and the page sets the attribute then.
// A selector with no prefixed class would reach other pages, so the plugin drops it and warns.
const moonstoneScopedCss = (): Plugin => {
  const scopedCss = readFileSync(MOONSTONE_SCOPED_CSS, "utf8");
  const hashedNames = new Set(scopedCss.match(HASHED_NAME));
  return {
    name: "site-history:moonstone-scoped-css",
    enforce: "pre",
    load(id) {
      if (!MOONSTONE_GLOBAL_CSS.test(id.split("?")[0])) {
        return undefined;
      }
      const root = postcss.parse(scopedCss.replace(HASHED_NAME, name => `${PREFIX}${name}`));
      root.walkRules(rule => {
        if (isInKeyframes(rule)) {
          return;
        }
        const kept = rule.selectors
          .map(selector => selector.replace(/^:root(?=$|[\s,{])/, `:root[${MOONSTONE_SCOPE_ATTRIBUTE}]`))
          .filter(selector => {
            const isKept = selector.startsWith(`:root[${MOONSTONE_SCOPE_ATTRIBUTE}]`) || selector.includes(`.${PREFIX}_`);
            if (!isKept) {
              this.warn(`Dropped the moonstone selector "${selector}", which would match elements outside this module`);
            }
            return isKept;
          });
        if (kept.length === 0) {
          rule.remove();
        } else {
          rule.selectors = kept;
        }
      });
      return root.toString();
    },
    transform(code, id) {
      if (!MOONSTONE_JS.test(id.split("?")[0])) {
        return undefined;
      }
      // A class map holds a name in a string or in a template literal, such as `_moonstone-chip_80ecd79 ${r}`.
      const renamed = code.replace(HASHED_NAME, name => (hashedNames.has(name) ? `${PREFIX}${name}` : name));
      // The names keep their lines, so the source map of moonstone stays valid line by line.
      return { code: renamed, map: null };
    },
    generateBundle(_options, bundle) {
      // A source map keeps the original source of moonstone, so it holds the original names.
      for (const file of Object.values(bundle).filter(output => !output.fileName.endsWith(".map"))) {
        const text = file.type === "chunk" ? file.code : String(file.source);
        const leftover = text.match(HASHED_NAME)?.find(name => hashedNames.has(name));
        if (leftover) {
          this.error(`${file.fileName} still holds the moonstone name ${leftover}, which the app shell can carry too`);
        }
      }
    },
  };
};

export default defineConfig({
  build: {
    outDir: "./src/main/resources/javascript/apps/",
  },
  plugins: [
    moonstoneScopedCss(),
    jahia({
      exposes: {
        "./init": "./src/javascript/init.tsx",
      },
    }),
  ],
});
