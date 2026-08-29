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

Write-Host "finhub-context: $linked skills ligadas em $skillsDir"
if ($skipped -gt 0) { Write-Host "finhub-context: $skipped ignoradas por conflito" }
