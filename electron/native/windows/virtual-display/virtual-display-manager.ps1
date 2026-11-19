# Float-Space — Windows Virtual Extended Display Subsystem Manager
# Automates Virtual Display Driver (IddCx / MttVDD) installation, activation, and status inspection.

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('status', 'create', 'enable', 'disable', 'remove', 'set_resolution')]
    [string]$Action = 'status',

    [Parameter(Mandatory=$false)]
    [int]$Width = 1920,

    [Parameter(Mandatory=$false)]
    [int]$Height = 1080
)

$ErrorActionPreference = 'SilentlyContinue'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$binDir = Join-Path $scriptDir "bin"
$devcon = Join-Path $binDir "devcon.exe"
$infPath = Join-Path $binDir "MttVDD.inf"
$settingsSource = Join-Path $binDir "vdd_settings.xml"
$systemSettingsDir = "C:\VirtualDisplayDriver"
$systemSettingsPath = Join-Path $systemSettingsDir "vdd_settings.xml"

function Get-IsAdmin {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-DisplayScreens {
    Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
    $screens = @([System.Windows.Forms.Screen]::AllScreens)
    $screenList = @()
    foreach ($s in $screens) {
        $screenList += @{
            deviceName = $s.DeviceName
            bounds = @{
                x = $s.Bounds.X
                y = $s.Bounds.Y
                width = $s.Bounds.Width
                height = $s.Bounds.Height
            }
            primary = $s.Primary
            bitsPerPixel = $s.BitsPerPixel
        }
    }
    return ,$screenList
}

function Get-DriverNodeStatus {
    if (-not (Test-Path $devcon)) {
        return @{ exists = $false; running = $false; raw = "devcon not found" }
    }
    $output = & $devcon status Root\MttVDD 2>&1 | Out-String
    $exists = ($output -match "ROOT\\MTTVDD")
    $running = ($output -match "Driver is running")
    $disabled = ($output -match "Device is disabled")
    return @{
        exists = $exists
        running = $running
        disabled = $disabled
        raw = $output.Trim()
    }
}

function Ensure-SettingsFile([int]$targetWidth, [int]$targetHeight) {
    try {
        if (-not (Test-Path $systemSettingsDir)) {
            New-Item -ItemType Directory -Path $systemSettingsDir -Force | Out-Null
        }
        $xmlContent = @"
<?xml version='1.0' encoding='utf-8'?>
<vdd_settings>
    <monitors>
        <count>1</count>
    </monitors>
    <gpu>
        <friendlyname>default</friendlyname>
    </gpu>
    <global>
        <g_refresh_rate>60</g_refresh_rate>
    </global>
    <resolutions>
        <resolution>
            <width>$targetWidth</width>
            <height>$targetHeight</height>
            <refresh_rate>60</refresh_rate>
        </resolution>
        <resolution>
            <width>1920</width>
            <height>1080</height>
            <refresh_rate>60</refresh_rate>
        </resolution>
        <resolution>
            <width>1600</width>
            <height>900</height>
            <refresh_rate>60</refresh_rate>
        </resolution>
        <resolution>
            <width>1280</width>
            <height>720</height>
            <refresh_rate>60</refresh_rate>
        </resolution>
    </resolutions>
    <options>
        <CustomEdid>false</CustomEdid>
        <PreventSpoof>false</PreventSpoof>
        <EdidCeaOverride>false</EdidCeaOverride>
        <HardwareCursor>true</HardwareCursor>
        <SDR10bit>false</SDR10bit>
        <HDRPlus>false</HDRPlus>
        <logging>false</logging>
        <debuglogging>false</debuglogging> 
    </options>
</vdd_settings>
"@
        Set-Content -Path $systemSettingsPath -Value $xmlContent -Encoding UTF8 -Force
    } catch {}
}

# ----------------- ACTION: STATUS -----------------
if ($Action -eq 'status') {
    $screens = Get-DisplayScreens
    $driverStatus = Get-DriverNodeStatus
    $isAdmin = Get-IsAdmin

    # Truthful Status Computation:
    # 1. 'ready': Windows genuinely has Display 2 active (screens.Count > 1)
    # 2. 'disconnected': Driver node exists but disabled or turned off
    # 3. 'failed': Driver node exists with error
    # 4. 'not_created': Driver node not installed and screens.Count == 1

    $state = 'not_created'
    $secondary = $null

    if ($screens.Count -gt 1) {
        $secondary = $screens | Where-Object { -not $_.primary } | Select-Object -First 1
        if ($secondary) {
            $state = 'ready'
        }
    } elseif ($driverStatus.disabled) {
        $state = 'disconnected'
    } elseif ($driverStatus.exists -and -not $driverStatus.running) {
        $state = 'failed'
    } else {
        $state = 'not_created'
    }

    $res = @{
        state = $state
        screensCount = $screens.Count
        screens = $screens
        driverNode = $driverStatus
        isAdmin = $isAdmin
        secondaryDisplay = $secondary
    }

    $res | ConvertTo-Json -Compress -Depth 4
    exit 0
}

# ----------------- ACTION: CREATE / INSTALL -----------------
if ($Action -eq 'create') {
    Ensure-SettingsFile $Width $Height

    if (-not (Get-IsAdmin)) {
        # Trigger elevated execution with UAC
        $cmd = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Action create -Width $Width -Height $Height"
        $proc = Start-Process powershell.exe -ArgumentList $cmd -Verb RunAs -PassThru -Wait
        
        # Verify result after elevation
        Start-Sleep -Seconds 2
        $screens = Get-DisplayScreens
        $ready = ($screens.Count -gt 1)
        @{
            success = $ready
            state = if ($ready) { 'ready' } else { 'not_created' }
            message = if ($ready) { "Virtual Extended Display 2 created and active!" } else { "UAC elevation completed or canceled by user." }
            screensCount = $screens.Count
        } | ConvertTo-Json -Compress
        exit 0
    }

    # Running elevated: Execute devcon install
    Push-Location $binDir
    try {
        & $devcon install $infPath Root\MttVDD | Out-Null
        Start-Sleep -Seconds 1

        # Extend desktop topology in Windows
        Start-Process displayswitch.exe -ArgumentList "/extend" -Wait -WindowStyle Hidden
        Start-Sleep -Seconds 2

        $screens = Get-DisplayScreens
        $ready = ($screens.Count -gt 1)
        @{
            success = $ready
            state = if ($ready) { 'ready' } else { 'failed' }
            screensCount = $screens.Count
            message = if ($ready) { "Virtual Extended Display initialized successfully." } else { "Device node created. Please enable 'Extend these displays' in Windows Display Settings." }
        } | ConvertTo-Json -Compress
    } finally {
        Pop-Location
    }
    exit 0
}

# ----------------- ACTION: ENABLE -----------------
if ($Action -eq 'enable') {
    if (-not (Get-IsAdmin)) {
        $cmd = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Action enable"
        Start-Process powershell.exe -ArgumentList $cmd -Verb RunAs -Wait
    } else {
        & $devcon enable Root\MttVDD | Out-Null
        Start-Process displayswitch.exe -ArgumentList "/extend" -Wait -WindowStyle Hidden
    }
    Start-Sleep -Seconds 2
    $screens = Get-DisplayScreens
    @{
        success = ($screens.Count -gt 1)
        state = if ($screens.Count -gt 1) { 'ready' } else { 'disconnected' }
        screensCount = $screens.Count
    } | ConvertTo-Json -Compress
    exit 0
}

# ----------------- ACTION: DISABLE -----------------
if ($Action -eq 'disable') {
    if (-not (Get-IsAdmin)) {
        $cmd = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Action disable"
        Start-Process powershell.exe -ArgumentList $cmd -Verb RunAs -Wait
    } else {
        & $devcon disable Root\MttVDD | Out-Null
    }
    @{
        success = $true
        state = 'disconnected'
    } | ConvertTo-Json -Compress
    exit 0
}

# ----------------- ACTION: REMOVE -----------------
if ($Action -eq 'remove') {
    if (-not (Get-IsAdmin)) {
        $cmd = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Action remove"
        Start-Process powershell.exe -ArgumentList $cmd -Verb RunAs -Wait
    } else {
        & $devcon remove Root\MttVDD | Out-Null
    }
    @{
        success = $true
        state = 'not_created'
    } | ConvertTo-Json -Compress
    exit 0
}

# ----------------- ACTION: SET_RESOLUTION -----------------
if ($Action -eq 'set_resolution') {
    Ensure-SettingsFile $Width $Height
    @{
        success = $true
        resolution = "$($Width)x$($Height)"
    } | ConvertTo-Json -Compress
    exit 0
}
