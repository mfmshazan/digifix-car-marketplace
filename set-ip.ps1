# Auto-detect the active LAN IPv4 address and update both Expo app environments.
# Usage: .\set-ip.ps1 [192.168.8.100]

param([string]$ManualIp = '')

function Get-LanIp {
    $defaultRoute = route print -4 |
        Select-String '^\s*0\.0\.0\.0\s+0\.0\.0\.0\s+\S+\s+(\S+)' |
        Select-Object -First 1

    if ($defaultRoute -and $defaultRoute.Matches[0].Groups[1].Value) {
        return $defaultRoute.Matches[0].Groups[1].Value
    }

    return [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
        Where-Object { $_.AddressFamily -eq 'InterNetwork' } |
        Select-Object -ExpandProperty IPAddressToString |
        Where-Object { $_ -match '^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)' } |
        Select-Object -First 1
}

$ip = if ($ManualIp) { $ManualIp.Trim() } else { Get-LanIp }
if (-not $ip) {
    Write-Host 'Could not detect a LAN IP address. Pass one explicitly.' -ForegroundColor Red
    exit 1
}

if ($ip -notmatch '^(?:\d{1,3}\.){3}\d{1,3}$') {
    Write-Host "Invalid IPv4 address: $ip" -ForegroundColor Red
    exit 1
}

Write-Host "Setting API host to $ip" -ForegroundColor Cyan

$riderEnv = 'apps\rider\.env'
if (Test-Path -LiteralPath $riderEnv) {
    $content = Get-Content -LiteralPath $riderEnv -Raw
    if ($content -match '(?m)^#?\s*EXPO_PUBLIC_API_URL=.*$') {
        $content = $content -replace '(?m)^#?\s*EXPO_PUBLIC_API_URL=.*$', "EXPO_PUBLIC_API_URL=http://${ip}:3000/api"
    }
    if ($content -match '(?m)^#?\s*EXPO_PUBLIC_API_HOST=.*$') {
        $content = $content -replace '(?m)^#?\s*EXPO_PUBLIC_API_HOST=.*$', "EXPO_PUBLIC_API_HOST=$ip"
    } else {
        $content += "`nEXPO_PUBLIC_API_HOST=$ip`n"
    }
    Set-Content -LiteralPath $riderEnv -Value $content -NoNewline
    Write-Host "Updated $riderEnv" -ForegroundColor Green
}

$mobileEnv = 'apps\mobile\.env'
if (Test-Path -LiteralPath $mobileEnv) {
    $content = Get-Content -LiteralPath $mobileEnv -Raw
    if ($content -match '(?m)^#?\s*EXPO_PUBLIC_API_URL=.*$') {
        $content = $content -replace '(?m)^#?\s*EXPO_PUBLIC_API_URL=.*$', "EXPO_PUBLIC_API_URL=http://${ip}:3000/api"
    } else {
        $content += "`nEXPO_PUBLIC_API_URL=http://${ip}:3000/api`n"
    }
    if ($content -match '(?m)^#?\s*EXPO_PUBLIC_API_HOST=.*$') {
        $content = $content -replace '(?m)^#?\s*EXPO_PUBLIC_API_HOST=.*$', "EXPO_PUBLIC_API_HOST=$ip"
    } else {
        $content += "`nEXPO_PUBLIC_API_HOST=$ip`n"
    }
    Set-Content -LiteralPath $mobileEnv -Value $content -NoNewline
    Write-Host "Updated $mobileEnv" -ForegroundColor Green
}

Write-Host 'Done. Restart Expo with a cleared Metro cache.' -ForegroundColor Cyan
