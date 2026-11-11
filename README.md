# Iqa‘ quiz

A browser-based quiz for learning the 43 Arabic rhythmic cycles in [Maqam World’s Iqa‘ Index](https://www.maqamworld.com/en/iqaa.php). Built with plain HTML, CSS, and JavaScript—no framework, build step, account, or backend.

Notation images and recordings load directly from Maqam World. The repository contains the application and source catalog, **not copies of those media files**. An internet connection is required to display notation and play audio.

## Use online

Open [Iqa‘ quiz](https://ptrkmrsck.github.io/iqa-quiz/) on your phone or desktop. No local server is needed.

GitHub Pages deploys automatically when changes are pushed to `main`. The deployment includes the two quiz pages, the Resources and How it works pages, their scripts and styles, and the rhythm and jins catalogs; media continues to load from Maqam World.

## Run locally

Install Node.js 18 or later, then run:

```sh
npm start
```

Open [localhost:3000](http://localhost:3000). Installing dependencies is only necessary for development tests.

To use a phone on the same trusted Wi-Fi network, open `http://YOUR_COMPUTER_LOCAL_IP:3000`. The development server listens on the local network. Set `PORT` to use a different port.

## Practice

**Practice direction** in Settings defaults to **Identify**. **Perform** shows the name so you can sing or play it before selecting **Reveal**. Reveal shows the transcription and starts a randomly selected musical example for the current form (or offers Play if the browser blocks autoplay). Jins notation is playable and includes optional reference-note playback; notes and recordings stop each other. Rate yourself **Again** or **Got it**; Again returns the item later in the round. Direction is saved in browser settings and selection links. Switching directions keeps the current item and form, and preserves Identify cue and answer settings.

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
- `how-it-works.html`: practice, settings, playback, and shortcut guide.
- `resources.html`: links to Maqam World, Inside Arabic Music, and related learning tools.
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

## Jins quiz and catalog

`jins.html` is a separate section sharing the quiz engine, drawer, retries, and round summaries with Iqa. All **24 ajnas** are available, with **25 notation versions**. ‘Ajam randomly uses its 5-note or 3-note version per question, with recordings matched to that version. Each section has its own settings and shareable selection links.

Notation, reference notes, and musical examples are independent toggles. Playing reference notes pauses the musical example; playing the example stops the reference notes. Reference playback starts and ends on the tonic. Most defined spans play upward then down; Upper Rast and Upper ‘Ajam descend first. Extended outlines are used where a core alone cannot distinguish a jins or where its size is undefined. Whenever notation is shown, every displayed note can be tapped or activated with the keyboard, including baggage and alternatives. The entire notation image is divided into full-height touch areas at the midpoints between notes: tapping anywhere plays the nearest note horizontally and briefly highlights its notehead. No permanent circles are shown. Tonic and ghammaz labels appear after a correct answer; reference sequences use the documented study mappings. Audio starts only on request. Reference notes stop on Next, restart, opening Settings, or leaving the page.

`jins-study.js` documents per-version tonic, ghammaz possibilities, reference outlines, and special cases, checked against the source descriptions. `jins-content.js` applies these mappings and defines the presets. `pitch-player.js` generates notes at the imported frequencies, with short fades to avoid clicks during rapid tapping. Note sound offers Sine (default), Square, Sawtooth, and Triangle for reference sequences and individual notes. Tone is saved in Jins settings and shared links; it does not alter musical recordings. No equal-temperament conversion or audio backup files are used. The Musical examples audio option randomly selects an excerpt from the current jins’s source page. Recordings loop, remain fixed during retries, and reveal their title and credits after a correct answer. Playback uses Maqam World URLs, not the ignored backups.

`jins.json` imports all 24 ajnas from the English Jins Index.

Selection presets include Foundations (eight starting points), All ajnas, D-based comparisons, related-jins comparisons around ‘Ajam, Rast, Hijaz, Nahawand, Sikah, and Saba, and flexible or undefined spans. Comparison sets are teaching groupings, not a claim that Maqam World classifies them as formal families. Existing saved selections remain intact; new visits default to Foundations.

The catalog contains 25 notation diagrams, 178 clickable note definitions, 153 musical-example entries, and 24 pronunciation entries. Each diagram includes its original image URL and dimensions, note coordinates, exact source frequencies in Hz, original note labels, and adjacent tuning comments. Source explanations and recording credits are retained for review. Frequencies are Maqam World's per-diagram reference values, not a universal tuning table.

Refresh metadata and optionally download audio backups:

```sh
python3 scripts/import-jins.py
python3 scripts/import-jins-audio.py
python3 -m unittest discover -s tests -p 'test_*.py'
```

The metadata importer reads PNG dimensions without saving the images. The audio importer stores 175 unique source files (musical excerpts and pronunciations) under ignored `assets/jins-audio/`; two pronunciation URLs are shared across entries. The catalog uses remote URLs only. Existing valid backups are reused.

Special cases handled by the study mappings:

- ‘Ajam has separate 5-note and 3-note diagrams.
- Notation includes baggage and alternative notes. Source note order must not automatically become the reference-note playback sequence.
- Upper Rast and Upper ‘Ajam place the tonic at the top of their core scales.
- Saba and Saba Zamzam offer two ghammaz possibilities; several other ajnas have no defined ghammaz or size.
- Sikah Baladi is explicitly described as difficult to notate accurately and best learned by ear.
- Source tuning comments sometimes flag uncertainty or possible future changes. Preserve their assigned values rather than silently correcting them.

The raw import retains its `unreviewed` status; `jins-study.js` holds the separate source-based study mapping so refreshing the import does not overwrite it. Lami and Hijaz Murassa‘ use an extra distinguishing note rather than an identical core to Kurd and Hijaz. Undefined spans use explicitly labeled extended reference outlines, not invented formal scales. Ghammaz labels distinguish multiple possibilities and leave unspecified roles unset. These synthesized outlines are learning references, not performances of characteristic melodic development. Musical examples follow Maqam World's classifications; the excerpts have not been independently reviewed by a musician.

## Credits and licensing

Rhythm information, notation, and musical examples come from [Maqam World](https://www.maqamworld.com/), with content by Johnny Farraj. Tabla demonstrations are performed by Faisal Zedan. Original source links and recording credits are preserved in the catalog.

This is an independent study tool, not an official Maqam World project. Third-party material belongs to its respective rights holders; linking to it does not grant permission to redistribute it.

No open-source license has been selected for the application code (`UNLICENSED` in `package.json`).

## TODO

- Add a setting for the number of multiple-choice answers, shared by Iqa and Jins. Cap the count at the selected eligible items, persist it in settings and selection links, and update keyboard shortcuts accordingly. Keep the current maximum of four until implemented.
