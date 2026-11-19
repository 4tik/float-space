# Win32 Bridge for Float-Space
# High-performance persistent Win32 automation bridge for native window embedding, bounds synchronization, exact window discovery, and input routing.

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
  [Parameter(Mandatory=$false)][int]$ExpectedPid = 0,
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

try {
  Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue
} catch {}

# Inline C# P/Invoke definitions for User32 & Exact Window Enumeration
$code = @'
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Diagnostics;

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

    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);

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

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetProcessDpiAwarenessContext(IntPtr dpiContext);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr OpenProcess(uint processAccess, bool bInheritHandle, uint processId);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern bool QueryFullProcessImageName(IntPtr hProcess, int flags, StringBuilder text, ref int size);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);

    static Win32Native() {
        try {
            // Set Per-Monitor V2 DPI awareness (-4) to guarantee 1:1 sharp pixel rendering
            SetProcessDpiAwarenessContext(new IntPtr(-4));
        } catch {}
    }

    public static IntPtr FindPresentationWindow(uint processId) {
        IntPtr found = IntPtr.Zero;
        EnumWindows((hWnd, lParam) => {
            if (!IsWindow(hWnd)) return true;
            uint pid = 0;
            GetWindowThreadProcessId(hWnd, out pid);
            if (pid != processId) return true;

            var sbClass = new StringBuilder(256);
            GetClassName(hWnd, sbClass, 256);
            string cls = sbClass.ToString();

            if (cls == "screenClass" || cls == "PP9FrameClass") {
                if (IsWindowVisible(hWnd)) {
                    found = hWnd;
                    return false;
                }
            }

            var sbTitle = new StringBuilder(512);
            GetWindowText(hWnd, sbTitle, 512);
            string title = sbTitle.ToString();
            if (title.StartsWith("PowerPoint Slide Show", StringComparison.OrdinalIgnoreCase)) {
                if (IsWindowVisible(hWnd)) {
                    found = hWnd;
                    return false;
                }
            }

            return true;
        }, IntPtr.Zero);

        return found;
    }

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

    public class WindowRecord {
        public string hwnd;
        public uint processId;
        public string processName;
        public string appName;
        public string title;
        public string executablePath;
        public bool isMinimized;
        public int x;
        public int y;
        public int width;
        public int height;
        public string iconDataUrl;
    }

    private static Dictionary<string, string> _iconCache = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

    public static string GetIconBase64(string exePath) {
        if (string.IsNullOrEmpty(exePath)) return null;
        lock (_iconCache) {
            string cached;
            if (_iconCache.TryGetValue(exePath, out cached)) return cached;
            try {
                if (File.Exists(exePath)) {
                    using (var icon = Icon.ExtractAssociatedIcon(exePath)) {
                        if (icon != null) {
                            using (var bmp = icon.ToBitmap())
                            using (var ms = new MemoryStream()) {
                                bmp.Save(ms, ImageFormat.Png);
                                string dataUrl = "data:image/png;base64," + Convert.ToBase64String(ms.ToArray());
                                _iconCache[exePath] = dataUrl;
                                return dataUrl;
                            }
                        }
                    }
                }
            } catch {}
            _iconCache[exePath] = null;
            return null;
        }
    }

    public static List<WindowRecord> EnumerateApplicationWindows(uint currentPid) {
        var list = new List<WindowRecord>();

        EnumWindows((hWnd, lParam) => {
            if (!IsWindow(hWnd)) return true;
            bool iconic = IsIconic(hWnd);
            if (!IsWindowVisible(hWnd) && !iconic) return true;

            int style = GetWindowLong(hWnd, -16); // GWL_STYLE
            if ((style & 0x40000000) != 0) return true; // WS_CHILD

            int exStyle = GetWindowLong(hWnd, -20); // GWL_EXSTYLE
            // Ignore tool windows unless explicitly marked as app window
            if ((exStyle & 0x00000080) != 0 && (exStyle & 0x00040000) == 0) return true;

            var sbTitle = new StringBuilder(512);
            GetWindowText(hWnd, sbTitle, 512);
            string title = sbTitle.ToString().Trim();
            if (string.IsNullOrEmpty(title)) return true;

            if (title == "Program Manager" || title == "Default IME" || title == "MSCTFIME UI" ||
                title == "Windows Input Experience" || title == "Float-Space" ||
                title.StartsWith("Floating Monitor", StringComparison.OrdinalIgnoreCase)) {
                return true;
            }

            var sbClass = new StringBuilder(256);
            GetClassName(hWnd, sbClass, 256);
            string cls = sbClass.ToString();
            if (cls.Contains("IME") || cls.Contains("Tooltip") || cls.Contains("Shadow") ||
                cls.Contains("WorkerW") || cls == "Progman" || cls == "Shell_TrayWnd") {
                return true;
            }

            uint pid = 0;
            GetWindowThreadProcessId(hWnd, out pid);
            if (pid == 0 || pid == currentPid) return true;

            RECT r;
            GetWindowRect(hWnd, out r);
            int w = r.Right - r.Left;
            int h = r.Bottom - r.Top;
            if (r.Right <= -10000 || r.Bottom <= -10000 || r.Left <= -10000 || r.Top <= -10000) {
                iconic = true;
            }
            if (!iconic && (w < 80 || h < 40)) {
                return true;
            }

            string procName = "";
            string procPath = "";
            string appName = "";

            // 1. Query process image path via Win32 OpenProcess with PROCESS_QUERY_LIMITED_INFORMATION (0x1000)
            // This works reliably across sandboxed processes (Firefox, Chrome, Edge) and standard user applications
            IntPtr hProc = OpenProcess(0x1000, false, pid);
            if (hProc != IntPtr.Zero) {
                try {
                    var sbPath = new StringBuilder(1024);
                    int size = sbPath.Capacity;
                    if (QueryFullProcessImageName(hProc, 0, sbPath, ref size)) {
                        procPath = sbPath.ToString();
                        procName = System.IO.Path.GetFileNameWithoutExtension(procPath);
                    }
                } finally {
                    CloseHandle(hProc);
                }
            }

            // 2. Fallback to .NET Process inspection if needed
            if (string.IsNullOrEmpty(procName)) {
                try {
                    using (var p = Process.GetProcessById((int)pid)) {
                        procName = p.ProcessName;
                        try {
                            if (string.IsNullOrEmpty(procPath)) procPath = p.MainModule.FileName;
                        } catch {}
                    }
                } catch {}
            }

            // 3. Fallback based on window class or title (e.g. sandboxed Firefox)
            if (string.IsNullOrEmpty(procName)) {
                if (cls == "MozillaWindowClass" || title.Contains("Firefox")) {
                    procName = "firefox";
                    appName = "Mozilla Firefox";
                } else if (cls.Contains("Chrome") || title.Contains("Chrome")) {
                    procName = "chrome";
                    appName = "Google Chrome";
                } else {
                    procName = "Application";
                }
            }

            // Exclude Windows OS internal background shells
            if (procName == "TextInputHost" || procName == "ShellExperienceHost" ||
                procName == "dwm" || procName == "csrss" || procName == "smss" ||
                procName == "lsass" || procName == "SystemSettings" ||
                procName == "SearchApp" || procName == "StartMenuExperienceHost" ||
                procName == "LockApp") {
                return true;
            }

            if (!string.IsNullOrEmpty(procPath) && System.IO.File.Exists(procPath)) {
                try {
                    var fvi = FileVersionInfo.GetVersionInfo(procPath);
                    appName = fvi.FileDescription;
                } catch {}
            }

            if (string.IsNullOrEmpty(appName)) {
                appName = procName;
            }

            string iconUrl = GetIconBase64(procPath);

            list.Add(new WindowRecord {
                hwnd = hWnd.ToInt64().ToString(),
                processId = pid,
                processName = procName,
                appName = appName,
                title = title,
                executablePath = procPath,
                isMinimized = iconic,
                x = r.Left,
                y = r.Top,
                width = w,
                height = h,
                iconDataUrl = iconUrl
            });

            return true;
        }, IntPtr.Zero);

        return list;
    }
}
'@

try {
  if (-not ([System.Management.Automation.PSTypeName]'Win32Native').Type) {
    Add-Type -ReferencedAssemblies "System.Drawing" -TypeDefinition $code -ErrorAction Stop
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

  $targetPtr = [IntPtr]::Zero
  if ($targetHwndStr) {
    $cleanHwnd = [string]$targetHwndStr -replace '^win-', '' -replace '^window:', '' -replace ':0$', ''
    if ($cleanHwnd -and $cleanHwnd -ne "0" -and $cleanHwnd -match '^-?\d+$') {
      $targetPtr = [IntPtr][long]$cleanHwnd
    }
  }

  $parentPtr = [IntPtr]::Zero
  if ($parentHwndStr) {
    $cleanParent = [string]$parentHwndStr -replace '^win-', '' -replace '^window:', '' -replace ':0$', ''
    if ($cleanParent -and $cleanParent -ne "0" -and $cleanParent -match '^-?\d+$') {
      $parentPtr = [IntPtr][long]$cleanParent
    }
  }

  $out = @{ success = $false; action = $action }

  if ($action -eq "get_running_windows") {
    [uint32]$curPid = 0
    if ($processId -gt 0) { $curPid = [uint32]$processId }
    $windows = [Win32Native]::EnumerateApplicationWindows($curPid)
    $list = @()
    foreach ($w in $windows) {
      $list += @{
        id = "win-" + $w.hwnd
        sourceId = "window:" + $w.hwnd + ":0"
        handle = $w.hwnd
        processId = [int]$w.processId
        appName = $w.appName
        title = $w.title
        executablePath = $w.executablePath
        iconDataUrl = $w.iconDataUrl
        isMinimized = [bool]$w.isMinimized
        x = $w.x
        y = $w.y
        width = $w.width
        height = $w.height
      }
    }
    $out["success"] = $true
    $out["windows"] = $list
    return $out
  }

  if ($action -eq "embed") {
    [uint32]$expectedPid = 0
    if ($processId -gt 0) { $expectedPid = [uint32]$processId }

    if ($targetPtr -eq [IntPtr]::Zero -or $parentPtr -eq [IntPtr]::Zero) {
      throw "Invalid window handles: Target=$targetHwndStr, Parent=$parentHwndStr"
    }
    if (-not [Win32Native]::IsWindow($targetPtr)) {
      throw "Target window does not exist or has closed."
    }

    # Verify process ownership strictly: Target window must belong to selected application PID
    [uint32]$childPid = 0
    $childThread = [Win32Native]::GetWindowThreadProcessId($targetPtr, [ref]$childPid)
    if ($expectedPid -gt 0 -and $childPid -ne $expectedPid) {
      throw "Security validation failed: Target window PID ($childPid) does not match expected application PID ($expectedPid)."
    }

    # 1. Restore target application window if minimized so Win32 renders it
    if ([Win32Native]::IsIconic($targetPtr)) {
      [Win32Native]::ShowWindow($targetPtr, 9) | Out-Null # SW_RESTORE
    }

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
    # AND remove WS_EX_LAYERED (0x00080000) to guarantee 100% sharp opacity and eliminate alpha bleed on File Explorer
    $newExStyle = ($oldExStyle -band (-bnot (0x00040000 -bor 0x00080000)))
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
    if ($targetPtr -ne [IntPtr]::Zero -and [Win32Native]::IsWindow($targetPtr)) {
      [Win32Native]::ShowWindow($targetPtr, 9) | Out-Null # SW_RESTORE
      [Win32Native]::ShowWindow($targetPtr, 5) | Out-Null # SW_SHOW
      [Win32Native]::SetForegroundWindow($targetPtr) | Out-Null
      [Win32Native]::BringWindowToTop($targetPtr) | Out-Null
      [Win32Native]::SetFocus($targetPtr) | Out-Null
      [Win32Native]::SetActiveWindow($targetPtr) | Out-Null
      $out["success"] = $true
      $out["targetHwnd"] = $targetPtr.ToInt64().ToString()
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
    $isProcRunning = $false
    [uint32]$actualPid = 0
    $title = ""
    $expPid = if ($params.expectedPid) { [int]$params.expectedPid } elseif ($params.processId) { [int]$params.processId } elseif ($ExpectedPid) { [int]$ExpectedPid } else { 0 }

    if ($exists) {
      [Win32Native]::GetWindowThreadProcessId($targetPtr, [ref]$actualPid) | Out-Null
      if ($actualPid -gt 0) {
        try {
          $p = [System.Diagnostics.Process]::GetProcessById([int]$actualPid)
          if (-not $p.HasExited) { $isProcRunning = $true }
        } catch {}
      }
      if ($expPid -gt 0) {
        $procMatch = ([int]$actualPid -eq $expPid)
      }
      $sb = New-Object System.Text.StringBuilder 512
      [Win32Native]::GetWindowText($targetPtr, $sb, 512) | Out-Null
      $title = $sb.ToString()
    }

    $isValid = ($exists -and $procMatch -and $isProcRunning)
    $out["success"] = $isValid
    $out["exists"] = $exists
    $out["valid"] = $isValid
    $out["isProcessRunning"] = $isProcRunning
    $out["pidMatch"] = $procMatch
    $out["actualPid"] = [int]$actualPid
    $out["title"] = $title
    if (-not $exists) {
      $out["reason"] = "Target application window no longer exists or was closed."
    } elseif (-not $isProcRunning) {
      $out["reason"] = "Target application process has exited."
    } elseif (-not $procMatch) {
      $out["reason"] = "Window PID mismatch: target window belongs to PID $actualPid, but expected PID is $expPid."
    }
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
        [uint32]$cProcPid = 0
        [Win32Native]::GetWindowThreadProcessId($childHwnd, [ref]$cProcPid) | Out-Null
        [uint32]$tgtPid = 0
        [Win32Native]::GetWindowThreadProcessId($targetPtr, [ref]$tgtPid) | Out-Null
        if ($cProcPid -eq $tgtPid) {
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

  if ($action -eq "find_presentation_window") {
    [uint32]$procId = 0
    if ($processId -gt 0) { $procId = [uint32]$processId }
    $presHwnd = [Win32Native]::FindPresentationWindow($procId)
    $out["success"] = ($presHwnd -ne [IntPtr]::Zero)
    $out["hwnd"] = if ($presHwnd -ne [IntPtr]::Zero) { $presHwnd.ToInt64().ToString() } else { $null }
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
    expectedPid = if ($ExpectedPid -gt 0) { $ExpectedPid } else { $ProcessId }
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
