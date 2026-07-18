# Design QA

## Comparison target

- Source visual truth:
  - Current oversized desktop regression supplied by the user:
    `/var/folders/9g/7wbr3g8573n2v6jw1dtx1ks40000gn/T/codex-clipboard-db24f6c1-39de-4401-97ff-ba5c7adf8927.png`.
  - Previous compact desktop player baseline:
    `/tmp/blog-article-player.png`.
  - Existing mobile full-player baseline:
    `/private/tmp/output/playwright/blog-mobile-redesign/article-player-mobile.png`.
- Browser-rendered implementation:
  - Desktop article at `1440 × 900`:
    `/private/tmp/output/blog-player-responsive-qa/article-desktop-compact.png`.
  - Mobile article at `390 × 844`:
    `/private/tmp/output/blog-player-responsive-qa/article-mobile-full-player.png`.
- Focused regions:
  - `/private/tmp/output/blog-player-responsive-qa/article-desktop-player-crop.png`.
  - `/private/tmp/output/blog-player-responsive-qa/article-mobile-player-crop.png`.
- Combined comparison input:
  `/private/tmp/output/blog-player-responsive-qa/design-comparison.png`.
- State: article page near its previous/next navigation and comments; desktop
  compact player fixed at the lower-left; mobile full player between navigation
  and comments; playback toggled in both responsive states.

## Environment

- Local Hexo preview: `http://localhost:4000/`.
- Browser path: Codex in-app Browser; no fallback browser was used.
- Desktop checks: `1440 × 900` (plus dimension reads at the requested desktop
  breakpoint).
- Mobile checks: `390 × 844`.
- Theme note: the historical source capture is light while the browser session
  retained the user's dark theme. Geometry, density, controls, and responsive
  presentation were compared; both variants use the existing theme tokens.

## Findings

No actionable P0, P1, or P2 differences remain.

- [P3] Compact-player color differs between the historical light reference and
  the current dark browser state.
  - Classification: expected theme-state difference. Border, fill, text, and
    shadow all use the existing light/dark tokens.
- [P3] Perceived loudness remains partly dependent on the visitor's system and
  browser volume.
  - Classification: expected platform variance. The site-side default is now
    explicitly set to `35%` instead of the browser default `100%`.

## Required fidelity surfaces

- Fonts and typography: passed. Compact title, lyric, time labels, and mobile
  full-player hierarchy reuse the prior component styles without wrapping or
  clipping.
- Spacing and layout rhythm: passed. Desktop player measures `280px` wide and
  sits `24px` from the left and bottom viewport edges. Mobile retains the full
  card after article navigation and before comments.
- Colors and visual tokens: passed. The compact player uses the same glass,
  accent, border, and shadow tokens as the existing component, including dark
  mode.
- Image quality and asset fidelity: passed. The original album cover is reused
  directly at both sizes with no placeholder or regenerated asset.
- Copy and content: passed. Song title, artist, lyric, progress, duration, and
  control labels remain synchronized between desktop and mobile surfaces.

## Responsive and interaction evidence

- Desktop article:
  - Compact player display is `grid`; position is `fixed`.
  - Measured left offset `24px`, bottom offset `24px`, width `280px`.
  - The old full-width article player is `display: none` and removed from the
    accessibility interaction path.
- Mobile article:
  - Compact player is `display: none` and `aria-hidden=true`.
  - Full article player is visible, accessible, and ordered after navigation
    and before comments.
  - No horizontal overflow at `390px`.
- Playback:
  - Desktop play changed the control to pause and advanced elapsed time.
  - Mobile toggle changed the same shared audio state and brought the full card
    into view.
  - Default audio volume is assigned to `0.35` when the global audio element is
    created.

## Comparison history

### Iteration 1

- [P1] The desktop article page rendered the mobile-style full-width music card
  below navigation, materially increasing page length and differing from the
  user's requested compact desktop behavior.
- Fix:
  - Restored the prior compact player markup and desktop glass-card styling.
  - Scoped it to desktop article pages at `min-width: 769px`.
  - Kept the full article card only at `max-width: 768px`.
  - Added breakpoint-aware `inert` and `aria-hidden` synchronization.
- Post-fix evidence:
  - Desktop: `article-desktop-compact.png` and
    `article-desktop-player-crop.png`.
  - Mobile: `article-mobile-full-player.png` and
    `article-mobile-player-crop.png`.
  - Combined: `design-comparison.png`.

### Iteration 2

- Full-view and focused comparison found no remaining actionable P0/P1/P2
  issue. Desktop and mobile each expose exactly one usable player surface.

## Console review

- No custom player errors or warnings were emitted.
- The only warning was the expected local-preview Giscus `Discussion not
  found` message; it is unrelated to the player change.

## Implementation checklist

- [x] Desktop article compact player restored at lower-left.
- [x] Desktop full-width article player hidden.
- [x] Mobile full-width article player preserved.
- [x] Hidden responsive surface removed from accessibility interaction.
- [x] Default music volume reduced to 35%.
- [x] Desktop/mobile playback interactions verified.
- [x] Production build and visual comparison passed.

final result: passed
