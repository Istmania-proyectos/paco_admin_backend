param(
  [string]$ReferencePath = 'C:\Users\yamador01\Downloads\Manual_tecnico_PACO_Admin.docx',
  [string]$OutputDirectory = (Join-Path $PSScriptRoot 'manual-usuario-paco-admin')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
if (-not (Test-Path -LiteralPath $OutputDirectory)) { New-Item -ItemType Directory -Path $OutputDirectory | Out-Null }
$docxPath = Join-Path $OutputDirectory 'Manual_de_usuario_PACO_Admin.docx'
$pdfPath = Join-Path $OutputDirectory 'Manual_de_usuario_PACO_Admin.pdf'
$sourcePath = Join-Path $OutputDirectory 'document-source.xml'
$flatPath = Join-Path $OutputDirectory 'document-updated.xml'

& node (Join-Path $PSScriptRoot 'build-user-manual.cjs') $OutputDirectory
if ($LASTEXITCODE -ne 0) { throw 'El generador de contenido termino con error.' }

$nsWord = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
$nsRel = 'http://schemas.openxmlformats.org/package/2006/relationships'
$referenceStream = [IO.File]::Open($ReferencePath, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
$referenceZip = [IO.Compression.ZipArchive]::new($referenceStream, [IO.Compression.ZipArchiveMode]::Read)
$packageParts = @{}
try {
  foreach ($entry in $referenceZip.Entries) {
    if ($entry.FullName.EndsWith('/')) { continue }
    $memory = [IO.MemoryStream]::new()
    $entryStream = $entry.Open()
    try { $entryStream.CopyTo($memory); $packageParts[$entry.FullName] = $memory.ToArray() }
    finally { $entryStream.Dispose(); $memory.Dispose() }
  }
} finally { $referenceZip.Dispose(); $referenceStream.Dispose() }

$utf8 = [Text.UTF8Encoding]::new($false)
[xml]$referenceDocument = $utf8.GetString($packageParts['word/document.xml'])
$ns = [Xml.XmlNamespaceManager]::new($referenceDocument.NameTable)
$ns.AddNamespace('w', $nsWord)
$logoParagraph = $referenceDocument.SelectSingleNode('//w:body/w:p[.//w:drawing]', $ns)
$documentSource = [IO.File]::ReadAllText($sourcePath, $utf8)
if ($logoParagraph) { $documentSource = $documentSource.Replace('<!--COVER_LOGO-->', $logoParagraph.OuterXml) }
else { $documentSource = $documentSource.Replace('<!--COVER_LOGO-->', '') }
$packageParts['word/document.xml'] = $utf8.GetBytes($documentSource)

[xml]$styles = $utf8.GetString($packageParts['word/styles.xml'])
$styleNs = [Xml.XmlNamespaceManager]::new($styles.NameTable)
$styleNs.AddNamespace('w', $nsWord)
foreach ($caption in @('UserTableCaption','UserFigureCaption')) {
  $style = $styles.CreateElement('w', 'style', $nsWord)
  [void]$style.SetAttribute('type', $nsWord, 'paragraph')
  [void]$style.SetAttribute('styleId', $nsWord, $caption)
  $style.InnerXml = '<w:name xmlns:w="'+$nsWord+'" w:val="'+$caption+'"/><w:basedOn xmlns:w="'+$nsWord+'" w:val="Normal"/><w:pPr xmlns:w="'+$nsWord+'"><w:keepNext/><w:spacing w:line="240" w:lineRule="auto" w:after="100"/></w:pPr><w:rPr xmlns:w="'+$nsWord+'"><w:b/><w:sz w:val="22"/></w:rPr>'
  [void]$styles.DocumentElement.AppendChild($style)
}
$normal = $styles.SelectSingleNode('//w:style[@w:styleId="Normal"]', $styleNs)
$runProperties = $normal.SelectSingleNode('w:rPr', $styleNs)
if (-not $runProperties) { $runProperties=$styles.CreateElement('w','rPr',$nsWord);[void]$normal.AppendChild($runProperties) }
$fontSize = $styles.CreateElement('w','sz',$nsWord)
[void]$fontSize.SetAttribute('val',$nsWord,'22')
[void]$runProperties.AppendChild($fontSize)
$packageParts['word/styles.xml'] = $utf8.GetBytes($styles.OuterXml)

[xml]$relationships = $utf8.GetString($packageParts['word/_rels/document.xml.rels'])
$headerRelationship = $relationships.CreateElement('Relationship', $nsRel)
$headerRelationship.SetAttribute('Id','rIdUserHeader')
$headerRelationship.SetAttribute('Type','http://schemas.openxmlformats.org/officeDocument/2006/relationships/header')
$headerRelationship.SetAttribute('Target','userHeader.xml')
[void]$relationships.DocumentElement.AppendChild($headerRelationship)
$packageParts['word/_rels/document.xml.rels'] = $utf8.GetBytes($relationships.OuterXml)
$packageParts['word/userHeader.xml'] = $utf8.GetBytes('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="'+$nsWord+'"><w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="9026"/></w:tabs></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="16"/></w:rPr><w:t>PACO ADMIN | MANUAL DE USUARIO</w:t></w:r><w:r><w:tab/></w:r><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:hdr>')
[xml]$contentTypes = $utf8.GetString($packageParts['[Content_Types].xml'])
$override = $contentTypes.CreateElement('Override','http://schemas.openxmlformats.org/package/2006/content-types')
$override.SetAttribute('PartName','/word/userHeader.xml')
$override.SetAttribute('ContentType','application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml')
[void]$contentTypes.DocumentElement.AppendChild($override)
$packageParts['[Content_Types].xml'] = $utf8.GetBytes($contentTypes.OuterXml)

# Set the bibliographic metadata independently of localized Office property names.
$packageParts['docProps/core.xml'] = $utf8.GetBytes('<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Manual de usuario - PACO Admin</dc:title><dc:subject>Procedimientos de usuario y espacios para capturas</dc:subject><dc:creator>Equipo de desarrollo PACO Admin</dc:creator><cp:keywords>Manual de usuario; PACO Admin; capturas pendientes</cp:keywords><dc:description>Version 1.0. Pagos S4HANA excluido del release.</dc:description></cp:coreProperties>')

$outputStream = [IO.File]::Open($docxPath,[IO.FileMode]::Create,[IO.FileAccess]::ReadWrite)
$outputZip = [IO.Compression.ZipArchive]::new($outputStream,[IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($name in $packageParts.Keys) {
    $newEntry = $outputZip.CreateEntry($name,[IO.Compression.CompressionLevel]::Optimal)
    $entryStream=$newEntry.Open()
    try { $bytes=$packageParts[$name];$entryStream.Write($bytes,0,$bytes.Length) }
    finally { $entryStream.Dispose() }
  }
} finally { $outputZip.Dispose();$outputStream.Dispose() }
Write-Output "PACKAGED=$docxPath"

$word=$null;$document=$null
try {
  $word=New-Object -ComObject Word.Application
  $word.Visible=$false
  $word.DisplayAlerts=0
  $document=$word.Documents.Open($docxPath,$false,$false)
  [void]$document.Fields.Update()
  foreach($toc in $document.TablesOfContents){$toc.Update()}
  $document.Repaginate()
  foreach($toc in $document.TablesOfContents){$toc.UpdatePageNumbers()}
  Write-Output "PAGES=$($document.ComputeStatistics(2)) TABLES=$($document.Tables.Count) INDEXES=$($document.TablesOfContents.Count)"
  [IO.File]::WriteAllText($flatPath,$document.WordOpenXML,$utf8)
} finally {
  if($document){$document.Close([ref]0)}
  if($word){$word.Quit()}
}
& (Join-Path $PSScriptRoot 'convert-flatopc-to-docx.ps1') -InputPath $flatPath -OutputPath $docxPath
$word=$null;$document=$null
try {
  $word=New-Object -ComObject Word.Application
  $word.Visible=$false
  $word.DisplayAlerts=0
  $word.Options.PrintBackground=$false
  $word.Options.UpdateFieldsAtPrint=$false
  $document=$word.Documents.Open($docxPath,$false,$true)
  $document.ExportAsFixedFormat($pdfPath,17)
  Write-Output "PDF=$pdfPath"
} finally {
  if($document){$document.Close([ref]0)}
  if($word){$word.Quit()}
}
# Remove only the two intermediate files produced above; both can be recreated.
foreach($temporaryPath in @($sourcePath,$flatPath)){if([IO.File]::Exists($temporaryPath)){[IO.File]::Delete($temporaryPath)}}
Write-Output "DOCX=$docxPath"
