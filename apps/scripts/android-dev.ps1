[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ExpoArgs
)

$ErrorActionPreference = "Stop"

$sdkSource = Join-Path $env:LOCALAPPDATA "Android\Sdk"
if (-not (Test-Path -LiteralPath $sdkSource)) {
    throw "Android SDK not found at $sdkSource. Install it with Android Studio first."
}

$sdkDrive = if ($env:DIGIFIX_ANDROID_SDK_DRIVE) {
    $env:DIGIFIX_ANDROID_SDK_DRIVE.TrimEnd("\")
} else {
    "S:"
}

if ($sdkDrive -notmatch "^[A-Za-z]:$") {
    throw "DIGIFIX_ANDROID_SDK_DRIVE must be a drive letter such as S:."
}

$mappingPrefix = "$sdkDrive\"
$mapping = @(& subst.exe) |
    Where-Object { $_.StartsWith($mappingPrefix, [System.StringComparison]::OrdinalIgnoreCase) } |
    Select-Object -First 1

if (-not $mapping) {
    & subst.exe $sdkDrive $sdkSource
    if ($LASTEXITCODE -ne 0) {
        throw "Could not map $sdkDrive to $sdkSource."
    }
} else {
    $mappedPath = (($mapping -split "=>", 2)[1]).Trim().TrimEnd("\")
    if (-not [string]::Equals(
        $mappedPath,
        $sdkSource.TrimEnd("\"),
        [System.StringComparison]::OrdinalIgnoreCase
    )) {
        throw "$sdkDrive is already mapped to another folder. Set DIGIFIX_ANDROID_SDK_DRIVE to a free drive letter."
    }
}

$shortSdk = "$sdkDrive\"
$env:ANDROID_HOME = $shortSdk
$env:ANDROID_SDK_ROOT = $shortSdk
$env:Path = "${shortSdk}platform-tools;${shortSdk}emulator;$env:Path"

$localProperties = Join-Path (Get-Location) "android\local.properties"
if (Test-Path -LiteralPath (Split-Path -Parent $localProperties)) {
    $lines = if (Test-Path -LiteralPath $localProperties) {
        [System.IO.File]::ReadAllLines($localProperties) |
            Where-Object { $_ -notmatch "^sdk\.dir=" }
    } else {
        @()
    }

    $encoding = New-Object System.Text.UTF8Encoding($false)
    $properties = [string[]](@("sdk.dir=$sdkDrive\\") + @($lines))
    [System.IO.File]::WriteAllLines(
        $localProperties,
        $properties,
        $encoding
    )
}

& npx.cmd expo run:android @ExpoArgs
exit $LASTEXITCODE
