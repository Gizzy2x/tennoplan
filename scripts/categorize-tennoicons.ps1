# Categorize src/assets/tennoicons into subfolders.
# Idempotent: re-running after manual edits only moves what still matches.

$root = Join-Path $PSScriptRoot "..\src\assets\tennoicons"
$root = (Resolve-Path $root).Path

function NewDir($p) {
  $full = Join-Path $root $p
  if (-not (Test-Path -LiteralPath $full)) { New-Item -ItemType Directory -Force -Path $full | Out-Null }
}

function MoveTo([string[]]$files, [string]$dest) {
  $destPath = Join-Path $root $dest
  foreach ($f in $files) {
    $src = Join-Path $root $f
    if (Test-Path -LiteralPath $src) {
      Move-Item -LiteralPath $src -Destination $destPath -Force
    }
  }
}

function MoveRegex([string]$regex, [string]$dest) {
  $destPath = Join-Path $root $dest
  Get-ChildItem -LiteralPath $root -File | Where-Object { $_.Name -match $regex } | ForEach-Object {
    Move-Item -LiteralPath $_.FullName -Destination $destPath -Force
  }
}

# --- Create folders ---
'damage','polarity','focus','stats','rank','rarity','currency','factions','syndicates','shards','markers','abilities','railjack','resources','tokens','platform','ui','companions','misc','reference' | ForEach-Object { NewDir $_ }
NewDir 'controls\gamepad'
NewDir 'controls\keyboard'
NewDir 'controls\mouse'
NewDir 'controls\ios'
NewDir 'controls\touchpad'

# --- Reference (wiki HTML + example images + footers + thumbnails) ---
MoveTo @(
  "Text_Icons.htm",
  "300px-ExampleTextIcons.jpg","600px-ExampleTextIcons.jpg",
  "60px-Photo-4.png","120px-Photo-4.png",
  "60px-ArchimedeanYontaSquare.png","120px-ArchimedeanYontaSquare.png",
  "Creative_Commons_footer.png","Creative_Commons_footer@2x.png",
  "Weird_Gloop_footer_hosted.png","Weird_Gloop_footer_hosted@2x.png",
  "ArticleComments-9eabbad9-f422-49be-92da-e4f3672c06b7.jpg",
  "FocusLensFocus(xWhite).svg"
) 'reference'

# --- Polarity (MUST run before focus — names overlap) ---
MoveTo @(
  "Madurai_Pol(xBlack).svg","Vazarin_Pol(xBlack).svg","Naramon_Pol(xBlack).svg",
  "Zenurik_Pol(xBlack).svg","Unairu_Pol(xBlack).svg","Penjaga_Pol(xBlack).svg",
  "Umbra_Pol(xBlack).svg","Koneksi_Pol(xBlack).svg",
  "20px-Any_Pol(xBlack).png","40px-Any_Pol(xBlack).png"
) 'polarity'

# --- Abilities (MUST run before damage — SlashDash, MagnetizeIcon, etc.) ---
MoveTo @(
  "SlashDashIcon(xWhite).png","MagnetizeIcon(xWhite).png","PullIcon(xWhite).png",
  "CrushIcon(xWhite).png","DischargeIcon(xWhite).png","DuetIcon(xWhite).png",
  "ElectricShieldIcon(xWhite).png","ExaltedBladeIcon(xWhite).png",
  "RadialBlindIcon(xWhite).png","RadialJavelinIcon(xWhite).png","Shock(xWhite).png",
  "32px-EmbraceIcon(xWhite).png","64px-EmbraceIcon(xWhite).png","EmbraceIcon(xWhite).png",
  "32px-ConsumeIcon(xWhite).png","64px-ConsumeIcon(xWhite).png","ConsumeIcon(xWhite).png",
  "32px-Death'sHarvestIcon(xWhite).png","64px-Death'sHarvestIcon(xWhite).png","Death'sHarvestIcon(xWhite).png",
  "Restorative(Drifter)Icon(xLight).png","SmokeScreen(Drifter)Icon(xLight).png",
  "SummonKaithe(Drifter)Icon(xLight).png","TargetRadar(Drifter)Icon(xLight).png",
  "AtomiBombIcon(xWhite).png","AtomiBoostIcon(xWhite).png",
  "WraithDeadlyWall(xWhite).png","WraithDeathsGrasp(xWhite).png","WraithSoulHarvest(xWhite).png",
  "SpeedIcon(xWhite).png","Infestation(xWhite).svg"
) 'abilities'

# --- Damage (incl. Tau/Sentient/True/Void/Radiant + Railjack damage types) ---
MoveRegex '^(32px-|64px-)?Dmg.+\.png$' 'damage'
MoveTo @(
  "Impact(xWhite).svg","ImpactOutline(xWhite).png","ImpactSymbol.png",
  "Puncture(xWhite).svg","PunctureOutline(xWhite).png","PunctureSymbol.png",
  "Slash(xWhite).svg","SlashOutline(xWhite).png","SlashSymbol.png",
  "Heat(xWhite).png","HeatOutline(xWhite).png","HeatSymbol.png",
  "Cold(xWhite).png","ColdOutline(xWhite).png","ColdSymbol.png",
  "Electricity(xWhite).png","ElectricityOutline(xWhite).png","ElectricitySymbol.png",
  "Toxin(xWhite).png","ToxinOutline(xWhite).png","ToxinSymbol.png",
  "Blast(xWhite).png","BlastOutline(xWhite).png","BlastSymbol.png",
  "Radiation(xWhite).png","RadiationOutline(xWhite).png","RadiationSymbol.png",
  "Gas(xWhite).png","GasOutline(xWhite).png","GasSymbol.png",
  "Magnetic(xWhite).png","MagneticOutline(xWhite).png","MagneticSymbol.png",
  "Viral(xWhite).png","ViralOutline(xWhite).png","ViralSymbol.png",
  "Corrosive(xWhite).png","CorrosiveOutline(xWhite).png","CorrosiveSymbol.png",
  "VoidOutline(xWhite).png","VoidSymbol.png","VoidTearIcon(xWhite).png",
  "Tau(xWhite).png","SentientOutline(xWhite).png","SentientSymbol.png",
  "True(xWhite).png",
  # Railjack damage types
  "Ballistic(xWhite).png","Plasma(xWhite).png","Particle(xWhite).png",
  "Incendiary(xWhite).png","Ionic(xWhite).png","Chem(xWhite).png"
) 'damage'

# --- Focus (schools, lenses, ability glyphs) ---
MoveRegex '^IconMadurai' 'focus'
MoveRegex '^IconNaramon' 'focus'
MoveRegex '^IconVazarin' 'focus'
MoveRegex '^IconZenurik' 'focus'
MoveRegex '^IconUnairu' 'focus'
MoveRegex '^IconFocus' 'focus'
MoveRegex 'FocusLens' 'focus'
MoveTo @(
  "32px-FocusCausticStrike(xBlack).png","64px-FocusCausticStrike(xBlack).png","FocusCausticStrike(xBlack).png",
  "32px-FocusVoidSnare(xBlack).png","64px-FocusVoidSnare(xBlack).png","FocusVoidSnare(xBlack).png"
) 'focus'

# --- Rank ---
MoveRegex '^IconRank\d+\.png$' 'rank'
MoveTo @(
  "IconArcaneRank(xWhite).png","IconArcaneRankOutline(xWhite).png",
  "IconMasteryRank.png","IconMasteryRankLocked.png",
  "IconNightwavePrestige(xWhite).png","IconClanXP.png",
  "MasteryAffinity64(xDark).png"
) 'rank'

# --- Rarity ---
MoveTo @(
  "IconCommon.png","IconUncommon.png","IconRare.png","IconLegendary.png",
  "IconEpic(xWhite).png","LegendaryIcon.png"
) 'rarity'

# --- Stats ---
MoveRegex '^IconStat' 'stats'
MoveTo @("IconShield.png","IconHealth.gif","IconEnergy.gif") 'stats'

# --- Currency ---
MoveTo @(
  "32px-Aya.png","64px-Aya.png","32px-RegalAya.png","64px-RegalAya.png",
  "32px-Credits.png","64px-Credits.png","IconCredits.png",
  "37px-PlatinumLarge.png","75px-PlatinumLarge.png","Platinum.png",
  "32px-OrokinDucats.png","64px-OrokinDucats.png","OrokinDucats.png",
  "32px-Endo.png","64px-Endo.png","Kuva64.png","Vosfor.png","Dirac.png",
  "32px-ReputationLarge(xWhite).png","64px-ReputationLarge(xWhite).png",
  "ReputationLarge(xWhite).png","ReputationSmall(xWhite).png",
  "IconOstronPrice.png","IconFusionPoints.png","IconCoupon.png"
) 'currency'

# --- Factions ---
MoveTo @(
  "32px-IconCorpusOn(xWhite).png","64px-IconCorpusOn(xWhite).png","IconCorpusOn(xWhite).png",
  "32px-IconGrineerOn(xWhite).png","64px-IconGrineerOn(xWhite).png","IconGrineerOn(xWhite).png",
  "32px-IconOrokinOn(xWhite).png","64px-IconOrokinOn(xWhite).png","IconOrokinOn(xWhite).png",
  "32px-IconNarmer(xWhite).png","64px-IconNarmer(xWhite).png","IconNarmer(xWhite).png",
  "32px-IconWild(xWhite).png","64px-IconWild(xWhite).png","IconWild(xWhite).png",
  "32px-IconAnarchs(xWhite).png","64px-IconAnarchs(xWhite).png","IconAnarchs(xWhite).png",
  "32px-TennoIcon(xWhite).png","64px-TennoIcon(xWhite).png","TennoIcon(xWhite).png",
  "32px-ScaldraIcon(xWhite).png","64px-ScaldraIcon(xWhite).png","ScaldraIcon(xWhite).png",
  "32px-TechrotIcon(xWhite).png","64px-TechrotIcon(xWhite).png","TechrotIcon(xWhite).png",
  "32px-MurmurIcon(xWhite).png","64px-MurmurIcon(xWhite).png","MurmurIcon(xWhite).png",
  "32px-SentientFactionIcon(xWhite).png","64px-SentientFactionIcon(xWhite).png","SentientFactionIcon(xWhite).png",
  "IconInfested(xWhite).png","IconInfestedAdaptation(xWhite).png",
  "IconGrineerCover(xLight).png"
) 'factions'

# --- Syndicates ---
MoveTo @(
  "ArbitersofHexisSigil(SxWhite).png","CephalonSimarisSigil(SxWhite).png","CephalonSudaSigil(SxWhite).png",
  "ConclaveSigil(SxWhite).png","NewLokaSigil(SxWhite).png","OldBloodSigil(SxWhite).png",
  "PerrinSequenceSigil(SxWhite).png","RedVeilSigil(SxWhite).png","SisterhoodSigil(SxWhite).png",
  "SteelMeridianSigil(SxWhite).png","NightwaveEmblem(ExWhite).png",
  "IconVoxSolaris(xWhite).png","IconVentkids(xWhite).png","IconNeutralSyndicate(xWhite).png",
  "IconSimarisTextured(xYellow).png"
) 'syndicates'

# --- Shards ---
MoveRegex '^IconShard' 'shards'

# --- Markers ---
MoveRegex '^IconMissionMarker' 'markers'
MoveRegex '^IconArtifactMarker' 'markers'
MoveRegex '^IconNPC' 'markers'
MoveTo @(
  "IconHiveMarker(xWhite).png","IconSurvivalPillarMarker(xWhite).png",
  "IconSurvivalPillarOutlineMarker(xWhite).png",
  "IconFisureCanisterMarker(xWhite).png","IconFisureCanisterMarkerOutline(xWhite).png"
) 'markers'

# --- Railjack (non-damage Railjack assets) ---
MoveTo @(
  "Avionics(xWhite).png","HouseLavan(xWhite).png","HouseVidar(xWhite).png","HouseZetki(xWhite).png",
  "IconRailjack(xWhite).png"
) 'railjack'

# --- Resources ---
MoveTo @(
  "VitusEssence.png","PhasicCells.png","RenHypercore.png","AntiserumInjector.png",
  "KahlStock.png","Hollars.png","LyroicBridge.png","AscarisPrime.png"
) 'resources'

# --- Tokens ---
MoveTo @(
  "DaughterToken.png","FatherToken.png","GrandmotherToken.png","MotherToken.png",
  "SonToken.png","OtakToken.png","PrimeToken.png"
) 'tokens'

# --- Controls / Gamepad ---
MoveRegex '^IconGamepad' 'controls\gamepad'

# --- Controls / Mouse ---
MoveRegex '^IconMouse' 'controls\mouse'

# --- Controls / IOS ---
MoveRegex '^IconIOS' 'controls\ios'

# --- Controls / Touchpad ---
MoveRegex '^IconTouchpad' 'controls\touchpad'

# --- Controls / Keyboard ---
MoveRegex '^IconF\d+\.png$' 'controls\keyboard'
MoveRegex '^IconNumpad' 'controls\keyboard'
MoveTo @(
  "IconLAlt.png","IconRAlt.png","IconLShift.png","IconRShift.png",
  "IconLControl.png","IconRControl.png","IconControl.png",
  "IconReturn.png","IconTab.png","IconBackspace.png","IconEscape(xWhite).png",
  "IconCapsLock.png","IconScroll.png","IconNumLock.png","IconPause.png",
  "IconHome.png","IconEnd.png","IconPageUp.png","IconPageDown.png",
  "IconInsert.png","IconDelete.png","IconSpace.png","IconMenuSelect.png",
  "IconLBracket.png","IconRBracket.png","IconSemicolon.png","IconPeriod.png",
  "IconComma.png","IconApostrophe.png","IconGrave.png",
  "IconForwardSlash.png","IconBackwardSlash.png",
  "IconMinus.png","IconPlus(xWhite).png","IconEquals.png","IconMultiply.png",
  "IconDivide.png","IconSubtract.png","IconDecimal.png",
  "IconDecArrow(xWhite).png","IconIncArrow(xWhite).png",
  "IconChecker.png","IconApps.png","IconApple(xWhite).png"
) 'controls\keyboard'

# --- Platform ---
MoveTo @(
  "IconWindows(xWhite).png","IconXbox(xWhite).png","IconPlaystation(xWhite).png",
  "IconSwitch(xWhite).png","IconSteam.png","IconDiscord(xWhite).png","IconUGC.png"
) 'platform'

# --- Companions ---
MoveRegex '^IconKavat' 'companions'
MoveRegex '^IconKubrow' 'companions'
MoveTo @(
  "IconDeployMoa(xWhite).png","IconIDeployMoaDrone(xWhite).png",
  "IconIconIDeployMoaGun(xWhite).png","IconSentinel(xWhite).png"
) 'companions'

# --- UI ---
MoveTo @(
  "IconAdd.png","IconCheckmark(xWhite).png","IconCheckmarkFail(xWhite).png","IconCheckmarkOutline(xWhite).png",
  "IconArrowRight(xWhite).png","IconUpArrow(xWhite).png","IconDownArrow(xWhite).png","IconMiniArrow(xWhite).png",
  "IconUp(xWhite).png","IconDown(xWhite).png","IconLeft(xWhite).png","IconRight(xWhite).png",
  "IconPaginationFirst(xWhite).png","IconPaginationLast(xWhite).png",
  "IconPaginationNext(xWhite).png","IconPaginationPrevious(xWhite).png",
  "IconLineSeparator(xWhite).png","IconWarning(xWhite).png","IconLocked(xWhite).png","IconOwned(xWhite).png",
  "IconTimer(xWhite).png","IconReset(xWhite).png","IconUpgrade(xWhite).png","IconPreview(xWhite).png",
  "IconRandomize(xWhite).png","IconProblem(xWhite).png","IconAllyDown(xRed).png",
  "IconInfinite(xWhite).png","IconInfinity(xWhite).png","IconKey(xWhite).png","IconKeyWide(xWhite).png",
  "IconQuest(xWhite).png","IconHelminth(xWhite).png","IconArchwing(xWhite).png",
  "IconRadialButtonOff(xWhite).png","IconRadialButtonOn(xWhite).png",
  "IconRegisteredTMSmall(xWhite).png","IconRegisteredTrademark(xWhite).png",
  "IconSMSmall(xWhite).png","IconTMSmall(xWhite).png",
  "IconBundle(xWhite).png","IconSessionIndicator(xWhite).png","IconCursorBlink(xWhite).gif",
  "IconResearchInProgress(xWhite).gif","IconRecoveryArrow(xWhite).gif","IconSpeedUpArrow(xWhite).gif",
  "IconAmmoMutation(xWhite).png","IconAmbulasDataFragment.png","IconArbitrationDrone(xWhite).png",
  "IconCategoryAmp(xWhite).png","IconCategoryBow(xWhite).png","IconCategoryMelee(xWhite).png",
  "IconCategoryModular(xWhite).png","IconCategoryOperator(xWhite).png","IconCategoryPistol(xWhite).png",
  "IconCategoryRifle(xWhite).png","IconCategoryShotgun(xWhite).png","IconCategoryWarframe(xWhite).png",
  "IconEnhancer(xWhite).png","IconGrenade(xWhite).png","IconLuminousIconLarge.png",
  "IconModDuplicates(xWhite).png","IconModSelector.png",
  "IconModSetEmptyNotch(xWhite).png","IconModSetFilledNotch(xWhite).png",
  "IconPlayer(xWhite).png","IconPlayerGeneric(xWhite).png",
  "IconProjectionT1(xWhite).png","IconProjectionT2(xWhite).png",
  "IconProjectionT3(xWhite).png","IconProjectionT4(xWhite).png",
  "IconInTradeIcon(xWhite).png","IconSeekingTradeIcon(xWhite).png","IconTradeRequestSentIcon(xWhite).png",
  "IconVault(xWhite).png","IconVenusAlert(xWhite).png","IconWeekly(xWhite).png",
  "IconSalvage(xWhite).png","IconTreasureGem(xWhite).png","IconTreasureGemOutline(xWhite).png","IconTreasures(xWhite).png",
  "IconSomachordFragment(xPurple).png","IconStealthCombo(xWhite).png",
  "IconUniversal.png","IconMastered(xWhite).png","IconTeamDropped(xLight).png",
  "IconMoonTeam.png","IconSunTeam.png","IconLotus(xWhite).png"
) 'ui'

# --- Misc (mission/event/visual icons that don't fit other buckets) ---
MoveTo @(
  "Sortie(xWhite).png","Raid(xBlue).png","IconNightmareRaid(xBlue).png",
  "36px-Sevagoth-Shadow.png","72px-Sevagoth-Shadow.png",
  "IconKoumeiDie1.png","IconKoumeiDie2.png","IconKoumeiDie3.png",
  "IconKoumeiDie4.png","IconKoumeiDie5.png","IconKoumeiDie6.png",
  "Orvius.png","32px-Orvius.png",
  "IconTeshinAbilitesCold(xWhite).png","IconTeshinAbilitesElectricity(xWhite).png",
  "IconTeshinAbilitesGlaive(xWhite).png","IconTeshinAbilitesHeat(xWhite).png",
  "32px-DuviriIcon.png","64px-DuviriIcon.png"
) 'misc'

# --- Leftover report ---
Write-Host ""
Write-Host "=== LEFTOVERS in tennoicons root (need manual triage) ===" -ForegroundColor Yellow
$leftovers = Get-ChildItem -LiteralPath $root -File
$leftovers | ForEach-Object { Write-Host "  $($_.Name)" }
Write-Host ""
Write-Host "Total leftovers: $($leftovers.Count)" -ForegroundColor Cyan
Write-Host ""
Write-Host "=== Folder counts ===" -ForegroundColor Yellow
Get-ChildItem -LiteralPath $root -Directory | Sort-Object Name | ForEach-Object {
  $count = (Get-ChildItem -LiteralPath $_.FullName -File -Recurse).Count
  Write-Host ("  {0,-22} {1}" -f $_.Name, $count)
}
