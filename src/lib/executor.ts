import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Challenge, GoChallenge } from "../../data/types";
import { GO_CHALLENGES } from "../../data/challengesGo.ts";

export interface CaseFailure {
  index: number;
  total: number;
  args: string[];
  expected: string;
  actual: string;
}

export type CodeLang = "python" | "go";

export interface RunResult {
  passed: boolean;
  total: number;
  passedCount: number;
  firstFailure?: CaseFailure;
  error?: "no_solution" | "student_error" | "timeout" | "crashed" | "bad_output";
  errorDetail?: string;
  durationMs: number;
}

const PY_HARNESS = String.raw`import sys, json, resource

try:
    resource.setrlimit(resource.RLIMIT_AS, (536870912, 536870912))
    resource.setrlimit(resource.RLIMIT_CPU, (3, 4))
except Exception:
    pass

def _write(payload):
    try:
        with open(sys.argv[1], "w") as f:
            json.dump(payload, f)
    except Exception:
        pass

try:
    data = json.loads(sys.stdin.read())
    STUDENT = data["code"]
    CASES = data["cases"]
except Exception as e:
    _write({"fatal": "bad_output", "error": str(e)})
    sys.exit(0)

ns = {}
try:
    exec(compile(STUDENT, "<reto>", "exec"), ns)
except BaseException as e:
    _write({"fatal": "student_error", "error": "%s: %s" % (type(e).__name__, e)})
    sys.exit(0)

fn = ns.get("solution")
if not callable(fn):
    _write({"fatal": "no_solution"})
    sys.exit(0)

results = []
for i, c in enumerate(CASES):
    try:
        argvals = [eval(a, {"__builtins__": {}}, {}) for a in c["args"]]
    except Exception:
        results.append({"i": i, "ok": False, "err": "arg", "out": "", "exp": c["expects"], "args": c["args"]})
        continue
    try:
        out = fn(*argvals)
    except BaseException as e:
        results.append({"i": i, "ok": False, "err": "%s: %s" % (type(e).__name__, e), "out": "", "exp": c["expects"], "args": c["args"]})
        continue
    try:
        exp = eval(c["expects"], {"__builtins__": {}}, {})
    except Exception:
        exp = None
    try:
        ok = bool(out == exp)
    except Exception:
        ok = False
    results.append({"i": i, "ok": ok, "out": repr(out), "exp": repr(exp), "args": c["args"]})

_write({"results": results})
`;

interface PythonCase {
  args: string[];
  expects: string;
}

interface PythonResult {
  fatal?: string;
  error?: string;
  results?: {
    i: number;
    ok: boolean;
    out: string;
    exp: string;
    err?: string;
    args: string[];
  }[];
}

interface GoResultPayload {
  fatal?: string;
  error?: string;
  results?: {
    i: number;
    ok: boolean;
    out: string;
    exp: string;
    err?: string;
    args: string[];
  }[];
}

function pythonBin(): string {
  return process.env.PYTHON_BIN || "python3";
}

export function runChallenge(challenge: Challenge, code: string, lang: CodeLang = "python", timeoutMs = 8000): Promise<RunResult> {
  if (lang === "go") {
    const goData = GO_CHALLENGES[challenge.id];
    if (!goData || goData.testsGo.length === 0) {
      return Promise.resolve({ passed: false, total: 0, passedCount: 0, error: "crashed", durationMs: 0 });
    }
    return runGoChallenge(goData, code, timeoutMs);
  }
  return runPythonChallenge(challenge, code, timeoutMs);
}

function runPythonChallenge(challenge: Challenge, code: string, timeoutMs: number): Promise<RunResult> {
  const started = Date.now();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ochomiles-"));
  const scriptPath = path.join(dir, "run.py");
  const outPath = path.join(dir, "out.json");
  const cases: PythonCase[] = challenge.tests.map((t) => ({ args: t.args, expects: t.expects }));

  return new Promise<RunResult>((resolve) => {
    let settled = false;
    const finalize = (result: RunResult) => {
      if (settled) return;
      settled = true;
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      result.durationMs = Date.now() - started;
      resolve(result);
    };

    try {
      fs.writeFileSync(scriptPath, PY_HARNESS, "utf8");
    } catch (e) {
      finalize({ passed: false, total: cases.length, passedCount: 0, error: "crashed", errorDetail: String(e), durationMs: 0 });
      return;
    }

    const child = spawn(
      /* turbopackIgnore: true */ pythonBin(),
      ["-B", "-I", "-S", scriptPath, outPath],
      {
        cwd: dir,
        stdio: ["pipe", "ignore", "pipe"],
      }
    );

    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
      finalize({
        passed: false,
        total: cases.length,
        passedCount: 0,
        error: "timeout",
        durationMs: 0,
      });
    }, timeoutMs);

    child.on("error", (e) => {
      clearTimeout(timer);
      finalize({ passed: false, total: cases.length, passedCount: 0, error: "crashed", errorDetail: String(e), durationMs: 0 });
    });

    child.on("close", () => {
      clearTimeout(timer);
      let parsed: PythonResult;
      try {
        const raw = fs.readFileSync(outPath, "utf8");
        parsed = JSON.parse(raw) as PythonResult;
      } catch {
        finalize({ passed: false, total: cases.length, passedCount: 0, error: "crashed", durationMs: 0 });
        return;
      }

      if (parsed.fatal) {
        finalize({
          passed: false,
          total: cases.length,
          passedCount: 0,
          error: parsed.fatal as RunResult["error"],
          errorDetail: parsed.error,
          durationMs: 0,
        });
        return;
      }

      const rows = parsed.results ?? [];
      const passedCount = rows.filter((r) => r.ok).length;
      const allPassed = passedCount === cases.length && cases.length > 0;
      const firstBad = rows.find((r) => !r.ok);

      finalize({
        passed: allPassed,
        total: cases.length,
        passedCount,
        firstFailure: firstBad
          ? {
              index: firstBad.i + 1,
              total: cases.length,
              args: firstBad.args ?? [],
              expected: firstBad.err ? (firstBad.err as string) : firstBad.exp,
              actual: firstBad.err ? "" : firstBad.out,
            }
          : undefined,
        durationMs: 0,
      });
    });

    child.stdin.write(JSON.stringify({ code, cases }));
    child.stdin.end();
  });
}

const GO_CACHE_DIR = path.join(os.tmpdir(), "ochomiles-gocache");
const GO_MODCACHE_DIR = path.join(os.tmpdir(), "ochomiles-gomodcache");

const GO_HEADER = `package main

import (
	__IMPORTS__
)

type caseResult struct {
	I    int      \`json:"i"\`
	Ok   bool     \`json:"ok"\`
	Out  string   \`json:"out"\`
	Exp  string   \`json:"exp"\`
	Err  string   \`json:"err,omitempty"\`
	Args []string \`json:"args"\`
}

type goOutput struct {
	Fatal   string       \`json:"fatal,omitempty"\`
	Error   string       \`json:"error,omitempty"\`
	Results []caseResult \`json:"results"\`
}

func writeOut(p goOutput) {
	if data, err := json.Marshal(p); err == nil {
		_ = os.WriteFile(os.Args[1], data, 0o644)
	}
}

func numKind(k reflect.Kind) bool {
	switch k {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
		reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64,
		reflect.Float32, reflect.Float64:
		return true
	}
	return false
}

func numVal(v reflect.Value) float64 {
	switch v.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return float64(v.Int())
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return float64(v.Uint())
	case reflect.Float32, reflect.Float64:
		return v.Float()
	}
	return 0
}

func deepEq(a, b reflect.Value) bool {
	if a.Kind() == reflect.Interface {
		if a.IsNil() {
			return b.Kind() == reflect.Interface && b.IsNil()
		}
		a = a.Elem()
	}
	if b.Kind() == reflect.Interface {
		if b.IsNil() {
			return a.Kind() == reflect.Interface && a.IsNil()
		}
		b = b.Elem()
	}
	if numKind(a.Kind()) && numKind(b.Kind()) {
		d := numVal(a) - numVal(b)
		if d < 0 {
			d = -d
		}
		return d < 1e-9
	}
	if a.Kind() != b.Kind() {
		return false
	}
	if (a.Kind() == reflect.Slice || a.Kind() == reflect.Array) && a.Len() == 0 && b.Len() == 0 {
		return true
	}
	if a.Kind() == reflect.Map && a.Len() == 0 && b.Len() == 0 {
		return true
	}
	switch a.Kind() {
	case reflect.Bool:
		return a.Bool() == b.Bool()
	case reflect.String:
		return a.String() == b.String()
	case reflect.Slice, reflect.Array:
		if a.Len() != b.Len() {
			return false
		}
		for i := 0; i < a.Len(); i++ {
			if !deepEq(a.Index(i), b.Index(i)) {
				return false
			}
		}
		return true
	case reflect.Map:
		if a.Len() != b.Len() {
			return false
		}
		it := a.MapRange()
		for it.Next() {
			kv := it.Value()
			other := b.MapIndex(it.Key())
			if !other.IsValid() || !deepEq(kv, other) {
				return false
			}
		}
		return true
	default:
		return reflect.DeepEqual(a.Interface(), b.Interface())
	}
}

func equals(a, b interface{}) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return deepEq(reflect.ValueOf(a), reflect.ValueOf(b))
}
`;

const GO_TAIL = `
func main() {
	out := goOutput{Results: []caseResult{}}
	defer func() { writeOut(out) }()

	for i, c := range cases {
		func() {
			res := caseResult{I: i, Args: c.args, Exp: fmt.Sprintf("%#v", c.exp)}
			defer func() {
				if r := recover(); r != nil {
					res.Err = fmt.Sprintf("panic: %v", r)
					res.Ok = false
					out.Results = append(out.Results, res)
				}
			}()
			v := c.f()
			res.Out = fmt.Sprintf("%#v", v)
			res.Ok = equals(v, c.exp)
			out.Results = append(out.Results, res)
		}()
	}
}

var cases = []struct {
	args []string
	f    func() interface{}
	exp  interface{}
}{
`;

function goEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GOCACHE: GO_CACHE_DIR,
    GOMODCACHE: GO_MODCACHE_DIR,
    GOPROXY: "off",
    GO111MODULE: "on",
    GOFLAGS: "-mod=mod",
    GOTOOLCHAIN: "local",
    CGO_ENABLED: "0",
  };
}

function goBin(): string {
  return process.env.GO_BIN || "go";
}

export function runGoChallenge(goData: GoChallenge, code: string, timeoutMs: number): Promise<RunResult> {
  const started = Date.now();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ochomiles-go-"));
  const outPath = path.join(dir, "out.json");
  const binPath = path.join(dir, "reto");

  const done = (result: RunResult): RunResult => {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    result.durationMs = Date.now() - started;
    return result;
  };

  try {
    fs.mkdirSync(GO_CACHE_DIR, { recursive: true });
    fs.mkdirSync(GO_MODCACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(dir, "go.mod"), "module reto\n\ngo 1.23\n", "utf8");
  } catch (e) {
    return Promise.resolve(done({ passed: false, total: 0, passedCount: 0, error: "crashed", errorDetail: String(e), durationMs: 0 }));
  }

  const callExprs: string[] = [];
  for (const c of goData.testsGo) {
    callExprs.push(
      `	{args: []string{${c.args.map((a) => JSON.stringify(a)).join(", ")}}, f: func() interface{} { return solution(${c.args.join(", ")}) }, exp: ${c.expects}},`
    );
  }

  let src: string;
  try {
    src = GO_HEADER + "\n// ===== Código del alpinista =====\n" + code + "\n" + GO_TAIL + callExprs.join("\n") + "\n}\n";

    const list = ["encoding/json", "fmt", "os", "reflect"];
    if (src.includes("strings.")) list.push("strings");
    if (src.includes("sort.")) list.push("sort");
    if (src.includes("strconv.")) list.push("strconv");
    src = src.replace("__IMPORTS__", list.map((p) => `"${p}"`).join("\n\t"));
    fs.writeFileSync(path.join(dir, "main.go"), src, "utf8");
  } catch (e) {
    return Promise.resolve(done({ passed: false, total: 0, passedCount: 0, error: "crashed", errorDetail: String(e), durationMs: 0 }));
  }

  const build = spawnSync(goBin(), ["build", "-trimpath", "-o", "reto", "."], {
    cwd: dir,
    env: goEnv(),
    encoding: "utf8",
    timeout: Math.max(10000, timeoutMs),
  });

  if (build.status !== 0 || build.error?.message?.includes("ETIMEDOUT")) {
    const errText = (build.stderr ?? build.error?.message ?? "build failed").toString().slice(0, 4000);
    return Promise.resolve(
      done({
        passed: false,
        total: goData.testsGo.length,
        passedCount: 0,
        error: /undefined: solution/.test(errText) ? "no_solution" : "student_error",
        errorDetail: errText,
        durationMs: 0,
      })
    );
  }

  return new Promise<RunResult>((resolve) => {
    let settled = false;
    const finalize = (result: RunResult) => {
      if (settled) return;
      settled = true;
      resolve(done(result));
    };

    const child = spawn(
      /* turbopackIgnore: true */ "/usr/bin/prlimit",
      ["--as=4294967296", "--cpu=3", "--", binPath, outPath],
      { cwd: dir, stdio: ["ignore", "ignore", "pipe"] }
    );

    let stderrLog = "";
    child.stderr?.on("data", (d) => {
      stderrLog = (stderrLog + String(d)).slice(-4000);
    });

    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
      finalize({ passed: false, total: goData.testsGo.length, passedCount: 0, error: "timeout", durationMs: 0 });
    }, timeoutMs);

    child.on("error", (e) => {
      clearTimeout(timer);
      finalize({ passed: false, total: goData.testsGo.length, passedCount: 0, error: "crashed", errorDetail: String(e), durationMs: 0 });
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (signal) {
        finalize({ passed: false, total: goData.testsGo.length, passedCount: 0, error: "timeout", durationMs: 0 });
        return;
      }
      if (code !== 0 || !fs.existsSync(outPath)) {
        finalize({
          passed: false,
          total: goData.testsGo.length,
          passedCount: 0,
          error: "crashed",
          errorDetail: stderrLog || undefined,
          durationMs: 0,
        });
        return;
      }
      let parsed: GoResultPayload;
      try {
        parsed = JSON.parse(fs.readFileSync(outPath, "utf8")) as GoResultPayload;
      } catch {
        finalize({ passed: false, total: goData.testsGo.length, passedCount: 0, error: "crashed", durationMs: 0 });
        return;
      }
      const rows = parsed.results ?? [];
      const passedCount = rows.filter((r) => r.ok).length;
      const allPassed = passedCount === goData.testsGo.length && goData.testsGo.length > 0;
      const firstBad = rows.find((r) => !r.ok);
      finalize({
        passed: allPassed,
        total: goData.testsGo.length,
        passedCount,
        firstFailure: firstBad
          ? {
              index: firstBad.i + 1,
              total: goData.testsGo.length,
              args: firstBad.args ?? [],
              expected: firstBad.err ? (firstBad.err as string) : firstBad.exp,
              actual: firstBad.err ? "" : firstBad.out,
            }
          : undefined,
        durationMs: 0,
      });
    });
  });
}
