# Apply approved SVGs: move from tools/_svg_review/ into src/assets/tennoicons/
# and delete the redundant PNG size variants they replace.
#
# WORKFLOW:
#   1. Run vectorize-tennoicons.ps1
#   2. Open tools/_svg_review/contact-sheet.html in a browser
#   3. For any bad traces, DELETE the .svg from tools/_svg_review/<folder>/
#      (those PNGs will be left alone — only SVGs still present are applied)
#   4. Run this script
#
# What this script deletes for each approved SVG:
#   - PNG variants: Foo(xWhite).png, 32px-Foo(xWhite).png, 64px-Foo(xWhite).png
# Nothing else is touched.

param(
  [string]$IconRoot  = "src\assets\tennoicons",
  [string]$ReviewRoot = "tools\_svg_review",
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path .).Path
$iconRoot    = (Resolve-Path $IconRoot).Path
$reviewRoot  = Join-Path $projectRoot $ReviewRoot

if (-not (Test-Path -LiteralPath $reviewRoot)) {
  Write-Host "ERROR: No review folder at $reviewRoot. Run vectorize-tennoicons.ps1 first." -ForegroundColor Red
  exit 1
}

$svgs = Get-ChildItem -LiteralPath $reviewRoot -File -Recurse -Filter '*.svg'
Write-Host "Found $($svgs.Count) approved SVGs in review folder"
if ($DryRun) { Write-Host "DRY RUN — no files will be changed" -ForegroundColor Yellow }
Write-Host ""

$moved = 0
$pngDeleted = 0

foreach ($svg in $svgs) {
  $relFolder = $svg.DirectoryName.Substring($reviewRoot.Length).TrimStart('\','/')
  if ($relFolder -eq '_root') { $relFolder = '' }
  $destDir   = if ($relFolder) { Join-Path $iconRoot $relFolder } else { $iconRoot }
  $destSvg   = Join-Path $destDir $svg.Name

  $canonicalPng = $svg.Name -replace '\.svg$','.png'

  # PNG variants to delete: with and without "Npx-" prefix
  $variants = @(
    (Join-Path $destDir $canonicalPng)
  )
  Get-ChildItem -LiteralPath $destDir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "^\d+px-$([regex]::Escape($canonicalPng))$" } |
    ForEach-Object { $variants += $_.FullName }

  $variantsToDelete = $variants | Where-Object { Test-Path -LiteralPath $_ }

  Write-Host "$($relFolder)\$($svg.Name)" -ForegroundColor Cyan
  Write-Host "  + SVG -> $destSvg"
  foreach ($v in $variantsToDelete) {
    Write-Host "  - PNG -> $(Split-Path -Leaf $v)" -ForegroundColor DarkGray
  }

  if (-not $DryRun) {
    if (-not (Test-Path -LiteralPath $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
    Move-Item -LiteralPath $svg.FullName -Destination $destSvg -Force
    $moved++
    foreach ($v in $variantsToDelete) {
      Remove-Item -LiteralPath $v -Force
      $pngDeleted++
    }
  }
}

Write-Host ""
if ($DryRun) {
  Write-Host "DRY RUN complete. Re-run without -DryRun to apply." -ForegroundColor Yellow
} else {
  Write-Host "Applied: $moved SVGs moved, $pngDeleted PNG variants deleted." -ForegroundColor Green
  $remaining = Get-ChildItem -LiteralPath $reviewRoot -File -Recurse -ErrorAction SilentlyContinue
  if (-not $remaining) {
    Write-Host "Review folder is empty — safe to delete tools/_svg_review/" -ForegroundColor DarkGray
  }
}
