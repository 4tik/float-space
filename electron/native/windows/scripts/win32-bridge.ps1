# Win32 Bridge for Float-Space
# Handles safe cross-process window reparenting, bounds synchronization, and detachment.

param(
  [Parameter(Mandatory=$true)][string]$Action,
  [Parameter(Mandatory=$false)][string]$TargetHwnd,
  [Parameter(Mandatory=$false)][string]$ParentHwnd,
  [Parameter(Mandatory=$false)][int]$X = 0,
  [Parameter(Mandatory=$false)][int]$Y = 32,
  [Parameter(Mandatory=$false)][int]$Width = 480,
  [Parameter(Mandatory=$false)][int]$Height = 288,
  [Parameter(Mandatory=$false)][long]$OriginalStyle = 0
)

# Inline C# P/Invoke definitions for User32
$code = @'
using System;
using System.Runtime.InteropServices;

public class Win32Native {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool IsWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
'@

try {
  if (-not ([System.Management.Automation.PSTypeName]'Win32Native').Type) {
    Add-Type -TypeDefinition $code -ErrorAction Stop
  }
} catch {
  # Already defined or type exists
}

$output = @{ success = $false; action = $Action }

try {
  $targetPtr = [IntPtr]::Zero
  if ($TargetHwnd -and $TargetHwnd -ne "0") {
    $targetPtr = [IntPtr][long]$TargetHwnd
  }

  $parentPtr = [IntPtr]::Zero
  if ($ParentHwnd -and $ParentHwnd -ne "0") {
    $parentPtr = [IntPtr][long]$ParentHwnd
  }

  if ($Action -eq "embed") {
    if ($targetPtr -eq [IntPtr]::Zero -or $parentPtr -eq [IntPtr]::Zero) {
      throw "Invalid window handles: Target=$TargetHwnd, Parent=$ParentHwnd"
    }

    if (-not [Win32Native]::IsWindow($targetPtr)) {
      throw "Target window does not exist or has closed."
    }

    # Save original window style (GWL_STYLE = -16)
    $oldStyle = [Win32Native]::GetWindowLong($targetPtr, -16)
    $output["originalStyle"] = $oldStyle

    # WS_VISIBLE = 0x10000000, WS_CHILD = 0x40000000, remove WS_POPUP (0x80000000)
    $newStyle = ($oldStyle -band (-bnot 0x80000000)) -bor 0x40000000 -bor 0x10000000
    [Win32Native]::SetWindowLong($targetPtr, -16, $newStyle) | Out-Null

    # Reparent to Electron container
    $resParent = [Win32Native]::SetParent($targetPtr, $parentPtr)
    
    # Position child window inside Electron window below titlebar
    [Win32Native]::MoveWindow($targetPtr, $X, $Y, $Width, $Height, $true) | Out-Null
    [Win32Native]::ShowWindow($targetPtr, 5) | Out-Null # SW_SHOW
    [Win32Native]::SetForegroundWindow($targetPtr) | Out-Null

    $output["success"] = $true
    $output["message"] = "Embedded target $TargetHwnd into container $ParentHwnd"
  }
  elseif ($Action -eq "sync") {
    if ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr)) {
      [Win32Native]::MoveWindow($targetPtr, $X, $Y, $Width, $Height, $true) | Out-Null
      $output["success"] = $true
    }
  }
  elseif ($Action -eq "detach") {
    if ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr)) {
      # Detach to desktop root (IntPtr.Zero)
      [Win32Native]::SetParent($targetPtr, [IntPtr]::Zero) | Out-Null

      if ($OriginalStyle -ne 0) {
        [Win32Native]::SetWindowLong($targetPtr, -16, [int]$OriginalStyle) | Out-Null
      }

      # Restore window visibility and state
      [Win32Native]::ShowWindow($targetPtr, 9) | Out-Null # SW_RESTORE
      $output["success"] = $true
      $output["message"] = "Detached target $TargetHwnd back to desktop"
    } else {
      $output["success"] = $true
      $output["message"] = "Window already destroyed or invalid"
    }
  }
  elseif ($Action -eq "focus") {
    if ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr)) {
      [Win32Native]::SetForegroundWindow($targetPtr) | Out-Null
      [Win32Native]::BringWindowToTop($targetPtr) | Out-Null
      $output["success"] = $true
    }
  }
} catch {
  $output["success"] = $false
  $output["error"] = $_.Exception.Message
}

$output | ConvertTo-Json -Compress
