#!/usr/bin/env bash
set -euo pipefail

DEFAULT_HOSTED_URL="https://promotion-tracker-rose.vercel.app/gym"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

LOCAL_MODE=false
TARGET_URL="$DEFAULT_HOSTED_URL"

if [[ "${1:-}" == "--local" ]]; then
  LOCAL_MODE=true
  TARGET_URL="http://localhost:3000/gym"
elif [[ -n "${1:-}" ]]; then
  TARGET_URL="$1"
fi

echo "==> Installing Raspberry Pi kiosk packages..."
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y x11-xserver-utils unclutter curl || true
  if apt-cache show chromium >/dev/null 2>&1; then
    sudo apt-get install -y chromium
  else
    sudo apt-get install -y chromium-browser
  fi
fi

chmod +x "$SCRIPT_DIR/kiosk.sh"

if [[ "$LOCAL_MODE" == "true" ]]; then
  echo "==> Setting up local Next.js server ($REPO_DIR)..."
  if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js 18+ is required for --local mode." >&2
    exit 1
  fi

  cd "$REPO_DIR"
  npm ci
  npm run build

  SERVICE_USER="${SUDO_USER:-$USER}"
  NPM_BIN="$(command -v npm)"
  TMP_SERVICE="$(mktemp)"
  sed \
    -e "s|User=pi|User=${SERVICE_USER}|g" \
    -e "s|/opt/promotion-tracker|${REPO_DIR}|g" \
    -e "s|/usr/bin/npm|${NPM_BIN}|g" \
    "$SCRIPT_DIR/bjj-gym-display.service" > "$TMP_SERVICE"

  sudo cp "$TMP_SERVICE" /etc/systemd/system/bjj-gym-display.service
  rm -f "$TMP_SERVICE"

  sudo systemctl daemon-reload
  sudo systemctl enable bjj-gym-display.service
  sudo systemctl restart bjj-gym-display.service
  echo "==> Local service started at http://localhost:3000/gym"
else
  echo "==> Hosted mode: Chromium will load $TARGET_URL (no local server needed)"
fi

AUTOSTART_DIR="$HOME/.config/autostart"
mkdir -p "$AUTOSTART_DIR"
cat > "$AUTOSTART_DIR/bjj-gym-kiosk.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=BJJ Gym Display
Exec=${SCRIPT_DIR}/kiosk.sh ${TARGET_URL}
X-GNOME-Autostart-enabled=true
EOF

# Also append to Wayfire autostart if Raspberry Pi OS Bookworm+ uses Wayfire
WAYFIRE_INI="$HOME/.config/wayfire.ini"
if [[ -f "$WAYFIRE_INI" ]] && ! grep -q "bjj-gym-kiosk" "$WAYFIRE_INI"; then
  {
    echo ""
    echo "[autostart]"
    echo "bjj-gym-kiosk = ${SCRIPT_DIR}/kiosk.sh ${TARGET_URL}"
  } >> "$WAYFIRE_INI"
fi

echo "==> Done! Reboot or run: ${SCRIPT_DIR}/kiosk.sh ${TARGET_URL}"
