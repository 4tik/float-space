# Win32 Bridge for Float-Space
# High-performance persistent Win32 automation bridge for native window embedding, bounds synchronization, and low-latency input forwarding.

param(
  [Parameter(Mandatory=$false)][string]$Action,
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
  [Parameter(Mandatory=$false)][int]$KeyCode = 0,
  [Parameter(Mandatory=$false)][switch]$Daemon
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
    public static extern bool SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool ClientToScreen(IntPtr hWnd, ref POINT lpPoint);

    [DllImport("user32.dll")]
    public static extern bool ScreenToClient(IntPtr hWnd, ref POINT lpPoint);

    [DllImport("user32.dll")]
    public static extern IntPtr WindowFromPoint(POINT Point);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT {
        public int X;
        public int Y;
    }
}
'@

try {
  if (-not ([System.Management.Automation.PSTypeName]'Win32Native').Type) {
    Add-Type -TypeDefinition $code -ErrorAction Stop
  }
} catch {
  # Type already registered in session
}

function Dispatch-Action($params) {
  $action = $params.action
  if (-not $action) { $action = $params.Action }
  $targetHwndStr = if ($params.targetHwnd) { $params.targetHwnd } else { $params.TargetHwnd }
  $parentHwndStr = if ($params.parentHwnd) { $params.parentHwnd } else { $params.ParentHwnd }
  $x = if ($null -ne $params.x) { [int]$params.x } else { [int]$params.X }
  $y = if ($null -ne $params.y) { [int]$params.y } else { [int]$params.Y }
  $width = if ($null -ne $params.width) { [int]$params.width } else { [int]$params.Width }
  $height = if ($null -ne $params.height) { [int]$params.height } else { [int]$params.Height }
  $originalStyle = if ($null -ne $params.originalStyle) { [long]$params.originalStyle } else { [long]$params.OriginalStyle }
  $inputType = if ($params.inputType) { $params.inputType } else { $params.InputType }
  $normX = if ($null -ne $params.normX) { [double]$params.normX } else { [double]$params.NormX }
  $normY = if ($null -ne $params.normY) { [double]$params.normY } else { [double]$params.NormY }
  $deltaX = if ($null -ne $params.deltaX) { [int]$params.deltaX } else { [int]$params.DeltaX }
  $deltaY = if ($null -ne $params.deltaY) { [int]$params.deltaY } else { [int]$params.DeltaY }
  $charCode = if ($null -ne $params.charCode) { [int]$params.charCode } else { [int]$params.CharCode }
  $keyCode = if ($null -ne $params.keyCode) { [int]$params.keyCode } else { [int]$params.KeyCode }

  $targetPtr = [IntPtr]::Zero
  if ($targetHwndStr -and $targetHwndStr -ne "0") {
    $targetPtr = [IntPtr][long]$targetHwndStr
  }

  $parentPtr = [IntPtr]::Zero
  if ($parentHwndStr -and $parentHwndStr -ne "0") {
    $parentPtr = [IntPtr][long]$parentHwndStr
  }

  $out = @{ success = $false; action = $action }

  if ($action -eq "embed") {
    if ($targetPtr -eq [IntPtr]::Zero -or $parentPtr -eq [IntPtr]::Zero) {
      throw "Invalid window handles: Target=$targetHwndStr, Parent=$parentHwndStr"
    }
    if (-not [Win32Native]::IsWindow($targetPtr)) {
      throw "Target window does not exist or has closed."
    }

    # 1. Ensure Electron parent container has WS_CLIPCHILDREN (0x02000000) so it doesn't paint over child
    $parentStyle = [Win32Native]::GetWindowLong($parentPtr, -16)
    if (($parentStyle -band 0x02000000) -eq 0) {
      [Win32Native]::SetWindowLong($parentPtr, -16, ($parentStyle -bor 0x02000000)) | Out-Null
    }

    # 2. Attach thread input so child receives focus and keystrokes
    [uint32]$childPid = 0
    $childThread = [Win32Native]::GetWindowThreadProcessId($targetPtr, [ref]$childPid)
    [uint32]$parentPid = 0
    $parentThread = [Win32Native]::GetWindowThreadProcessId($parentPtr, [ref]$parentPid)
    if ($childThread -ne 0 -and $parentThread -ne 0 -and $childThread -ne $parentThread) {
      [Win32Native]::AttachThreadInput($childThread, $parentThread, $true) | Out-Null
    }

    # 3. Save original style (GWL_STYLE = -16)
    $oldStyle = [Win32Native]::GetWindowLong($targetPtr, -16)
    $out["originalStyle"] = $oldStyle

    # Remove WS_POPUP (0x80000000) and WS_CAPTION (0x00C00000)
    # Add WS_CHILD (0x40000000) | WS_VISIBLE (0x10000000) | WS_CLIPSIBLINGS (0x04000000)
    $newStyle = ($oldStyle -band (-bnot 0x80C00000)) -bor 0x44000000 -bor 0x10000000
    [Win32Native]::SetWindowLong($targetPtr, -16, $newStyle) | Out-Null

    # 4. Reparent to Electron container
    [Win32Native]::SetParent($targetPtr, $parentPtr) | Out-Null

    # 5. Position and show with SWP_FRAMECHANGED (0x0020) and SWP_SHOWWINDOW (0x0040)
    [Win32Native]::SetWindowPos($targetPtr, [IntPtr]::Zero, $x, $y, $width, $height, 0x0020 -bor 0x0040) | Out-Null
    [Win32Native]::ShowWindow($targetPtr, 5) | Out-Null
    [Win32Native]::SetForegroundWindow($targetPtr) | Out-Null

    $out["success"] = $true
    $out["message"] = "Embedded target $targetHwndStr into container $parentHwndStr"
    return $out
  }

  if ($action -eq "sync") {
    if ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr)) {
      [Win32Native]::SetWindowPos($targetPtr, [IntPtr]::Zero, $x, $y, $width, $height, 0x0004 -bor 0x0020) | Out-Null # SWP_NOZORDER | SWP_FRAMECHANGED
      $out["success"] = $true
    }
    return $out
  }

  if ($action -eq "detach") {
    if ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr)) {
      [Win32Native]::SetParent($targetPtr, [IntPtr]::Zero) | Out-Null
      if ($originalStyle -ne 0) {
        [Win32Native]::SetWindowLong($targetPtr, -16, [int]$originalStyle) | Out-Null
      }
      [Win32Native]::SetWindowPos($targetPtr, [IntPtr]::Zero, 0, 0, 0, 0, 0x0001 -bor 0x0002 -bor 0x0020 -bor 0x0040) | Out-Null # SWP_NOSIZE | SWP_NOMOVE
      [Win32Native]::ShowWindow($targetPtr, 9) | Out-Null # SW_RESTORE

      # Detach thread input
      [uint32]$cPid = 0
      $cThread = [Win32Native]::GetWindowThreadProcessId($targetPtr, [ref]$cPid)
      [uint32]$pPid = 0
      $pThread = [Win32Native]::GetWindowThreadProcessId($parentPtr, [ref]$pPid)
      if ($cThread -ne 0 -and $pThread -ne 0 -and $cThread -ne $pThread) {
        [Win32Native]::AttachThreadInput($cThread, $pThread, $false) | Out-Null
      }

      $out["success"] = $true
      $out["message"] = "Detached target $targetHwndStr"
    } else {
      $out["success"] = $true
      $out["message"] = "Window already closed"
    }
    return $out
  }

  if ($action -eq "focus") {
    if ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr)) {
      [Win32Native]::ShowWindow($targetPtr, 9) | Out-Null # SW_RESTORE
      [Win32Native]::SetForegroundWindow($targetPtr) | Out-Null
      [Win32Native]::BringWindowToTop($targetPtr) | Out-Null
      $out["success"] = $true
    }
    return $out
  }

  if ($action -eq "get_process") {
    if ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr)) {
      [uint32]$procId = 0
      [Win32Native]::GetWindowThreadProcessId($targetPtr, [ref]$procId) | Out-Null
      $procName = ""
      $procPath = ""
      if ($procId -gt 0) {
        try {
          $p = [System.Diagnostics.Process]::GetProcessById([int]$procId)
          $procName = $p.ProcessName
          try { $procPath = $p.MainModule.FileName } catch {}
        } catch {}
      }
      $out["success"] = $true
      $out["processId"] = [int]$procId
      $out["processName"] = $procName
      $out["executablePath"] = $procPath
    }
    return $out
  }

  if ($action -eq "validate") {
    $exists = ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr))
    $procMatch = $true
    [uint32]$actualPid = 0
    if ($exists) {
      [Win32Native]::GetWindowThreadProcessId($targetPtr, [ref]$actualPid) | Out-Null
      if ($params.expectedPid -and [int]$params.expectedPid -gt 0) {
        $procMatch = ([int]$actualPid -eq [int]$params.expectedPid)
      }
    }
    $out["success"] = ($exists -and $procMatch)
    $out["exists"] = $exists
    $out["pidMatch"] = $procMatch
    $out["actualPid"] = [int]$actualPid
    return $out
  }

  if ($action -eq "input") {
    if ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr)) {
      $rect = New-Object Win32Native+RECT
      [Win32Native]::GetClientRect($targetPtr, [ref]$rect) | Out-Null
      $w = [Math]::Max($rect.Right - $rect.Left, 1)
      $h = [Math]::Max($rect.Bottom - $rect.Top, 1)
      $clientX = [int]($rect.Left + ($normX * $w))
      $clientY = [int]($rect.Top + ($normY * $h))

      # Convert client coordinate to screen point
      $pt = New-Object Win32Native+POINT
      $pt.X = $clientX
      $pt.Y = $clientY
      [Win32Native]::ClientToScreen($targetPtr, [ref]$pt) | Out-Null

      # Target the specific child control under cursor
      $childHwnd = [Win32Native]::WindowFromPoint($pt)
      $sendHwnd = $targetPtr
      $destX = $clientX
      $destY = $clientY

      if ($childHwnd -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($childHwnd)) {
        [uint32]$childPid = 0
        [Win32Native]::GetWindowThreadProcessId($childHwnd, [ref]$childPid) | Out-Null
        [uint32]$tgtPid = 0
        [Win32Native]::GetWindowThreadProcessId($targetPtr, [ref]$tgtPid) | Out-Null
        if ($childPid -eq $tgtPid) {
          $sendHwnd = $childHwnd
          $childPt = New-Object Win32Native+POINT
          $childPt.X = $pt.X
          $childPt.Y = $pt.Y
          [Win32Native]::ScreenToClient($childHwnd, [ref]$childPt) | Out-Null
          $destX = $childPt.X
          $destY = $childPt.Y
        }
      }

      $lParam = [IntPtr](($destY -shl 16) -bor ($destX -band 0xFFFF))
      $screenLParam = [IntPtr](($pt.Y -shl 16) -bor ($pt.X -band 0xFFFF))

      if ($inputType -eq "click" -or $inputType -eq "mouse_down") {
        [Win32Native]::SetForegroundWindow($targetPtr) | Out-Null
        [Win32Native]::PostMessage($sendHwnd, 0x0201, [IntPtr]1, $lParam) | Out-Null # WM_LBUTTONDOWN
        if ($inputType -eq "click") {
          [Win32Native]::PostMessage($sendHwnd, 0x0202, [IntPtr]0, $lParam) | Out-Null # WM_LBUTTONUP
        }
      }
      elseif ($inputType -eq "mouse_up") {
        [Win32Native]::PostMessage($sendHwnd, 0x0202, [IntPtr]0, $lParam) | Out-Null # WM_LBUTTONUP
      }
      elseif ($inputType -eq "double_click") {
        [Win32Native]::PostMessage($sendHwnd, 0x0203, [IntPtr]1, $lParam) | Out-Null # WM_LBUTTONDBLCLK
        [Win32Native]::PostMessage($sendHwnd, 0x0202, [IntPtr]0, $lParam) | Out-Null # WM_LBUTTONUP
      }
      elseif ($inputType -eq "context_menu") {
        [Win32Native]::PostMessage($sendHwnd, 0x0204, [IntPtr]2, $lParam) | Out-Null # WM_RBUTTONDOWN
        [Win32Native]::PostMessage($sendHwnd, 0x0205, [IntPtr]0, $lParam) | Out-Null # WM_RBUTTONUP
      }
      elseif ($inputType -eq "wheel") {
        $wheelDelta = [int]$deltaY * -1
        if ($wheelDelta -eq 0) { $wheelDelta = 120 }
        $wParam = [IntPtr]($wheelDelta -shl 16)
        [Win32Native]::PostMessage($sendHwnd, 0x020A, $wParam, $screenLParam) | Out-Null # WM_MOUSEWHEEL
      }
      elseif ($inputType -eq "move") {
        [Win32Native]::PostMessage($sendHwnd, 0x0200, [IntPtr]0, $lParam) | Out-Null # WM_MOUSEMOVE
      }
      elseif ($inputType -eq "char") {
        if ($charCode -gt 0) {
          [Win32Native]::PostMessage($targetPtr, 0x0102, [IntPtr]$charCode, [IntPtr]1) | Out-Null # WM_CHAR
        }
      }
      elseif ($inputType -eq "key") {
        if ($keyCode -gt 0) {
          [Win32Native]::PostMessage($targetPtr, 0x0100, [IntPtr]$keyCode, [IntPtr]1) | Out-Null # WM_KEYDOWN
          [Win32Native]::PostMessage($targetPtr, 0x0101, [IntPtr]$keyCode, [IntPtr]1) | Out-Null # WM_KEYUP
        }
      }

      $out["success"] = $true
    }
    return $out
  }

  return $out
}

# Daemon Mode: Persistent stdin loop for instantaneous input forwarding
if ($Daemon) {
  [Console]::Out.WriteLine("READY")
  [Console]::Out.Flush()

  while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    if ($line.Trim() -eq "") { continue }

    try {
      $req = $line | ConvertFrom-Json
      $res = Dispatch-Action $req
      [Console]::Out.WriteLine(($res | ConvertTo-Json -Compress))
      [Console]::Out.Flush()
    } catch {
      [Console]::Out.WriteLine((@{ success = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress))
      [Console]::Out.Flush()
    }
  }
  exit 0
}

# One-shot command line mode
try {
  $cmdParams = @{
    action = $Action
    targetHwnd = $TargetHwnd
    parentHwnd = $ParentHwnd
    x = $X
    y = $Y
    width = $Width
    height = $Height
    originalStyle = $OriginalStyle
    inputType = $InputType
    normX = $NormX
    normY = $NormY
    deltaX = $DeltaX
    deltaY = $DeltaY
    charCode = $CharCode
    keyCode = $KeyCode
  }
  $result = Dispatch-Action $cmdParams
  $result | ConvertTo-Json -Compress
} catch {
  @{ success = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
}
