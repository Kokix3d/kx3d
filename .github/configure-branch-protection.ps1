# GitHub Branch Protection Configuration Script for Solo Developer
# This script configures branch protection rules that:
# - Require pull requests
# - Allow 0 approvals (no review required)
# - Disable code owner requirements
# - Disable conversation resolution requirements
# - Allow merge, squash, and rebase

param(
    [Parameter(Mandatory=$false)]
    [string]$Branch = "main",
    
    [Parameter(Mandatory=$false)]
    [string]$Repository = ""
)

# Check if GitHub CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "Error: GitHub CLI (gh) is not installed." -ForegroundColor Red
    Write-Host "Please install it from: https://cli.github.com/" -ForegroundColor Yellow
    exit 1
}

# Check if user is authenticated
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Not authenticated with GitHub CLI." -ForegroundColor Red
    Write-Host "Please run: gh auth login" -ForegroundColor Yellow
    exit 1
}

# Get repository name if not provided
if ([string]::IsNullOrEmpty($Repository)) {
    $remoteUrl = git remote get-url origin 2>&1
    if ($LASTEXITCODE -eq 0) {
        # Extract repo name from URL (handles both HTTPS and SSH)
        if ($remoteUrl -match 'github\.com[:/]([^/]+)/([^/]+?)(?:\.git)?$') {
            $Repository = "$($matches[1])/$($matches[2])"
        }
    }
    
    if ([string]::IsNullOrEmpty($Repository)) {
        Write-Host "Error: Could not determine repository name." -ForegroundColor Red
        Write-Host "Please provide the repository name in format: owner/repo" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "Configuring branch protection for: $Repository (branch: $Branch)" -ForegroundColor Cyan

# Configure branch protection rules
# Note: GitHub CLI uses different flags, so we'll use the API directly
$protectionRules = @{
    required_pull_request_reviews = @{
        required_approving_review_count = 0
        dismiss_stale_reviews = $false
        require_code_owner_reviews = $false
        require_last_push_approval = $false
    }
    enforce_admins = $false
    required_status_checks = $null
    restrictions = $null
    allow_force_pushes = $false
    allow_deletions = $false
    required_conversation_resolution = $false
    require_linear_history = $false
    allow_squash_merge = $true
    allow_merge_commit = $true
    allow_rebase_merge = $true
    block_creations = $false
    required_signatures = $false
    lock_branch = $false
    allow_fork_syncing = $false
} | ConvertTo-Json -Depth 10

# Update branch protection using GitHub API
Write-Host "Setting branch protection rules..." -ForegroundColor Yellow

# Create temporary file for JSON payload
$tempFile = [System.IO.Path]::GetTempFileName()
try {
    $protectionRules | Out-File -FilePath $tempFile -Encoding utf8 -NoNewline
    
    $response = gh api repos/$Repository/branches/$Branch/protection `
        --method PUT `
        --input $tempFile `
        2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Branch protection rules configured successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Configuration summary:" -ForegroundColor Cyan
        Write-Host "  - Pull requests required: Yes" -ForegroundColor White
        Write-Host "  - Required approvals: 0" -ForegroundColor White
        Write-Host "  - Code owner reviews: Disabled" -ForegroundColor White
        Write-Host "  - Conversation resolution: Disabled" -ForegroundColor White
        Write-Host "  - Merge methods: Merge, Squash, Rebase (all enabled)" -ForegroundColor White
    } else {
        Write-Host "Error configuring branch protection:" -ForegroundColor Red
        Write-Host $response -ForegroundColor Red
        exit 1
    }
} finally {
    # Clean up temporary file
    if (Test-Path $tempFile) {
        Remove-Item $tempFile -Force
    }
}
