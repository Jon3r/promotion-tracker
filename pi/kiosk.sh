#!/usr/bin/env bash
set -euo pipefail

DEFAULT_URL="https://promotion-tracker-rose.vercel.app/gym"
TARGET_URL="${1:-${GYM_DISPLAY_URL:-$DEFAULT_URL}}"

export DISPLAY="${DISPLAY:-:0}"

# Disable screen blanking / DPMS power saving
if command -v xset >/dev/null 2>&1; then
  xset s off || true
  xset -dpms || true
  xset s noblank || true
fi

# Hide mouse cursor after brief inactivity
if command -v unclutter >/dev/null 2>&1; then
  unclutter -idle 0.5 -root >/dev/null 2>&1 &
fi

# Pick whichever Chromium binary is installed on Raspberry Pi OS / Debian
CHROMIUM_BIN=""
for candidate in chromium chromium-browser google-chrome; do
  if command -v "$candidate" >/dev/null 2>&1; then
    CHROMIUM_BIN="$candidate"
    break
  fi
done

if [[ -z "$CHROMIUM_BIN" ]]; then
  echo "Error: Chromium not found. Install chromium or chromium-browser first." >&2
  exit 1
fi

# Wait briefly for network / local server before launching kiosk
for _ in $(seq 1 30); do
  if command -v curl >/dev/null 2>&1; then
    if curl -fsS --max-time 3 "$TARGET_URL" >/dev/null 2>&1; then
      break
    fi
  else
    break
  fi
  sleep 2
done

# Clear any previous crash flag so Chromium doesn't show "Restore pages?"
PREFS_FILE="$HOME/.config/chromium/Default/Preferences"
if [[ -f "$PREFS_FILE" ]] && command -v sed >/dev/null 2>&1; then
  sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' "$PREFS_FILE" || true
  sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' "$PREFS_FILE" || true
fi

exec "$CHROMIUM_BIN" \
  --kiosk \
  --autoplay-policy=no-user-gesture-required \
  --noerrdialogs \
  --disable-infobars \
  --no-first-run \
  --disable-session-crashed-bubble \
  --disable-translate \
  --check-for-update-interval=31536000 \
  "$TARGET_URL"
