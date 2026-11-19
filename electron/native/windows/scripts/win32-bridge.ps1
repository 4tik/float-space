# Win32 Bridge for Float-Space
# High-performance persistent Win32 automation bridge for native window embedding, bounds synchronization, and input routing.

param(
  [Parameter(Mandatory=$false)][string]$Action,
  [Parameter(Mandatory=$false)][string]$TargetHwnd,
  [Parameter(Mandatory=$false)][string]$ParentHwnd,
  [Parameter(Mandatory=$false)][int]$X = 0,
  [Parameter(Mandatory=$false)][int]$Y = 32,
  [Parameter(Mandatory=$false)][int]$Width = 480,
  [Parameter(Mandatory=$false)][int]$Height = 288,
  [Parameter(Mandatory=$false)][long]$OriginalStyle = 0,
  [Parameter(Mandatory=$false)][long]$OriginalExStyle = 0,
  [Parameter(Mandatory=$false)][int]$OrigX = 0,
  [Parameter(Mandatory=$false)][int]$OrigY = 0,
  [Parameter(Mandatory=$false)][int]$OrigWidth = 0,
  [Parameter(Mandatory=$false)][int]$OrigHeight = 0,
  [Parameter(Mandatory=$false)][int]$ProcessId = 0,
  [Parameter(Mandatory=$false)][string]$Title = "",
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
using System.Text;
using System.Runtime.InteropServices;
using System.Collections.Generic;

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
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern IntPtr SetFocus(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern IntPtr SetActiveWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool UpdateWindow(IntPtr hWnd);

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

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

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

    public static IntPtr FindBestWindowForProcess(uint targetPid, string titleHint, IntPtr initialHwnd) {
        if (initialHwnd != IntPtr.Zero && IsWindow(initialHwnd) && IsWindowVisible(initialHwnd)) {
            uint pid = 0;
            GetWindowThreadProcessId(initialHwnd, out pid);
            if (pid == targetPid) {
                RECT r;
                GetWindowRect(initialHwnd, out r);
                int w = r.Right - r.Left;
                int h = r.Bottom - r.Top;
                if (w > 150 && h > 100) {
                    return initialHwnd;
                }
            }
        }

        IntPtr bestHwnd = IntPtr.Zero;
        long bestScore = -1;

        EnumWindows((hWnd, lParam) => {
            if (!IsWindowVisible(hWnd)) return true;
            uint pid = 0;
            GetWindowThreadProcessId(hWnd, out pid);
            if (pid != targetPid) return true;

            RECT r;
            GetWindowRect(hWnd, out r);
            int w = r.Right - r.Left;
            int h = r.Bottom - r.Top;
            if (w < 80 || h < 60) return true;

            var sbClass = new StringBuilder(256);
            GetClassName(hWnd, sbClass, 256);
            string cls = sbClass.ToString();
            if (cls.Contains("IME") || cls.Contains("Tooltip") || cls.Contains("Shadow") || cls.Contains("WorkerW")) {
                return true;
            }

            var sbTitle = new StringBuilder(512);
            GetWindowText(hWnd, sbTitle, 512);
            string title = sbTitle.ToString();

            long score = (long)w * h;
            if (!string.IsNullOrEmpty(titleHint) && !string.IsNullOrEmpty(title)) {
                if (title.IndexOf(titleHint, StringComparison.OrdinalIgnoreCase) >= 0) {
                    score += 10000000;
                }
            }
            if (hWnd == initialHwnd) {
                score += 5000000;
            }

            if (score > bestScore) {
                bestScore = score;
                bestHwnd = hWnd;
            }

            return true;
        }, IntPtr.Zero);

        return (bestHwnd != IntPtr.Zero) ? bestHwnd : initialHwnd;
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
  $originalExStyle = if ($null -ne $params.originalExStyle) { [long]$params.originalExStyle } else { [long]$params.OriginalExStyle }
  $origX = if ($null -ne $params.origX) { [int]$params.origX } else { [int]$params.OrigX }
  $origY = if ($null -ne $params.origY) { [int]$params.origY } else { [int]$params.OrigY }
  $origWidth = if ($null -ne $params.origWidth) { [int]$params.origWidth } else { [int]$params.OrigWidth }
  $origHeight = if ($null -ne $params.origHeight) { [int]$params.origHeight } else { [int]$params.OrigHeight }
  $processId = if ($null -ne $params.processId) { [int]$params.processId } else { [int]$params.ProcessId }
  $title = if ($params.title) { [string]$params.title } else { [string]$params.Title }

  $inputType = if ($params.inputType) { $params.inputType } else { $params.InputType }
  $normX = if ($null -ne $params.normX) { [double]$params.normX } else { [double]$params.NormX }
  $normY = if ($null -ne $params.normY) { [double]$params.normY } else { [double]$params.NormY }
  $deltaX = if ($null -ne $params.deltaX) { [int]$params.deltaX } else { [int]$params.DeltaX }
  $deltaY = if ($null -ne $params.deltaY) { [int]$params.deltaY } else { [int]$params.DeltaY }
  $charCode = if ($null -ne $params.charCode) { [int]$params.charCode } else { [int]$params.CharCode }
  $keyCode = if ($null -ne $params.keyCode) { [int]$params.keyCode } else { [int]$params.KeyCode }
  $screenX = if ($null -ne $params.screenX) { [int]$params.screenX } else { [int]$params.ScreenX }
  $screenY = if ($null -ne $params.screenY) { [int]$params.screenY } else { [int]$params.ScreenY }
  $maximize = if ($null -ne $params.maximize) { [bool]$params.maximize } else { [bool]$params.Maximize }

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
    [uint32]$expectedPid = 0
    if ($processId -gt 0) { $expectedPid = [uint32]$processId }

    # Resolve the true interactive window for the target process
    if ($expectedPid -gt 0) {
      $resolvedHwnd = [Win32Native]::FindBestWindowForProcess($expectedPid, $title, $targetPtr)
      if ($resolvedHwnd -ne [IntPtr]::Zero) {
        $targetPtr = $resolvedHwnd
      }
    }

    if ($targetPtr -eq [IntPtr]::Zero -or $parentPtr -eq [IntPtr]::Zero) {
      throw "Invalid window handles: Target=$targetHwndStr, Parent=$parentHwndStr"
    }
    if (-not [Win32Native]::IsWindow($targetPtr)) {
      throw "Target window does not exist or has closed."
    }

    # Verify process ownership
    [uint32]$childPid = 0
    $childThread = [Win32Native]::GetWindowThreadProcessId($targetPtr, [ref]$childPid)
    if ($expectedPid -gt 0 -and $childPid -ne $expectedPid) {
      throw "Target window PID ($childPid) does not match expected application PID ($expectedPid)."
    }

    # 1. Restore target application window if minimized so Win32 renders it
    [Win32Native]::ShowWindow($targetPtr, 9) | Out-Null # SW_RESTORE

    # 2. Ensure parent container has WS_CLIPCHILDREN (0x02000000) so it doesn't paint over child
    $parentStyle = [Win32Native]::GetWindowLong($parentPtr, -16)
    if (($parentStyle -band 0x02000000) -eq 0) {
      [Win32Native]::SetWindowLong($parentPtr, -16, ($parentStyle -bor 0x02000000)) | Out-Null
    }

    # 3. Attach thread input so child receives focus, keyboard keystrokes, and cursor events
    [uint32]$parentPid = 0
    $parentThread = [Win32Native]::GetWindowThreadProcessId($parentPtr, [ref]$parentPid)
    if ($childThread -ne 0 -and $parentThread -ne 0 -and $childThread -ne $parentThread) {
      [Win32Native]::AttachThreadInput($childThread, $parentThread, $true) | Out-Null
    }

    # 4. Save original styles and bounds for clean restoration on detach
    $oldStyle = [Win32Native]::GetWindowLong($targetPtr, -16) # GWL_STYLE
    $oldExStyle = [Win32Native]::GetWindowLong($targetPtr, -20) # GWL_EXSTYLE
    $origRect = New-Object Win32Native+RECT
    [Win32Native]::GetWindowRect($targetPtr, [ref]$origRect) | Out-Null

    $out["originalStyle"] = $oldStyle
    $out["originalExStyle"] = $oldExStyle
    $out["origX"] = $origRect.Left
    $out["origY"] = $origRect.Top
    $out["origWidth"] = [Math]::Max($origRect.Right - $origRect.Left, 200)
    $out["origHeight"] = [Math]::Max($origRect.Bottom - $origRect.Top, 150)
    $out["resolvedHwnd"] = $targetPtr.ToInt64().ToString()

    # 5. Modify child styles:
    # Remove WS_POPUP (0x80000000) | WS_CAPTION (0x00C00000) | WS_THICKFRAME (0x00040000) | WS_MINIMIZEBOX (0x00020000) | WS_MAXIMIZEBOX (0x00010000) | WS_SYSMENU (0x00080000) = 0x80CF0000
    # Add WS_CHILD (0x40000000) | WS_VISIBLE (0x10000000) | WS_CLIPSIBLINGS (0x04000000) = 0x54000000
    $newStyle = ($oldStyle -band (-bnot 0x80CF0000)) -bor 0x54000000
    [Win32Native]::SetWindowLong($targetPtr, -16, $newStyle) | Out-Null

    # Remove WS_EX_APPWINDOW (0x00040000) so it doesn't show a redundant separate taskbar button while embedded
    $newExStyle = ($oldExStyle -band (-bnot 0x00040000))
    [Win32Native]::SetWindowLong($targetPtr, -20, $newExStyle) | Out-Null

    # 6. Reparent window to parent container
    $repRes = [Win32Native]::SetParent($targetPtr, $parentPtr)
    if ($repRes -eq [IntPtr]::Zero) {
      $winErr = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
      if ($winErr -eq 5) {
        throw "Access denied by Windows UIPI. The target application is running with elevated Administrator privileges. Please run Float-Space as Administrator to embed this window."
      } else {
        throw "SetParent failed with Win32 error code: $winErr"
      }
    }

    # 7. Position, resize, and show the embedded window
    # SWP_FRAMECHANGED (0x0020) | SWP_SHOWWINDOW (0x0040)
    [Win32Native]::SetWindowPos($targetPtr, [IntPtr]::Zero, $x, $y, $width, $height, 0x0020 -bor 0x0040) | Out-Null
    [Win32Native]::ShowWindow($targetPtr, 5) | Out-Null # SW_SHOW
    [Win32Native]::UpdateWindow($targetPtr) | Out-Null
    [Win32Native]::SetForegroundWindow($targetPtr) | Out-Null
    [Win32Native]::SetFocus($targetPtr) | Out-Null

    $out["success"] = $true
    $out["message"] = "Embedded target $($targetPtr.ToInt64().ToString()) into container $parentHwndStr"
    return $out
  }

  if ($action -eq "sync") {
    if ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr)) {
      # SWP_NOZORDER (0x0004) | SWP_FRAMECHANGED (0x0020) | SWP_NOACTIVATE (0x0010)
      [Win32Native]::SetWindowPos($targetPtr, [IntPtr]::Zero, $x, $y, $width, $height, 0x0004 -bor 0x0020 -bor 0x0010) | Out-Null
      [Win32Native]::UpdateWindow($targetPtr) | Out-Null
      $out["success"] = $true
    }
    return $out
  }

  if ($action -eq "detach") {
    if ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr)) {
      # 1. Reparent back to top-level desktop
      [Win32Native]::SetParent($targetPtr, [IntPtr]::Zero) | Out-Null

      # 2. Restore original styles
      if ($originalStyle -ne 0) {
        [Win32Native]::SetWindowLong($targetPtr, -16, [int]$originalStyle) | Out-Null
      }
      if ($originalExStyle -ne 0) {
        [Win32Native]::SetWindowLong($targetPtr, -20, [int]$originalExStyle) | Out-Null
      }

      # 3. Restore bounds and window frame
      if ($origWidth -gt 0 -and $origHeight -gt 0) {
        [Win32Native]::SetWindowPos($targetPtr, [IntPtr]::Zero, $origX, $origY, $origWidth, $origHeight, 0x0020 -bor 0x0040) | Out-Null
      } else {
        [Win32Native]::SetWindowPos($targetPtr, [IntPtr]::Zero, 0, 0, 0, 0, 0x0001 -bor 0x0002 -bor 0x0020 -bor 0x0040) | Out-Null
      }

      [Win32Native]::ShowWindow($targetPtr, 9) | Out-Null # SW_RESTORE
      [Win32Native]::UpdateWindow($targetPtr) | Out-Null

      # 4. Detach thread input
      [uint32]$cPid = 0
      $cThread = [Win32Native]::GetWindowThreadProcessId($targetPtr, [ref]$cPid)
      [uint32]$pPid = 0
      $pThread = [Win32Native]::GetWindowThreadProcessId($parentPtr, [ref]$pPid)
      if ($cThread -ne 0 -and $pThread -ne 0 -and $cThread -ne $pThread) {
        [Win32Native]::AttachThreadInput($cThread, $pThread, $false) | Out-Null
      }

      $out["success"] = $true
      $out["message"] = "Detached target $targetHwndStr and restored desktop state"
    } else {
      $out["success"] = $true
      $out["message"] = "Window already closed"
    }
    return $out
  }

  if ($action -eq "focus" -or $action -eq "restore") {
    $foundPtr = $targetPtr
    if ($foundPtr -eq [IntPtr]::Zero -or (-not [Win32Native]::IsWindow($foundPtr))) {
      if ($processId -gt 0) {
        $foundPtr = [Win32Native]::FindBestWindowForProcess([uint32]$processId, $title, [IntPtr]::Zero)
      }
    }

    if ($foundPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($foundPtr)) {
      [Win32Native]::ShowWindow($foundPtr, 9) | Out-Null # SW_RESTORE
      [Win32Native]::ShowWindow($foundPtr, 5) | Out-Null # SW_SHOW
      [Win32Native]::SetForegroundWindow($foundPtr) | Out-Null
      [Win32Native]::BringWindowToTop($foundPtr) | Out-Null
      [Win32Native]::SetFocus($foundPtr) | Out-Null
      [Win32Native]::SetActiveWindow($foundPtr) | Out-Null
      $out["success"] = $true
      $out["targetHwnd"] = $foundPtr.ToInt64().ToString()
    }
    return $out
  }

  if ($action -eq "resolve_window") {
    [uint32]$pid = 0
    if ($processId -gt 0) { $pid = [uint32]$processId }
    $resHwnd = [Win32Native]::FindBestWindowForProcess($pid, $title, $targetPtr)
    if ($resHwnd -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($resHwnd)) {
      [uint32]$outPid = 0
      $childThread = [Win32Native]::GetWindowThreadProcessId($resHwnd, [ref]$outPid)
      $sb = New-Object System.Text.StringBuilder 512
      [Win32Native]::GetWindowText($resHwnd, $sb, 512) | Out-Null
      $rect = New-Object Win32Native+RECT
      [Win32Native]::GetWindowRect($resHwnd, [ref]$rect) | Out-Null

      $out["success"] = $true
      $out["hwnd"] = $resHwnd.ToInt64().ToString()
      $out["processId"] = [int]$outPid
      $out["title"] = $sb.ToString()
      $out["width"] = [Math]::Max($rect.Right - $rect.Left, 0)
      $out["height"] = [Math]::Max($rect.Bottom - $rect.Top, 0)
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

  if ($action -eq "move_to_display") {
    if ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr)) {
      # 1. Query original rect so caller can store it
      $origRect = New-Object Win32Native+RECT
      [Win32Native]::GetWindowRect($targetPtr, [ref]$origRect) | Out-Null
      $out["origX"] = $origRect.Left
      $out["origY"] = $origRect.Top
      $out["origWidth"] = [Math]::Max($origRect.Right - $origRect.Left, 200)
      $out["origHeight"] = [Math]::Max($origRect.Bottom - $origRect.Top, 150)

      # 2. Restore if minimized
      [Win32Native]::ShowWindow($targetPtr, 9) | Out-Null # SW_RESTORE

      # 3. Position window at target bounds on Virtual Display
      # SWP_SHOWWINDOW (0x0040) | SWP_FRAMECHANGED (0x0020)
      [Win32Native]::SetWindowPos($targetPtr, [IntPtr]::Zero, $x, $y, $width, $height, 0x0040 -bor 0x0020) | Out-Null

      if ($maximize) {
        [Win32Native]::ShowWindow($targetPtr, 3) | Out-Null # SW_MAXIMIZE
      } else {
        [Win32Native]::ShowWindow($targetPtr, 5) | Out-Null # SW_SHOW
      }
      [Win32Native]::UpdateWindow($targetPtr) | Out-Null
      [Win32Native]::SetForegroundWindow($targetPtr) | Out-Null

      $out["success"] = $true
      $out["message"] = "Moved window $($targetPtr.ToInt64().ToString()) to display bounds ($x, $y, $width, $height)"
    }
    return $out
  }

  if ($action -eq "return_from_display") {
    if ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr)) {
      [Win32Native]::ShowWindow($targetPtr, 9) | Out-Null # SW_RESTORE
      [Win32Native]::SetWindowPos($targetPtr, [IntPtr]::Zero, $x, $y, $width, $height, 0x0040 -bor 0x0020) | Out-Null
      [Win32Native]::ShowWindow($targetPtr, 5) | Out-Null # SW_SHOW
      [Win32Native]::SetForegroundWindow($targetPtr) | Out-Null
      [Win32Native]::UpdateWindow($targetPtr) | Out-Null
      $out["success"] = $true
      $out["message"] = "Returned window $($targetPtr.ToInt64().ToString()) to primary desktop ($x, $y, $width, $height)"
    }
    return $out
  }

  if ($action -eq "get_window_rect") {
    if ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr)) {
      $rect = New-Object Win32Native+RECT
      [Win32Native]::GetWindowRect($targetPtr, [ref]$rect) | Out-Null
      $out["success"] = $true
      $out["x"] = $rect.Left
      $out["y"] = $rect.Top
      $out["width"] = [Math]::Max($rect.Right - $rect.Left, 100)
      $out["height"] = [Math]::Max($rect.Bottom - $rect.Top, 100)
    }
    return $out
  }

  if ($action -eq "virtual_screen_input") {
    # Position cursor on virtual display
    [Win32Native]::SetCursorPos($screenX, $screenY) | Out-Null

    # Identify window under cursor on virtual display
    $pt = New-Object Win32Native+POINT
    $pt.X = $screenX
    $pt.Y = $screenY
    $targetUnderCursor = [Win32Native]::WindowFromPoint($pt)

    if ($inputType -eq "move") {
      [Win32Native]::mouse_event(0x0001, 0, 0, 0, [UIntPtr]::Zero) # MOUSEEVENTF_MOVE
    }
    elseif ($inputType -eq "click" -or $inputType -eq "mouse_down") {
      if ($targetUnderCursor -ne [IntPtr]::Zero) {
        [Win32Native]::SetForegroundWindow($targetUnderCursor) | Out-Null
      }
      [Win32Native]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero) # MOUSEEVENTF_LEFTDOWN
      if ($inputType -eq "click") {
        [Win32Native]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero) # MOUSEEVENTF_LEFTUP
      }
    }
    elseif ($inputType -eq "mouse_up") {
      [Win32Native]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero) # MOUSEEVENTF_LEFTUP
    }
    elseif ($inputType -eq "double_click") {
      if ($targetUnderCursor -ne [IntPtr]::Zero) {
        [Win32Native]::SetForegroundWindow($targetUnderCursor) | Out-Null
      }
      [Win32Native]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
      [Win32Native]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
      [Win32Native]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
      [Win32Native]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
    }
    elseif ($inputType -eq "context_menu" -or $inputType -eq "right_click") {
      if ($targetUnderCursor -ne [IntPtr]::Zero) {
        [Win32Native]::SetForegroundWindow($targetUnderCursor) | Out-Null
      }
      [Win32Native]::mouse_event(0x0008, 0, 0, 0, [UIntPtr]::Zero) # MOUSEEVENTF_RIGHTDOWN
      [Win32Native]::mouse_event(0x0010, 0, 0, 0, [UIntPtr]::Zero) # MOUSEEVENTF_RIGHTUP
    }
    elseif ($inputType -eq "wheel") {
      $wheelDelta = [int]$deltaY * -1
      if ($wheelDelta -eq 0) { $wheelDelta = 120 }
      [Win32Native]::mouse_event(0x0800, 0, 0, [uint32]$wheelDelta, [UIntPtr]::Zero) # MOUSEEVENTF_WHEEL
    }
    elseif ($inputType -eq "key") {
      if ($keyCode -gt 0) {
        [Win32Native]::keybd_event([byte]$keyCode, 0, 0, [UIntPtr]::Zero) # KeyDown
        [Win32Native]::keybd_event([byte]$keyCode, 0, 2, [UIntPtr]::Zero) # KeyUp
      }
    }
    elseif ($inputType -eq "char") {
      if ($targetUnderCursor -ne [IntPtr]::Zero -and $charCode -gt 0) {
        [Win32Native]::PostMessage($targetUnderCursor, 0x0102, [IntPtr]$charCode, [IntPtr]1) | Out-Null # WM_CHAR
      }
    }

    $out["success"] = $true
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
    originalExStyle = $OriginalExStyle
    origX = $OrigX
    origY = $OrigY
    origWidth = $OrigWidth
    origHeight = $OrigHeight
    processId = $ProcessId
    title = $Title
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
