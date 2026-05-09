# PowerShell Script to Package ClipHive for Chrome Web Store
# Run this script from the parent directory of ClipHive
# Example: Set-Location e:\repos; .\ClipHive\PACKAGE_EXTENSION.ps1

param(
    [string]$Version = "1.0.0",
    [string]$OutputDir = "."
)

# Get the script's directory (where ClipHive is located)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ClipHiveDir = $ScriptDir

# Verify manifest.json exists
if (-not (Test-Path "$ClipHiveDir\manifest.json")) {
    Write-Error "manifest.json not found in $ClipHiveDir. Make sure you're in the correct directory."
    exit 1
}

# Define the output zip file
$ZipName = "cliphive-v$Version.zip"
$OutputPath = Join-Path $OutputDir $ZipName

# List of files and folders to include
$ItemsToZip = @(
    "manifest.json",
    "background",
    "content",
    "icons",
    "offscreen",
    "popup",
    "utils"
)

# Verify all items exist
foreach ($item in $ItemsToZip) {
    $fullPath = Join-Path $ClipHiveDir $item
    if (-not (Test-Path $fullPath)) {
        Write-Warning "Warning: $item not found at $fullPath"
    }
}

Write-Host "Packaging ClipHive v$Version..." -ForegroundColor Green
Write-Host "Source directory: $ClipHiveDir"
Write-Host "Output location: $OutputPath"
Write-Host ""

# Create the zip file
try {
    # Remove existing zip if it exists
    if (Test-Path $OutputPath) {
        Remove-Item $OutputPath -Force
        Write-Host "Removed existing $ZipName"
    }

    # Create hashtable for Compress-Archive
    $compressParams = @{
        Path            = ($ItemsToZip | ForEach-Object { Join-Path $ClipHiveDir $_ })
        DestinationPath = $OutputPath
        Force           = $true
    }

    Compress-Archive @compressParams

    # Verify the zip was created
    if (Test-Path $OutputPath) {
        $fileSizeMB = [Math]::Round((Get-Item $OutputPath).Length / 1MB, 2)
        Write-Host "[SUCCESS] Created $ZipName ($fileSizeMB MB)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Go to https://chrome.google.com/webstore/devconsole"
        Write-Host "2. Click 'New Item'"
        Write-Host "3. Upload: $OutputPath"
        Write-Host "4. Fill in the store listing (see STORE_LISTING.md for copy)"
        Write-Host "5. Add screenshots (see STORE_LISTING.md for guidance)"
        Write-Host "6. Submit for review"
        Write-Host ""
        Write-Host "Verify the zip before uploading:" -ForegroundColor Cyan
        Write-Host "   Run: Expand-Archive -Path '$OutputPath' -DestinationPath './test-extract' -Force"
        Write-Host "   Then check that manifest.json is at the root level."
    }
    else {
        Write-Error "Failed to create $ZipName"
        exit 1
    }
}
catch {
    Write-Error ("Error during packaging: " + $_)
    exit 1
}
