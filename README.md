# Kazu

Kazu is a free Japanese numbers trainer and counting practice web app for learning Japanese numerals, kanji, hiragana, and romaji. Practice counting from 0 to 1,000,000 with adaptive exercises, exam mode, instant feedback, and local progress tracking.

## Live version

<https://kazu.marmotan.ru/>

## Hosted at

`https://kazu.marmotan.ru/`

## Features

- Adaptive Japanese number practice for kanji, hiragana, romaji and Arabic numerals
- Learning and exam modes for Japanese numerals, counting and reading practice
- Number ranges from 0–10 up to 0–1,000,000
- Local profile, progress tracking, streaks, accuracy, response timing and mastery

## Run locally

```bash
python3 server.py
```

Open <http://localhost:8000>. To use another port: `python3 server.py 8080`.

## GitHub Pages

In the repository settings, open **Settings → Pages**, choose **Deploy from a branch**, select the `main` branch and the `/ (root)` directory. No build step is required.

## Roadmap

- **0.1:** ✓ numbers 1–10, mobile interface, answer checking, profile, and statistics.
- **0.2:** ✓ numbers 1–99, adaptive selection, streaks, and mastery percentage.
- **0.3:** ✓ hundreds and thousands, response timing, learning and exam modes.
- **1.0:** numbers, dates, time, money, counters, PWA installation, and full offline support.
