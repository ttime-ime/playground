#!/usr/bin/env python3
"""Cache-busting for the playground.

Every reference to a script, stylesheet, image, font or Wasm file gets
`?v=<first 10 hex digits of that file's SHA-256>`, so a browser fetches a file
again exactly when its content changed. A page and the scripts it loads always
come from the same deploy, which matters because the Wasm glue and the Wasm
binary must match.

Run `python3 -I stamp.py` after changing any file here, and commit the result.
`--check` changes nothing and exits 1 if a reference is stale (for CI or a
pre-push hook). Files under pkg/ are only read. Fixtures are fetched with
`cache: "no-cache"` instead, because the page names them at run time.
"""
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
REF = re.compile(
    r"""(?P<pre>["'(])(?P<path>(?:\./)?(?:(?:pkg|assets)/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+|[A-Za-z0-9_-]+\.(?:js|css)))(?:\?v=[0-9a-f]*)?(?P<post>["')])"""
)


def digest(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]


def stamped(text: str, errors: list) -> str:
    def one(m):
        rel = m.group("path")
        target = ROOT / rel.removeprefix("./")
        if not target.is_file():
            errors.append(rel)
            return m.group(0)
        return f'{m.group("pre")}{rel}?v={digest(target)}{m.group("post")}'

    return REF.sub(one, text)


def sources():
    names = [*sorted(ROOT.glob("*.html")), *sorted(ROOT.glob("*.js")), ROOT / "style.css"]
    return [p for p in names if p.is_file()]


def main() -> int:
    check = "--check" in sys.argv
    errors: list = []
    changed: set = set()
    # Scripts import each other, so a stamp can change the file that another
    # file points to: repeat until nothing moves.
    for _ in range(8):
        moved = False
        for path in sources():
            old = path.read_text(encoding="utf-8")
            new = stamped(old, errors)
            if new != old:
                moved = True
                changed.add(path.name)
                if not check:
                    path.write_text(new, encoding="utf-8")
        if check or not moved:
            break
    else:
        print("stamping did not settle", file=sys.stderr)
        return 2
    if errors:
        print("missing files: " + ", ".join(sorted(set(errors))), file=sys.stderr)
        return 2
    if check and changed:
        print("stale references in: " + ", ".join(sorted(changed)), file=sys.stderr)
        return 1
    if not check:
        print("stamped" + (": " + ", ".join(sorted(changed)) if changed else " (already current)"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
