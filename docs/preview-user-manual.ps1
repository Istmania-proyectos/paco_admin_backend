param([string]$PdfPath = (Join-Path $PSScriptRoot 'manual-usuario-paco-admin\Manual_de_usuario_PACO_Admin.pdf'))
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Drawing
[void][Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
[void][Windows.Data.Pdf.PdfDocument,Windows.Data.Pdf,ContentType=WindowsRuntime]
[void][Windows.Storage.Streams.InMemoryRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
[void][Windows.Storage.Streams.DataReader,Windows.Storage.Streams,ContentType=WindowsRuntime]
[void][Windows.Data.Pdf.PdfPageRenderOptions,Windows.Data.Pdf,ContentType=WindowsRuntime]
function Await-Result($Operation,[Type]$ResultType){
  $method=[System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object{$_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetGenericArguments().Count -eq 1}|Select-Object -First 1
  $task=$method.MakeGenericMethod($ResultType).Invoke($null,@($Operation))
  $task.GetAwaiter().GetResult()
}
function Await-Action($Operation){
  $method=[System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object{$_.Name -eq 'AsTask' -and -not $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction'}|Select-Object -First 1
  $task=$method.Invoke($null,@($Operation))
  $task.GetAwaiter().GetResult()
}
$storageFile=Await-Result ([Windows.Storage.StorageFile]::GetFileFromPathAsync([IO.Path]::GetFullPath($PdfPath))) ([Windows.Storage.StorageFile])
$pdf=Await-Result ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($storageFile)) ([Windows.Data.Pdf.PdfDocument])
$previewDir=Join-Path ([IO.Path]::GetDirectoryName($PdfPath)) 'previews'
if(-not(Test-Path -LiteralPath $previewDir)){New-Item -ItemType Directory -Path $previewDir|Out-Null}
$selectedPages=@(1,3,9,12,15,22,30,38)
$canvas=[Drawing.Bitmap]::new(1440,2040)
$graphics=[Drawing.Graphics]::FromImage($canvas)
$graphics.Clear([Drawing.Color]::LightGray)
$font=[Drawing.Font]::new('Arial',11)
$index=0
foreach($pageNumber in $selectedPages){
  if($pageNumber -gt $pdf.PageCount){continue}
  $page=$pdf.GetPage($pageNumber-1)
  $stream=[Windows.Storage.Streams.InMemoryRandomAccessStream]::new()
  $options=[Windows.Data.Pdf.PdfPageRenderOptions]::new()
  $options.DestinationWidth=1000
  Await-Action ($page.RenderToStreamAsync($stream,$options))
  $stream.Seek(0)
  $reader=[Windows.Storage.Streams.DataReader]::new($stream.GetInputStreamAt(0))
  [void](Await-Result ($reader.LoadAsync([uint32]$stream.Size)) ([uint32]))
  $bytes=New-Object byte[] ([int]$stream.Size)
  $reader.ReadBytes($bytes)
  $imagePath=Join-Path $previewDir ('page-{0:00}.png' -f $pageNumber)
  [IO.File]::WriteAllBytes($imagePath,$bytes)
  $memory=[IO.MemoryStream]::new($bytes)
  $image=[Drawing.Image]::FromStream($memory)
  $x=($index%4)*360;$y=[math]::Floor($index/4)*1020
  $graphics.DrawString("Pagina $pageNumber",$font,[Drawing.Brushes]::Black,$x+10,$y+8)
  $graphics.DrawImage($image,$x+5,$y+32,350,495)
  $image.Dispose();$memory.Dispose();$reader.Dispose();$stream.Dispose();$page.Dispose()
  $index++
}
$sheet=Join-Path $previewDir 'contact-sheet.png'
$canvas.Save($sheet,[Drawing.Imaging.ImageFormat]::Png)
$font.Dispose();$graphics.Dispose();$canvas.Dispose()
"PDF_PAGES=$($pdf.PageCount)"
"CONTACT_SHEET=$sheet"
