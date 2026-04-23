#!/usr/bin/env node

const fs = require("fs").promises;
const path = require("path");

const ROOT = process.cwd();
const WIKI_DIR = path.join(ROOT, "wiki");
const RAW_DIR = path.join(WIKI_DIR, "raw");
const PAGES_DIR = path.join(WIKI_DIR, "pages");
const INDEX_FILE = path.join(WIKI_DIR, "index.md");
const LOG_FILE = path.join(WIKI_DIR, "log.md");
const AGENTS_FILE = path.join(WIKI_DIR, "AGENTS.md");

function nowDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowTimestamp() {
  return new Date().toISOString();
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function ensureFile(filePath, content) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, content, "utf8");
  }
}

async function appendLog(kind, title, details) {
  const safeDetails = details || "";
  const header = `## [${nowDate()}] ${kind} | ${title}`;
  const body = safeDetails ? `\n${safeDetails.trim()}\n` : "\n";
  await fs.appendFile(LOG_FILE, `${header}${body}\n`, "utf8");
}

async function initWiki() {
  await ensureDir(WIKI_DIR);
  await ensureDir(RAW_DIR);
  await ensureDir(PAGES_DIR);

  await ensureFile(
    AGENTS_FILE,
    `# Wiki Maintainer Rules

You are maintaining this wiki for long-term, cumulative knowledge.

## Directories
- \`raw/\` contains immutable source material.
- \`pages/\` contains LLM-maintained wiki pages.
- \`index.md\` catalogs all pages and summaries.
- \`log.md\` is append-only and chronological.

## Ingest workflow
1. Read source(s) in \`raw/\`.
2. Create or update relevant pages in \`pages/\`.
3. Update \`index.md\` so pages remain discoverable.
4. Add a new entry in \`log.md\` with what changed.

## Query workflow
1. Read \`index.md\` first.
2. Open relevant pages from \`pages/\`.
3. Synthesize an answer with citations.
4. If useful, save output as a new page and update \`index.md\` and \`log.md\`.

## Lint workflow
Check for stale claims, contradictions, orphan pages, and missing cross-links.
`
  );

  await ensureFile(
    INDEX_FILE,
    `# Wiki Index

## Core
- [Wiki Home](pages/wiki-home.md) - High-level overview and current synthesis.

## Sources
- Add source summaries here as they are ingested.

## Entities / Concepts
- Add topic pages here as they are created.
`
  );

  await ensureFile(
    path.join(PAGES_DIR, "wiki-home.md"),
    `# Wiki Home

This wiki is maintained incrementally by an LLM.

## Current focus
- Add your current research focus here.

## Open questions
- Add high-value questions here.
`
  );

  await ensureFile(
    path.join(RAW_DIR, "README.md"),
    `# Raw Sources

Drop immutable source files here. The LLM reads from this folder but does not edit source files.
`
  );

  await ensureFile(
    LOG_FILE,
    `# Wiki Log

## [${nowDate()}] init | wiki scaffold
Created wiki scaffold with raw sources nested under wiki/.
`
  );
}

async function ingestSource(sourceArg) {
  if (!sourceArg) {
    console.error("Usage: npm run wiki:ingest -- <path-to-source-file>");
    process.exit(1);
  }

  const sourcePath = path.resolve(ROOT, sourceArg);
  const sourceName = path.basename(sourcePath);
  const destination = path.join(RAW_DIR, sourceName);

  await fs.copyFile(sourcePath, destination);
  await appendLog(
    "ingest",
    sourceName,
    `- copied source to \`raw/${sourceName}\`\n- timestamp: ${nowTimestamp()}`
  );

  console.log(`Ingested source: ${destination}`);
}

async function queryWiki(args) {
  const question = args.join(" ").trim();
  if (!question) {
    console.error("Usage: npm run wiki:query -- <your question>");
    process.exit(1);
  }

  await appendLog("query", question, `- timestamp: ${nowTimestamp()}`);
  console.log("Query logged. Use your LLM agent to answer from wiki/index.md + pages/.");
}

async function lintWiki() {
  const checks = [WIKI_DIR, RAW_DIR, PAGES_DIR, INDEX_FILE, LOG_FILE, AGENTS_FILE];
  const missing = [];

  for (const item of checks) {
    try {
      await fs.access(item);
    } catch {
      missing.push(item);
    }
  }

  if (missing.length > 0) {
    console.error("Wiki lint failed. Missing required items:");
    for (const item of missing) {
      console.error(`- ${path.relative(ROOT, item)}`);
    }
    process.exit(1);
  }

  await appendLog("lint", "health check", `- status: pass\n- timestamp: ${nowTimestamp()}`);
  console.log("Wiki lint passed.");
}

async function startWiki() {
  await initWiki();
  console.log("Wiki is initialized and ready.");
  console.log("Root: wiki/");
  console.log("Raw sources: wiki/raw/");
  console.log("Pages: wiki/pages/");
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const rest = args.slice(1);

  switch (command) {
    case "init":
      await initWiki();
      console.log("Wiki scaffold initialized.");
      break;
    case "start":
      await startWiki();
      break;
    case "ingest":
      await initWiki();
      await ingestSource(rest[0]);
      break;
    case "query":
      await initWiki();
      await queryWiki(rest);
      break;
    case "lint":
      await initWiki();
      await lintWiki();
      break;
    default:
      console.log("Usage: node scripts/wiki.js <init|start|ingest|query|lint>");
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
