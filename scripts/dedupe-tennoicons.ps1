# Keep only the largest size variant of each icon. Delete the rest.
# Groups files by canonical name (strips ^Npx- prefix), keeps the biggest
# by file size, deletes the smaller variants. Run with -DryRun first.

param(
  [string]$IconRoot = "src\assets\tennoicons",
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$iconRoot = (Resolve-Path $IconRoot).Path

$allPngs = Get-ChildItem -LiteralPath $iconRoot -File -Recurse -Filter '*.png'
$groups = $allPngs | Group-Object { (Split-Path -Parent $_.FullName) + '|' + ($_.Name -replace '^\d+px-','') }

$deleted = 0
$bytesFreed = 0

foreach ($g in $groups) {
  if ($g.Count -lt 2) { continue }
  $sorted = $g.Group | Sort-Object Length -Descending
  $keep = $sorted[0]
  $drop = $sorted | Select-Object -Skip 1
  Write-Host "$(Split-Path -Leaf $keep.DirectoryName)\$($keep.Name)" -ForegroundColor Cyan
  Write-Host "  KEEP $($keep.Name) ($([math]::Round($keep.Length/1KB,1))KB)" -ForegroundColor Green
  foreach ($d in $drop) {
    Write-Host "  DROP $($d.Name) ($([math]::Round($d.Length/1KB,1))KB)" -ForegroundColor DarkGray
    if (-not $DryRun) { Remove-Item -LiteralPath $d.FullName -Force }
    $deleted++
    $bytesFreed += $d.Length
  }
}

Write-Host ""
if ($DryRun) {
  Write-Host "DRY RUN: would delete $deleted files, freeing $([math]::Round($bytesFreed/1KB,1)) KB" -ForegroundColor Yellow
} else {
  Write-Host "Deleted $deleted files, freed $([math]::Round($bytesFreed/1KB,1)) KB" -ForegroundColor Green
}
