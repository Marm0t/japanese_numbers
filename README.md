# Kazu

A static, adaptive Japanese number trainer. It supports selectable ranges from 0–10 to 0–1,000,000, response timing, learning and exam modes, a local profile, and statistics stored in `localStorage`.

## Live version

<https://marm0t.github.io/japanese_numbers/>

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
