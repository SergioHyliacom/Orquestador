// What a test or check command said, read from its output: whether it failed, and which failure it was.
// The guard reads it for every command a builder runs, because the exit code alone is not enough: a builder
// trims long output (`go test ./... 2>&1 | tail -30`, `| grep -E "FAIL|Tests"`), the exit code of a pipe is its
// last command's, and a failing test reaches Claude Code as a success. In the builders' transcripts of
// October and November 2026, 153 of 169 failed checks came back with exit code 0.

// The commands this applies to: the test runners and the checks of «Comprobaciones». Anything else (a grep over
// the code, a git log) may print "FAIL" without having failed.
const CHECK = new RegExp([
  String.raw`\bgo(\s+-C\s+\S+)?\s+(test|vet|build)\b`, String.raw`\bgo-test\.mjs\b`,
  String.raw`\b(pnpm|npm|yarn|bun)\b[^|;&\n]*?\b(run\s+)?(test|lint|typecheck|build)(:[\w-]+)?\b`,
  String.raw`\bvitest\b`, String.raw`\bplaywright\s+test\b`, String.raw`\bnode\s+(--\S+\s+)*--test\b`, String.raw`\btsc\b`,
  String.raw`\bbiome\s+(check|lint|ci)\b`, String.raw`\bgolangci-lint\b`,
  String.raw`\bturbo\s+run\s+(test|lint|typecheck|build)\b`, String.raw`\bliterals\s+check\b`,
].join("|"), "i");

export const isCheckCommand = (command) => CHECK.test(String(command ?? ""));

const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;
// turbo and pnpm -r put the package and the task before each line: "@easyone/panel:typecheck: src/a.ts(3,1): …".
const PREFIX = /^((@[\w.-]+\/)?[\w.-]+(:[\w-]+)+:\s|[\w.@-]+\/[\w./@-]+ [\w:-]+:\s)/;

// What changes from one attempt to the next while the failure stays the same: colours, durations, positions,
// times, addresses, temporary paths and ports, and the random names the database tests give their roles
// (internal/pgtest: "t" + 8 hex digits). The status codes and values an assertion prints stay.
export function normalize(line) {
  return String(line)
    .replace(ANSI, "")
    .replace(/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?/g, "<time>")
    .replace(/\b\d{2}:\d{2}:\d{2}(\.\d+)?\b/g, "<time>")
    .replace(/\(?\b\d+(\.\d+)?\s?(ms|s|m|µs|ns)\)?(?![\w])/g, "")
    .replace(/0x[0-9a-f]+/gi, "<addr>")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<uuid>")
    .replace(/(?=[0-9a-f]*\d)[0-9a-f]{8,}/gi, "<hex>")
    .replace(/(127\.0\.0\.1|localhost|\[::1?\]):\d+/g, "$1:<port>")
    .replace(/([\\/](tmp|Temp|T)[\\/])[^\s'"`:)]+/g, "$1<tmp>")
    .replace(/(\.\w+):\d+(:\d+)?/g, "$1")
    .replace(/\(\d+,\d+\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Each runner names what failed in its own way: one entry per failing test or error, without its position.
const FAILING = [
  // go test: --- FAIL: TestX/[EO-1.1]_nombre (0.01s); a package that does not build; a compile error; a panic.
  [/^\s*--- FAIL: (\S+)/, (m) => `go ${m[1]}`],
  [/^FAIL\s+(\S+)\s+\[(build|setup) failed\]/, (m) => `go ${m[2]} failed ${m[1]}`],
  [/^(\S+\.go):\d+(:\d+)?: (.+)$/, (m) => `go ${m[1]}: ${m[3]}`],
  [/^panic: (.+)$/, (m) => `panic ${m[1]}`],
  // Vitest: FAIL  src/a.test.ts > grupo > [EO-1.1] nombre; × [EO-1.1] nombre
  [/^\s*FAIL\s+(\S+\.[cm]?[jt]sx?)\b\s*(.*)$/, (m) => `vitest ${m[1]} ${m[2]}`],
  [/^\s*[×✗]\s+(.+)$/, (m) => `vitest ${m[1]}`],
  // Playwright: ✘ 1 [chromium] › e2e/a.e2e.ts:12:5 › nombre; 1) [chromium] › …
  [/^\s*(?:✘|\d+\))\s+(?:\d+\s+)?(\[[^\]]+\]\s+›.+)$/, (m) => `playwright ${m[1]}`],
  // node --test: not ok 3 - nombre; ✖ nombre
  [/^\s*not ok \d+ - (.+)$/, (m) => `node ${m[1]}`],
  [/^\s*✖ (.+)$/, (m) => `node ${m[1]}`],
  // tsc: a.ts(12,5): error TS2322: … or a.ts:12:5 - error TS2322: …
  [/^(\S+?)(?:\(\d+,\d+\)|:\d+:\d+)\s*[:-]\s*error (TS\d+)/, (m) => `tsc ${m[1]} ${m[2]}`],
  // Biome: a.ts:12:5 lint/suspicious/noX
  [/^(\S+):\d+:\d+\s+(lint\/\S+|format|organizeImports|assist\/\S+)/, (m) => `biome ${m[1]} ${m[2]}`],
];
// The lines under a failure that say why it failed.
const WHY = /(error|expected|got|want|received|assert|undefined|cannot|not |timed out|timeout)/i;

// A failure that names no test: the runner's summary, or the package manager saying a script failed.
const SUMMARY = [
  /^FAIL$/m, /^FAIL\s+\S+/m, /\bTests?\s+\d+ failed\b/, /\bTest Files\s+\d+ failed\b/, /\b[1-9]\d* (failed|failing)\b/,
  /^ℹ fail [1-9]/m, /^# fail [1-9]/m, /\bFound [1-9]\d* errors?\b/, /\berror TS\d+/, /\[build failed\]/, /^panic: /m,
  /\bERR_PNPM_\w+/, /\bELIFECYCLE\b/, /Command failed with exit code [1-9]/, /\bTest timed out\b/,
];

// failed: whether the output shows a failure. signature: what failed, the same while the failure is the same.
// The lines under each failure go into it, so a test that fails for another reason is another failure.
// named: the failing tests and errors, one line each. summary: one line that says what failed.
export function readFailure(output, { exitFailed = false } = {}) {
  const lines = String(output ?? "").replace(ANSI, "").split(/\r?\n/).map((l) => l.replace(PREFIX, ""));
  const named = [];
  lines.forEach((line, i) => {
    for (const [re, name] of FAILING) {
      const m = line.match(re);
      if (!m) continue;
      const why = lines.slice(i + 1, i + 8).filter((l) => l.trim() && !FAILING.some(([r]) => r.test(l)) && WHY.test(l)).slice(0, 2);
      named.push({ name: normalize(name(m)), why: why.map(normalize) });
      break;
    }
  });
  const text = lines.join("\n");
  const failed = exitFailed || named.length > 0 || SUMMARY.some((re) => re.test(text));
  const names = [...new Set(named.map((n) => n.name))];
  if (!failed) return { failed: false, signature: null, named: names, summary: null };
  // Nothing named: the last lines that say something, as the guard read the whole output before.
  const said = lines.map(normalize).filter(Boolean);
  const basis = named.length ? [...new Set(named.map((n) => [n.name, ...n.why].join(" | ")))].sort() : said.slice(-12);
  const summary = names[0] ?? said.findLast((l) => SUMMARY.some((re) => re.test(l)) || /fail|error|panic|timed out/i.test(l)) ?? said.at(-1) ?? "";
  return { failed: true, signature: basis.join("\n"), named: names, summary: summary.slice(0, 160) };
}

// What Claude Code returns when a hook blocked the command: the command never ran, so there is no output to read.
export const blockedByHook = (text) => /^\s*PreToolUse:\S+ hook (error|blocking error)/i.test(String(text ?? ""));
