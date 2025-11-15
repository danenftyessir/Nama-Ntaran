Write-Host "Stopping existing Next.js dev servers..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Cleaning lock files..." -ForegroundColor Yellow
if (Test-Path ".next\dev\lock") {
    Remove-Item ".next\dev\lock" -Force -ErrorAction SilentlyContinue
}

Write-Host "Starting Next.js dev server..." -ForegroundColor Green
npm run dev
