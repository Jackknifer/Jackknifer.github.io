# Design QA

## Comparison target

- Source visual truth:
  - `/Users/apple/.codex/attachments/ee281477-66dd-44a4-adbc-b7b54277a9c7/image-1.jpg`
  - `/Users/apple/.codex/attachments/ee281477-66dd-44a4-adbc-b7b54277a9c7/image-2.jpg`
  - `/Users/apple/.codex/attachments/ee281477-66dd-44a4-adbc-b7b54277a9c7/image-3.png`
- Browser-rendered implementation:
  - `/tmp/blog-home-desktop.png`
  - `/tmp/blog-article-player.png`
  - `/tmp/blog-moments-desktop.png`
  - `/tmp/blog-home-mobile.png`
  - `/tmp/blog-moments-mobile.png`
- Full-view side-by-side comparison: `/tmp/blog-visual-comparison.png`
- Desktop viewport: `1920 × 1080`
- Mobile viewport: `390 × 844`
- State:
  - Light theme.
  - Homepage scrolled past the hero to the article, music, and weather grid.
  - Local song actively playing before navigating to an article.
  - Article page showing the persistent compact player.
  - 碎碎念 page showing all entries, plus tested search and month-filter states.

## Findings

No actionable P0, P1, or P2 differences remain.

- [P3] The reference pages include decorative petals, extra clock/calendar cards,
  and project-specific content that are absent from this implementation.
  - Location: full-page background and reference-only cards.
  - Evidence: the source images contain these additional visual elements, while
    the implementation keeps the existing blog content and requested widgets.
  - Classification: intentional scope difference. The user explicitly limited
    this update to music, weather, 碎碎念, navigation, and typography.
- [P3] The implementation retains the Redefine theme's header proportions and
  current blog imagery instead of cloning the reference site's identity.
  - Location: global header, homepage article cards, and profile card.
  - Evidence: `/tmp/blog-visual-comparison.png`.
  - Classification: acceptable adaptation to the existing product design system.

## Required fidelity surfaces

- Fonts and typography: passed. Display and article text use a Chinese serif
  stack with adjusted article size and line height; compact controls use the
  existing sans-serif UI treatment. Hierarchy and wrapping remain legible on
  desktop and mobile.
- Spacing and layout rhythm: passed. The desktop homepage uses the intended
  left profile/navigation, central article list, and right widget rail. At
  narrower widths the widgets stack without clipping. Card radii, padding,
  shadows, and vertical rhythm are visually coherent with the references.
- Colors and visual tokens: passed. Warm translucent music/weather surfaces,
  orange playback emphasis, violet timeline accents, and pink/blue moment tags
  preserve the reference hierarchy while fitting the existing theme.
- Image quality and asset fidelity: passed. The supplied album cover is used
  directly without placeholder art, stretching, or custom SVG substitution.
  Existing article imagery remains sharp and correctly cropped.
- Copy and content: passed. Player metadata, lyrics, weather labels, privacy
  fallback copy, timeline dates/tags, search placeholder, and record count are
  coherent in Chinese and reflect real blog content.
- Icons: passed. Existing Font Awesome icons are used consistently for
  navigation, playback, weather, search, and metadata.
- Responsiveness and accessibility: passed. Mobile width reported no horizontal
  overflow (`390px` viewport, `376px` document width). Controls have semantic
  buttons, labels, pressed states, and practical touch targets. The visually
  hidden homepage floating player is also removed from keyboard and
  accessibility navigation.

## Focused region evidence

Focused regions were inspected at their original screenshot resolution:

- Homepage music and weather cards:
  `/tmp/blog-home-desktop.png` against source image 1.
- Article compact player:
  `/tmp/blog-article-player.png` against source image 2.
- 碎碎念 search, filters, timeline line/markers, and card typography:
  `/tmp/blog-moments-desktop.png` against source image 3.
- Responsive stacking and fixed-player clearance:
  `/tmp/blog-home-mobile.png` and `/tmp/blog-moments-mobile.png`.

No additional crop files were required because the controls and typography were
clearly readable in the original-resolution captures.

## Comparison history

### Iteration 1

- Earlier finding: [P2] On the homepage, the compact floating player was
  visually transparent but still present in the accessibility tree, duplicating
  playback controls.
- Fix:
  - Added `inert` and `aria-hidden` page-state synchronization in
    `source/js/blog-experience.js`.
  - Added `visibility: hidden` to the homepage-only floating-player state in
    `source/css/blog-enhancements.css`.
- Post-fix evidence:
  - The refreshed homepage accessibility snapshot contained only the home music
    card controls.
  - `/tmp/blog-home-desktop.png` shows no duplicate floating player.

### Iteration 2

- Full-view comparison:
  `/tmp/blog-visual-comparison.png`.
- Result: no actionable P0, P1, or P2 visual mismatch. Remaining differences
  are the intentional P3 scope adaptations listed above.

## Primary interactions tested

- Started 刘森《雨夜》 and observed elapsed time and lyric synchronization.
- Navigated from homepage to an article while playback continued.
- Confirmed the homepage player becomes the compact bottom-right article player.
- Confirmed weather renders after geolocation fallback and exposes a retry
  control for requesting precise location.
- Searched 碎碎念 for `旧文章` and confirmed the result count changed to one.
- Selected `26 年 7 月` and confirmed only the July entry remained.
- Checked desktop and mobile navigation states and verified the top/left
  navigation item sets are identical.
- Confirmed “关于” is a direct link and has no GitHub submenu.

## Console review

- Custom music, weather, navigation, and moments code produced no console errors.
- The article page emitted the existing Giscus “discussion not found” local
  preview response; this is unrelated to the implementation and Giscus states
  that a discussion will be created when a comment or reaction is submitted.

## Implementation checklist

- [x] Homepage music widget and article/page floating player.
- [x] Local MP3, LRC lyrics, and album cover.
- [x] Visitor-location weather with permission-aware fallback.
- [x] 碎碎念 route with search and month filters.
- [x] Unified top and left navigation.
- [x] Direct 关于 link without GitHub submenu.
- [x] Serif typography and adjusted article sizing.
- [x] Desktop/mobile browser QA and production build.

final result: passed
