# Deslop Pattern Reference

All patterns with severity, language, and regex. Sourced from agentsys, tested on 1,000+ repos.

## Critical — Must Fix

| Pattern | Language | Regex | Auto-fix |
|---|---|---|---|
| Hardcoded secrets | all | `(password\|secret\|api_key\|token)\s*[:=]\s*"[^"]{8,}"` | flag |
| JWT tokens | all | `eyJ[A-Za-z0-9_-]{10,}\.eyJ...` | flag |
| OpenAI API keys | all | `sk-[a-zA-Z0-9]{32,}` | flag |
| GitHub tokens | all | `ghp_[a-zA-Z0-9]{36}` | flag |
| AWS credentials | all | `AKIA[0-9A-Z]{16}` | flag |
| Stripe keys | all | `sk_live_[a-zA-Z0-9]{24,}` | flag |
| Google/Firebase keys | all | `AIza[0-9A-Za-z_-]{35}` | flag |
| throw Error("TODO") | JS/TS | `throw\s+new\s+Error\s*\(.*TODO\|implement` | flag |
| Empty function body | JS/TS | `function\s+\w+\([^)]*\)\s*\{\s*\}` | flag |
| Empty catch block | JS/TS | `catch\s*\([^)]*\)\s*\{\s*\}` | add_logging |
| Empty except: pass | Python | `except\s*[^:]*:\s*pass` | add_logging |
| raise NotImplementedError | Python | `raise\s+NotImplementedError` | flag |
| pass-only function | Python | `def\s+\w+\([^)]*\):\s*pass` | flag |
| ellipsis-only function | Python | `def\s+\w+\([^)]*\):\s*\.\.\.` | flag |
| todo!/unimplemented! | Rust | `(todo\|unimplemented)!\s*\(` | flag |
| panic!("TODO") | Rust | `panic!\s*\(".*TODO` | flag |
| panic("TODO") | Go | `panic\s*\(".*TODO` | flag |
| UnsupportedOperationException | Java | `throw\s+new\s+UnsupportedOperationException` | flag |

## Medium — Should Fix

| Pattern | Language | Regex | Auto-fix |
|---|---|---|---|
| console.log/debug | JS/TS | `console\.(log\|debug)\(` | remove |
| Python debug prints | Python | `print\(\|import pdb\|breakpoint()` | remove |
| Rust debug macros | Rust | `println!\|dbg!\|eprintln!` | remove |
| Bare .unwrap() | Rust | `.unwrap()\s*` | flag |
| Placeholder text | all | `lorem ipsum\|test test test\|asdf asdf` | flag |
| Commented-out code | all | 5+ consecutive commented lines | remove |

## Low — Review

| Pattern | Language | Regex | Auto-fix |
|---|---|---|---|
| TODO/FIXME/HACK | all | `(TODO\|FIXME\|HACK\|XXX):` | flag |
| Disabled linter rules | all | `eslint-disable\|noqa\|#[allow(` | flag |
| Mixed indentation | all | `^\t+ \| +\t` | replace |
| Trailing whitespace | all | `\s+$` | remove |
| Multiple blank lines | all | 3+ consecutive blank lines | replace |
| Unused imports | all | `import .* // unused` | remove |

## Excluded From Scanning

All patterns skip: `*.test.*`, `*.spec.*`, `node_modules/`, `dist/`, `.git/`, fixtures, mocks, config files.
