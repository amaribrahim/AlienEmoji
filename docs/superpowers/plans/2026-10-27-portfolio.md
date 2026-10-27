# Portfolio implementation plan

Goal: Implement the user's agreed accordion portfolio at /portfolio/; change only the services link on the homepage. Local review only.

Architecture: Existing HTML/CSS/JavaScript, native audio/video, SVG waveforms generated from decoded PCM by FFmpeg. Authoritative sibling portfolio project folders are compiled into the site's portfolio directory. No framework or remote runtime dependency.

1. Content preparation: add a validated Python index/waveform builder and tests for stable folder IDs, project/media ordering, missing optional fields, missing assets, and folder addition/removal. Keep original asset provenance; prefer file over source for supplied metadata. Preserve explicit metadata and report uncertain items.
2. Presentation: add portfolio/index.html, portfolio.css and portfolio.js. Reuse site styles and shared navigation with page-local correction of relative links. Accessible single-open accordion; lazy source assignment; native playback exclusivity; SVG waveform with range input for pointer/touch/keyboard seeking, elapsed/total time, and animation-frame playhead.
3. Verify: run builder tests, rebuild supplied assets, browser-check desktop/mobile, keyboard, seeking, rapid playback/close transitions and no initial media downloads. Add content instructions and list unresolved assets. Review diff to ensure homepage only gets one link. No publishing.

Review focus: late media load after closing a panel; relative links on nested route; external sources with unavailable waveforms/CORS; empty metadata and media; safe stale folder cleanup.

Verification: completed all three tasks. Six Python content/waveform tests and two JavaScript URL/playback tests pass. Browser checks passed at desktop and 390px widths; physical touch device remains untested. Review findings fixed: stale play event race, literal URL encoding, source symlinks. Homepage exact-preservation check passed after removing the one added services link. Nothing published.
