# Design review

Three screens, judged against Apple's HIG and the usual writing rules. Short by default; the fixes below are what came
out of it.

Reviewed: 15 November 2026, `shot-desktop.png`, `shot-mobile-records.png`, `shot-pipeline.png`.

---

## Quick read — Unified record (desktop)

**Score: 7/10** — a dense, honest record screen whose provenance line is the best thing on it, undermined by seven
equal-weight actions in a row and a card that contradicted the table above it.

Desktop/web · Purpose: read one customer's merged record and act on a conflict · Product UI

**Working**
- Provenance sits *under* each value, so the eye reads "Acme Industrial" then "HubSpot · trust score" — proximity doing
  the work a tooltip would have failed to do.
- Ochre is reserved for values and actions, grey for labels: colour carries one meaning, consistently.

**Not working**
- Seven pills of identical weight, "Tombstone" among them — no hierarchy and a destructive action with no separation.
- "RELATED: No company reference on this record" under a table showing **Acme Industrial** — the screen contradicted
  itself, which costs trust faster than any layout fault.
- A bare `82` chip next to "3 conflicts" with no label; an unlabelled number is decoration, not information.
- Pencil icons at ~55% opacity, hover-only — invisible on touch and undiscoverable with a keyboard.

**Fix first** — separate and colour the destructive action; the rest is polish. *(Done.)*

---

## Quick read — Records (mobile)

**Score: 6/10** — four stacked control rows before the first customer, on the screen whose job is to show customers.

Mobile · Purpose: find a customer and open them · Product UI

**Working**
- The row carries name, role, company, email and conflict count without a horizontal scroll — density earned, not
  crammed.
- Bottom bar with labels, not icon-only: recognition over recall.

**Not working**
- Filter, sort, saved-views, name-field and a full-width "Save view" button = five controls before content. Hick's law
  on the one screen that should be fastest.
- "Save view" gets a whole row and the visual weight of a primary action; it is a rare, secondary one.
- Seven items in the bottom bar at 390px — roughly 55px each, at the edge of a comfortable touch target.

**Fix first** — collapse the four control rows into two and put "Save view" beside the field it saves.

---

## Quick read — Pipeline (desktop)

**Score: 6/10** — the right shape for the question "how much is where", with two buttons per card competing and half
the screen empty.

Desktop/web · Purpose: see deal value by stage and move a deal · Product UI

**Working**
- Columns answer the question at a glance; a table sorted by stage would have answered it slowly.
- The arrow button names its destination ("→ negotiation"), which is the correct label for a move action.

**Not working**
- "Open" and "→ negotiation" carry identical weight; the move is the action, the open is navigation, and they look the
  same.
- `1 · ₹8,000.00` jams a count and a currency together; two different units in one string.
- Ochre on five repeated amounts dilutes the accent until it means "a number" rather than "look here".

**Fix first** — make the move the primary action and the open a text link; separate the count from the total.

---

## What the review changed

| Finding | Fix | Where |
|---|---|---|
| The Related card contradicted the table | It reads `company_ref` **or** `company`; the copy names which case it is in | `app.js` |
| `82` with no label | `Relationship health 82` in the accessibility tree, `health` on the title | `app.js` |
| Tombstone among benign actions | Moved to the far right, danger colour, separated by a spacer | `index.html` |
| `1 · ₹8,000.00` | `1 deal · ₹8,000.00` | `app.js` |

## The bug the review uncovered, which was not a design bug

Repairing the CSS for the destructive action exposed a real defect: the record screen had **no action buttons at all**.

Cause: a string replace of `.rowaction{` also matched inside `.frow:not([data-conflict]) .rowaction{` and
`.frow .rowaction{`, splitting both selectors. The scoped rule `display:none` became global and hid every button.

**A screenshot caught it; the accessibility harness did not** — the buttons were still in the accessibility tree and
still named. That is the honest limit of a markup check: it cannot see that a thing is not painted.

## Still open

- Seven items in the mobile bottom bar. Fixing it properly means merging Report into Pipeline or moving it behind
  Settings, which is an information-architecture decision rather than a styling one.
- The pencil-edit affordance is hover-dependent. It needs a visible state on touch — the row action pattern the
  conflict rows already use would do it.
- The Notes placeholder truncates at 1440px ("What happened, and what should the next pers…"). Either shorten the
  string or let the field take the width it needs.
