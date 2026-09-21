#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..", "..");
const JS_LIKE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const PRETTIER_ONLY_EXTS = new Set([".md", ".mdx"]);

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function main() {
  let input;
  try {
    input = JSON.parse(readStdin());
  } catch {
    process.exit(0);
  }

  const filePath = input?.tool_response?.filePath ?? input?.tool_input?.file_path;
  if (!filePath) process.exit(0);

  const absPath = path.resolve(PROJECT_ROOT, filePath);
  const relPath = path.relative(PROJECT_ROOT, absPath);
  if (relPath.startsWith("..") || path.isAbsolute(relPath)) process.exit(0);

  const ext = path.extname(absPath).toLowerCase();
  if (!JS_LIKE_EXTS.has(ext) && !PRETTIER_ONLY_EXTS.has(ext)) process.exit(0);

  let eslintOutput = "";

  if (JS_LIKE_EXTS.has(ext)) {
    const eslintBin = path.join(PROJECT_ROOT, "node_modules", "eslint", "bin", "eslint.js");
    const result = spawnSync(process.execPath, [eslintBin, "--fix", absPath], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
    });
    if (!result.error) {
      eslintOutput = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    }
  }

  const prettierBin = path.join(PROJECT_ROOT, "node_modules", "prettier", "bin", "prettier.cjs");
  spawnSync(process.execPath, [prettierBin, "--write", "--ignore-unknown", absPath], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
  });

  if (eslintOutput) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `ESLint encontró problemas en ${relPath} que no pudo autocorregir:\n\n${eslintOutput}`,
        },
        suppressOutput: true,
      }),
    );
  }

  process.exit(0);
}

main();
