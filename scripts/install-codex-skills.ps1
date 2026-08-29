# Liga as skills do finhub-context a ~/.codex/skills (Windows).
# Idempotente e nao destrutivo: nunca apaga uma pasta real que ja exista la.
#
# Uso: powershell -ExecutionPolicy Bypass -File scripts/install-codex-skills.ps1
#
# -Force substitui pastas reais em conflito. So usar depois de confirmar que nao
# ha conteudo unico a perder.
param([switch]$Force)

$ErrorActionPreference = 'Stop'

$repoUrl   = if ($env:FINHUB_CONTEXT_URL) { $env:FINHUB_CONTEXT_URL } else { 'https://github.com/PTFinHub/finhub-context.git' }
$repoDir   = if ($env:FINHUB_CONTEXT_DIR) { $env:FINHUB_CONTEXT_DIR } else { Join-Path $HOME '.finhub-context' }
$skillsDir = if ($env:CODEX_SKILLS_DIR)   { $env:CODEX_SKILLS_DIR }   else { Join-Path $HOME '.codex\skills' }

if (Test-Path (Join-Path $repoDir '.git')) {
  git -C $repoDir pull --ff-only
} else {
  git clone --depth 1 $repoUrl $repoDir
}

New-Item -ItemType Directory -Force -Path $skillsDir | Out-Null

$linked  = 0
$skipped = 0

Get-ChildItem -Path (Join-Path $repoDir 'plugins') -Directory | ForEach-Object {
  $skillRoot = Join-Path $_.FullName 'skills'
  if (-not (Test-Path $skillRoot)) { return }

  Get-ChildItem -Path $skillRoot -Directory | ForEach-Object {
    $link = Join-Path $skillsDir $_.Name
    if (Test-Path $link) {
      $item = Get-Item $link -Force
      $isLink = $item.LinkType -in @('Junction', 'SymbolicLink')
      if (-not $isLink -and -not $Force) {
        Write-Host "  ! $($_.Name) ja existe como pasta real - nao tocado (-Force para substituir)"
        $script:skipped++
        return
      }
      Remove-Item $link -Recurse -Force
    }
    # Junction nao precisa de privilegios de administrador
    New-Item -ItemType Junction -Path $link -Target $_.FullName | Out-Null
    $script:linked++
  }
}

# Agentes do Codex (~/.codex/agents) - mesma politica nao destrutiva
$agentsDir = if ($env:CODEX_AGENTS_DIR) { $env:CODEX_AGENTS_DIR } else { Join-Path $HOME (Join-Path ".codex" "agents") }
New-Item -ItemType Directory -Force -Path $agentsDir | Out-Null
$agents = 0
$agentSource = Join-Path $repoDir (Join-Path "codex" "agents")
if (Test-Path $agentSource) {
  Get-ChildItem -Path $agentSource -Filter *.toml | ForEach-Object {
    $target = Join-Path $agentsDir $_.Name
    if (Test-Path $target) {
      $item = Get-Item $target -Force
      if ($item.LinkType -ne 'SymbolicLink' -and -not $Force) {
        Write-Host "  ! $($_.Name) ja existe como ficheiro real - nao tocado (-Force para substituir)"
        return
      }
      Remove-Item $target -Force
    }
    Copy-Item $_.FullName $target
    $script:agents++
  }
}

# Regras universais do Codex (~/.codex/AGENTS.md) - mesma politica nao destrutiva
$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$globalRules = Join-Path $repoDir (Join-Path "codex" "AGENTS.md")
$targetRules = Join-Path $codexHome "AGENTS.md"
if (Test-Path $globalRules) {
  New-Item -ItemType Directory -Force -Path $codexHome | Out-Null
  $hasOwn = (Test-Path $targetRules) -and ((Get-Item $targetRules).Length -gt 0) -and ((Get-Item $targetRules -Force).LinkType -eq $null)
  if ($hasOwn -and -not $Force) {
    Write-Host "  ! ~/.codex/AGENTS.md tem conteudo proprio - nao tocado (-Force para substituir)"
  } else {
    if (Test-Path $targetRules) { Remove-Item $targetRules -Force }
    Copy-Item $globalRules $targetRules
    Write-Host "finhub-context: regras universais copiadas para $targetRules"
  }
}

Write-Host "finhub-context: $linked skills ligadas em $skillsDir"
if ($agents -gt 0) { Write-Host "finhub-context: $agents agentes copiados para $agentsDir" }
if ($skipped -gt 0) { Write-Host "finhub-context: $skipped ignoradas por conflito" }
