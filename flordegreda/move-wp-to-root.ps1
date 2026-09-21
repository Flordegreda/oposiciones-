# Move WordPress from blog.flordegreda.es/wp/ up to blog.flordegreda.es/
$ErrorActionPreference = 'Stop'
$hostFtp = '213.158.86.95'
$user = 'hosting170297eu'
$pass = 'Juanola_2026'
$cred = New-Object System.Net.NetworkCredential($user, $pass)
$base = 'ftp://{0}/public_html/blog.flordegreda.es' -f $hostFtp

function Invoke-FtpRequest {
    param(
        [string]$Uri,
        [string]$Method,
        [string]$RenameTo = $null
    )
    $req = [System.Net.FtpWebRequest]::Create($Uri)
    $req.Credentials = $cred
    $req.Method = $Method
    $req.UseBinary = $true
    $req.UsePassive = $true
    $req.KeepAlive = $false
    if ($RenameTo) { $req.RenameTo = $RenameTo }
    $resp = $req.GetResponse()
    try {
        if ($Method -eq [System.Net.WebRequestMethods+Ftp]::ListDirectory -or
            $Method -eq [System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails) {
            $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
            return $reader.ReadToEnd()
        }
        return $null
    } finally {
        $resp.Close()
    }
}

function Get-FtpNames {
    param([string]$RelPath)
    $uri = if ($RelPath) { "$base/$RelPath" } else { $base }
    $raw = Invoke-FtpRequest -Uri $uri -Method ([System.Net.WebRequestMethods+Ftp]::ListDirectory)
    $names = @()
    foreach ($line in ($raw -split "`r?`n")) {
        $n = $line.Trim()
        if ($n -and $n -ne '.' -and $n -ne '..') { $names += $n }
    }
    return $names
}

function Test-FtpIsDir {
    param([string]$RelPath)
    try {
        $null = Invoke-FtpRequest -Uri "$base/$RelPath" -Method ([System.Net.WebRequestMethods+Ftp]::ListDirectory)
        return $true
    } catch {
        return $false
    }
}

function Ensure-FtpDir {
    param([string]$RelPath)
    if (-not $RelPath) { return }
    $parts = $RelPath -split '/'
    $cur = ''
    foreach ($p in $parts) {
        $cur = if ($cur) { "$cur/$p" } else { $p }
        try {
            $req = [System.Net.FtpWebRequest]::Create("$base/$cur")
            $req.Credentials = $cred
            $req.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
            $req.UsePassive = $true
            $req.KeepAlive = $false
            $resp = $req.GetResponse()
            $resp.Close()
            Write-Host "MKD $cur"
        } catch {
            # exists
        }
    }
}

function Move-FtpTree {
    param(
        [string]$FromRel,
        [string]$ToRel
    )
    $names = Get-FtpNames -RelPath $FromRel
    foreach ($name in $names) {
        $from = "$FromRel/$name"
        $to = if ($ToRel) { "$ToRel/$name" } else { $name }
        if (Test-FtpIsDir -RelPath $from) {
            Ensure-FtpDir -RelPath $to
            Move-FtpTree -FromRel $from -ToRel $to
            # remove empty dir
            try {
                Invoke-FtpRequest -Uri "$base/$from" -Method ([System.Net.WebRequestMethods+Ftp]::RemoveDirectory) | Out-Null
                Write-Host "RMD $from"
            } catch {
                Write-Host "WARN RMD $from : $($_.Exception.Message)"
            }
        } else {
            # Rename relative to server: Rename from path to destination path
            $fromUri = "$base/$from"
            # RenameTo is often relative to current dir of the request URI's parent
            # Use absolute-style path from FTP root
            $renameTo = "/public_html/blog.flordegreda.es/$to"
            try {
                Invoke-FtpRequest -Uri $fromUri -Method ([System.Net.WebRequestMethods+Ftp]::Rename) -RenameTo $renameTo | Out-Null
                Write-Host "MV $from -> $to"
            } catch {
                Write-Host "FAIL MV $from -> $to : $($_.Exception.Message)"
                throw
            }
        }
    }
}

Write-Host 'Starting move wp/ -> root...'
Move-FtpTree -FromRel 'wp' -ToRel ''
try {
    Invoke-FtpRequest -Uri "$base/wp" -Method ([System.Net.WebRequestMethods+Ftp]::RemoveDirectory) | Out-Null
    Write-Host 'RMD wp'
} catch {
    Write-Host "WARN final RMD wp: $($_.Exception.Message)"
}
Write-Host 'Done listing root:'
Get-FtpNames -RelPath '' | ForEach-Object { Write-Host " - $_" }
