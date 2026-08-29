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

# Agentes do Codex (~/.codex/agents) — mesma politica nao destrutiva
AGENTS_DIR="${CODEX_AGENTS_DIR:-$HOME/.codex/agents}"
mkdir -p "$AGENTS_DIR"
agents=0
for agent in "$REPO_DIR"/codex/agents/*.toml; do
  [ -f "$agent" ] || continue
  target="$AGENTS_DIR/$(basename "$agent")"
  if [ -e "$target" ] && [ ! -L "$target" ] && [ "$FORCE" != "1" ]; then
    echo "  ! $(basename "$agent") ja existe como ficheiro real — nao tocado"
    continue
  fi
  rm -f "$target"
  ln -s "$agent" "$target"
  agents=$((agents + 1))
done

# Regras universais do Codex (~/.codex/AGENTS.md)
#
# Nao basta perguntar "o ficheiro existe?": depois da primeira instalacao existe sempre,
# e a partir dai nenhuma actualizacao do repo chegava a esta maquina. Guardamos o hash do
# que escrevemos; se o ficheiro ainda tiver esse hash, e nosso e pode ser actualizado.
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
global_rules="$REPO_DIR/codex/AGENTS.md"
target_rules="$CODEX_HOME/AGENTS.md"
state_file="$CODEX_HOME/.finhub-installed"

if [ -f "$global_rules" ]; then
  mkdir -p "$CODEX_HOME"
  wrote_sha=""
  [ -f "$state_file" ] && wrote_sha="$(cat "$state_file" 2>/dev/null || true)"
  current_sha=""
  [ -f "$target_rules" ] && current_sha="$(sha256sum "$target_rules" | cut -d' ' -f1)"

  # Primeira corrida depois desta correccao: sem estado guardado, mas se o conteudo
  # instalado for igual a qualquer versao historica do ficheiro no repo, fomos nos que o
  # escrevemos e podemos actualizar sem pedir FINHUB_FORCE.
  # Compara-se pelo blob hash do git: e exacto e nao depende de codificacao.
  ours=0
  if [ -z "$wrote_sha" ] && [ -s "$target_rules" ]; then
    blob="$(git -C "$REPO_DIR" hash-object --no-filters "$target_rules" 2>/dev/null)"
    for c in $(git -C "$REPO_DIR" log --format=%H -- codex/AGENTS.md 2>/dev/null); do
      if [ "$(git -C "$REPO_DIR" rev-parse "$c:codex/AGENTS.md" 2>/dev/null)" = "$blob" ]; then
        ours=1; break
      fi
    done
  fi

  if [ ! -e "$target_rules" ] || [ -L "$target_rules" ] || [ ! -s "$target_rules" ]      || [ "$current_sha" = "$wrote_sha" ] || [ "$ours" = "1" ] || [ "$FORCE" = "1" ]; then
    rm -f "$target_rules"
    cp "$global_rules" "$target_rules"
    sha256sum "$target_rules" | cut -d' ' -f1 > "$state_file"
    echo "finhub-context: regras universais actualizadas em $target_rules"
  else
    echo "  ! ~/.codex/AGENTS.md foi alterado fora do installer — nao tocado (FINHUB_FORCE=1 para substituir)"
  fi
fi

echo "finhub-context: $linked skills ligadas em $SKILLS_DIR"
[ "$agents" -gt 0 ] && echo "finhub-context: $agents agentes ligados em $AGENTS_DIR"
[ "$skipped" -gt 0 ] && echo "finhub-context: $skipped ignoradas por conflito"
exit 0
