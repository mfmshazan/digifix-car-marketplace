# ─────────────────────────────────────────────────────────────────────────────
# set-ip.ps1  —  Auto-detect your LAN IP and update both app .env files
#
# Usage (from repo root):
#   .\set-ip.ps1            # auto-detects your Wi-Fi IP
#   .\set-ip.ps1 192.168.x.x  # use a specific IP instead
#
# You only need this if Expo's auto-detection (Constants.expoConfig.hostUri)
# fails — e.g. when running in tunnel mode or on a VPN.
# ─────────────────────────────────────────────────────────────────────────────

param([string]$ManualIp = "")

function Get-LanIp {
    # Get all IPv4 addresses except loopback, pick the first private LAN one
    $addresses = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
        Where-Object { $_.AddressFamily -eq 'InterNetwork' } |
        Select-Object -ExpandProperty IPAddressToString |
        Where-Object { $_ -ne '127.0.0.1' } |
        Where-Object { $_ -match '^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)' }

    return $addresses | Select-Object -First 1
}

$ip = if ($ManualIp -ne "") { $ManualIp } else { Get-LanIp }

if (-not $ip) {
    Write-Host "❌ Could not detect a LAN IP address. Are you connected to Wi-Fi?" -ForegroundColor Red
    Write-Host "   Run:  .\set-ip.ps1 <your-ip>  to set it manually." -ForegroundColor Yellow
    exit 1
}

Write-Host "🌐 Setting IP to: $ip" -ForegroundColor Cyan

# ─── Update apps/rider/.env ───────────────────────────────────────────────────
$riderEnv = "apps\rider\.env"
if (Test-Path $riderEnv) {
    $content = Get-Content $riderEnv -Raw
    if ($content -match "(?m)^#?\s*EXPO_PUBLIC_API_HOST=.*$") {
        # Replace the existing (commented or uncommented) host line
        $content = $content -replace "(?m)^#?\s*EXPO_PUBLIC_API_HOST=.*$", "EXPO_PUBLIC_API_HOST=$ip"
    } else {
        # Append if not found
        $content += "`nEXPO_PUBLIC_API_HOST=$ip`n"
    }
    Set-Content $riderEnv $content -NoNewline
    Write-Host "   ✅ Updated $riderEnv" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  $riderEnv not found — skipping." -ForegroundColor Yellow
}

# ─── Update apps/mobile/.env ─────────────────────────────────────────────────
$mobileEnv = "apps\mobile\.env"
if (Test-Path $mobileEnv) {
    $content = Get-Content $mobileEnv -Raw
    # Replace or uncomment EXPO_PUBLIC_API_URL
    if ($content -match "(?m)^#?\s*EXPO_PUBLIC_API_URL=.*$") {
        $content = $content -replace "(?m)^#?\s*EXPO_PUBLIC_API_URL=.*$", "EXPO_PUBLIC_API_URL=http://${ip}:3000/api"
    } else {
        $content += "`nEXPO_PUBLIC_API_URL=http://${ip}:3000/api`n"
    }
    # Replace or uncomment EXPO_PUBLIC_API_HOST
    if ($content -match "(?m)^#?\s*EXPO_PUBLIC_API_HOST=.*$") {
        $content = $content -replace "(?m)^#?\s*EXPO_PUBLIC_API_HOST=.*$", "EXPO_PUBLIC_API_HOST=$ip"
    } else {
        $content += "`nEXPO_PUBLIC_API_HOST=$ip`n"
    }
    Set-Content $mobileEnv $content -NoNewline
    Write-Host "   ✅ Updated $mobileEnv" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  $mobileEnv not found — skipping." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✨ Done! Now restart your Expo servers:" -ForegroundColor Cyan
Write-Host "   cd apps\rider   && npm start -- --clear" -ForegroundColor White
Write-Host "   cd apps\mobile  && npm start -- --clear" -ForegroundColor White
