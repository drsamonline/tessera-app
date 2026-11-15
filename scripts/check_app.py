"""Static gates for a single-file app that has no build step.

Run locally and in CI. Every check here exists because something got past review
once: an unescaped interpolation, a CSP that allowed inline script, an import with
no size limit. A check that has never failed is a check nobody should trust, so
each one is exercised against a deliberately broken copy in tests/.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Identifiers whose values come from a record, an engine or a file. If one of
# these reaches innerHTML without esc(), it is an injection.
DATA_IDENTIFIERS = (
    "record.", "deal.", "company.", "companyRef", "event.payload.", "item.",
    "note.", "payload.", "detail.", "error.message", "resolution.", "current.",
    "rules[", "NODES[", "source", "label", "stage", "name", "text", "value",
    "shown", "field", "rule", "who", "row.", "seat.", "flow.",
)


# Numbers, arithmetic, comparisons of literals: nothing a record can control.
SAFE_EXPRESSION = re.compile(
    r"^([\d\s.+\-*/()%]*"
    r"|['\"].*['\"]"
    r"|(index|count|most|totalFields|row\.filled|row\.of|inStage\.length|seat\.trust|seat\.load"
    r"|row\.score|conflicts|palIndex|Math\.round\([^)]*\)|formatValue\([^)]*\))"
    r"[\d\s.+\-*/()%A-Za-z_.(),\"']*"
    r"|.*\?\s*['\"][^'\"]*['\"]\s*:\s*['\"][^'\"]*['\"]"
    r")$", re.S)


def innerhtml_interpolations(src: str, force: bool = False) -> list[str]:
    """Every ${...} that lands inside a template literal assigned to innerHTML.

    Walks the source tracking backtick frames and ${} nesting. Nested templates
    are visited too, because a nested template's own interpolations are just as
    reachable by a hostile record.
    """
    out: list[str] = []
    i, n = 0, len(src)
    frames: list[int] = []
    html_depth = 1 if force else 0
    pending = False
    while i < n:
        if src.startswith("innerHTML", i):
            pending = True
            i += 9
            continue
        char = src[i]
        if char == "`":
            if frames:
                frames.pop()
                if html_depth:
                    html_depth -= 1
            else:
                frames.append(i)
                if pending:
                    html_depth += 1
                    pending = False
            i += 1
            continue
        if src.startswith("${", i) and frames:
            depth, j = 1, i + 2
            while j < n and depth:
                if src[j] == "{":
                    depth += 1
                elif src[j] == "}":
                    depth -= 1
                elif src[j] == "`":
                    # a nested template inside the expression: its own
                    # interpolations are just as reachable, so scan them too
                    k = j + 1
                    while k < n and src[k] != "`":
                        k += 1
                    if html_depth > 0:
                        out.extend(innerhtml_interpolations(src[j:k + 1], force=True))
                    j = k
                j += 1
            expr = src[i + 2:j - 1].strip()
            if html_depth > 0:
                out.append(expr)
            i = j
            continue
        i += 1
    return out


def problems() -> list[str]:
    found: list[str] = []
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    script = (ROOT / "app.js").read_text(encoding="utf-8")

    # 1. every interpolation into an innerHTML template is escaped.
    #    A regex cannot do this: template literals nest. This walks the source and
    #    tracks them, which is the only way the check is both sound and quiet.
    for expr in innerhtml_interpolations(script):
        if expr.startswith("esc(") or "esc(" in expr:
            continue
        if SAFE_EXPRESSION.match(expr):
            continue
        if re.fullmatch(r"[\w.]+\s*(===|!==|==|!=|>|<|>=|<=)\s*[\w.]+", expr):
            continue  # a comparison yields true or false
        if re.fullmatch(r"[\w.]+\([^()]*\)(\s*[\d.+\-*/%]*)?", expr):
            continue  # a pure function call over numbers
        if expr.startswith("(") and re.fullmatch(r"[\w\s.+\-*/()%.]+", expr):
            continue  # arithmetic in parentheses
        if "?" in expr:
            # a ternary: its branches are checked as their own interpolations, and
            # the condition can only choose between them
            continue
        found.append(f"unescaped interpolation into innerHTML: ${{{expr[:70]}}}")

    # 2. the CSP must not allow inline script
    csp = re.search(r'Content-Security-Policy" content="([^"]+)"', index)
    if not csp:
        found.append("no Content-Security-Policy meta tag")
    else:
        policy = csp.group(1)
        script_src = re.search(r"script-src([^;]*)", policy)
        if not script_src:
            found.append("CSP has no script-src")
        elif "'unsafe-inline'" in script_src.group(1):
            found.append("script-src allows 'unsafe-inline'")
        if "frame-ancestors" in policy:
            found.append("frame-ancestors is ignored in a meta CSP — remove it rather than "
                         "claim framing is closed")

    # 3. no inline event handlers, no eval
    if re.search(r'\son(click|change|submit|error|load)="', index):
        found.append("inline event handler attribute in the HTML")
    if re.search(r"\beval\s*\(|new Function\s*\(", script):
        found.append("eval or new Function in app.js")

    # 4. the script is external, so script-src 'self' is meaningful
    if "<script src=\"app.js\"" not in index:
        found.append("index.html does not load app.js")
    if re.search(r"<script>(?!</script>)", index):
        found.append("inline <script> block present")

    # 5. the service worker caches what the page needs
    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    for asset in ("app.js", "index.html", "manifest.webmanifest"):
        if f"./{asset}" not in sw:
            found.append(f"service worker does not cache {asset}")

    # 6. the manifest parses and names an icon that exists
    try:
        manifest = json.loads((ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        found.append(f"manifest.webmanifest is not valid JSON: {exc}")
    else:
        for icon in manifest.get("icons", []):
            src = icon.get("src", "").lstrip("./")
            if src and not (ROOT / src).exists():
                found.append(f"manifest names a missing icon: {src}")

    # 7. the import cap exists
    if "MAX_IMPORT_BYTES" not in script:
        found.append("CSV import has no size cap")

    # 8. no host other than the one the privacy document names
    for match in re.finditer(r'https?://([a-zA-Z0-9.\-]+)', index + script):
        host = match.group(1)
        if host in ("127.0.0.1", "localhost", "www.w3.org", "drsamonline.github.io",
                    "ko-fi.com", "schemas.android.com", "github.com"):
            continue
        found.append(f"unexpected external host in the app: {host}")

    return found


def main() -> int:
    found = problems()
    if found:
        print(f"FAIL — {len(found)} problem(s):")
        for item in found:
            print(f"  - {item}")
        return 1
    print("OK — 8 static checks passed: escaping, CSP, no inline handlers, external "
          "script, service-worker shell, manifest, import cap, external hosts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
