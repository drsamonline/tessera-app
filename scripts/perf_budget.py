"""The performance budget, enforced.

A performance number without a budget is an opinion. These are the numbers this
project commits to, measured on the bytes actually served, and the build fails if
they are exceeded.

The budget is deliberately small because the app is deliberately small: no
framework, no fonts to download, no images on the critical path. When a change
breaches it, the fix is to remove work, not to raise the number.
"""
from __future__ import annotations

import gzip
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# kilobytes, gzipped, as served
BUDGET = {
    "app.js": 32,
    "index.html": 14,
    "sw.js": 2,
    "manifest.webmanifest": 2,
}
TOTAL_BUDGET_KB = 48


def kb(path: pathlib.Path) -> float:
    return len(gzip.compress(path.read_bytes(), 9)) / 1024


def main() -> int:
    rows, failures, total = [], [], 0.0
    for name, limit in BUDGET.items():
        path = ROOT / name
        if not path.exists():
            failures.append(f"{name} is missing")
            continue
        size = kb(path)
        total += size
        over = size > limit
        rows.append((name, size, limit, over))
        if over:
            failures.append(f"{name}: {size:.1f} KB gzipped, budget {limit} KB")

    print(f"{'file':<24}{'gzipped':>9}{'budget':>9}  ")
    for name, size, limit, over in rows:
        print(f"{name:<24}{size:>8.1f}K{limit:>8}K  {'OVER' if over else 'ok'}")
    print(f"{'total':<24}{total:>8.1f}K{TOTAL_BUDGET_KB:>8}K  "
          f"{'OVER' if total > TOTAL_BUDGET_KB else 'ok'}")
    if total > TOTAL_BUDGET_KB:
        failures.append(f"total: {total:.1f} KB gzipped, budget {TOTAL_BUDGET_KB} KB")

    print()
    if failures:
        print(f"FAIL — {len(failures)} budget breach(es):")
        for item in failures:
            print(f"  - {item}")
        print("Fix by removing work, not by raising the budget.")
        return 1
    print(f"Within budget: {total:.1f} KB gzipped of {TOTAL_BUDGET_KB} KB.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
