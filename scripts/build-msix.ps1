#Requires -Version 7.0

# 从 Tauri 构建产物生成用于 Microsoft Store 提交的未签名 x64 MSIX。
[CmdletBinding()]
param(
    [string]$BuildDirectory,
    [string]$OutputDirectory,
    [string]$Version,
    [string]$SdkDirectory
)

$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$tauriRoot = Join-Path $repoRoot "src-tauri"
$templateRoot = Join-Path $tauriRoot "msix"
$templateManifest = Join-Path $templateRoot "AppxManifest.xml"
$tauriConfig = Join-Path $tauriRoot "tauri.conf.json"
$windowsConfig = Join-Path $tauriRoot "tauri.windows.conf.json"
$iconsRoot = Join-Path $tauriRoot "icons"
$stagingRoot = Join-Path $tauriRoot "target\msix"
function Resolve-FullPath {
    param([string]$Value, [string]$Base, [string]$Label)
    if ([string]::IsNullOrWhiteSpace($Value)) { throw "$Label cannot be empty." }
    try {
        if ([IO.Path]::IsPathRooted($Value)) { return [IO.Path]::GetFullPath($Value) }
        return [IO.Path]::GetFullPath((Join-Path $Base $Value))
    } catch { throw "Invalid $Label path '$Value': $($_.Exception.Message)" }
}
function Resolve-SafeChildPath {
    param([string]$Base, [string]$RelativePath, [string]$Label)
    if ([string]::IsNullOrWhiteSpace($RelativePath) -or [IO.Path]::IsPathRooted($RelativePath)) { throw "$Label '$RelativePath' must be a non-empty relative path." }
    if ($RelativePath.IndexOf([char]0) -ge 0 -or $RelativePath -match "(^|[\\/])\.\.([\\/]|$)" -or $RelativePath -match "[:*?""<>|]") { throw "$Label '$RelativePath' contains an unsafe path segment." }
    try {
        $fullBase = [IO.Path]::GetFullPath($Base).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
        $fullPath = [IO.Path]::GetFullPath((Join-Path $fullBase $RelativePath))
    } catch { throw "Invalid $Label path '$RelativePath': $($_.Exception.Message)" }
    if (-not $fullPath.StartsWith($fullBase + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw "$Label '$RelativePath' resolves outside '$Base'." }
    $fullPath
}
function Normalize-Version {
    param([string]$Requested, [string]$ConfigPath)
    if ([string]::IsNullOrWhiteSpace($Requested)) {
        if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) { throw "Tauri configuration was not found: $ConfigPath" }
        try {
            $Requested = [string]((Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json).version)
        } catch { throw "Unable to read the version from '$ConfigPath': $($_.Exception.Message)" }
    }
    $Requested = $Requested.Trim()
    if ($Requested -notmatch "^\d+(?:\.\d+){0,3}$") { throw "MSIX version '$Requested' must contain one to four numeric components with no semver suffix." }
    $parts = [Collections.Generic.List[UInt64]]::new()
    foreach ($part in $Requested.Split(".")) {
        try {
            $number = [UInt64]::Parse($part, [Globalization.CultureInfo]::InvariantCulture)
        } catch { throw "MSIX version component '$part' is not a valid integer." }
        if ($number -gt 65535) { throw "MSIX version component '$part' exceeds 65535." }
        [void]$parts.Add($number)
    }
    while ($parts.Count -lt 4) { [void]$parts.Add(0) }
    if ($parts[3] -ne 0) { throw "MSIX version '$Requested' is invalid for Store submission: the fourth component must be 0." }
    (($parts | ForEach-Object { $_.ToString([Globalization.CultureInfo]::InvariantCulture) }) -join ".")
}
function Read-ManifestInfo {
    param([string]$Path, [string]$SetVersion)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "MSIX manifest was not found: $Path" }
    try {
        $document = [Xml.XmlDocument]::new()
        $document.PreserveWhitespace = $true
        $document.Load($Path)
    } catch { throw "Unable to parse '$Path': $($_.Exception.Message)" }
    $identity = $document.SelectSingleNode("/*[local-name()='Package']/*[local-name()='Identity']")
    $application = $document.SelectSingleNode("/*[local-name()='Package']/*[local-name()='Applications']/*[local-name()='Application']")
    $resource = $document.SelectSingleNode("/*[local-name()='Package']/*[local-name()='Resources']/*[local-name()='Resource']")
    if ($null -eq $identity -or $null -eq $identity.Attributes["Version"]) { throw "The manifest must contain Package/Identity@Version." }
    if (-not [string]::IsNullOrWhiteSpace($SetVersion)) {
        $identity.SetAttribute("Version", $SetVersion)
        try { $document.Save($Path) } catch { throw "Unable to update staged manifest '$Path': $($_.Exception.Message)" }
        if ($identity.GetAttribute("Version") -ne $SetVersion) { throw "The staged manifest Identity.Version was not updated to '$SetVersion'." }
    }
    if ($null -eq $application -or [string]::IsNullOrWhiteSpace($application.GetAttribute("Executable"))) { throw "The manifest must contain Applications/Application@Executable." }
    if ($null -eq $resource -or [string]::IsNullOrWhiteSpace($resource.GetAttribute("Language"))) { throw "The manifest must contain Resources/Resource@Language." }
    [pscustomobject]@{
        Executable = $application.GetAttribute("Executable")
        Language   = $resource.GetAttribute("Language")
    }
}
function Remove-MakePriPackaging {
    param([string]$Path)
    try {
        $document = [Xml.XmlDocument]::new()
        $document.PreserveWhitespace = $true
        $document.Load($Path)
        $nodes = @($document.SelectNodes("//*[local-name()='packaging']"))
        foreach ($node in $nodes) {
            if ($null -ne $node.ParentNode) { [void]$node.ParentNode.RemoveChild($node) }
        }
        if ($nodes.Count -gt 0) { $document.Save($Path) }
    } catch { throw "Unable to remove MakePri packaging nodes from '$Path': $($_.Exception.Message)" }
}
function Assert-X64Executable {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Built TeyvatGuide.exe was not found: $Path" }
    $reader = $null
    try {
        $reader = [IO.BinaryReader]::new([IO.File]::OpenRead($Path))
        if ($reader.BaseStream.Length -lt 0x40 -or $reader.ReadUInt16() -ne 0x5A4D) {
            throw "the file does not have a valid MZ header"
        }
        $reader.BaseStream.Position = 0x3C
        $peOffset = $reader.ReadInt32()
        if ($peOffset -lt 0 -or $peOffset + 6 -gt $reader.BaseStream.Length) {
            throw "the PE header offset is invalid"
        }
        $reader.BaseStream.Position = $peOffset
        if ($reader.ReadUInt32() -ne 0x00004550) { throw "the file does not have a valid PE signature" }
        $machine = $reader.ReadUInt16()
        if ($machine -ne 0x8664) { throw ("the executable machine type is 0x{0:X4}; x64 (0x8664) is required" -f $machine) }
    } catch { throw "Built TeyvatGuide.exe is not a valid x64 PE executable: $($_.Exception.Message)" }
    finally {
        if ($null -ne $reader) { $reader.Dispose() }
    }
}
function Write-ResizedPng {
    param([string]$SourcePath, [string]$DestinationPath, [int]$Width, [int]$Height)

    $sourceBitmap = $targetBitmap = $graphics = $null
    try {
        $sourceBitmap = [Drawing.Bitmap]::new($SourcePath)
        $targetBitmap = [Drawing.Bitmap]::new($Width, $Height, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [Drawing.Graphics]::FromImage($targetBitmap)
        $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.Clear([Drawing.Color]::Transparent)
        $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($sourceBitmap, 0, 0, $Width, $Height)
        $targetBitmap.Save($DestinationPath, [Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        if ($null -ne $graphics) { $graphics.Dispose() }; if ($null -ne $targetBitmap) { $targetBitmap.Dispose() }; if ($null -ne $sourceBitmap) { $sourceBitmap.Dispose() }
    }
}
function New-Assets {
    param([string]$Icons, [string]$Destination)

    Add-Type -AssemblyName System.Drawing
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    $baseNames = @("StoreLogo.png", "Square44x44Logo.png", "Square71x71Logo.png", "Square150x150Logo.png", "Square310x310Logo.png")
    foreach ($name in $baseNames) {
        $source = Join-Path $Icons $name
        if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "MSIX asset source was not found: $source" }
        Copy-Item -LiteralPath $source -Destination (Join-Path $Destination $name) -Force
    }
    $iconPath = Join-Path $Icons "icon.png"
    if (-not (Test-Path -LiteralPath $iconPath -PathType Leaf)) { throw "MSIX source icon was not found: $iconPath" }
    $iconProbe = [Drawing.Bitmap]::new($iconPath)
    try {
        if ($iconProbe.Width -ne 512 -or $iconProbe.Height -ne 512) { throw "icon.png must be 512x512 pixels." }
    }
    finally { $iconProbe.Dispose() }
    foreach ($size in @(16, 20, 24, 30, 32, 36, 40, 44, 48, 60, 64, 72, 80, 96, 256)) {
        $prefix = Join-Path $Destination ("Square44x44Logo.targetsize-{0}" -f $size)
        Write-ResizedPng $iconPath ($prefix + ".png") $size $size
        Copy-Item -LiteralPath ($prefix + ".png") -Destination ($prefix + "_altform-unplated.png") -Force
        Copy-Item -LiteralPath ($prefix + ".png") -Destination ($prefix + "_altform-lightunplated.png") -Force
    }
    Copy-Item -LiteralPath (Join-Path $Destination "Square44x44Logo.png") -Destination (Join-Path $Destination "Square44x44Logo.scale-100.png") -Force
    Copy-Item -LiteralPath (Join-Path $Destination "Square150x150Logo.png") -Destination (Join-Path $Destination "Square150x150Logo.scale-100.png") -Force
    Write-ResizedPng $iconPath (Join-Path $Destination "Square44x44Logo.scale-200.png") 88 88
    Write-ResizedPng $iconPath (Join-Path $Destination "Square44x44Logo.scale-400.png") 176 176
    Write-ResizedPng $iconPath (Join-Path $Destination "Square150x150Logo.scale-200.png") 300 300
    Write-ResizedPng $iconPath (Join-Path $Destination "Square150x150Logo.scale-400.png") 600 600
    $sourceBitmap = $wideBitmap = $graphics = $null
    try {
        $sourceBitmap = [Drawing.Bitmap]::new((Join-Path $Icons "Square150x150Logo.png"))
        if ($sourceBitmap.Width -ne 150 -or $sourceBitmap.Height -ne 150) {
            throw "Square150x150Logo.png must be 150x150 pixels."
        }
        $wideBitmap = [Drawing.Bitmap]::new(310, 150, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [Drawing.Graphics]::FromImage($wideBitmap)
        $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.Clear([Drawing.Color]::Transparent)
        $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($sourceBitmap, 80, 0, 150, 150)
        $wideBitmap.Save((Join-Path $Destination "Wide310x150Logo.png"), [Drawing.Imaging.ImageFormat]::Png)
    }
    catch {
        throw "Unable to generate Wide310x150Logo.png: $($_.Exception.Message)"
    }
    finally {
        if ($null -ne $graphics) { $graphics.Dispose() }; if ($null -ne $wideBitmap) { $wideBitmap.Dispose() }; if ($null -ne $sourceBitmap) { $sourceBitmap.Dispose() }
    }
}

function Find-Sdk {
    param([string]$Requested)

    $candidates = @()
    if (-not [string]::IsNullOrWhiteSpace($Requested)) {
        $candidates += Resolve-FullPath $Requested (Get-Location).Path "Windows SDK directory"
    }
    else {
        $appx = Get-Command makeappx.exe -ErrorAction SilentlyContinue
        $pri = Get-Command makepri.exe -ErrorAction SilentlyContinue
        if ($null -ne $appx -and $null -ne $pri) {
            $appxDir = Split-Path $appx.Source -Parent
            if ($appxDir.Equals((Split-Path $pri.Source -Parent), [StringComparison]::OrdinalIgnoreCase)) {
                $candidates += $appxDir
            }
        }
        foreach ($root in @([Environment]::GetEnvironmentVariable("ProgramFiles(x86)"), $env:ProgramFiles)) {
            if ([string]::IsNullOrWhiteSpace($root)) { continue }
            $binRoot = Join-Path $root "Windows Kits\10\bin"
            if (-not (Test-Path -LiteralPath $binRoot -PathType Container)) { continue }
            $candidates += Get-ChildItem -LiteralPath $binRoot -Directory | Sort-Object Name -Descending | ForEach-Object { Join-Path $_.FullName "x64" }
        }
    }

    foreach ($candidate in $candidates) {
        $makeAppx = Join-Path $candidate "makeappx.exe"
        $makePri = Join-Path $candidate "makepri.exe"
        if ((Test-Path -LiteralPath $makeAppx -PathType Leaf) -and (Test-Path -LiteralPath $makePri -PathType Leaf)) {
            return [pscustomobject]@{ MakeAppx = $makeAppx; MakePri = $makePri }
        }
    }
    if ([string]::IsNullOrWhiteSpace($Requested)) {
        throw "Windows SDK MakeAppx.exe and MakePri.exe were not found. Pass -SdkDirectory with the x64 SDK bin folder."
    }
    throw "Windows SDK directory '$Requested' must contain both makeappx.exe and makepri.exe."
}

function Invoke-Native {
    param([string]$Executable, [string[]]$Arguments, [switch]$UnicodeOutput)

    $startInfo = [Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $Executable
    $startInfo.UseShellExecute = $false; $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true; $startInfo.RedirectStandardError = $true
    if ($UnicodeOutput) {
        $startInfo.StandardOutputEncoding = [Text.Encoding]::Unicode; $startInfo.StandardErrorEncoding = [Text.Encoding]::Unicode
    }
    foreach ($argument in $Arguments) { [void]$startInfo.ArgumentList.Add([string]$argument) }

    Write-Host ("> {0} {1}" -f $Executable, ($Arguments -join " "))
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    try {
        if (-not $process.Start()) { throw "unable to start the process" }
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        $stdout = $stdoutTask.Result
        $stderr = $stderrTask.Result
        if (-not [string]::IsNullOrWhiteSpace($stdout)) { Write-Host $stdout.TrimEnd() }
        if (-not [string]::IsNullOrWhiteSpace($stderr)) { Write-Host $stderr.TrimEnd() }
        if ($process.ExitCode -ne 0) { throw "$([IO.Path]::GetFileName($Executable)) failed with exit code $($process.ExitCode)." }
    } finally { $process.Dispose() }
}

function Remove-StagingDirectory {
    param([string]$Path, [string]$Root)

    if (-not (Test-Path -LiteralPath $Path)) { return }
    $fullPath = [IO.Path]::GetFullPath($Path)
    $fullRoot = [IO.Path]::GetFullPath($Root).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    if ($fullPath.Equals($fullRoot, [StringComparison]::OrdinalIgnoreCase) -or -not $fullPath.StartsWith($fullRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove a path outside the generated MSIX staging root: $Path"
    }
    Remove-Item -LiteralPath $fullPath -Recurse -Force
}

if ([string]::IsNullOrWhiteSpace($BuildDirectory)) {
    $BuildDirectory = Join-Path $tauriRoot "target\release"
}
else {
    $BuildDirectory = Resolve-FullPath $BuildDirectory $repoRoot "build directory"
}
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $tauriRoot "target\release\bundle\msix"
}
else {
    $OutputDirectory = Resolve-FullPath $OutputDirectory $repoRoot "output directory"
}

$stagingDirectory = $null
$configDirectory = $null
$exitCode = 0
try {
    foreach ($directory in @($BuildDirectory, $templateRoot, $iconsRoot)) {
        if (-not (Test-Path -LiteralPath $directory -PathType Container)) {
            throw "Required directory was not found: $directory"
        }
    }
    if (-not (Test-Path -LiteralPath $templateManifest -PathType Leaf)) {
        throw "MSIX template manifest was not found: $templateManifest"
    }

    $normalizedVersion = Normalize-Version $Version $tauriConfig
    $manifestInfo = Read-ManifestInfo $templateManifest
    $sdk = Find-Sdk $SdkDirectory
    $sourceExecutable = Join-Path $BuildDirectory "TeyvatGuide.exe"
    Assert-X64Executable $sourceExecutable

    New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
    New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null
    $stagingDirectory = Join-Path $stagingRoot ("staging-" + [Guid]::NewGuid().ToString("N"))
    $configDirectory = Join-Path $stagingRoot ("config-" + [Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $stagingDirectory, $configDirectory -Force | Out-Null

    Get-ChildItem -LiteralPath $templateRoot -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $stagingDirectory -Recurse -Force
    }
    $stagedManifest = Join-Path $stagingDirectory "AppxManifest.xml"
    $manifestInfo = Read-ManifestInfo $stagedManifest $normalizedVersion
    $executableDestination = Resolve-SafeChildPath $stagingDirectory $manifestInfo.Executable "manifest executable path"
    New-Item -ItemType Directory -Path (Split-Path $executableDestination -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $sourceExecutable -Destination $executableDestination -Force

    $resourceConfig = Get-Content -LiteralPath $windowsConfig -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($null -ne $resourceConfig.bundle.resources) {
        foreach ($entry in $resourceConfig.bundle.resources.PSObject.Properties) {
            if ($entry.Value -is [Array] -or [string]::IsNullOrWhiteSpace([string]$entry.Value)) {
                throw "Resource '$($entry.Name)' must map one source file to one relative package path."
            }
            $source = Resolve-SafeChildPath $tauriRoot ([string]$entry.Name) "resource source"
            $destination = Resolve-SafeChildPath $stagingDirectory ([string]$entry.Value) "resource destination"
            if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
                throw "Configured resource source was not found: $source"
            }
            if ($destination.Equals($stagedManifest, [StringComparison]::OrdinalIgnoreCase) -or $destination.Equals($executableDestination, [StringComparison]::OrdinalIgnoreCase)) {
                throw "Configured resource '$($entry.Name)' would overwrite a required package file."
            }
            New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
            Copy-Item -LiteralPath $source -Destination $destination -Force
        }
    }

    New-Assets $iconsRoot (Join-Path $stagingDirectory "Assets")
    $configPath = Join-Path $configDirectory "priconfig.xml"
    $priPath = Join-Path $stagingDirectory "resources.pri"
    Invoke-Native $sdk.MakePri @("createconfig", "/cf", $configPath, "/dq", $manifestInfo.Language, "/pv", "10.0.0", "/o") -UnicodeOutput
    Remove-MakePriPackaging $configPath
    Invoke-Native $sdk.MakePri @("new", "/pr", $stagingDirectory, "/cf", $configPath, "/of", $priPath, "/o") -UnicodeOutput

    $outputPath = Join-Path $OutputDirectory ("TeyvatGuide_{0}_x64.msix" -f $normalizedVersion)
    Invoke-Native $sdk.MakeAppx @("pack", "/v", "/o", "/d", $stagingDirectory, "/p", $outputPath)
    if (-not (Test-Path -LiteralPath $outputPath -PathType Leaf) -or (Get-Item -LiteralPath $outputPath).Length -le 0) {
        throw "MakeAppx reported success but no non-empty MSIX was produced: $outputPath"
    }
    if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_OUTPUT)) {
        [IO.File]::AppendAllText($env:GITHUB_OUTPUT, ("msix-path={0}{1}" -f $outputPath, [Environment]::NewLine), [Text.UTF8Encoding]::new($false))
    }
    Write-Host "MSIX package created: $outputPath"
}
catch {
    $exitCode = 1
    Write-Error ("MSIX build failed: " + $_.Exception.Message)
}
finally {
    if ($null -ne $configDirectory) { Remove-StagingDirectory $configDirectory $stagingRoot }
    if ($null -ne $stagingDirectory) { Remove-StagingDirectory $stagingDirectory $stagingRoot }
}
if ($exitCode -ne 0) { exit $exitCode }
