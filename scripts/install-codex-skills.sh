#!/usr/bin/env bash
# Liga as skills do finhub-context a ~/.codex/skills.
# Idempotente e nao destrutivo: nunca apaga uma pasta real que ja exista la.
#
# Uso local:       bash scripts/install-codex-skills.sh
# Uso Codex cloud: colar no setup script do environment (ver README).
#
# FINHUB_FORCE=1 substitui pastas reais em conflito. So usar depois de confirmar
# que nao ha conteudo unico a perder.
set -euo pipefail

REPO_URL="${FINHUB_CONTEXT_URL:-https://github.com/PTFinHub/finhub-context.git}"
REPO_DIR="${FINHUB_CONTEXT_DIR:-$HOME/.finhub-context}"
SKILLS_DIR="${CODEX_SKILLS_DIR:-$HOME/.codex/skills}"
FORCE="${FINHUB_FORCE:-0}"

if [ -d "$REPO_DIR/.git" ]; then
  git -C "$REPO_DIR" pull --ff-only
else
  git clone --depth 1 "$REPO_URL" "$REPO_DIR"
fi

mkdir -p "$SKILLS_DIR"

linked=0
skipped=0
for skill in "$REPO_DIR"/plugins/*/skills/*/; do
  [ -d "$skill" ] || continue
  name="$(basename "$skill")"
  target="$SKILLS_DIR/$name"

  if [ -e "$target" ] && [ ! -L "$target" ] && [ "$FORCE" != "1" ]; then
    echo "  ! $name ja existe como pasta real — nao tocado (FINHUB_FORCE=1 para substituir)"
    skipped=$((skipped + 1))
    continue
  fi

  rm -rf "$target"
  ln -s "${skill%/}" "$target"
  linked=$((linked + 1))
done

echo "finhub-context: $linked skills ligadas em $SKILLS_DIR"
[ "$skipped" -gt 0 ] && echo "finhub-context: $skipped ignoradas por conflito"
exit 0
