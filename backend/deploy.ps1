# نشر الخلفية على Apps Script بأمر واحد: .\deploy.ps1 "وصف النسخة"
# 1) يزيد VERSION في Code.gs  2) clasp push  3) يحدّث نفس الـ Deployment (رابط /exec لا يتغير)
# 4) يتأكد من الرابط الحي أن ping يرجع النسخة الجديدة
# يحتاج مرة واحدة: تفعيل Apps Script API + npx @google/clasp login
param([string]$Description = "")

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$DeploymentId = "AKfycbz5QzGujgyndr_k1QpuFkPBQTjgA-KkxQoP9WOBV66-6pi5X-o4Q4JWLiJauDR2Xt39"
$ExecUrl = "https://script.google.com/macros/s/$DeploymentId/exec"

node "$PSScriptRoot\tests\backend.test.js"
if ($LASTEXITCODE -ne 0) { throw "اختبارات الخلفية فشلت — لم يتم النشر" }

$code = [System.IO.File]::ReadAllText("$PSScriptRoot\Code.gs")
$m = [regex]::Match($code, "const VERSION = (\d+);")
if (-not $m.Success) { throw "const VERSION غير موجود في Code.gs" }
$version = [int]$m.Groups[1].Value + 1
$code = $code.Replace($m.Value, "const VERSION = $version;")
[System.IO.File]::WriteAllText("$PSScriptRoot\Code.gs", $code, (New-Object System.Text.UTF8Encoding $false))
Write-Host "VERSION -> $version"

npx -y @google/clasp@latest push --force
if ($LASTEXITCODE -ne 0) { throw "clasp push فشل" }

$desc = "v$version $Description".Trim()
npx -y @google/clasp@latest create-deployment --deploymentId $DeploymentId --description $desc
if ($LASTEXITCODE -ne 0) { throw "تحديث الـ Deployment فشل" }

$res = Invoke-RestMethod -Uri "$ExecUrl`?action=ping" -Method Get
if ($res.ok -and $res.data.version -eq $version) {
  Write-Host "OK: الرابط الحي يعمل على النسخة $version" -ForegroundColor Green
} else {
  throw ("الرابط الحي لم يرجع النسخة المتوقعة: " + ($res | ConvertTo-Json -Compress))
}
