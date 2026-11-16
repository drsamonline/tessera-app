# Debugging

Four bugs from this repository, in the order they were found, each written up as the sequence that actually happened.
Not a method abstracted from theory — a record of what worked and what wasted time.

The rule underneath all four: **a diagnostic that prints the state beats a hypothesis about the state.** Three of these
were solved by making the code say what it thought, and the two that took longest were the two where I guessed first.

---

## Case 1 — the record screen had no buttons

**Symptom.** After a CSS change, the action row (All records, Export JSON, Copy link, Tombstone) disappeared. The
accessibility harness still passed, 64/64 names.

**What was tried.** Reading the CSS. It looked correct: `.rowaction` had a sensible rule and nothing set `display:none`
on it.

**What found it.** A computed-style probe in a real browser: `display: "none"`, `height: 0`, `parentDisplay: "flex"`.

**Root cause.** A string replacement of `.rowaction{` also matched inside `.frow:not([data-conflict]) .rowaction{` and
`.frow .rowaction{`. Both selectors were split mid-way, so a scoped `display:none` became global.

**The lesson that cost an hour.** The buttons were *present, named and in the accessibility tree* the whole time. A
markup check cannot see that a thing is not painted; only a render can.

**Guard.** None specific. The general guard is that every visual change is screenshotted, which is already the practice.

---

## Case 2 — the list froze with the count updated

**Symptom.** Adding companies and deals to the Records list: the count chip said "4 customers" while six contact rows
stayed on screen. A state that should be impossible if the render completes.

**Three wrong hypotheses, in order.**

| Hypothesis | Test | Result |
|---|---|---|
| CORS refusing the company request | Called `/v1/objects/Company` directly | 200, four ids. Wrong |
| Boot ordering — the route applied before data loaded | Counted `applyRoute` calls | Two calls, both after the load. Wrong |
| Deep link losing the object segment | Printed `location.hash` in the title | `#records/Company`, intact. Wrong |

**What found it.** One diagnostic that printed the state instead of testing a theory:

```
live=false url=http://127.0.0.1:40163 cos=4
```

Four companies loaded, and the connection flag said *not connected*.

**Root cause.** Hydration (`loadState`) restored the stored `engine` object over the one the boot-time connection had
just set. The data survived because it is not part of the stored state; the flag did not. Every later load saw
`live: false` and returned.

**Two lessons.** First: the count updating while the rows did not was itself the clue — a render that throws between two
assignments leaves exactly that signature. Second: three hypotheses cost more than one instrument would have.

**Guard.** `loadState` now preserves a live engine that was set during boot.

---

## Case 3 — layout shift at three times the budget

**Symptom.** Cumulative layout shift 0.291 against a budget of 0.1, measured in a real browser.

**What found it.** The performance harness reported the shift *sources*: `DIV.grid2`, `DIV.ws`, `BUTTON#delRecord`. A
number alone would have been unfixable; the elements made it a one-line diagnosis.

**Root cause.** Two things. The shell paints before `app.js` fills it, by design — awaiting IndexedDB first leaves an
empty screen — so content landed into a zero-height box and pushed everything down. And hydration repainted the record
even when the stored state was identical to what was already on screen.

**Fix.** Reserve the height the content will occupy; skip the repaint when nothing changed. **0.291 → 0.021.**

**Guard.** The harness fails the build if CLS goes over budget, and prints the sources when it does.

---

## Case 4 — a card that contradicted the table above it

**Symptom.** The Related card said "No company reference on this record" directly under a field table showing
**Acme Industrial**.

**Root cause.** Two data shapes, one reader. A record from the engine carries `company_ref` (a reference); a seeded or
locally created record carries `company` (a name). The card read only the reference.

**What found it.** A screenshot. No test asserted anything about that card, and nothing in the code looked wrong — each
half was correct on its own.

**Guard.** The card reads either shape and its copy distinguishes "no deals for this company" from "deals are linked
through the engine".

---

## What generalises

1. **A render that half-completes leaves a signature.** If one part of a view updates and another does not, look for a
   throw between the two assignments, not for a logic error in either.
2. **Print the state, do not test the theory.** Every case above ended with a diagnostic that displayed a value. Two of
   them started with a hypothesis that was wrong.
3. **A number is not a diagnosis.** CLS 0.291 is unactionable; `DIV.grid2` at 762 ms is a fix.
4. **Markup checks cannot see paint.** The accessibility harness passed through a bug that removed every button from the
   screen.
5. **Two correct halves make a wrong whole.** Case 4 was not a bug in either data shape; it was a bug in assuming there
   was one.
