# Vectorize tint-suffixed monochrome PNGs in src/assets/tennoicons via vtracer.
#
# Conservative scope: only files whose names end in (xWhite|xBlack|xLight|
# xRed|xBlue|xYellow|xPurple|xDark|xGreen|xOrange).png. These are guaranteed
# single-color silhouettes by Warframe wiki naming convention.
#
# Output: tools/_svg_review/<original-subfolder>/<name>.svg
# Plus tools/_svg_review/contact-sheet.html — side-by-side PNG vs SVG for review.
#
# Nothing is deleted by this script. After review, run apply-svg-conversion.ps1
# to move SVGs into place and remove the redundant PNG size variants.

param(
  [string]$IconRoot  = "src\assets\tennoicons",
  [string]$OutRoot   = "tools\_svg_review",
  [string]$VtracerExe = "tools\vtracer.exe"
)

$ErrorActionPreference = 'Stop'

# --- Resolve paths ---
$projectRoot = (Resolve-Path .).Path
$iconRoot    = (Resolve-Path $IconRoot).Path
$outRoot     = Join-Path $projectRoot $OutRoot
$vtracer     = Join-Path $projectRoot $VtracerExe

if (-not (Test-Path -LiteralPath $vtracer)) {
  Write-Host "ERROR: vtracer not found at $vtracer" -ForegroundColor Red
  Write-Host "Download from https://github.com/visioncortex/vtracer/releases and extract vtracer.exe into tools/" -ForegroundColor Yellow
  exit 1
}

New-Item -ItemType Directory -Force -Path $outRoot | Out-Null

# --- Candidate filter ---
$tintRegex = '\(x(White|Black|Light|Red|Blue|Yellow|Purple|Dark|Green|Orange)\)\.png$'
$candidates = Get-ChildItem -LiteralPath $iconRoot -File -Recurse | Where-Object { $_.Name -match $tintRegex }
Write-Host "Found $($candidates.Count) candidate PNGs (tint-suffixed)"

# --- Group by canonical name (strip ^\d+px- prefix) so size variants collapse ---
$groups = $candidates | Group-Object { $_.Name -replace '^\d+px-','' }
Write-Host "Resolved to $($groups.Count) unique icons after collapsing size variants"
Write-Host ""

# --- Trace each group's largest source ---
$rows = New-Object System.Collections.ArrayList
$traced = 0
$failed = 0

foreach ($g in ($groups | Sort-Object Name)) {
  $largest = $g.Group | Sort-Object Length -Descending | Select-Object -First 1
  $rel = $largest.FullName.Substring($iconRoot.Length).TrimStart('\','/')
  $folder = Split-Path -Parent $rel
  if (-not $folder) { $folder = '_root' }

  $svgName = ($g.Name -replace '\.png$','') + '.svg'
  $outDir = Join-Path $outRoot $folder
  if (-not (Test-Path -LiteralPath $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }
  $outFile = Join-Path $outDir $svgName

  # vtracer flags tuned for clean monochrome silhouettes
  $args = @(
    '--input',  $largest.FullName,
    '--output', $outFile,
    '--colormode', 'binary',
    '--mode',   'spline',
    '--filter_speckle', '4',
    '--corner_threshold', '60',
    '--segment_length',   '4',
    '--splice_threshold', '45'
  )

  try {
    & $vtracer @args 2>&1 | Out-Null
    if (Test-Path -LiteralPath $outFile) {
      $traced++
      $variantNames = ($g.Group | Sort-Object Name | ForEach-Object { $_.Name }) -join ', '
      $pngUri = 'file:///' + $largest.FullName.Replace('\','/')
      $svgUri = 'file:///' + $outFile.Replace('\','/')
      $pngKB  = [math]::Round($largest.Length / 1KB, 1)
      $svgKB  = [math]::Round((Get-Item -LiteralPath $outFile).Length / 1KB, 1)
      [void]$rows.Add([pscustomobject]@{
        Folder = $folder; Canonical = $g.Name; Variants = $variantNames
        PngUri = $pngUri; SvgUri = $svgUri; PngKB = $pngKB; SvgKB = $svgKB
      })
    } else {
      $failed++
      Write-Host "  FAIL: $($g.Name)" -ForegroundColor Red
    }
  } catch {
    $failed++
    Write-Host "  ERR : $($g.Name) - $($_.Exception.Message)" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Traced: $traced  Failed: $failed" -ForegroundColor Cyan

# --- Contact sheet HTML ---
$html = New-Object System.Text.StringBuilder
[void]$html.Append(@"
<!doctype html>
<html><head><meta charset="utf-8"><title>Tennoicons SVG Review</title>
<style>
  body{background:#0a1117;color:#e5e2e1;font-family:Inter,system-ui,sans-serif;margin:0;padding:24px}
  h1{font-family:'Noto Serif',serif;color:#e3c372;font-weight:400}
  table{border-collapse:collapse;width:100%;max-width:1400px}
  th,td{padding:10px 12px;border-bottom:1px solid #2d333b;vertical-align:middle;text-align:left}
  th{color:#a8a5a0;font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:0.05em}
  td.mono{font-family:'JetBrains Mono',monospace;font-size:11px;color:#a8a5a0}
  td.name{font-family:'JetBrains Mono',monospace;font-size:12px;color:#e5e2e1}
  img.preview{display:block;width:64px;height:64px;object-fit:contain;background:#161b22;padding:8px;border-radius:6px;box-sizing:content-box}
  td.arrow{color:#e3c372;font-size:18px;text-align:center;width:24px}
  td.size{color:#00d4ff;font-family:'JetBrains Mono',monospace;font-size:11px}
  tr:hover{background:rgba(255,255,255,0.02)}
  .summary{background:#161b22;padding:16px 20px;border-radius:8px;margin-bottom:24px;display:inline-block}
  .summary b{color:#e3c372}
</style></head><body>
<h1>Tennoicons SVG Trace Review</h1>
<div class="summary">
  Traced: <b>$traced</b> &nbsp;|&nbsp; Failed: <b>$failed</b><br>
  Source: <code>$iconRoot</code><br>
  Output: <code>$outRoot</code>
</div>
<table>
  <thead><tr><th>Folder</th><th>Icon</th><th>PNG</th><th></th><th>SVG</th><th>Size</th><th>Variants merged</th></tr></thead>
  <tbody>
"@) | Out-Null

foreach ($r in ($rows | Sort-Object Folder, Canonical)) {
  $sizeChange = if ($r.PngKB -gt 0) { [math]::Round((($r.SvgKB - $r.PngKB) / $r.PngKB) * 100, 0) } else { 0 }
  $sizeColor = if ($r.SvgKB -le $r.PngKB) { '#7ee787' } else { '#f0883e' }
  [void]$html.Append("<tr><td class='mono'>$($r.Folder)</td><td class='name'>$($r.Canonical)</td><td><img class='preview' src='$($r.PngUri)'></td><td class='arrow'>&rarr;</td><td><img class='preview' src='$($r.SvgUri)'></td><td class='size'>$($r.PngKB)KB &rarr; <span style='color:$sizeColor'>$($r.SvgKB)KB ($sizeChange%)</span></td><td class='mono'>$($r.Variants)</td></tr>`n")
}

[void]$html.Append("</tbody></table></body></html>")

$contactPath = Join-Path $outRoot 'contact-sheet.html'
[IO.File]::WriteAllText($contactPath, $html.ToString(), [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "Contact sheet: $contactPath" -ForegroundColor Green
Write-Host "Open it in a browser to review side-by-side PNG vs SVG output." -ForegroundColor Green
