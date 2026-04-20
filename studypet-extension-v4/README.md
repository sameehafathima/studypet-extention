# 🌸 StudyPet v4.0 "Bloom" — Chrome Extension

Your adorable pink study companion — now with **evolution, heatmaps, site tracking, Lo-Fi beats, context-menu notes, keyboard shortcuts and a break-time mini-game**.

---

## 🚀 Install

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `studypet-extension-v4/` folder
5. Pin the pink paw icon from the puzzle menu 🧩

> ✅ v4 ships with a fixed, correctly-parsed `manifest.json`. If v3 wouldn't load for you, that's because `exclude_matches` contained invalid patterns (`chrome://*/*`, `chrome-extension://*/*`) that Chrome MV3 rejects. Fixed here by using explicit `http/https/file` match patterns — which is the correct MV3 approach (content scripts already can't run on `chrome://` so exclude isn't needed).

---

## ✨ What's new in v4.0

| Feature | How to use |
|---|---|
| 🐰 → 🐱 → 🐲 → 🔥 **Pet evolution** | Auto-evolves at level 5 / 10 / 20 — toast notification + badge on New Tab |
| 🔥 **Focus heatmap** | GitHub-style 12-week grid on New Tab shows your study streaks |
| 📊 **Per-site time tracker** | New Tab shows top sites & minutes spent today (last 30 days stored) |
| 🎵 **Lo-Fi beats** | In Timer → sound chip "Lo-Fi" (fully synthesised, no internet) |
| ⌨️ **Keyboard shortcuts** | `Alt+Shift+F` focus toggle · `Alt+Shift+P` hide pet · `Alt+Shift+G` mini-game |
| 📝 **Context-menu notes** | Highlight text on any page → right-click → "🌸 Save to StudyPet notes" |
| 🚫 **Quick block site** | Right-click page → "🚫 Add this site to StudyPet blocklist" |
| 💡 **Daily affirmation** | Deterministic per-day affirmation on New Tab (no repeats same day) |
| ⏳ **Auto long-break cycle** | Every 4th pomodoro triggers a long break automatically |
| 🫧 **Bubble Pop mini-game** | Break-time reflex game with combo system, high score, pet XP reward |

All v3 features retained: Pomodoro, site blocker, weekly stats, pet XP/level, tasks, draggable desktop pet, ambient sounds (white/pink/brown/rain + lofi), dark mode, import/export, badges, new-tab companion, pet overlay chatter.

---

## 📁 Files

```
studypet-extension-v4/
├── manifest.json        → MV3 config (fixed match patterns, commands, contextMenus)
├── popup.html / popup.js → Main UI (6 tabs)
├── background.js        → Blocker, alarms, tracking, commands, context menu, evolution
├── content.js           → Draggable desktop pet overlay
├── pet-overlay.css      → Pet styling + animations
├── blocked.html         → Shown when a blocked site is visited
├── offscreen.html       → Hidden page for MV3 audio playback
├── offscreen.js         → Web Audio ambient synthesis (incl. Lo-Fi beats)
├── newtab.html/.js      → Custom New Tab: clock, quote, affirmation, heatmap, site tracker
├── minigame.html/.js    → Bubble Pop break mini-game
├── icons/               → 16 / 32 / 48 / 128 PNG icons
└── README.md
```

---

## 🔒 Permissions explained

- `storage` — save your pet, settings, history locally
- `alarms` — session timers, hydration reminders, site-time flushing
- `tabs` / `activeTab` — detect active site for time tracker & tab chatter
- `scripting` + `<all_urls>` — inject the draggable desktop pet
- `notifications` — session + evolution + hydration toasts
- `declarativeNetRequest` — the real site blocker
- `offscreen` — play ambient noise via a hidden audio context
- `contextMenus` — right-click "save to notes" / "block site"
- `idle` — pause time-tracking when you walk away

Nothing is ever sent to a server. Everything runs locally.

---

## 🌸 Made with love for productive studying
