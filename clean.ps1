$CurrentDir = Get-Location
$ScriptPath = $MyInvocation.MyCommand.Path

Start-Sleep -Seconds 2

Get-ChildItem -Force | Where-Object {
    $_.FullName -ne $ScriptPath
} | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Start-Sleep -Milliseconds 500
Remove-Item -Path $ScriptPath -Force