# Set your music directory and playlist name

# Set your main music directory
$musicDir = "Z:\music\DiscoMP3\"
$playListDest = "Z:\music\_playlist\"
$suffix = "MP3"

# Get all child directories (1 level deep)
$childDirs = Get-ChildItem -Path $musicDir -Directory

foreach ($dir in $childDirs) {
    $playlist = Join-Path $playListDest "$($dir.Name)_$suffix.m3u"
    # Find all music files recursively in this child directory
    $files = Get-ChildItem -Path $dir.FullName -Include *.mp3, *.flac, *.wav, *.aac, *.ogg -File -Recurse
    # Write file paths to the M3U playlist
    $files | ForEach-Object { $_.FullName } | Set-Content -Path $playlist -Encoding UTF8
    Write-Host "Playlist created at $playlist"
}