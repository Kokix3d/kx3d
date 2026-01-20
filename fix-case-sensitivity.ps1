# PowerShell script to fix case sensitivity issues in HTML files
# Run this script to fix all houdini/unreal/blender case mismatches

$files = Get-ChildItem -Path . -Filter "*.html" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $original = $content
    
    # Fix case sensitivity issues
    $content = $content -replace 'href="../houdini/', 'href="../Houdini/'
    $content = $content -replace 'href="../unreal/', 'href="../Unreal/'
    $content = $content -replace 'href="../blender/', 'href="../Blender/'
    $content = $content -replace 'href="houdini/', 'href="Houdini/'
    $content = $content -replace 'href="unreal/', 'href="Unreal/'
    $content = $content -replace 'href="blender/', 'href="Blender/'
    
    # Only write if content changed
    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "Fixed: $($file.FullName)"
    }
}

Write-Host "Case sensitivity fixes complete!"
