param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,
  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$inputFullPath = (Resolve-Path -LiteralPath $InputPath).Path
$outputFullPath = [System.IO.Path]::GetFullPath($OutputPath)
$outputParent = [System.IO.Path]::GetDirectoryName($outputFullPath)
if (-not (Test-Path -LiteralPath $outputParent)) {
  New-Item -ItemType Directory -Path $outputParent | Out-Null
}

[xml]$flatOpc = [System.IO.File]::ReadAllText($inputFullPath, [System.Text.Encoding]::UTF8)
$namespaceManager = New-Object System.Xml.XmlNamespaceManager($flatOpc.NameTable)
$namespaceManager.AddNamespace('pkg', 'http://schemas.microsoft.com/office/2006/xmlPackage')
$parts = $flatOpc.SelectNodes('/pkg:package/pkg:part', $namespaceManager)
if (-not $parts -or $parts.Count -eq 0) {
  throw 'El archivo no contiene partes Flat OPC.'
}

$fileStream = [System.IO.File]::Open($outputFullPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::ReadWrite)
try {
  $archive = New-Object System.IO.Compression.ZipArchive($fileStream, [System.IO.Compression.ZipArchiveMode]::Create, $true)
  try {
    $contentTypes = New-Object System.Text.StringBuilder
    [void]$contentTypes.Append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
    [void]$contentTypes.Append('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">')
    [void]$contentTypes.Append('<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>')
    [void]$contentTypes.Append('<Default Extension="xml" ContentType="application/xml"/>')
    $binaryExtensions = @{}
    foreach ($part in $parts) {
      $partName = [string]$part.GetAttribute('name', 'http://schemas.microsoft.com/office/2006/xmlPackage')
      $contentType = [string]$part.GetAttribute('contentType', 'http://schemas.microsoft.com/office/2006/xmlPackage')
      $extension = [System.IO.Path]::GetExtension($partName).TrimStart('.').ToLowerInvariant()
      if ($extension -eq 'rels') { continue }
      if ($part.SelectSingleNode('pkg:binaryData', $namespaceManager)) {
        if (-not $binaryExtensions.ContainsKey($extension)) {
          $binaryExtensions[$extension] = $contentType
          [void]$contentTypes.Append(('<Default Extension="{0}" ContentType="{1}"/>' -f $extension, $contentType))
        }
      } else {
        [void]$contentTypes.Append(('<Override PartName="{0}" ContentType="{1}"/>' -f $partName, $contentType))
      }
    }
    [void]$contentTypes.Append('</Types>')
    $contentTypesEntry = $archive.CreateEntry('[Content_Types].xml', [System.IO.Compression.CompressionLevel]::Optimal)
    $contentTypesStream = $contentTypesEntry.Open()
    try {
      $contentTypesBytes = [System.Text.UTF8Encoding]::new($false).GetBytes($contentTypes.ToString())
      $contentTypesStream.Write($contentTypesBytes, 0, $contentTypesBytes.Length)
    } finally {
      $contentTypesStream.Dispose()
    }

    foreach ($part in $parts) {
      $partName = [string]$part.GetAttribute('name', 'http://schemas.microsoft.com/office/2006/xmlPackage')
      $entryName = $partName.TrimStart('/')
      $entry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
      $entryStream = $entry.Open()
      try {
        $binaryData = $part.SelectSingleNode('pkg:binaryData', $namespaceManager)
        if ($binaryData) {
          $bytes = [System.Convert]::FromBase64String(($binaryData.InnerText -replace '\s', ''))
          $entryStream.Write($bytes, 0, $bytes.Length)
        } else {
          $xmlData = $part.SelectSingleNode('pkg:xmlData', $namespaceManager)
          if (-not $xmlData) { throw "Parte sin xmlData ni binaryData: $partName" }
          $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($xmlData.InnerXml)
          $entryStream.Write($bytes, 0, $bytes.Length)
        }
      } finally {
        $entryStream.Dispose()
      }
    }
  } finally {
    $archive.Dispose()
  }
} finally {
  $fileStream.Dispose()
}

Write-Output "DOCX=$outputFullPath"
Write-Output "PARTS=$($parts.Count)"
Write-Output "BYTES=$((Get-Item -LiteralPath $outputFullPath).Length)"
