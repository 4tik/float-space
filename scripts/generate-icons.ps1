Add-Type -AssemblyName System.Drawing

function Draw-FloatSpaceLogo([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $scale = $size / 512.0

    # 1. Base App Squircle / Rounded Container
    $boxX = 28 * $scale
    $boxY = 28 * $scale
    $boxW = 456 * $scale
    $boxH = 456 * $scale
    $corner = 96 * $scale

    $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gp.AddArc($boxX, $boxY, $corner, $corner, 180, 90)
    $gp.AddArc($boxX + $boxW - $corner, $boxY, $corner, $corner, 270, 90)
    $gp.AddArc($boxX + $boxW - $corner, $boxY + $boxH - $corner, $corner, $corner, 0, 90)
    $gp.AddArc($boxX, $boxY + $boxH - $corner, $corner, $corner, 90, 90)
    $gp.CloseFigure()

    # Gradient fill for main container: Windows 11 Deep Blue
    $rect = New-Object System.Drawing.RectangleF($boxX, $boxY, $boxW, $boxH)
    $cTop = [System.Drawing.Color]::FromArgb(255, 0, 110, 215)
    $cBot = [System.Drawing.Color]::FromArgb(255, 0, 55, 130)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $cTop, $cBot, 45.0)
    $g.FillPath($brush, $gp)
    $brush.Dispose()

    # Subtle border ring on base container
    $penBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(60, 255, 255, 255), [float](2 * $scale))
    $g.DrawPath($penBorder, $gp)
    $penBorder.Dispose()

    # 2. Main Desktop Display Frame (Lower/Base workspace)
    $baseX = 84 * $scale
    $baseY = 160 * $scale
    $baseW = 344 * $scale
    $baseH = 244 * $scale
    $baseR = 36 * $scale

    $gpBase = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gpBase.AddArc($baseX, $baseY, $baseR, $baseR, 180, 90)
    $gpBase.AddArc($baseX + $baseW - $baseR, $baseY, $baseR, $baseR, 270, 90)
    $gpBase.AddArc($baseX + $baseW - $baseR, $baseY + $baseH - $baseR, $baseR, $baseR, 0, 90)
    $gpBase.AddArc($baseX, $baseY + $baseH - $baseR, $baseR, $baseR, 90, 90)
    $gpBase.CloseFigure()

    $brushBase = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 255, 255, 255))
    $g.FillPath($brushBase, $gpBase)
    $brushBase.Dispose()

    $penBase = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(90, 255, 255, 255), [float](2.5 * $scale))
    $g.DrawPath($penBase, $gpBase)
    $penBase.Dispose()

    # Workspace subtle grid lines
    $penGrid = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(35, 255, 255, 255), [float](1.5 * $scale))
    $g.DrawLine($penGrid, [float]($baseX + 16 * $scale), [float]($baseY + 60 * $scale), [float]($baseX + $baseW - 16 * $scale), [float]($baseY + 60 * $scale))
    $g.DrawLine($penGrid, [float]($baseX + 16 * $scale), [float]($baseY + 120 * $scale), [float]($baseX + $baseW - 16 * $scale), [float]($baseY + 120 * $scale))
    $g.DrawLine($penGrid, [float]($baseX + 16 * $scale), [float]($baseY + 180 * $scale), [float]($baseX + $baseW - 16 * $scale), [float]($baseY + 180 * $scale))
    $penGrid.Dispose()

    # 3. Floating Extended Window (Elevated, glowing, overlapping out of workspace)
    $floatX = 148 * $scale
    $floatY = 96 * $scale
    $floatW = 260 * $scale
    $floatH = 200 * $scale
    $floatR = 32 * $scale

    # Soft drop shadow for floating window
    $shadowColor = [System.Drawing.Color]::FromArgb(70, 0, 20, 50)
    $shadowBrush = New-Object System.Drawing.SolidBrush($shadowColor)
    $gpShadow = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gpShadow.AddArc($floatX + 6*$scale, $floatY + 14*$scale, $floatR, $floatR, 180, 90)
    $gpShadow.AddArc($floatX + $floatW + 6*$scale - $floatR, $floatY + 14*$scale, $floatR, $floatR, 270, 90)
    $gpShadow.AddArc($floatX + $floatW + 6*$scale - $floatR, $floatY + $floatH + 14*$scale - $floatR, $floatR, $floatR, 0, 90)
    $gpShadow.AddArc($floatX + 6*$scale, $floatY + $floatH + 14*$scale - $floatR, $floatR, $floatR, 90, 90)
    $gpShadow.CloseFigure()
    $g.FillPath($shadowBrush, $gpShadow)
    $shadowBrush.Dispose()
    $gpShadow.Dispose()

    # Floating window body
    $gpFloat = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gpFloat.AddArc($floatX, $floatY, $floatR, $floatR, 180, 90)
    $gpFloat.AddArc($floatX + $floatW - $floatR, $floatY, $floatR, $floatR, 270, 90)
    $gpFloat.AddArc($floatX + $floatW - $floatR, $floatY + $floatH - $floatR, $floatR, $floatR, 0, 90)
    $gpFloat.AddArc($floatX, $floatY + $floatH - $floatR, $floatR, $floatR, 90, 90)
    $gpFloat.CloseFigure()

    $brushFloatBody = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(250, 255, 255, 255))
    $g.FillPath($brushFloatBody, $gpFloat)
    $brushFloatBody.Dispose()

    # Floating window header (Cyan/Blue gradient)
    $headH = 50 * $scale
    $gpHead = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gpHead.AddArc($floatX, $floatY, $floatR, $floatR, 180, 90)
    $gpHead.AddArc($floatX + $floatW - $floatR, $floatY, $floatR, $floatR, 270, 90)
    $gpHead.AddLine($floatX + $floatW, $floatY + $headH, $floatX, $floatY + $headH)
    $gpHead.CloseFigure()

    $rectHead = New-Object System.Drawing.RectangleF($floatX, $floatY, $floatW, $headH)
    $cHead1 = [System.Drawing.Color]::FromArgb(255, 0, 164, 239) # Fluent Cyan
    $cHead2 = [System.Drawing.Color]::FromArgb(255, 0, 120, 215) # Fluent Blue
    $brushHead = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rectHead, $cHead1, $cHead2, 0.0)
    $g.FillPath($brushHead, $gpHead)
    $brushHead.Dispose()
    $gpHead.Dispose()

    # Three clean window header dots
    $dotY = $floatY + 20 * $scale
    $dotR = 8 * $scale
    $brushDot1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(240, 255, 255, 255))
    $g.FillEllipse($brushDot1, [float]($floatX + 20 * $scale), [float]$dotY, [float]$dotR, [float]$dotR)
    $g.FillEllipse($brushDot1, [float]($floatX + 34 * $scale), [float]$dotY, [float]$dotR, [float]$dotR)
    $g.FillEllipse($brushDot1, [float]($floatX + 48 * $scale), [float]$dotY, [float]$dotR, [float]$dotR)
    $brushDot1.Dispose()

    # Floating Window content accent bars (modern clean UI representation)
    $barBrush1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 0, 103, 192))
    $g.FillRectangle($barBrush1, [float]($floatX + 24 * $scale), [float]($floatY + 76 * $scale), [float](100 * $scale), [float](14 * $scale))
    $barBrush1.Dispose()

    $barBrush2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70, 0, 103, 192))
    $g.FillRectangle($barBrush2, [float]($floatX + 24 * $scale), [float]($floatY + 104 * $scale), [float](212 * $scale), [float](10 * $scale))
    $barBrush2.Dispose()

    $barBrush3 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(50, 0, 103, 192))
    $g.FillRectangle($barBrush3, [float]($floatX + 24 * $scale), [float]($floatY + 124 * $scale), [float](170 * $scale), [float](10 * $scale))
    $barBrush3.Dispose()

    $barBrush4 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 0, 103, 192))
    $g.FillRectangle($barBrush4, [float]($floatX + 24 * $scale), [float]($floatY + 144 * $scale), [float](195 * $scale), [float](10 * $scale))
    $barBrush4.Dispose()

    # Crisp border for floating window
    $penFloat = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, 255, 255, 255), [float](2 * $scale))
    $g.DrawPath($penFloat, $gpFloat)
    $penFloat.Dispose()
    $gpFloat.Dispose()

    $gp.Dispose()
    $gpBase.Dispose()
    $g.Dispose()

    return $bmp
}

# Generate 512x512 Master PNG
$master = Draw-FloatSpaceLogo 512
$master.Save("E:/personal/float-space/build/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$master.Save("E:/personal/float-space/public/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$master.Save("E:/personal/float-space/public/logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$master.Save("E:/personal/float-space/src/assets/logo.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Generate multi-res Windows ICO
# Create list of images: 256, 128, 64, 48, 32, 16
$sizes = @(256, 128, 64, 48, 32, 16)
$iconBitmaps = @()
foreach ($sz in $sizes) {
    $iconBitmaps += Draw-FloatSpaceLogo $sz
}

# Combine into a valid Windows .ico file structure
$icoStream = New-Object System.IO.FileStream("E:/personal/float-space/build/icon.ico", [System.IO.FileMode]::Create)
$writer = New-Object System.IO.BinaryWriter($icoStream)

# ICONDIR header
$writer.Write([uint16]0) # Reserved
$writer.Write([uint16]1) # Image type: 1 = ICO
$writer.Write([uint16]$sizes.Count) # Number of images

$pngBytesList = @()
foreach ($b in $iconBitmaps) {
    $ms = New-Object System.IO.MemoryStream
    $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytesList += ,$ms.ToArray()
    $ms.Dispose()
}

$offset = 6 + (16 * $sizes.Count)
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $sz = $sizes[$i]
    $data = $pngBytesList[$i]
    $wByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $hByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }

    # ICONDIRENTRY
    $writer.Write($wByte)
    $writer.Write($hByte)
    $writer.Write([byte]0) # Color count
    $writer.Write([byte]0) # Reserved
    $writer.Write([uint16]1) # Color planes
    $writer.Write([uint16]32) # Bits per pixel
    $writer.Write([uint32]$data.Length) # Image size in bytes
    $writer.Write([uint32]$offset) # Offset of image data
    $offset += $data.Length
}

# Write PNG payloads
foreach ($data in $pngBytesList) {
    $writer.Write($data)
}

$writer.Flush()
$icoStream.Dispose()

foreach ($b in $iconBitmaps) { $b.Dispose() }
$master.Dispose()

Write-Host "Float-Space icons generated successfully in build/ and public/."
