# GitHub Branch Protection Setup for Solo Developer

This guide explains how to configure GitHub branch protection rules for a solo developer workflow.

## Configuration Requirements

- ✅ Require pull requests
- ✅ Allow 0 approvals (no review required)
- ✅ Disable code owner requirements
- ✅ Disable conversation resolution requirements
- ✅ Allow merge, squash, and rebase

## Method 1: Using the PowerShell Scripts (Recommended)

### Prerequisites

1. Install [GitHub CLI](https://cli.github.com/)
2. Authenticate with GitHub:
   ```powershell
   gh auth login
   ```

### Option A: Simple Script (Recommended)

Uses field-based parameters - simpler and more reliable:

```powershell
# For default branch (main)
.\github\configure-branch-protection-simple.ps1

# For a specific branch
.\github\configure-branch-protection-simple.ps1 -Branch "main"

# For a specific repository
.\github\configure-branch-protection-simple.ps1 -Branch "main" -Repository "owner/repo"
```

### Option B: JSON-based Script

Uses JSON input for more complex configurations:

```powershell
# For default branch (main)
.\github\configure-branch-protection.ps1

# For a specific branch
.\github\configure-branch-protection.ps1 -Branch "main"

# For a specific repository
.\github\configure-branch-protection.ps1 -Branch "main" -Repository "owner/repo"
```

## Method 2: Manual Configuration via GitHub Web UI

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Branches**
3. Click **Add rule** or edit existing rule for your branch (e.g., `main`)
4. Configure the following settings:

### Branch Protection Settings

**Protect matching branches:**
- ✅ Enable this rule

**Pull request requirements:**
- ✅ Require a pull request before merging
- ✅ Required number of approvals before merging: **0**
- ❌ Dismiss stale pull request approvals when new commits are pushed (unchecked)
- ❌ Require review from Code Owners (unchecked)
- ❌ Require last push approval (unchecked)

**Conversation resolution:**
- ❌ Require conversation resolution before merging (unchecked)

**Merge restrictions:**
- ✅ Allow merge commits
- ✅ Allow squash merging
- ✅ Allow rebase merging

**Other settings:**
- ❌ Require status checks to pass before merging (unchecked)
- ❌ Require branches to be up to date before merging (unchecked)
- ❌ Require signed commits (unchecked)
- ❌ Require linear history (unchecked)
- ❌ Include administrators (unchecked)
- ❌ Do not allow bypassing the above settings (unchecked)
- ❌ Allow force pushes (unchecked)
- ❌ Allow deletions (unchecked)

## Method 3: Using GitHub CLI Directly

If you prefer to configure manually via CLI:

```powershell
# Set branch protection with required PR but 0 approvals
gh api repos/OWNER/REPO/branches/main/protection \
  --method PUT \
  --field required_pull_request_reviews[required_approving_review_count]=0 \
  --field required_pull_request_reviews[require_code_owner_reviews]=false \
  --field required_pull_request_reviews[dismiss_stale_reviews]=false \
  --field required_conversation_resolution=false \
  --field allow_merge_commit=true \
  --field allow_squash_merge=true \
  --field allow_rebase_merge=true \
  --field enforce_admins=false
```

Replace `OWNER/REPO` with your repository name (e.g., `username/repo-name`).

## Verification

After configuration, verify the settings:

1. Create a test branch and make a change
2. Open a pull request
3. You should be able to merge immediately without any approvals
4. You should see all three merge options available (Merge, Squash, Rebase)

## Notes

- This configuration is ideal for solo developers who want to maintain PR workflow but don't need review requirements
- You can still create and merge PRs for better commit history organization
- All merge methods (merge, squash, rebase) are available for flexibility
- No code owner or conversation resolution requirements means faster workflow
