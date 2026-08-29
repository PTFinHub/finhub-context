# Instala as skills do finhub-context em ~/.codex/skills (Windows).
# Idempotente. Uso: powershell -ExecutionPolicy Bypass -File scripts/install-codex-skills.ps1
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

$count = 0
Get-ChildItem -Path (Join-Path $repoDir 'plugins') -Directory | ForEach-Object {
  $skillRoot = Join-Path $_.FullName 'skills'
  if (-not (Test-Path $skillRoot)) { return }
  Get-ChildItem -Path $skillRoot -Directory | ForEach-Object {
    $link = Join-Path $skillsDir $_.Name
    if (Test-Path $link) { Remove-Item $link -Recurse -Force }
    # Junction nao precisa de privilegios de administrador
    New-Item -ItemType Junction -Path $link -Target $_.FullName | Out-Null
    $script:count++
  }
}

Write-Host "finhub-context: $count skills ligadas em $skillsDir"
