---
'@venture-ui/ui': minor
---

Add `DiffView` (`@venture-ui/ui/DiffView`): a line-level diff of two texts, unified or side by side, with a spoken +N -M summary, unchanged lines folded behind a control, CRLF/LF normalisation, Markdown emphasis and translatable text (`labels`). The comparison is jsdiff (BSD-3-Clause), which a build pulls in only when it imports DiffView. Ships a showcase template for the Astryx CLI.
