---
'@venture-ui/ui': patch
---

`DiffView` no longer freezes the page on large, very different texts. The line match gives up past 1,000 edits (two unrelated 5,000-line texts took 3.75 s, now under 0.1 s). The shared first and last lines stay as context, everything between is shown as replaced, and a note says so. The note text is the new `tooDifferent` label.
