# Design QA

## Comparison target

- Source visual truth:
  `/var/folders/9g/7wbr3g8573n2v6jw1dtx1ks40000gn/T/codex-clipboard-b9eef88c-a50b-433d-a687-f9f719618c68.png`.
- Existing component being matched: Theme Redefine's right-side gear and scroll
  percentage tools (`.right-side-tools-container`).
- Browser-rendered implementation:
  - Normal desktop state:
    `/private/tmp/output/blog-player-scroll-qa/desktop-aligned-visible.png`.
  - Hover/focus elevation state:
    `/private/tmp/output/blog-player-scroll-qa/desktop-hover.png`.
  - Page-bottom hidden state:
    `/private/tmp/output/blog-player-scroll-qa/desktop-footer-hidden.png`.
  - Mobile article player:
    `/private/tmp/output/blog-player-scroll-qa/mobile-player-unchanged.png`.
- Full comparison input:
  `/private/tmp/output/blog-player-scroll-qa/design-comparison.png`.
- Focused evidence: the lower viewport region in the normal and hover desktop
  captures clearly shows both fixed components and their shared bottom edge, so
  no separate enlarged crop was required.

## Environment

- Local Hexo preview: `http://localhost:4000/`.
- Browser: Codex in-app Browser; no fallback browser was used.
- Desktop viewport: `1440 × 900`.
- Mobile viewport: `390 × 844`.
- Route: `/2026/06/28/别了，前进大街2699号/`.
- States: article middle, elevated player, page bottom, return from page bottom,
  and mobile article player.

## Findings

No actionable P0, P1, or P2 differences remain.

- [P3] The in-app Browser does not retain a queryable `:hover` pseudo-state
  after its pointer-move call.
  - Classification: browser-test limitation. The identical hover/focus selector
    was activated through `:focus-within`; computed styles and the rendered
    capture confirm `translateY(-6px) scale(1.01)`, the accent border, and the
    stronger shadow. The production CSS applies the same declaration to
    `:hover` for fine pointers.

## Required fidelity surfaces

- Fonts and typography: passed. Player copy, time labels, and controls are
  unchanged; the new behavior does not alter type size, weight, wrapping, or
  truncation.
- Spacing and layout rhythm: passed. At `1440 × 900`, the player and right-side
  tools both use `bottom: 45px` (`5%`) and their measured bottom edges are both
  `855px`.
- Colors and visual tokens: passed. The hover/focus state reuses the site's
  burgundy accent, glass border, and shadow language.
- Image quality and asset fidelity: passed. The original album cover and the
  theme's Font Awesome icons are unchanged; no replacement assets were added.
- Copy and content: passed. Song title, lyric, progress, duration, and button
  labels are unchanged.

## Responsive and interaction evidence

- Normal desktop state:
  - Player bottom edge: `855px`; right-side tools bottom edge: `855px`.
  - Both are visible with `opacity: 1` and accept pointer input.
  - No horizontal overflow.
- Hover/focus elevation:
  - Transform: `translateY(-6px) scale(1.01)`.
  - Shadow: `0 24px 54px rgba(45, 35, 30, 0.22)`.
  - Border: `rgba(163, 31, 52, 0.22)`.
  - Playback toggled from play to pause while the state was active.
- Page bottom:
  - Theme side tools gained `hide`; the player mirrored the same class through
    a class observer.
  - Both reached `opacity: 0` and `pointer-events: none` with the same `0.2s`
    fade timing.
  - The hidden player also became `aria-hidden=true` and inert.
- Returning upward:
  - Both components removed `hide`, returned to `opacity: 1`, and the player
    returned to the accessible interaction path.
- Mobile:
  - Compact player remains `display: none`, `aria-hidden=true`, and inert.
  - Full article player remains visible after article navigation and before
    comments.
  - No horizontal overflow at `390px`.

## Comparison history

### Iteration 1

- [P2] The compact player used a fixed `24px` bottom offset while the right-side
  tools used `5%`; at `1440 × 900` their bottom edges differed by `21px`.
- [P1] At the page bottom, the right-side tools faded out but the compact player
  remained visible and interactive.
- Fix:
  - Changed the compact player's bottom offset to `5%`.
  - Mirrored the existing tools container's `hide` class with a
    `MutationObserver`, including accessibility state.
  - Added the requested hover/focus elevation state.

### Iteration 2

- Post-fix browser evidence shows identical bottom edges, synchronized hide and
  restore states, the intended elevated visual state, and unchanged mobile
  behavior. No actionable P0/P1/P2 issue remains.

## Browser checks

- Page identity: passed; expected article URL and title loaded.
- Blank-page check: passed; article, music player, and comments are present in
  the DOM snapshot.
- Framework overlay: passed; none present.
- Console health: passed for the custom player. The only warnings are the
  expected Giscus `Discussion not found` messages in local preview.
- Screenshot evidence: passed; normal, elevated, bottom-hidden, mobile, and
  combined comparison captures are recorded above.
- Interaction proof: passed; playback, page-bottom fade, upward restore, and
  responsive presentation were exercised.

## Implementation checklist

- [x] Player and right-side tools share the same bottom edge.
- [x] Player mirrors the right-side tools' page-bottom hide state.
- [x] Hidden player is non-interactive and inaccessible to assistive controls.
- [x] Fine-pointer hover elevates, scales, and strengthens the shadow.
- [x] Reduced-motion users do not receive the transition.
- [x] Mobile full-player behavior remains unchanged.
- [x] Production build and browser QA passed.

final result: passed
