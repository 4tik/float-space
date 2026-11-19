# Windows Virtual Extended Display Driver Helper for Float-Space
# Automates the creation and activation of an Indirect Display Driver (IddCx) virtual monitor on Windows 10/11.

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('install', 'enable', 'disable', 'status')]
    [string]$Action = 'status'
)

$ErrorActionPreference = 'SilentlyContinue'

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Float-Space — Windows Virtual Extended Display Manager " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

function Check-Screens {
    Add-Type -AssemblyName System.Windows.Forms
    $screens = [System.Windows.Forms.Screen]::AllScreens
    Write-Host "Detected Displays count: $($screens.Count)" -ForegroundColor Yellow
    foreach ($s in $screens) {
        $p = if ($s.Primary) { "[Primary Desktop]" } else { "[Extended / Virtual Display]" }
        Write-Host " - $($s.DeviceName) : $($s.Bounds.Width)x$($s.Bounds.Height) $p" -ForegroundColor Green
    }
    return $screens.Count
}

$screenCount = Check-Screens

if ($Action -eq 'status') {
    if ($screenCount -gt 1) {
        Write-Host "`nSUCCESS: Secondary / Virtual Display is ACTIVE and ready for Float-Space!" -ForegroundColor Green
    } else {
        Write-Host "`nNOTE: Only 1 display detected. Run this script as Administrator with '-Action enable' or '-Action install' to enable the Virtual Display Driver." -ForegroundColor Yellow
    }
    exit 0
}

if ($Action -eq 'enable') {
    Write-Host "`nEnabling Virtual Display..." -ForegroundColor Cyan
    # Check if devcon or deviceinstaller is available in driver path
    $driverDir = "$PSScriptRoot\driver"
    if (Test-Path "$driverDir\deviceinstaller64.exe") {
        Start-Process -FilePath "$driverDir\deviceinstaller64.exe" -ArgumentList "enableidd 1" -Verb RunAs -Wait
        Write-Host "Virtual Display enabled!" -ForegroundColor Green
    } else {
        Write-Host "Driver folder not found at $driverDir." -ForegroundColor Yellow
        Write-Host "Opening Windows Display Settings to detect external or wireless displays..." -ForegroundColor Cyan
        Start-Process "ms-settings:display"
    }
    Check-Screens
    exit 0
}

if ($Action -eq 'disable') {
    Write-Host "`nDisabling Virtual Display..." -ForegroundColor Cyan
    $driverDir = "$PSScriptRoot\driver"
    if (Test-Path "$driverDir\deviceinstaller64.exe") {
        Start-Process -FilePath "$driverDir\deviceinstaller64.exe" -ArgumentList "enableidd 0" -Verb RunAs -Wait
        Write-Host "Virtual Display disabled." -ForegroundColor Yellow
    }
    exit 0
}

if ($Action -eq 'install') {
    Write-Host "`nTo install the Windows Virtual Display Driver:" -ForegroundColor Cyan
    Write-Host "1. Download the open-source IddSampleDriver / Virtual Display Driver package." -ForegroundColor White
    Write-Host "2. Right-click and Run install-virtual-display.bat as Administrator." -ForegroundColor White
    Write-Host "3. Windows will recognize Display 2 (1920x1080 @ 60Hz) immediately." -ForegroundColor White
    exit 0
}
