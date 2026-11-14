#!/usr/bin/env bash
# Builds the four sales sites into dist/<site>/ for Render static hosting.
#   bash build.sh            -> builds every site
#   bash build.sh dslhelp    -> builds one site
# Each site gets its own copy of the shared files (base.css, config.js, money.js)
# and its brand icons, so every Render static site is self-contained.
set -euo pipefail
cd "$(dirname "$0")"

# site folder -> icon set in icons/
declare -A ICONS=(
  [trucktalk]=trucktalk
  [dispatch]=haulwise
  [dslhelp]=dslhelp
  [centers]=speakup
)

build_site() {
  local site="$1" icons="${ICONS[$1]:-}"
  if [[ -z "$icons" || ! -f "$site/index.html" ]]; then
    echo "skip: $site (no index.html or no icon set)" >&2
    return 1
  fi
  rm -rf "dist/$site"
  mkdir -p "dist/$site/icons"
  cp -R "$site/." "dist/$site/"
  cp shared/base.css shared/config.js shared/money.js "dist/$site/"
  cp -R "icons/$icons/." "dist/$site/icons/"
  # Never ship editor or OS leftovers.
  find "dist/$site" \( -name '.DS_Store' -o -name '*.swp' -o -name '*~' \) -delete
  echo "built: dist/$site ($(find "dist/$site" -type f | wc -l | tr -d ' ') files)"
}

if [[ $# -gt 0 ]]; then
  for s in "$@"; do build_site "$s"; done
else
  for s in trucktalk dispatch dslhelp centers; do
    if [[ -f "$s/index.html" ]]; then build_site "$s"; else echo "skip: $s (not written yet)"; fi
  done
fi
