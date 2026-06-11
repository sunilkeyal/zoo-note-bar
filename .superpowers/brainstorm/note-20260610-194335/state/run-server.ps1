$port = Get-Random -Minimum 49152 -Maximum 60000
$port | Out-File -FilePath $env:PORTFILE -Encoding ASCII
Set-Location -LiteralPath $env:CONTENTDIR
python -m http.server $port --directory $env:CONTENTDIR
