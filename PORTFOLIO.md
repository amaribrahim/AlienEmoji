# Portfolio content and preview

The page is `/portfolio/`. Publish through the existing site repository’s `main` branch. The homepage change is only the “Explore samples of our work” link in Services.

## Source of truth

Edit `../portfolio/<project-id>/project.json` and its `media/` folder (relative to this site repository). The initial supplied content is already imported: 14 projects, 42 audio tracks, 3 videos. There is no demonstration content. The sibling `Portfolio Tools/portfolio_config.json` and spreadsheet are historical import inputs, **not** ongoing content sources. Do not rerun the old sync/import scripts over edited project folders.

The builder prepares a deployable copy in this site's `portfolio/`, including the generated index. Keep the authoritative sibling folder backed up. Page HTML/CSS/JS live in the site's `portfolio/` and survive rebuilds. Do not edit the generated copies of project folders in the site; rebuilds replace them.

## Rebuild the index and waveforms

From `AlienEmoji Site`:

```sh
python3 tools/build_portfolio.py
```

Requires Python 3 and FFmpeg (`ffmpeg` on PATH). No frontend packages or build framework are needed. The command validates references, generates real waveform peaks from decoded audio, writes `waveforms/*.json` beside each project's source assets, rebuilds both indexes, and copies project folders into the site. Audio hashes cache waveforms: changed files regenerate automatically. Missing media stops the build with its filename; missing optional cover/metadata is fine. Project folders must be real folders, not symlinks.

You can select another content source with `--source /absolute/path/to/portfolio`. The source and output must be separate. The generated `.generated-projects.json` tracks which output folders the builder owns; keep it with the site source. Removing a source folder and rebuilding removes its indexed entry and its generated output folder. Page files and unrelated output folders are preserved.

## Add or remove a project

Create `../portfolio/my-project/project.json` and `../portfolio/my-project/media/`. Use lowercase hyphenated folder names. The folder name and `id` must match and remain stable. Copy this metadata, replacing example values; it is a documentation example, not rendered demo content:

```json
{
  "id": "my-project",
  "title": "My Project",
  "company": "Studio name",
  "year": "2026",
  "description": "A short project description.",
  "contribution": "What I contributed.",
  "order": 15,
  "featured": false,
  "featuredOrder": 1,
  "links": [{"label": "Game website", "url": "https://example.com"}],
  "media": [
    {"title": "Main Theme", "type": "audio", "file": "media/theme.mp3", "order": 1, "text": "Optional context."}
  ]
}
```

Then rebuild. To remove a project, move its folder outside the source directory (or remove it) and rebuild. Adding media requires the file plus a `media` entry; unlisted files are not automatically displayed.

## Ordering and optional fields

- `featured: true` projects come first, sorted by `featuredOrder`, then `order`, then title. Other projects use `order`, then title. Smaller numbers come first. All supplied projects had a `featuredOrder`, so their original sequence was preserved with `featured: true`; set it false to move an item into the nonfeatured group. The visual presentation is identical.
- Media use numeric `order`; equal/missing values retain their JSON array order.
- Omit empty company, year/date, description, contribution, links or media. `date` takes precedence over `year`.
- Add `cover.jpg`, `.jpeg`, `.png`, `.webp`, `.avif` or `.gif`, or set `cover` explicitly. Set `coverAlt` for descriptive alternative text. No image placeholders are shown.
- Local videos get a cached JPEG cover automatically during rebuild, stored in each project’s `posters/` folder. To override it, set `poster` to your chosen local image or external image URL in the media metadata. External videos need an explicit `poster`.
- Media types: `audio`, `music`, `sound-design`, `video`, `image`. Use `text` (or `description`) for explanatory text, `alt` for images and optional `poster` for video.
- `uncertain` accepts a human-readable note on a project or media item. It is displayed as “To confirm” and included in `portfolio/content-warnings.txt`.
- Existing `source` fields describe original filenames; `file` takes precedence. For new external media, use `source: "https://…/track.mp3"` without `file`, or use an external URL in `file`.

## External media

Use direct playable audio/video URLs, not YouTube, Vimeo or SoundCloud webpage URLs. Put service/article/game pages under labeled `links`. Third-party servers must allow playback and byte-range requests; external waveform JSON must allow CORS.

For external audio, supply `waveform` pointing to local or hosted JSON with `{"duration": 123.4, "peaks": [0.1, 0.8, 0.3]}` (normalized real amplitude peaks, 0–1). Practical workflow: prepare from a local audio file with the builder, retain its generated waveform, then change the media source to the hosted URL and set that waveform path. If waveform data is absent or fails, the page flags that fact and uses native controls rather than inventing a waveform. All supplied tracks have generated waveforms.

## Local preview and checks

```sh
python3 tools/preview_portfolio.py
```

Open `http://127.0.0.1:8766/portfolio/`. This local-only server supports HTTP byte ranges, needed for accurate seeking and duration. A basic `python -m http.server` does not support them. The eventual host should also support byte ranges. Stop preview with Ctrl+C.

```sh
python3 -m unittest discover -s tests
node --test tests/portfolio-core.test.mjs
```

Browser QA performed in the in-app browser: all 14 initially collapsed; Enter/Space heading operation; single-open behavior; no audio elements or sources on initial load; no audio sources assigned when opening an audio project; waveform seeking before/while playing; elapsed time and playhead alignment; audio/video exclusivity; pause on project close/switch; desktop layout and a 390px mobile-width iframe; metadata wrapping and projects without media. Native range controls provide keyboard and touch input; a physical touch device has not been tested. MP3 and Ogg playback plus supplied MP4 clips were exercised. No exhaustive cross-browser/device test was performed.

## Content items for review

- Flick Bowling 2 and Top Chef: no media supplied; description and links render normally.
- Bob the Builder and Galaxy: release status unconfirmed in supplied metadata; visibly flagged.
- No cover images were supplied; none are required.
- Fuzion is described in source metadata as unreleased; retain that context when reviewing its samples.
- External articles and historical release claims were carried over from supplied records, not independently verified.
