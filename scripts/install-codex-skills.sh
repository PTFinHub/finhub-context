#!/usr/bin/env bash
# Instala as skills do finhub-context em ~/.codex/skills.
# Idempotente: pode correr as vezes que forem precisas.
# Uso local:       bash scripts/install-codex-skills.sh
# Uso Codex cloud: colar no setup script do environment (ver README).
set -euo pipefail

REPO_URL="${FINHUB_CONTEXT_URL:-https://github.com/PTFinHub/finhub-context.git}"
REPO_DIR="${FINHUB_CONTEXT_DIR:-$HOME/.finhub-context}"
SKILLS_DIR="${CODEX_SKILLS_DIR:-$HOME/.codex/skills}"

if [ -d "$REPO_DIR/.git" ]; then
  git -C "$REPO_DIR" pull --ff-only
else
  git clone --depth 1 "$REPO_URL" "$REPO_DIR"
fi

mkdir -p "$SKILLS_DIR"

count=0
for skill in "$REPO_DIR"/plugins/*/skills/*/; do
  [ -d "$skill" ] || continue
  name="$(basename "$skill")"
  ln -sfn "${skill%/}" "$SKILLS_DIR/$name"
  count=$((count + 1))
done

echo "finhub-context: $count skills ligadas em $SKILLS_DIR"
