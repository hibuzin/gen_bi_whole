$service = Get-Service -Name MongoDB -ErrorAction SilentlyContinue

if ($service -eq $null) {

Start-Process msiexec.exe `
-ArgumentList "/i `"$PSScriptRoot\mongodb.msi`" /quiet INSTALLLOCATION=`"C:\Program Files\MongoDB\`"" `
-Wait

}