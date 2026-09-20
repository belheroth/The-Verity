Add-Type -AssemblyName System.Drawing

$electronAssets = "c:\Users\vicfa\The-Verity\electron\assets"
$frontendPublic = "c:\Users\vicfa\The-Verity\frontend\public"
$buildDir = "c:\Users\vicfa\The-Verity\build"

function Render-V-Vector([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.Color]::Transparent)
    
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $fontFamily = New-Object System.Drawing.FontFamily "Arial"
    $fontStyle = [int]([System.Drawing.FontStyle]::Bold -bor [System.Drawing.FontStyle]::Italic)
    $fontSize = $size * 0.85
    
    $origin = New-Object System.Drawing.PointF 0, 0
    $format = [System.Drawing.StringFormat]::GenericTypographic
    $path.AddString("V", $fontFamily, $fontStyle, $fontSize, $origin, $format)
    
    # Get exact bounds of the character V
    $bounds = $path.GetBounds()
    
    # Calculate transform to center V perfectly in canvas
    $dx = ($size - $bounds.Width) / 2.0 - $bounds.X
    $dy = ($size - $bounds.Height) / 2.0 - $bounds.Y
    
    $matrix = New-Object System.Drawing.Drawing2D.Matrix
    $matrix.Translate($dx, $dy)
    $path.Transform($matrix)
    
    # Draw soft, realistic drop shadow for depth
    for ($step = 3; $step -ge 1; $step--) {
        $shadowMatrix = New-Object System.Drawing.Drawing2D.Matrix
        $sOffY = ($size * 0.012) * $step
        $shadowMatrix.Translate(0, $sOffY)
        $sPatch = $path.Clone()
        $sPatch.Transform($shadowMatrix)
        $alpha = [int](35 / $step)
        $sBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($alpha, 0, 0, 0))
        $sPen = New-Object System.Drawing.Pen $sBrush, ($size * 0.015 * $step)
        $sPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
        $g.DrawPath($sPen, $sPatch)
        $g.FillPath($sBrush, $sPatch)
        $sPen.Dispose()
        $sBrush.Dispose()
        $sPatch.Dispose()
        $shadowMatrix.Dispose()
    }
    
    # Gradient Fill: Signature Verity vibrant emerald gradient
    $gradRect = New-Object System.Drawing.RectangleF 0, 0, $size, $size
    $colorTop = [System.Drawing.Color]::FromArgb(255, 52, 211, 153)    # #34d399 (vibrant mint)
    $colorMid = [System.Drawing.Color]::FromArgb(255, 16, 185, 129)    # #10b981 (signature emerald)
    $colorBottom = [System.Drawing.Color]::FromArgb(255, 4, 120, 87)   # #047857 (deep jewel emerald)
    
    $gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $gradRect, $colorTop, $colorBottom, 65.0
    
    # Color blend for richer 3-stop gradient
    $cb = New-Object System.Drawing.Drawing2D.ColorBlend 3
    $cb.Colors = @($colorTop, $colorMid, $colorBottom)
    $cb.Positions = @(0.0, 0.45, 1.0)
    $gradBrush.InterpolationColors = $cb
    
    $g.FillPath($gradBrush, $path)
    $gradBrush.Dispose()
    
    # Ultra-subtle crisp top-edge highlight for polish
    $highlightPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(120, 255, 255, 255)), ($size * 0.008)
    $highlightPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $g.DrawPath($highlightPen, $path)
    $highlightPen.Dispose()
    
    $matrix.Dispose()
    $path.Dispose()
    $fontFamily.Dispose()
    $g.Dispose()
    
    return $bmp
}

Write-Output "Rendering clean vector V icons across all sizes..."
$bmp512 = Render-V-Vector 512
$bmp512.Save("$electronAssets\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp512.Save("$buildDir\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp512.Save("$frontendPublic\icon-512.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp256 = Render-V-Vector 256
$bmp256.Save("$electronAssets\icon-256.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp256.Save("$buildDir\icon-256.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp128 = Render-V-Vector 128
$bmp128.Save("$electronAssets\icon-128.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp64 = Render-V-Vector 64
$bmp64.Save("$electronAssets\icon-64.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp48 = Render-V-Vector 48
$bmp48.Save("$electronAssets\icon-48.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp32 = Render-V-Vector 32
$bmp32.Save("$electronAssets\icon-32.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp32.Save("$frontendPublic\favicon-32x32.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp16 = Render-V-Vector 16
$bmp16.Save("$electronAssets\icon-16.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp16.Save("$frontendPublic\favicon-16x16.png", [System.Drawing.Imaging.ImageFormat]::Png)

Write-Output "All PNG sizes rendered."
