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
  [Parameter(Mandatory=$false)][long]$OriginalStyle = 0,
  [Parameter(Mandatory=$false)][string]$InputType = "click",
  [Parameter(Mandatory=$false)][double]$NormX = 0.5,
  [Parameter(Mandatory=$false)][double]$NormY = 0.5,
  [Parameter(Mandatory=$false)][int]$DeltaX = 0,
  [Parameter(Mandatory=$false)][int]$DeltaY = 0,
  [Parameter(Mandatory=$false)][int]$CharCode = 0,
  [Parameter(Mandatory=$false)][int]$KeyCode = 0
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

    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
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
  elseif ($Action -eq "input") {
    if ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr)) {
      $rect = New-Object Win32Native+RECT
      [Win32Native]::GetClientRect($targetPtr, [ref]$rect) | Out-Null
      $w = [Math]::Max($rect.Right - $rect.Left, 1)
      $h = [Math]::Max($rect.Bottom - $rect.Top, 1)
      $targetX = [int]($rect.Left + ($NormX * $w))
      $targetY = [int]($rect.Top + ($NormY * $h))
      $lParam = [IntPtr](($targetY -shl 16) -bor ($targetX -band 0xFFFF))

      if ($InputType -eq "click" -or $InputType -eq "mouse_down") {
        [Win32Native]::PostMessage($targetPtr, 0x0201, [IntPtr]1, $lParam) | Out-Null # WM_LBUTTONDOWN
        if ($InputType -eq "click") {
          [Win32Native]::PostMessage($targetPtr, 0x0202, [IntPtr]0, $lParam) | Out-Null # WM_LBUTTONUP
        }
      }
      elseif ($InputType -eq "mouse_up") {
        [Win32Native]::PostMessage($targetPtr, 0x0202, [IntPtr]0, $lParam) | Out-Null # WM_LBUTTONUP
      }
      elseif ($InputType -eq "double_click") {
        [Win32Native]::PostMessage($targetPtr, 0x0203, [IntPtr]1, $lParam) | Out-Null # WM_LBUTTONDBLCLK
        [Win32Native]::PostMessage($targetPtr, 0x0202, [IntPtr]0, $lParam) | Out-Null # WM_LBUTTONUP
      }
      elseif ($InputType -eq "context_menu") {
        [Win32Native]::PostMessage($targetPtr, 0x0204, [IntPtr]2, $lParam) | Out-Null # WM_RBUTTONDOWN
        [Win32Native]::PostMessage($targetPtr, 0x0205, [IntPtr]0, $lParam) | Out-Null # WM_RBUTTONUP
      }
      elseif ($InputType -eq "wheel") {
        $wheelDelta = [int]$DeltaY * -1
        if ($wheelDelta -eq 0) { $wheelDelta = 120 }
        $wParam = [IntPtr]($wheelDelta -shl 16)
        [Win32Native]::PostMessage($targetPtr, 0x020A, $wParam, $lParam) | Out-Null # WM_MOUSEWHEEL
      }
      elseif ($InputType -eq "char") {
        if ($CharCode -gt 0) {
          [Win32Native]::PostMessage($targetPtr, 0x0102, [IntPtr]$CharCode, [IntPtr]1) | Out-Null # WM_CHAR
        }
      }
      elseif ($InputType -eq "key") {
        if ($KeyCode -gt 0) {
          [Win32Native]::PostMessage($targetPtr, 0x0100, [IntPtr]$KeyCode, [IntPtr]1) | Out-Null # WM_KEYDOWN
          [Win32Native]::PostMessage($targetPtr, 0x0101, [IntPtr]$KeyCode, [IntPtr]1) | Out-Null # WM_KEYUP
        }
      }
      $output["success"] = $true
    }
  }
} catch {
  $output["success"] = $false
  $output["error"] = $_.Exception.Message
}

$output | ConvertTo-Json -Compress
