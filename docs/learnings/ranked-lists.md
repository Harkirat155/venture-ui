# Designing list and ranking pages

A guide for pages that show many similar items in an order: a catalogue, a chart, a search result, a shelf. It comes
from a study of eight public pages. Read "Limits" before you rely on it.

The examples use a library's books so they fit any product. The public pages behind them are named so you can open
them yourself.

## How much to trust this

- Eight pages were opened in a headless browser at 1280 px and 390 px. Nothing was clicked beyond loading a URL.
- Each "works because" line is the author's reasoning. No user was tested. A swap test (what breaks if you change
  the thing) was reasoned, not run.
- A principle seen in two or more pages is more likely to hold than one seen once. They are kept in separate sections.
- Not opened or not seen: hover and focus states on several pages, applied-filter states on the flight and catalogue
  pages, the mobile layout of several pages (some were clipped desktop layouts), and any in-app screens.
- One chart site returned a bot challenge and was not worked around. Nothing here comes from it. Two other
  references (a printed listings guide, two productivity apps) were not opened. Anything said about them would be
  from memory, so nothing is.
- Measurements such as colour contrast were calculated from assumed backgrounds, not measured on pixels. One heading
  size was judged by eye.
- Eight is a small sample. Two are plain-text reference sites and the rest are large brands.

## Principles seen in two or more pages

Pages: Hacker News (HN), Wikipedia, Google Flights, Spotify, Letterboxd, SpaceX, Apple, JustWatch.

### 1. Numbers carry their unit (seen in 7)
Problem: a bare number means little. Mechanism: put the scale, unit or condition on the same line.
- Examples: "580 points" (HN), "215 votes, 13.1%" (Wikipedia), "124 m / 407 ft" (SpaceX), "$83.29/mo. for 24 mo."
  (Apple), "-28% emissions" (Google Flights).
- Neutral form: "4,210 loans this month", not "4,210". "312 pages, about 9 hours" beats "312".
- Abbreviate ("737K") in a strip of social proof. Show full digits ("5,099,925") in a column people compare.
- Works because (reasoned): the reader never has to guess what the number counts, and a second unit answers "how big
  is that for me".

### 2. One dominant element per row (seen in 6)
Problem: a row with five equal parts cannot be scanned. Mechanism: one element is dark and large, the rest are muted
and always in the same order.
- Examples: the black title on HN, the first blue link on Wikipedia, the white title on Spotify, time and price on
  Google Flights.
- Neutral form: the book title in full colour, then author, year and shelf in a muted line.
- Works because (reasoned): the eye follows one column of titles, so scanning does not turn into reading.

### 3. Fixed positions and constant row height (seen in 5)
Problem: rows that differ in shape are hard to compare. Mechanism: a fixed column or field order and a stable height.
- Examples: the Google Flights column grid, Spotify's 56 px rows, HN's two-line rows, SpaceX's label-left,
  value-right fact rows.
- Neutral form: rank, title, loans, length in the same cells on every row.

### 4. A visible cue for what can be clicked (seen in 5)
Problem: the reader cannot tell what is a control. Mechanism: one consistent cue such as a caret, an outline, a
chevron or link colour.
- Examples: carets and outlines on Letterboxd, Google Flights and JustWatch; blue text on Wikipedia.
- HN is the weak case: its links are not underlined at rest. What hover does was not checked.

### 5. Print the sort key and the rule in words, with n (seen in 4)
Problem: a ranking looks arbitrary, or like a claim. Mechanism: say what the order is, and who or what it counts,
where the reader is looking.
- Examples: "Sort by popularity" (Letterboxd), "sorted by Popularity" (JustWatch), "Ranked based on price and
  convenience" (Google Flights), and a first sentence naming the poll's 1,639 voters (Wikipedia).
- Neutral form: "Sorted by loans in the last 30 days, from 41 branches."
- Word the rule from the constant that enforces it, so the text cannot drift from the code.
- Works because (reasoned): a named electorate is evidence. An anonymous list asks to be trusted.

### 6. A ranked default, no required choices (seen in 4)
Problem: the reader must decide before seeing anything. Mechanism: open on a useful ranked list. Filters refine it.
- Examples: Letterboxd, HN and Wikipedia ask for nothing. Google Flights pre-fills its four fields.

### 7. Keep selling out of the first screen (seen in 4)
Problem: the page promotes before it helps. Mechanism: banners, SEO copy and promotions come after the first results.
- Comply: SpaceX, HN, Wikipedia, Google Flights. Violate: JustWatch, Letterboxd, Apple, Spotify.
- JustWatch has about 50 controls (counted by hand) and about 370 px before the first result.

### 8. On a phone keep the row, collapse the controls (seen in 4)
Problem: the phone page becomes a different product. Mechanism: keep the row's wording and evidence, fold the
controls behind one door.
- Examples: HN and Wikipedia keep their rows. JustWatch folds eight dropdowns into one funnel. Google Flights scrolls
  its chips sideways and truncates times, which loses evidence. Do not copy that part.
- Among the 390 px captures, none gave a good phone layout to copy whole. Some of those captures were clipped
  desktop layouts or caught mid-fade, so this says little about each site's real mobile page.

### 9. A control's state is readable without opening it (seen in 3)
Problem: the reader cannot tell what is applied. Mechanism: the control shows its value, and one count says how many
results remain.
- Examples: JustWatch prints "164,146 titles sorted by Popularity". Google Flights marks the selected segment and
  says "35 results returned." A Letterboxd page loaded from a URL that already named a genre showed that genre where
  the "Genre" chip had been. Its results never loaded and no chip was clicked.
- The applied look of JustWatch's and Google Flights' filters was not seen, so what a filled-in control looks like
  there is unknown.
- Neutral form: the chip reads "Poetry", not "Genre"; a line says "212 books, sorted by loans".
- Swap test (reasoned): a fixed "Genre" label forces you to open the menu to learn the state.
- This is the reason `SentenceFilter` exists. See "Sentence or filter row" below.

### 10. Few doors for many filters (seen in 3)
Problem: a row of ten filters is a wall. Mechanism: a few labelled doors, or one "All filters" door.
- Examples: Letterboxd's six collapsed doors, Google Flights' "All filters", JustWatch's phone funnel.

### 11. A classifying note beside the name (seen in 3)
Problem: the reader asks where this comes from. Mechanism: a short note next to the name.
- Examples: the "(site.com)" after an HN title, "(author, 1975, country)" on Wikipedia, "JFK–LHR, Nonstop" on Google
  Flights.
- Neutral form: "Title (author, 1975, poetry)".

### 12. Is the list still true? Show a date (seen in 4)
Problem: the reader cannot tell if the list is current. Mechanism: a date in the header and, if it helps, what changed.
- Examples: Spotify's "6 Nov 2026, 2 new entries", HN's "9 hours ago", Google Flights' "Prices are currently typical".
- Neutral form: "Updated 6 Nov. 2 new this week."

### 13. Colour only on the main action (seen in 2)
Problem: colour everywhere is noise. Mechanism: one saturated colour on the primary action, or none.
- Examples: Spotify's green play button is the only saturated item. SpaceX showed no accent.

### 14. A muted rank number (seen in 2)
Problem: the order is unexplained. Mechanism: a grey rank in its own gutter, so position explains order.
- Examples: HN and Spotify.

### 15. One idea per screenful (seen in 4, but not for list pages)
Problem: the reader cannot take in many things at once. Mechanism: a headline 3 to 6 times body size on one left
edge. Apple was about 3.4 to 4.7 times and SpaceX 6.25 times.
- This fits a single-title page, not a list. The list pages studied (Letterboxd, HN, Spotify shelves) do not follow it.
- For a single-title page, label-left, value-right fact rows (SpaceX) pair a label with its value without icons.

## Principles seen in one page only

Treat these as ideas to test, not as findings.

- Show the alternative ranking's value in its tab label: "Cheapest from X" (Google Flights).
- A change chip against a typical value, coloured only where better (Google Flights).
- Restate the query above the answer (Google Flights).
- A second colour for visited links (Wikipedia). No link was visited in the study, so how the colour behaves was not tested.
- A sentence lead-in before a list, "The top 10 are:" (Wikipedia).
- A verb on each button, not "Learn more" everywhere (SpaceX).
- One value alone on a row, with space around it, to make a number feel large (SpaceX, "100+ t").
- A bounded shelf: heading, five items, "Show all" (Spotify).
- A large total as a quiet right-aligned count (Letterboxd).
- The place a thing can be found as the first filter (JustWatch).
- A preference asked once, in words, and dismissible (Apple's country strip).
- Facts as short sentences, one per fragment (Apple).

## Sentence or filter row

`SentenceFilter` writes the filter as a sentence: "Newest [poetry] in [any language]". Each bracket is a button.
A labelled filter row writes it as a row of fields: Genre, Language, Sort.

Use the sentence when:
- There are two to four filters that combine into a phrase that reads naturally.
- The page wants the applied state readable at a glance without opening anything (principle 9).
- Each filter has a short list of options.

Use a labelled filter row when:
- There are many filters, or filters that do not read as a phrase.
- Options need search, multiple choice or ranges. `SentenceFilter` picks one value per word.
- People compare or scan the filters as a set.

Untested: no stranger has used a sentence filter in this library. It follows principle 9 and has passed these
checks. Unit tests cover names, choosing, Escape, disabled options, the checked option and token removal. Browser
tests cover arrow keys, Enter, Space, Tab staying in the popup, focus return, 44 px targets, no sideways scroll at
390 px, and an axe scan with the popup open at 390 px and 1280 px, light and dark. None of that says whether
people understand it, and no screen reader was run. Test it with a few people
before you commit a product to it, and keep a labelled row ready as the fallback.

## Checklist before shipping a list page

1. Does the first screen show ranked results with no choice required?
2. Is the sort key printed in words, with how many items it covers?
3. Does every number carry its unit?
4. Is there one dominant element per row, in the same place on every row?
5. Does each filter show its applied value without being opened?
6. Is there a date for the list?
7. At 390 px, did the row keep its evidence and the controls fold away?
