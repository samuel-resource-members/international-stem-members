#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit 1
if [[ -x /usr/local/bin/python3 ]]; then
  exec /usr/local/bin/python3 scripts/library_browser.py
else
  exec python3 scripts/library_browser.py
fi
