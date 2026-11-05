param(
    [Parameter(Mandatory = $true)]
    [string]$AppPath,
    [string]$Url = 'http://localhost:55003'
)

$ErrorActionPreference = 'Stop'
$appRoot = (Resolve-Path -LiteralPath $AppPath).Path
$expectedMain = 'main.77b94be0bb15722b.js'
$expectedRuntime = 'runtime.d861651bb8d5bbbe.js'

function Get-ScriptNames([string]$Html) {
    @([regex]::Matches($Html, '<script[^>]*src="([^"]+)"') | ForEach-Object {
        $_.Groups[1].Value
    })
}

Write-Output "Aplicacion revisada: $appRoot"
Write-Output "Servidor consultado: $Url"
Write-Output "Compilacion esperada: $expectedRuntime / $expectedMain"

$configuredPath = $null
$envFile = Join-Path $appRoot '.env'
if (Test-Path -LiteralPath $envFile) {
    $pathLine = Get-Content -LiteralPath $envFile | Where-Object {
        $_ -match '^\s*FRONTEND_DIST_PATH\s*='
    } | Select-Object -Last 1
    if ($pathLine) {
        $configuredPath = ($pathLine -replace '^\s*FRONTEND_DIST_PATH\s*=\s*', '').Trim().Trim('"').Trim("'")
    }
}
Write-Output "FRONTEND_DIST_PATH en .env: $configuredPath"
Write-Output 'Las variables del proceso o del servicio pueden prevalecer sobre .env.'

$candidates = @(
    (Join-Path $appRoot 'public'),
    (Join-Path $appRoot 'public/public'),
    (Join-Path $appRoot 'public/paco_admin'),
    (Join-Path $appRoot 'public/dist/paco_admin')
)
if ($configuredPath) {
    if ([IO.Path]::IsPathRooted($configuredPath)) { $candidates += $configuredPath }
    else { $candidates += Join-Path $appRoot $configuredPath }
}
foreach ($folder in ($candidates | Select-Object -Unique)) {
    $indexPath = Join-Path $folder 'index.html'
    if (Test-Path -LiteralPath $indexPath) {
        $scripts = Get-ScriptNames (Get-Content -LiteralPath $indexPath -Raw)
        [pscustomobject]@{
            Archivo = $indexPath
            CompilacionCorrecta = ($scripts -contains $expectedMain) -and ($scripts -contains $expectedRuntime)
            Scripts = $scripts -join ', '
        } | Format-List | Out-String | Write-Output
    }
}

try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri ($Url.TrimEnd('/') + '/ticket/aprobar') -Headers @{ 'Cache-Control' = 'no-cache' } -TimeoutSec 15
    $scripts = Get-ScriptNames $response.Content
    [pscustomobject]@{
        PublicacionCorrecta = ($scripts -contains $expectedMain) -and ($scripts -contains $expectedRuntime)
        ScriptsPublicados = $scripts -join ', '
    } | Format-List | Out-String | Write-Output
} catch {
    Write-Output "No fue posible consultar $Url : $($_.Exception.Message)"
}

try {
    $port = ([uri]$Url).Port
    $listeners = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction Stop
    foreach ($processId in ($listeners.OwningProcess | Select-Object -Unique)) {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId=$processId"
        [pscustomobject]@{
            Puerto = $port
            PID = $processId
            Ejecutable = $process.ExecutablePath
            ProcesoPadre = $process.ParentProcessId
        } | Format-List | Out-String | Write-Output
    }
} catch {
    Write-Output 'No se pudo identificar el proceso local del puerto. Revisar en el servidor que hospeda la aplicacion.'
}

Write-Output 'Este diagnostico solo lee archivos, consulta HTTP e identifica procesos. No cambia configuraciones ni reinicia servicios.'
