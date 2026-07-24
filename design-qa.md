# Design QA

## Comparison target

- Archive source visual truth: `/var/folders/9g/7wbr3g8573n2v6jw1dtx1ks40000gn/T/TemporaryItems/NSIRD_screencaptureui_nCMr2p/截屏2026-07-24 16.17.38.png`
- Moments source visual truth: `/var/folders/9g/7wbr3g8573n2v6jw1dtx1ks40000gn/T/codex-clipboard-bd865817-d845-41df-8752-c2420359aaad.png`
- Archive implementation: `/private/tmp/output/blog-content-refinement-qa/archive-desktop.png`
- Moments implementation: `/private/tmp/output/blog-content-refinement-qa/moments-desktop.png`
- Mobile implementations:
  - `/private/tmp/output/blog-content-refinement-qa/archive-mobile.png`
  - `/private/tmp/output/blog-content-refinement-qa/moments-mobile.png`

## Viewport and normalization

- Desktop CSS viewport: `1280 × 900`; browser captures: `1266 × 890`.
- Mobile CSS viewport: `390 × 844`.
- Archive reference pixels: `1942 × 1028`.
- Moments reference pixels: `2258 × 1202`.
- The references are layout-direction examples, not same-site pixel targets. No density-based pixel matching was used because the user explicitly requested selective adaptation rather than full reproduction.
- State: light theme, default filter, first viewport after the page transition completed.

## Full-view comparison evidence

- Archive preserves the reference's readable left-date/right-title relationship, but intentionally removes its descriptions and highlighted row treatment to stay consistent with the existing Hexo archive data.
- Moments preserves the reference's thin left rail, date node, date badge and content-card rhythm. Comments, reactions and publishing controls were intentionally omitted because the current site has no matching backend data.
- All six content pages use a `920px` desktop shell and the same title origin. Measured title origin is `x=212, y=143` for 近况、动态、归档、标签、分类、关于.
- Focused crops were not required: the full-view captures keep the title, date column, timeline node, card boundary, avatar and typography readable.

## Required fidelity surfaces

- Fonts and typography: existing blog serif remains the primary content/title face; dates, times and controls use the site sans stack. Weight and line-height remain readable on desktop and mobile.
- Spacing and layout rhythm: title padding, shell width, border radius and interior margins are shared. Archive uses compact rows; moments uses grouped day sections without horizontal overflow.
- Colors and visual tokens: page shells and cards use the theme's native background and border variables. Muted mauve and warm taupe remain limited to small labels and states; stronger wine red remains reserved for interaction states.
- Image quality and assets: moments use the configured GitHub avatar URL with deterministic centered square cropping. Browser verification reported a loaded `460 × 460` source image.
- Copy and content: existing archive titles and moment content are unchanged. Moments add date, weekday and time labels derived from each Markdown entry.

## Comparison history

1. First pass found one P2 consistency issue: moments still inherited an older transparent-container rule and centered title padding, producing title origin `x=221, y=170` while the other pages used `x=212, y=143`.
2. Removed the obsolete moments-only container/title overrides and applied the shared content shell.
3. Post-fix measurements show the same shell width and title origin across all six target pages, with no desktop or mobile horizontal overflow.
4. Follow-up refinement removed the custom page tint, reduced archive date/title spacing, baseline-aligned each row and added URL-only link/music parsing.

## Findings

- No remaining P0, P1 or P2 visual differences within the requested selective-reference scope.
- P3: the Theme Redefine side-tools button can visually approach the lower-right edge of a moments card on a narrow mobile viewport. This is pre-existing behavior and outside the requested content-page layout change.

## Interaction and runtime checks

- Month filter: selecting `26 年 7 月` shows one card and one date group.
- Search empty state: searching for a missing phrase shows zero cards, zero date groups and the empty state.
- Search reset: clearing the query restores all three cards.
- Archive date-to-link distance is `64px` on desktop and `56px` on mobile; both layouts use baseline alignment.
- Avatar source is the configured GitHub URL. The loaded `460 × 460` image is centered inside its frame with only the intended `1px` border inset.
- URL-only share cards preserve the exact outbound URL and display its real domain. URL-only music cards display the real provider domain; direct audio URLs add native playback controls.
- Page identity, meaningful content, no framework overlay, no horizontal overflow and console warnings/errors all passed.

final result: passed
