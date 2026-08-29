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

# Regras universais do Codex (~/.codex/AGENTS.md)
#
# Nao basta perguntar "o ficheiro existe?": depois da primeira instalacao existe sempre,
# e a partir dai nenhuma actualizacao do repo chegava a esta maquina. Guardamos o hash do
# que escrevemos; se o ficheiro ainda tiver esse hash, e nosso e pode ser actualizado. Se
# tiver outro, alguem lhe mexeu e nao se toca.
$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$globalRules = Join-Path $repoDir (Join-Path "codex" "AGENTS.md")
$targetRules = Join-Path $codexHome "AGENTS.md"
$stateFile = Join-Path $codexHome ".finhub-installed.json"

function Get-Sha($file) {
  if (-not (Test-Path $file)) { return $null }
  return (Get-FileHash -Path $file -Algorithm SHA256).Hash
}

if (Test-Path $globalRules) {
  New-Item -ItemType Directory -Force -Path $codexHome | Out-Null

  $state = @{}
  if (Test-Path $stateFile) {
    try { (Get-Content $stateFile -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $state[$_.Name] = $_.Value } } catch {}
  }

  $currentSha = Get-Sha $targetRules
  $wroteSha = $state['agents_md']
  $ours = (-not (Test-Path $targetRules)) -or ((Get-Item $targetRules).Length -eq 0) -or ($currentSha -eq $wroteSha)

  # Primeira corrida depois desta correccao: nao ha estado guardado. Se o conteudo
  # instalado corresponder a QUALQUER versao historica do ficheiro no repo, fomos nos que
  # o escrevemos e podemos actualizar sem pedir -Force.
  #
  # Compara-se pelo blob hash do git, nao pelo conteudo: o ficheiro tem acentos e nem o
  # pipeline nem o redireccionamento do PowerShell preservam a codificacao de forma fiavel.
  if (-not $ours -and -not $wroteSha -and (Test-Path $targetRules)) {
    $blob = (& git -C $repoDir hash-object --no-filters $targetRules 2>$null) | Select-Object -First 1
    if ($blob) {
      foreach ($c in (& git -C $repoDir log --format=%H -- codex/AGENTS.md 2>$null)) {
        $historic = (& git -C $repoDir rev-parse "${c}:codex/AGENTS.md" 2>$null) | Select-Object -First 1
        if ($historic -eq $blob) { $ours = $true; break }
      }
    }
  }

  if ($ours -or $Force) {
    if (Test-Path $targetRules) { Remove-Item $targetRules -Force }
    Copy-Item $globalRules $targetRules
    $state['agents_md'] = Get-Sha $targetRules
    $state | ConvertTo-Json | Set-Content $stateFile -Encoding utf8
    Write-Host "finhub-context: regras universais actualizadas em $targetRules"
  } else {
    Write-Host "  ! ~/.codex/AGENTS.md foi alterado fora do installer - nao tocado (-Force para substituir)"
  }
}

Write-Host "finhub-context: $linked skills ligadas em $skillsDir"
if ($agents -gt 0) { Write-Host "finhub-context: $agents agentes copiados para $agentsDir" }
if ($skipped -gt 0) { Write-Host "finhub-context: $skipped ignoradas por conflito" }
