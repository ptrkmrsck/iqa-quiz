# Iqa‘ quiz

A browser-based quiz for learning the 43 Arabic rhythmic cycles in [Maqam World’s Iqa‘ Index](https://www.maqamworld.com/en/iqaa.php). Built with plain HTML, CSS, and JavaScript—no framework, build step, account, or backend.

Notation images and recordings load directly from Maqam World. The repository contains the application and source catalog, **not copies of those media files**. An internet connection is required to display notation and play audio.

## Use online

Open [Iqa‘ quiz](https://ptrkmrsck.github.io/iqa-quiz/) on your phone or desktop. No local server is needed.

GitHub Pages deploys automatically when changes are pushed to `main`. The deployment includes only `index.html`, `styles.css`, `app.js`, and `rhythms.json`; media continues to load from Maqam World.

## Run locally

Install Node.js 18 or later, then run:

```sh
npm start
```

Open [localhost:3000](http://localhost:3000). Installing dependencies is only necessary for development tests.

To use a phone on the same trusted Wi-Fi network, open `http://YOUR_COMPUTER_LOCAL_IP:3000`. The development server listens on the local network. Set `PORT` to use a different port.

## Practice

Choose rhythms individually or select a preset. Presets apply immediately; editing the selection changes its label to **Custom selection**. **Random** chooses an equally sized set of eligible rhythms, or four if the selection is empty.

Three independent settings control each question:

| Setting | Options |
| --- | --- |
| Transcription | Show or Hide |
| Audio | None, Tabla demonstrations by Faisal Zedan, or Musical examples |
| Answers | Multiple choice or Recall |

Audio loops. Autoplay is off by default and can be enabled in the Audio section. Browsers may require a manual Play action before allowing autoplay.

In multiple choice, wrong choices are disabled so you can try again without changing the question or interrupting playback. In Recall, reveal the answer and mark **Again** or **Got it**. Missed rhythms return later in the round. Counters track answer attempts during the current round. At the end, a summary lists missed rhythms; **Practice missed rhythms** starts a fresh round of those rhythms without changing your selection.

Each question randomly selects a form and a matching recording. The form label and alternate names appear after a correct answer; hidden notation is revealed then too. Changing quiz settings preserves the current rhythm, form, and progress. Changing the rhythm selection or restarting begins a new round.

Settings open in a right-side overlay drawer on every screen size, without moving the quiz. Close it with the Close button, an outside tap, or Escape.

Keyboard shortcuts: **1–4** choose an answer, **Space** plays or pauses audio, and **Enter** advances after answering. Shortcuts are inactive while Settings is open or while editing a field.

### Presets

- **Common rhythms** (default): Ayyub, Baladi, Fallahi, Malfuf, Maqsum, Masmudi Kabir, Sa‘idi, Wahda, and Wahda w-Nuss. A practical selection based on Maqam World’s descriptions of folk, popular, and tarab repertoire—not a statistical ranking.
- **Even & triple meters:** even beat counts, plus 3/4 and 3/8, including long even cycles.
- **Odd meters:** odd beat counts greater than three. This is a numerical grouping; 10/8 is included in Even & triple meters.

Presets use each rhythm’s index meter. Fresh visits start with Common rhythms. **Copy selection link** stores the selection and quiz options in the URL; opening that link restores them. A localhost link requires the recipient to run the app locally.

Settings and practice counts are stored in the browser, without an account or synchronization. Clearing browser storage removes them.

## Development

```sh
npm ci
npx playwright install chromium
npm test
```

Tests cover desktop, tablet, and mobile behavior, including matched forms, retrying answers, autoplay, looping, presets, and the mobile drawer. Remote media requests are replaced with test fixtures, so tests do not require network access or downloaded backups. They reject requests to local backup paths.

### Project files

- `index.html`, `styles.css`, `app.js`: interface and quiz logic.
- `rhythms.json`: rhythm names, meters, alternate names, form mappings, media URLs, and credits.
- `scripts/serve.js`: local development server.
- `scripts/alternate-names.json`: reviewed alternate-name mapping.
- `scripts/import-rhythms.py`, `scripts/import-audio.py`: optional catalog refresh and backup tools.
- `tests/`: browser tests and media fixtures.

### Media and optional backups

The app uses `notationSource` for images and `source` for audio. Catalog fields containing `assets/…` paths identify optional local backups; they are not used for playback or display. There is no automatic local fallback.

Both backup directories are excluded from Git:

```text
assets/audio/
assets/notation/
```

Neither directory is needed to run the app or its tests. Do not force-add backups to Git. `.gitignore` does not remove files that have already been committed.

For maintenance, Python 3 and curl are required:

```sh
python3 scripts/import-rhythms.py
python3 scripts/import-audio.py
```

These commands contact Maqam World, refresh the catalog, and download backups into the ignored directories. Review catalog changes before committing. Form mappings follow the source page sections. Two tempo variants—faster Ciftetelli and slower Fox—have no separate source transcription; the app notes this instead of showing mismatched notation. Forms without a recording in the selected audio category are excluded from new questions.

## Credits and licensing

Rhythm information, notation, and musical examples come from [Maqam World](https://www.maqamworld.com/), with content by Johnny Farraj. Tabla demonstrations are performed by Faisal Zedan. Original source links and recording credits are preserved in the catalog.

This is an independent study tool, not an official Maqam World project. Third-party material belongs to its respective rights holders; linking to it does not grant permission to redistribute it.

No open-source license has been selected for the application code (`UNLICENSED` in `package.json`).
