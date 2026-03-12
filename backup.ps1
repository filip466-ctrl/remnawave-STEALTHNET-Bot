param([string]$Action = "")

$Host.UI.RawUI.WindowTitle = "STEALTHNET Git Manager"

function Get-CurrentBranch {
    $branch = git rev-parse --abbrev-ref HEAD 2>&1
    if ($branch -eq "HEAD") {
        $tag = git describe --tags --exact-match 2>&1
        if ($LASTEXITCODE -eq 0) { return "detached @ $tag" }
        $hash = git rev-parse --short HEAD 2>&1
        return "detached @ $hash"
    }
    return $branch
}

function Get-GitStatus {
    $s = git status --porcelain 2>&1
    if ($s) { return "* est izmeneniya" } else { return "OK clean" }
}

function Get-LastCommit {
    return git log -1 --pretty=format:"%h - %s" 2>&1
}

function Draw-Header {
    Clear-Host
    $branch = Get-CurrentBranch
    $status = Get-GitStatus
    $commit = Get-LastCommit

    Write-Host ""
    Write-Host "  +----------------------------------------------+" -ForegroundColor DarkCyan
    Write-Host "  |       STEALTHNET  GIT  MANAGER               |" -ForegroundColor Cyan
    Write-Host "  +----------------------------------------------+" -ForegroundColor DarkCyan

    $branchColor = if ($branch -eq "main") { "Green" } elseif ($branch -like "detached*") { "Red" } else { "Yellow" }
    Write-Host "  |  Vetka  : " -ForegroundColor DarkCyan -NoNewline
    Write-Host ("{0,-35}" -f $branch) -ForegroundColor $branchColor -NoNewline
    Write-Host "|" -ForegroundColor DarkCyan

    $statusColor = if ($status -like "OK*") { "Green" } else { "Yellow" }
    Write-Host "  |  Status : " -ForegroundColor DarkCyan -NoNewline
    Write-Host ("{0,-35}" -f $status) -ForegroundColor $statusColor -NoNewline
    Write-Host "|" -ForegroundColor DarkCyan

    $shortCommit = if ($commit.Length -gt 35) { $commit.Substring(0,32) + "..." } else { $commit }
    Write-Host "  |  Commit : " -ForegroundColor DarkCyan -NoNewline
    Write-Host ("{0,-35}" -f $shortCommit) -ForegroundColor Gray -NoNewline
    Write-Host "|" -ForegroundColor DarkCyan

    Write-Host "  +----------------------------------------------+" -ForegroundColor DarkCyan
    Write-Host ""
}

function Draw-Menu {
    param([string[]]$Items, [int]$Selected)
    for ($i = 0; $i -lt $Items.Length; $i++) {
        if ($i -eq $Selected) {
            Write-Host "  >> " -ForegroundColor Cyan -NoNewline
            Write-Host $Items[$i] -ForegroundColor White -BackgroundColor DarkBlue
        } else {
            Write-Host "     " -NoNewline
            Write-Host $Items[$i] -ForegroundColor DarkGray
        }
    }
}

function Interactive-Menu {
    param([string]$Title, [string[]]$Items)
    $selected = 0
    while ($true) {
        Draw-Header
        Write-Host "  $Title" -ForegroundColor Cyan
        Write-Host ""
        Draw-Menu -Items $Items -Selected $selected
        Write-Host ""
        Write-Host "  [strelki] Navigaciya   [Enter] Vybrat   [Esc] Nazad" -ForegroundColor DarkGray
        $key = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        switch ($key.VirtualKeyCode) {
            38 { if ($selected -gt 0) { $selected-- } }
            40 { if ($selected -lt ($Items.Length - 1)) { $selected++ } }
            13 { return $selected }
            27 { return -1 }
        }
    }
}

function Pause-Screen {
    Write-Host ""
    Write-Host "  [Enter] Nazad v menyu..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# =============================================
#   COMMIT
# =============================================

function Do-Commit {
    Draw-Header
    Write-Host "  SOZDAT KOMMIT" -ForegroundColor Cyan
    Write-Host ""
    $status = git status --porcelain
    if (-not $status) {
        Write-Host "  Net izmeneniy dlya kommita." -ForegroundColor Yellow
        Pause-Screen
        return
    }
    Write-Host "  Izmeneniya:" -ForegroundColor Gray
    git status --short
    Write-Host ""
    Write-Host "  Opisanie kommita: " -ForegroundColor Cyan -NoNewline
    $msg = Read-Host
    if (-not $msg) { $msg = "update: $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }
    git add -A
    git commit -m $msg
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "  [OK] Kommit sozdan!" -ForegroundColor Green
    } else {
        Write-Host "  [ERR] Oshibka pri kommite" -ForegroundColor Red
    }
    Pause-Screen
}

# =============================================
#   PUSH
# =============================================

function Do-Push {
    Draw-Header
    Write-Host "  PUSH V GITHUB" -ForegroundColor Cyan
    Write-Host ""
    $branch = Get-CurrentBranch
    if ($branch -like "detached*") {
        Write-Host "  Ty v detached HEAD! Snachala pereключis na vetku." -ForegroundColor Red
        Pause-Screen
        return
    }
    $status = git status --porcelain
    if ($status) {
        Write-Host "  Est nezakkommichennye izmeneniya." -ForegroundColor Yellow
        Write-Host "  Zakkommitit ikh seychas? (y/n): " -ForegroundColor Yellow -NoNewline
        $c = Read-Host
        if ($c -eq "y") {
            Write-Host "  Opisanie kommita: " -ForegroundColor Cyan -NoNewline
            $msg = Read-Host
            if (-not $msg) { $msg = "update: $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }
            git add -A
            git commit -m $msg
        }
    }
    Write-Host ""
    Write-Host "  Pushу vetku '$branch' v origin..." -ForegroundColor Cyan
    git push origin $branch
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "  [OK] Uspeshno zapusheno!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  [ERR] Oshibka pri push. Force push? (y/n): " -ForegroundColor Red -NoNewline
        $fp = Read-Host
        if ($fp -eq "y") {
            git push origin $branch --force
            Write-Host "  [OK] Force push vypolnen!" -ForegroundColor Green
        }
    }
    Pause-Screen
}

# =============================================
#   PULL
# =============================================

function Do-Pull {
    Draw-Header
    Write-Host "  PULL IZ GITHUB" -ForegroundColor Cyan
    Write-Host ""
    $branch = Get-CurrentBranch
    if ($branch -like "detached*") {
        Write-Host "  Ty v detached HEAD! Snachala pereklyuchis na vetku." -ForegroundColor Red
        Pause-Screen
        return
    }
    Write-Host "  Tyanу izmeneniya dlya vetki '$branch'..." -ForegroundColor Gray
    git pull origin $branch
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "  [OK] Pull vypolnen!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  [ERR] Oshibka pri pull." -ForegroundColor Red
    }
    Pause-Screen
}

# =============================================
#   SWITCH BRANCH
# =============================================

function Do-SwitchBranch {
    $branches = @(git branch --format="%(refname:short)" 2>&1 | Where-Object { $_ -ne "" })
    $menuItems = $branches + @("[ + Sozdat novuyu vetku ]", "[ Nazad ]")

    $choice = Interactive-Menu -Title "PEREKLYUCHENIE VETKI" -Items $menuItems
    if ($choice -eq -1 -or $choice -eq ($menuItems.Length - 1)) { return }

    if ($choice -eq ($menuItems.Length - 2)) {
        Draw-Header
        Write-Host "  NOVAYA VETKA" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  Nazvanie vetki: " -ForegroundColor Cyan -NoNewline
        $newBranch = Read-Host
        if (-not $newBranch) { return }
        git checkout -b $newBranch
        Write-Host ""
        Write-Host "  Zapushit novuyu vetku v origin? (y/n): " -ForegroundColor Yellow -NoNewline
        $p = Read-Host
        if ($p -eq "y") { git push origin $newBranch }
        Write-Host "  [OK] Vetka '$newBranch' sozdana!" -ForegroundColor Green
        Pause-Screen
        return
    }

    $selected = $menuItems[$choice]
    git checkout $selected
    if ($LASTEXITCODE -eq 0) {
        Draw-Header
        Write-Host "  [OK] Pereklyuchilsya na '$selected'" -ForegroundColor Green
    } else {
        Write-Host "  [ERR] Oshibka pri pereklyuchenii" -ForegroundColor Red
    }
    Pause-Screen
}

# =============================================
#   BACKUP
# =============================================

function Do-CreateBackup {
    Draw-Header
    Write-Host "  SOZDAT BEKAP" -ForegroundColor Cyan
    Write-Host ""
    $branch = Get-CurrentBranch
    if ($branch -like "detached*") {
        Write-Host "  Ty v detached HEAD! Snachala pereklyuchis na vetku." -ForegroundColor Red
        Pause-Screen
        return
    }
    $date = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $tagName = "backup-$date"
    Write-Host "  Opisanie bekapa (enter = propustit): " -ForegroundColor Cyan -NoNewline
    $desc = Read-Host
    if (-not $desc) { $desc = "Backup $date" }

    $status = git status --porcelain
    if ($status) {
        Write-Host ""
        Write-Host "  Est izmeneniya. Vklyuchit v bekap? (y/n): " -ForegroundColor Yellow -NoNewline
        $c = Read-Host
        if ($c -eq "y") { git add -A }
    }

    Write-Host ""
    Write-Host "  Pereklyuchayus na vetku backups..." -ForegroundColor Gray
    $backupExists = git branch --list "backups"
    if (-not $backupExists) {
        git checkout -b backups
        git push origin backups
    } else {
        git checkout backups
    }

    git add -A
    git commit -m "backup: $date - $desc" 2>&1 | Out-Null
    git tag -a $tagName -m $desc

    Write-Host "  Pushу v GitHub..." -ForegroundColor Gray
    git push origin backups --tags

    git checkout $branch

    Write-Host ""
    Write-Host "  [OK] Bekap sozdan: $tagName" -ForegroundColor Green
    Pause-Screen
}

function Do-ListBackups {
    $tags = @(git tag -l "backup-*" --sort=-version:refname 2>&1 | Where-Object { $_ -ne "" })
    if ($tags.Count -eq 0) {
        Draw-Header
        Write-Host "  Bekapov ne naydeno." -ForegroundColor Yellow
        Pause-Screen
        return
    }

    $menuItems = @()
    foreach ($tag in $tags) {
        $msg = git tag -l $tag --format="%(contents)" 2>&1 | Select-Object -First 1
        if (-not $msg) { $msg = "" }
        $menuItems += "$tag  --  $msg"
    }
    $menuItems += "[ Nazad ]"

    $choice = Interactive-Menu -Title "VYBERI BEKAP" -Items $menuItems
    if ($choice -eq -1 -or $choice -eq ($menuItems.Length - 1)) { return }

    $selectedTag = $tags[$choice]
    Do-BackupActions -Tag $selectedTag
}

function Do-BackupActions {
    param([string]$Tag)
    $actions = @(
        "Prosmotr (lokalno, bez izmeneniy)",
        "Vosstanovit v tekushchuyu vetku",
        "Vosstanovit v main i zapushit",
        "[ Nazad ]"
    )
    $choice = Interactive-Menu -Title "DEYSTVIYA S BEKAPOM: $Tag" -Items $actions
    if ($choice -eq -1 -or $choice -eq 3) { return }

    Draw-Header
    switch ($choice) {
        0 {
            git checkout $Tag
            Write-Host "  [OK] Ty prosmaтриваesh bekap: $Tag" -ForegroundColor Green
            Write-Host "  Dlya vozvrata: vyberi 'Pereklyuchit vetku' v menyu." -ForegroundColor DarkGray
            Pause-Screen
        }
        1 {
            $cur = Get-CurrentBranch
            Write-Host "  VNIMANIE! Vetka '$cur' budet sbroshena do $Tag" -ForegroundColor Yellow
            Write-Host "  Prodolzhat? (yes/no): " -ForegroundColor Red -NoNewline
            $c = Read-Host
            if ($c -ne "yes") { Write-Host "  Otmena." -ForegroundColor Gray; Pause-Screen; return }
            git reset --hard $Tag
            Write-Host "  [OK] Vetka '$cur' vosstanovlena iz $Tag" -ForegroundColor Green
            Pause-Screen
        }
        2 {
            Write-Host "  !!! TOCHKA NEVOZVRATA !!!" -ForegroundColor Red
            Write-Host "  main budet perezapisan iz $Tag i force push v GitHub!" -ForegroundColor Yellow
            Write-Host "  Prodolzhat? (yes/no): " -ForegroundColor Red -NoNewline
            $c = Read-Host
            if ($c -ne "yes") { Write-Host "  Otmena." -ForegroundColor Gray; Pause-Screen; return }
            git checkout main
            git reset --hard $Tag
            git push origin main --force
            Write-Host "  [OK] main vosstanovlen iz $Tag i zapushen!" -ForegroundColor Green
            Pause-Screen
        }
    }
}

# =============================================
#   MAIN MENU
# =============================================

function Main-Menu {
    $menuItems = @(
        "Kommit",
        "Push v GitHub",
        "Pull iz GitHub",
        "Pereklyuchit vetku",
        "Sozdat bekap",
        "Bekapy / Vosstanovit",
        "Vyhod"
    )
    while ($true) {
        $choice = Interactive-Menu -Title "GLAVNOE MENYU" -Items $menuItems
        switch ($choice) {
            -1 { }
             0 { Do-Commit }
             1 { Do-Push }
             2 { Do-Pull }
             3 { Do-SwitchBranch }
             4 { Do-CreateBackup }
             5 { Do-ListBackups }
             6 { Clear-Host; exit }
        }
    }
}

# =============================================
#   START
# =============================================

if ($Action) {
    switch ($Action.ToLower()) {
        "push"    { Do-Push }
        "commit"  { Do-Commit }
        "pull"    { Do-Pull }
        "backup"  { Do-CreateBackup }
        "list"    { Do-ListBackups }
        "status"  { Draw-Header; Pause-Screen }
        default   { Write-Host "Neizvestnaya komanda: $Action" -ForegroundColor Red }
    }
} else {
    Main-Menu
}
