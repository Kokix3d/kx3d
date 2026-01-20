# Simplified GitHub Branch Protection Configuration Script
# Alternative method using GitHub CLI field parameters

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
Write-Host "Setting branch protection rules..." -ForegroundColor Yellow

# Configure branch protection using GitHub CLI field parameters
$response = gh api repos/$Repository/branches/$Branch/protection `
    --method PUT `
    --field required_pull_request_reviews[required_approving_review_count]=0 `
    --field required_pull_request_reviews[require_code_owner_reviews]=false `
    --field required_pull_request_reviews[dismiss_stale_reviews]=false `
    --field required_pull_request_reviews[require_last_push_approval]=false `
    --field required_conversation_resolution=false `
    --field allow_merge_commit=true `
    --field allow_squash_merge=true `
    --field allow_rebase_merge=true `
    --field enforce_admins=false `
    --field allow_force_pushes=false `
    --field allow_deletions=false `
    --field require_linear_history=false `
    --field required_signatures=false `
    --field lock_branch=false `
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
    Write-Host ""
    Write-Host "Note: If you see an error, you may need to enable branch protection first via GitHub web UI." -ForegroundColor Yellow
    exit 1
}
