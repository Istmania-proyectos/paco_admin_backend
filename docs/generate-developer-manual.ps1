param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot 'manual-paco-admin')
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $OutputDirectory)) {
  New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
}

$docxPath = Join-Path $OutputDirectory 'Manual tecnico para desarrolladores - PACO Admin.docx'
$pdfPath = Join-Path $OutputDirectory 'Manual tecnico para desarrolladores - PACO Admin.pdf'
$rtfPath = Join-Path $OutputDirectory 'Manual tecnico para desarrolladores - PACO Admin.rtf'
$flatOpcPath = Join-Path $OutputDirectory 'Manual tecnico para desarrolladores - PACO Admin.xml'
$backendRoot = Split-Path $PSScriptRoot -Parent
$workspaceParent = Split-Path $backendRoot -Parent
$logoPath = Join-Path $workspaceParent 'paco-admin-front\src\assets\img\LOGO-ISTMANIA-2021-1024x225.png'

$wdAlignLeft = 0
$wdAlignCenter = 1
$wdAlignRight = 2
$wdAlignJustify = 3
$wdPageBreak = 7
$wdCollapseEnd = 0
$wdAutoFitWindow = 2
$wdExportFormatPDF = 17
$wdHeaderFooterPrimary = 1
$wdFieldPage = 33

$script:TableNumber = 0
$script:FigureNumber = 0
$script:word = $null
$script:doc = $null
$script:sel = $null

function Set-SelectionStyle([string]$StyleName) {
  try { $script:sel.Style = $script:doc.Styles.Item($StyleName) } catch { $script:sel.Style = $script:doc.Styles.Item('Normal') }
}

function Add-Paragraph {
  param(
    [string]$Text,
    [string]$Style = 'Normal',
    [int]$Alignment = $wdAlignJustify,
    [switch]$Bold,
    [switch]$Italic
  )
  Set-SelectionStyle $Style
  $script:sel.ParagraphFormat.Alignment = $Alignment
  $script:sel.Font.Bold = [int]$Bold.IsPresent
  $script:sel.Font.Italic = [int]$Italic.IsPresent
  $script:sel.TypeText($Text)
  $script:sel.TypeParagraph()
  $script:sel.Font.Bold = 0
  $script:sel.Font.Italic = 0
}

function Add-Heading([string]$Text, [int]$Level = 1) {
  Add-Paragraph -Text $Text -Style "Título $Level" -Alignment $wdAlignLeft
}

function Add-Bullets([string[]]$Items) {
  foreach ($item in $Items) {
    Set-SelectionStyle 'Normal'
    $script:sel.Range.ListFormat.ApplyBulletDefault()
    $script:sel.TypeText($item)
    $script:sel.TypeParagraph()
    $script:sel.Range.ListFormat.RemoveNumbers()
  }
}

function Add-Numbered([string[]]$Items) {
  foreach ($item in $Items) {
    Set-SelectionStyle 'Normal'
    $script:sel.Range.ListFormat.ApplyNumberDefault()
    $script:sel.TypeText($item)
    $script:sel.TypeParagraph()
    $script:sel.Range.ListFormat.RemoveNumbers()
  }
}

function Add-Code([string[]]$Lines) {
  foreach ($line in $Lines) {
    Set-SelectionStyle 'Normal'
    $script:sel.Font.Name = 'Consolas'
    $script:sel.Font.Size = 9
    $script:sel.ParagraphFormat.LineSpacingRule = 0
    $script:sel.ParagraphFormat.LeftIndent = 18
    $script:sel.ParagraphFormat.RightIndent = 18
    $script:sel.ParagraphFormat.SpaceAfter = 0
    $script:sel.ParagraphFormat.Shading.BackgroundPatternColor = 15921906
    $script:sel.TypeText($line)
    $script:sel.TypeParagraph()
  }
  $script:sel.Font.Name = 'Arial'
  $script:sel.Font.Size = 11
  $script:sel.ParagraphFormat.LeftIndent = 0
  $script:sel.ParagraphFormat.RightIndent = 0
  $script:sel.ParagraphFormat.LineSpacingRule = 2
  $script:sel.ParagraphFormat.Shading.BackgroundPatternColor = 16777215
}

function Add-Note([string]$Title, [string]$Text, [int]$Color = 15132390) {
  $table = $script:doc.Tables.Add($script:sel.Range, 1, 1)
  $table.AllowAutoFit = $true
  $table.AutoFitBehavior($wdAutoFitWindow)
  $cell = $table.Cell(1,1)
  $cell.Shading.BackgroundPatternColor = $Color
  $cell.Range.Text = "$Title`r$Text"
  $cell.Range.Font.Name = 'Arial'
  $cell.Range.Font.Size = 10
  $cell.Range.ParagraphFormat.LineSpacingRule = 0
  $cell.Range.Paragraphs.Item(1).Range.Font.Bold = 1
  $script:sel.SetRange($table.Range.End, $table.Range.End)
  $script:sel.TypeParagraph()
}

function Add-Caption([string]$Kind, [string]$Title) {
  if ($Kind -eq 'Tabla') { $script:TableNumber++; $n = $script:TableNumber } else { $script:FigureNumber++; $n = $script:FigureNumber }
  Set-SelectionStyle 'Normal'
  $script:sel.ParagraphFormat.Alignment = $wdAlignLeft
  $script:sel.Font.Bold = 1
  $script:sel.Font.Italic = 0
  $script:sel.TypeText("$Kind $n")
  $script:sel.TypeParagraph()
  $script:sel.Font.Bold = 0
  $script:sel.Font.Italic = 1
  $script:sel.TypeText($Title)
  $script:sel.TypeParagraph()
  $script:sel.Font.Italic = 0
}

function Add-Table {
  param([string]$Title, [string[]]$Headers, [object[][]]$Rows, [double[]]$Widths = @())
  Add-Caption 'Tabla' $Title
  $table = $script:doc.Tables.Add($script:sel.Range, $Rows.Count + 1, $Headers.Count)
  $table.Borders.Enable = 1
  $table.Range.Font.Name = 'Arial'
  $table.Range.Font.Size = 9
  $table.Range.ParagraphFormat.LineSpacingRule = 0
  $table.Range.ParagraphFormat.SpaceAfter = 0
  for ($c=1; $c -le $Headers.Count; $c++) {
    $table.Cell(1,$c).Range.Text = [string]$Headers[$c-1]
    $table.Cell(1,$c).Range.Font.Bold = 1
    $table.Cell(1,$c).Range.Font.Color = 16777215
    $table.Cell(1,$c).Shading.BackgroundPatternColor = 9974124
  }
  for ($r=0; $r -lt $Rows.Count; $r++) {
    for ($c=0; $c -lt $Headers.Count; $c++) {
      $table.Cell($r+2,$c+1).Range.Text = [string]$Rows[$r][$c]
      if (($r % 2) -eq 1) { $table.Cell($r+2,$c+1).Shading.BackgroundPatternColor = 15921906 }
    }
  }
  $table.Rows.Item(1).HeadingFormat = -1
  $table.AutoFitBehavior($wdAutoFitWindow)
  if ($Widths.Count -eq $Headers.Count) {
    for ($c=1; $c -le $Headers.Count; $c++) { $table.Columns.Item($c).PreferredWidth = $Widths[$c-1] }
  }
  $script:sel.SetRange($table.Range.End, $table.Range.End)
  $script:sel.TypeParagraph()
}

function Add-FlowDiagram([string]$Title, [string[]]$Nodes, [string]$Note = '') {
  Add-Caption 'Figura' $Title
  $columns = ($Nodes.Count * 2) - 1
  $table = $script:doc.Tables.Add($script:sel.Range, 1, $columns)
  $table.Borders.Enable = 0
  $table.Range.Font.Name = 'Arial'
  $table.Range.Font.Size = 9
  $table.Range.ParagraphFormat.LineSpacingRule = 0
  for ($i=0; $i -lt $Nodes.Count; $i++) {
    $col = ($i * 2) + 1
    $cell = $table.Cell(1,$col)
    $cell.Range.Text = $Nodes[$i]
    $cell.Range.Font.Bold = 1
    $cell.Range.ParagraphFormat.Alignment = $wdAlignCenter
    $cell.VerticalAlignment = 1
    $nodeColor = if (($i % 2) -eq 0) { 15128749 } else { 14277081 }
    $cell.Shading.BackgroundPatternColor = $nodeColor
    if ($i -lt ($Nodes.Count - 1)) {
      $arrow = $table.Cell(1,$col+1)
      $arrow.Range.Text = '→'
      $arrow.Range.Font.Size = 18
      $arrow.Range.Font.Bold = 1
      $arrow.Range.ParagraphFormat.Alignment = $wdAlignCenter
      $arrow.VerticalAlignment = 1
    }
  }
  $table.Rows.Height = 48
  $table.AutoFitBehavior($wdAutoFitWindow)
  $script:sel.SetRange($table.Range.End, $table.Range.End)
  $script:sel.TypeParagraph()
  if ($Note) { Add-Paragraph -Text "Nota. $Note" -Style 'Normal' -Alignment $wdAlignLeft -Italic }
}

function Add-PageBreak { $script:sel.InsertBreak($wdPageBreak) }

try {
  $script:word = New-Object -ComObject Word.Application
  $script:word.Visible = $false
  $script:word.DisplayAlerts = 0
  $script:word.Options.CheckGrammarAsYouType = $false
  $script:word.Options.CheckSpellingAsYouType = $false
  $script:doc = $script:word.Documents.Add()
  $script:sel = $script:word.Selection

  $section = $script:doc.Sections.Item(1)
  $section.PageSetup.TopMargin = 72
  $section.PageSetup.BottomMargin = 72
  $section.PageSetup.LeftMargin = 72
  $section.PageSetup.RightMargin = 72
  $section.PageSetup.DifferentFirstPageHeaderFooter = -1

  $normal = $script:doc.Styles.Item('Normal')
  $normal.Font.Name = 'Arial'; $normal.Font.Size = 11
  $normal.ParagraphFormat.LineSpacingRule = 2
  $normal.ParagraphFormat.SpaceAfter = 0
  $normal.ParagraphFormat.WidowControl = -1

  foreach ($level in 1..3) {
    $style = $script:doc.Styles.Item("Título $level")
    $style.Font.Name = 'Arial'; $style.Font.Bold = 1
    $headingSize = if ($level -eq 1) { 14 } elseif ($level -eq 2) { 12 } else { 11 }
    $headingColor = if ($level -eq 1) { 7354954 } else { 0 }
    $style.Font.Size = $headingSize
    $style.Font.Color = $headingColor
    $style.ParagraphFormat.SpaceBefore = 12
    $style.ParagraphFormat.SpaceAfter = 6
    $style.ParagraphFormat.KeepWithNext = -1
  }
  $script:doc.Styles.Item('Título').Font.Name = 'Arial'
  $script:doc.Styles.Item('Título').Font.Size = 24
  $script:doc.Styles.Item('Subtítulo').Font.Name = 'Arial'
  $script:doc.Styles.Item('Subtítulo').Font.Size = 15

  $header = $section.Headers.Item($wdHeaderFooterPrimary).Range
  $header.Text = 'PACO ADMIN — MANUAL TÉCNICO'
  $header.Font.Name = 'Arial'; $header.Font.Size = 8
  $header.ParagraphFormat.Alignment = $wdAlignLeft
  $section.Headers.Item($wdHeaderFooterPrimary).PageNumbers.Add($wdAlignRight, $true) | Out-Null

  # Portada
  $script:sel.ParagraphFormat.SpaceBefore = 36
  if (Test-Path -LiteralPath $logoPath) {
    $script:sel.ParagraphFormat.Alignment = $wdAlignCenter
    $pic = $script:sel.InlineShapes.AddPicture($logoPath)
    $pic.LockAspectRatio = -1
    $pic.Width = 260
    $script:sel.TypeParagraph(); $script:sel.TypeParagraph()
  }
  Add-Paragraph -Text 'MANUAL TÉCNICO PARA DESARROLLADORES' -Style 'Título' -Alignment $wdAlignCenter
  Add-Paragraph -Text 'Sistema PACO Admin' -Style 'Subtítulo' -Alignment $wdAlignCenter
  Add-Paragraph -Text 'Frontend 1.1.1 | Backend 1.0.0' -Alignment $wdAlignCenter -Bold
  Add-Paragraph -Text 'Versión documental 1.0' -Alignment $wdAlignCenter
  Add-Paragraph -Text 'Fecha de elaboración: 1 de octubre de 2026' -Alignment $wdAlignCenter
  Add-Paragraph -Text 'Equipo de desarrollo PACO Admin' -Alignment $wdAlignCenter
  Add-Paragraph -Text 'Documento elaborado a partir de la revisión directa de los repositorios frontend y backend.' -Alignment $wdAlignCenter -Italic
  Add-PageBreak

  Add-Heading 'CONTROL DEL DOCUMENTO' 1
  Add-Table 'Historial de revisiones' @('Versión','Fecha','Descripción','Responsable') @(
    @('1.0','01/10/2026','Emisión inicial. Arquitectura conjunta, API, seguridad, despliegue y delimitación de pagos-s4hana.','Equipo de desarrollo')
  )
  Add-Table 'Identificación y alcance documental' @('Elemento','Detalle') @(
    @('Backend','paco_admin_backend; rama main; paquete 1.0.0.'),
    @('Frontend','paco-admin-front; rama main; paquete 1.1.1.'),
    @('Base de datos','Microsoft SQL Server; esquema heredado y procedimientos almacenados; synchronize=false.'),
    @('Estado del release','Incluye todos los módulos confirmados en HEAD. Excluye pagos-s4hana, presente únicamente como trabajo local en desarrollo.'),
    @('Referencia editorial','Manual técnico para desarrolladores - GeoTracker.docx; se reutilizó su organización, no sus instrucciones ni su contenido técnico.')
  )
  Add-Note 'ADVERTENCIA DE ALCANCE' 'El módulo pagos-s4hana NO forma parte del release documentado. Sus archivos, rutas, conexión secundaria y cambios de navegación se describen solo en un anexo de desarrollo y no deben desplegarse con esta versión.' 13421823
  Add-PageBreak

  Add-Heading 'ÍNDICE GENERAL' 1
  Add-Bullets @(
    '1. Introducción', '2. Visión general de la solución', '3. Tecnologías y dependencias',
    '4. Estructura de los proyectos', '5. Preparación del entorno', '6. Configuración',
    '7. Arquitectura del frontend', '8. Arquitectura del backend', '9. Acceso a datos y procedimientos',
    '10. Autenticación y seguridad', '11. Referencia de la API', '12. Flujos técnicos principales',
    '13. Funcionalidad en desarrollo: pagos-s4hana', '14. Pruebas y calidad',
    '15. Compilación y despliegue', '16. Diagnóstico y soporte', '17. Mantenimiento y contribución',
    '18. Limitaciones y hoja de ruta', '19. Glosario', '20. Referencias',
    'Apéndice A. Comandos rápidos', 'Apéndice B. Lista de verificación del release',
    'Apéndice C. Matriz resumida de compatibilidad', 'Apéndice D. Trazabilidad de pagos-s4hana'
  )
  Add-Heading 'ÍNDICE DE TABLAS' 1
  Add-Paragraph 'La relación de tablas se actualiza junto con el índice general al abrir el documento en Microsoft Word (Ctrl+A, F9).' -Alignment $wdAlignLeft
  Add-Bullets @(
    'Tabla 1. Historial de revisiones.', 'Tabla 2. Identificación y alcance documental.', 'Tabla 3. Repositorios y responsabilidades.',
    'Tabla 4. Tecnologías principales.', 'Tabla 5. Módulos funcionales liberados.', 'Tabla 6. Estructura del backend.',
    'Tabla 7. Estructura del frontend.', 'Tabla 8. Variables de entorno del backend.', 'Tabla 9. Rutas principales del frontend.',
    'Tabla 10. Controles de autenticación y autorización.', 'Tabla 11. Inventario resumido de API.', 'Tabla 12. Procedimientos y acceso a datos.',
    'Tabla 13. Estrategia de pruebas.', 'Tabla 14. Diagnóstico de incidentes.', 'Tabla 15. Glosario.', 'Tabla 16. Matriz de compatibilidad.'
  )
  Add-Heading 'ÍNDICE DE FIGURAS' 1
  Add-Bullets @(
    'Figura 1. Arquitectura lógica de PACO Admin.', 'Figura 2. Flujo de autenticación y consumo protegido.',
    'Figura 3. Flujo técnico de tickets.', 'Figura 4. Flujo de compilación y publicación.'
  )
  Add-PageBreak

  Add-Heading '1. INTRODUCCIÓN' 1
  Add-Heading '1.1 Objetivo' 2
  Add-Paragraph 'Este manual permite instalar, comprender, modificar, probar y desplegar PACO Admin sin depender del conocimiento tácito del equipo. Describe el contrato entre la aplicación Angular y la API NestJS, el acceso a SQL Server, los mecanismos de autenticación y los flujos de negocio observados en el código.'
  Add-Heading '1.2 Audiencia' 2
  Add-Paragraph 'Está dirigido a desarrolladores frontend y backend, responsables de base de datos, personal de aseguramiento de calidad y operadores que publiquen la solución. Se presupone conocimiento práctico de TypeScript, Angular, NestJS, HTTP y SQL Server.'
  Add-Heading '1.3 Alcance' 2
  Add-Paragraph 'La línea base funcional comprende autenticación, administración de usuarios, solicitudes PACO, liberación de pedidos, salida de marcas, ficha de cliente, punteo geográfico, tickets, tickets de vencimiento, catálogos maestros, notificaciones y aprobación de libro de ruta. La SPA puede publicarse por separado o ser servida por NestJS desde public/.'
  Add-Heading '1.4 Fuera de alcance' 2
  Add-Bullets @('Operación de infraestructura productiva no representada en los repositorios.', 'Contenido o credenciales reales de archivos .env.', 'Ejecución o migración automática de scripts SQL.', 'La funcionalidad pagos-s4hana, todavía en desarrollo y fuera del release.')
  Add-Heading '1.5 Convenciones' 2
  Add-Paragraph 'Las rutas de archivos se expresan desde la raíz de cada repositorio. Los ejemplos de secretos usan marcadores. Las rutas HTTP conservan mayúsculas y minúsculas tal como aparecen en los controladores. “Release” significa el contenido confirmado en HEAD de la rama main al 1 de octubre de 2026.'

  Add-Heading '2. VISIÓN GENERAL DE LA SOLUCIÓN' 1
  Add-Paragraph 'PACO Admin es una plataforma administrativa web que conserva contratos de un backend ASP.NET anterior y los implementa en NestJS. El frontend Angular consume una API HTTP; el backend valida JWT, ejecuta consultas y procedimientos sobre SQL Server, envía notificaciones SMTP y expone enlaces públicos con token para determinadas aprobaciones y respuestas.'
  Add-Table 'Repositorios y responsabilidades' @('Repositorio','Responsabilidad','Artefacto') @(
    @('paco-admin-front','SPA Angular, navegación, formularios, tablas, exportaciones y estado de sesión.','dist/paco_admin'),
    @('paco_admin_backend','API NestJS, reglas de aplicación, acceso SQL, correo, Swagger y publicación opcional de la SPA.','dist/main.js'),
    @('sql/ dentro del backend','DDL, procedimientos, seeds y scripts de evolución revisados manualmente.','Scripts .sql; no se ejecutan al iniciar')
  )
  Add-FlowDiagram 'Arquitectura lógica de PACO Admin' @('Navegador`nAngular SPA','API NestJS`n/api + Swagger','Servicios de negocio`nGuardas y validación','SQL Server`nIdentity + PACO') 'NestJS también integra SMTP para notificaciones y puede servir el build Angular desde public/. Los enlaces públicos de tickets y libro de ruta regresan a rutas específicas de la SPA.'
  Add-Heading '2.1 Principios de la arquitectura' 2
  Add-Bullets @('Separación por módulos de negocio en frontend y backend.', 'Compatibilidad con tablas de ASP.NET Identity y hashes de contraseña v2/v3.', 'TypeORM utilizado como conexión y mapeo; synchronize permanece desactivado.', 'Validación global de DTO con whitelist y transform en NestJS.', 'Carga diferida de módulos Angular para las áreas funcionales.', 'Configuración por variables de entorno y tokens de inyección; no incrustar secretos.')
  Add-Heading '2.2 Estado verificado' 2
  Add-Paragraph 'El 1 de octubre de 2026 se compiló el backend y se ejecutaron 25 pruebas Jest con resultado exitoso. El frontend generó un build de producción de 2.20 MB iniciales y ejecutó 55 pruebas Karma/Jasmine con resultado exitoso. La máquina de verificación tenía Node 24.0.0, aunque el frontend declara y debe operarse con Node 20.19.x y npm 10.x.'
  Add-Note 'Lectura correcta de la verificación' 'La compilación local incluyó archivos no confirmados de pagos-s4hana porque estaban presentes en el árbol de trabajo. Esto demuestra que el código actual compila, pero no autoriza su liberación. Para crear el release se debe partir de un checkout limpio del commit aprobado.' 14277081

  Add-Heading '3. TECNOLOGÍAS Y DEPENDENCIAS' 1
  Add-Table 'Tecnologías principales' @('Capa','Tecnología','Versión observada','Uso') @(
    @('Frontend','Angular / CLI','21.2.x','SPA basada en NgModule y lazy loading.'),
    @('Frontend','TypeScript','5.9.x','Tipado estricto y compilación.'),
    @('Frontend','Material, PrimeNG, Bootstrap, Tailwind','21.2 / 21.1 / 5.2 / 3.3','Componentes, estilos y diseño.'),
    @('Frontend','RxJS / Zone.js','7.8 / 0.15','Flujos asíncronos y detección de cambios.'),
    @('Backend','NestJS','10.x','API modular sobre Express.'),
    @('Backend','TypeORM / mssql','0.3 / 10.x','Conexión a SQL Server y consultas.'),
    @('Backend','Passport JWT','4.x','Autenticación Bearer.'),
    @('Pruebas','Jest / Jasmine-Karma','29 / 4-6','Pruebas backend y frontend.'),
    @('Runtime','Node.js','20.19.x recomendado','Rango declarado por el frontend.')
  )
  Add-Heading '3.1 Dependencias que requieren atención' 2
  Add-Paragraph 'El frontend combina cuatro sistemas visuales. Antes de retirar Bootstrap, jQuery, PrimeNG, Material o Tailwind deben revisarse las plantillas y estilos globales. El build reporta dependencias CommonJS transitivas de jsPDF/canvg/html2canvas; son advertencias de optimización, no fallos. Los budgets de angular.json deben vigilarse porque el bundle inicial supera el umbral de advertencia configurado.'

  Add-Heading '4. ESTRUCTURA DE LOS PROYECTOS' 1
  Add-Table 'Módulos funcionales liberados' @('Área','Frontend','Backend','Estado') @(
    @('Acceso y usuarios','login, home/usuarios','auth, accounts, dashboard','Liberado'),
    @('Solicitudes PACO','home y servicios compartidos','paco','Liberado'),
    @('Liberación de pedidos','liberacion','paco / procedimientos heredados','Liberado'),
    @('Salida de marcas','salida-marcas','paco','Liberado'),
    @('Ficha de cliente','solicitudes-ficha-cliente','paco','Liberado'),
    @('Ubicación de clientes','punteo','punteo','Liberado'),
    @('Tickets','tickets, ticket-response, ticket-approval','tickets, mail, notificaciones','Liberado'),
    @('Tickets de vencimiento','tickets-vencimiento','tickets-vencimiento','Liberado'),
    @('Catálogos','master-data','master-data','Liberado'),
    @('Libro de ruta','libro-ruta-approval','libro-ruta','Liberado'),
    @('Pagos S/4HANA','pagos-s4hana','pagos-s4hana + conexión secundaria','NO LIBERADO')
  )
  Add-Table 'Estructura del backend' @('Ruta','Contenido') @(
    @('src/main.ts','Bootstrap, límites de cuerpo, CORS, ValidationPipe, Swagger, logs HTTP y publicación estática.'),
    @('src/app.module.ts','Composición de módulos globales y funcionales.'),
    @('src/modules/auth','Login, JWT, compatibilidad de hashes y guardas por rol.'),
    @('src/modules/database','TypeORM, entidades heredadas y servicio de consultas.'),
    @('src/modules/*','Controladores, servicios y DTO por dominio.'),
    @('sql/','Scripts de esquema, procedimientos, seeds y pruebas manuales.'),
    @('docs/','Notas de automatización y configuración de IIS.'),
    @('public/','Build Angular opcional servido por la API.')
  )
  Add-Table 'Estructura del frontend' @('Ruta','Contenido') @(
    @('src/app/app.module.ts','Módulo raíz, providers, HTTP, interceptor, Toastr y PrimeNG.'),
    @('src/app/app-routing.module.ts','Rutas raíz y módulos lazy.'),
    @('src/app/core/config','Contrato tipado API_CONFIG.'),
    @('src/app/auth','AuthGuard e interceptor Bearer.'),
    @('src/app/modules','Áreas funcionales, componentes, servicios e interfaces.'),
    @('src/app/shared','Material compartido, modelos y utilidades de roles.'),
    @('src/environments','URLs base por configuración de compilación.'),
    @('src/assets/data/menu.json','Definición del menú lateral.')
  )

  Add-Heading '5. PREPARACIÓN DEL ENTORNO' 1
  Add-Heading '5.1 Requisitos' 2
  Add-Bullets @('Windows, Linux o macOS con acceso a los repositorios.', 'Node.js 20.19.x y npm 10.x para el frontend; pnpm 10.18.0 para el backend.', 'Acceso de red a SQL Server y credenciales de una base no productiva.', 'Chrome o Chromium para pruebas Karma.', 'SMTP accesible para validar notificaciones, cuando corresponda.', 'Microsoft Word 2016 o posterior para actualizar índices del documento.')
  Add-Heading '5.2 Backend' 2
  Add-Code @('cd paco_admin_backend','Copy-Item .env.example .env','# Completar valores locales sin confirmar el archivo','pnpm install --frozen-lockfile','pnpm run start:dev','# Swagger: http://localhost:55003/swagger')
  Add-Heading '5.3 Frontend' 2
  Add-Code @('cd paco-admin-front','nvm use 20.19.0','npm ci --ignore-scripts','npm run start','# Aplicación: http://localhost:4200')
  Add-Heading '5.4 Reglas locales' 2
  Add-Bullets @('No compartir ni registrar .env, tokens, claves SMTP o contraseñas.', 'No usar una base productiva para pruebas de escritura o automatizaciones.', 'Mantener apiBaseUrl con barra final; los servicios actuales concatenan rutas.', 'Cuando el frontend y backend usan orígenes distintos, definir CORS_ORIGIN de forma explícita.')

  Add-Heading '6. CONFIGURACIÓN' 1
  Add-Table 'Variables de entorno del backend' @('Grupo','Variables','Finalidad') @(
    @('Servidor','PORT, HOST, CORS_ORIGIN, REQUEST_BODY_LIMIT, FRONTEND_DIST_PATH','Escucha HTTP, CORS, tamaño de solicitudes y SPA estática.'),
    @('SQL Server','DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_ENCRYPT, DB_TRUST_SERVER_CERTIFICATE, DB_POOL_MAX','Conexión principal; nunca documentar valores reales.'),
    @('JWT','JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE, JWT_EXPIRES_IN_SECONDS','Firma y validación compatible con el sistema heredado.'),
    @('Correo','EMAIL_FROM, EMAIL_SMTP_HOST, EMAIL_SMTP_PORT, EMAIL_SMTP_USER, EMAIL_SMTP_PASSWORD, EMAIL_SMTP_TIMEOUT_MS','Notificaciones SMTP.'),
    @('Tickets','TICKETS_*','Enlaces públicos, expiración, automatización, recordatorios y redirección segura.'),
    @('Integraciones','PACO_ROUTE_DATABASE, PACO_MOBILE_INTEGRATION_KEY, LIBRO_RUTA_*','Base de rutas, autenticación móvil y aprobación de libro de ruta.'),
    @('Solo desarrollo no liberado','PACO_S4HANA_DB_NAME','Base secundaria para pagos-s4hana; excluir del release.')
  )
  Add-Heading '6.1 Configuración frontend' 2
  Add-Paragraph 'environment.ts y environment.prod.ts proporcionan apiBaseUrl y pacoApiUrl al token API_CONFIG. apiBaseUrl apunta a la raíz del servidor; pacoApiUrl apunta al prefijo api/Paco/. Los hosts son datos de despliegue y deben configurarse por ambiente, no repetirse dentro de servicios.'
  Add-Code @("export const environment = {","  production: false,","  apiBaseUrl: 'https://servidor-ejemplo/',","  pacoApiUrl: 'https://servidor-ejemplo/api/Paco/'","};")
  Add-Heading '6.2 Configuración segura' 2
  Add-Paragraph 'Use .env.example como catálogo de nombres, mantenga .env fuera del control de versiones y almacene secretos en el mecanismo aprobado por infraestructura. JWT_SECRET debe coincidir con el emisor que deba conservar compatibilidad. DB_ENCRYPT y DB_TRUST_SERVER_CERTIFICATE se fijan según el certificado del entorno; no debilitar TLS como solución permanente.'

  Add-Heading '7. ARQUITECTURA DEL FRONTEND' 1
  Add-Heading '7.1 Arranque y composición' 2
  Add-Paragraph 'main.ts arranca AppModule con detección de cambios basada en Zone.js. AppModule registra HttpClient, animaciones, Toastr, el interceptor de autenticación y el preset Lara de PrimeNG. AppComponent contiene el router-outlet. SharedModule centraliza módulos de formularios y Angular Material.'
  Add-Table 'Rutas principales del frontend' @('Ruta','Módulo/función','Protección') @(
    @('/login','Inicio de sesión, recuperación y 403','Pública'),
    @('/home','Layout y módulos administrativos','AuthGuard: USER o VIEW según sesión'),
    @('/home/usuarios','Gestión de cuentas','SUPERUSUARIO'),
    @('/home/tickets','Bandeja, detalle, importación y correos','Sesión; reglas adicionales en API'),
    @('/home/catalogos','Vendedores y supervisores/gerentes','Sesión y roles de datos maestros'),
    @('/home/liberacion','Liberación de pedidos','Sesión'),
    @('/home/ficha-solicitudes','Ficha de cliente','Sesión'),
    @('/home/salidas-marcas','Salida de marcas','Sesión'),
    @('/punteo','Pendientes, ubicación e histórico','Ruta raíz sin guard explícito; API según contrato'),
    @('/ticket/responder, /ticket/aprobar, /libro-ruta/aprobar','Enlaces públicos con token','Token de un solo uso o temporal'),
    @('/home/pagos-s4hana','Pantalla administrativa','NO LIBERADA')
  )
  Add-Heading '7.2 Sesión e interceptor' 2
  Add-Paragraph 'El login conserva el bearer token en localStorage bajo userToken, junto con userRoles, userId, userName y timeToken. AuthInterceptor agrega Authorization salvo que la solicitud incluya No-Auth: True. Ante 401 limpia la sesión; ante 401/403 redirige al flujo correspondiente. No registrar estos valores en consola, pruebas o telemetría.'
  Add-Heading '7.3 Estado y manejo de errores' 2
  Add-Paragraph 'La aplicación usa servicios con Observables RxJS y estado local de componentes; no existe un store global. Los errores se comunican mediante Toastr o SweetAlert2. Las operaciones que cambian datos deben evitar suscripciones duplicadas, deshabilitar temporalmente controles y refrescar el listado únicamente después de una respuesta exitosa.'

  Add-Heading '8. ARQUITECTURA DEL BACKEND' 1
  Add-Heading '8.1 Canal HTTP' 2
  Add-Paragraph 'main.ts crea NestExpressApplication, desactiva ETag, registra un log por solicitud, admite cuerpos JSON y urlencoded con límite configurable, aplica ValidationPipe global, habilita CORS y marca /api como no almacenable. Swagger se publica en /swagger. Si existe index.html dentro de FRONTEND_DIST_PATH, las rutas HTML no API se redirigen a la SPA.'
  Add-Heading '8.2 Capas' 2
  Add-Bullets @('Controller: contrato HTTP, decoradores, parámetros, guardas y códigos.', 'DTO: transformación y validación de entrada.', 'Service: reglas, transacciones, selección de destinatarios y adaptación del contrato heredado.', 'DatabaseService/TypeORM: consultas parametrizadas, procedimientos y entidades Identity.', 'Mailer/Notificaciones: envío SMTP y registro del resultado.')
  Add-Heading '8.3 Validación y errores' 2
  Add-Paragraph 'ValidationPipe elimina propiedades no declaradas, transforma tipos y detiene la validación en el primer error. Los servicios lanzan excepciones HTTP de NestJS. Los procedimientos también aplican reglas transaccionales; una validación de interfaz nunca reemplaza una restricción del backend o la base.'

  Add-Heading '9. ACCESO A DATOS Y PROCEDIMIENTOS' 1
  Add-Table 'Procedimientos y acceso a datos' @('Dominio','Objetos destacados','Notas') @(
    @('PACO','PACO_GET_PEDIDOS, PACO_INSERT_PEDIDOS, PACO_CORREO','Parámetros genéricos opcion/param1…param5; conservar contrato.'),
    @('Punteo','PACO_GET_PUNTEO','Consulta pendientes, ubicación, histórico y acciones.'),
    @('Tickets','PACO_GET_TICKET, PACO_INSERT_TICKET','Lecturas por opción y transiciones transaccionales.'),
    @('Automatización','PACO_TICKET_AUTOMATIZAR_CHECKIN, PACO_TICKET_RENOVAR_MENSUAL','Ejecutar primero en simulación y con flags seguros.'),
    @('Producto/aprobación','PACO_TICKET_PRODUCTOS_*, PACO_TICKET_RESPONDER_APROBACION','Flujos por producto y tokens públicos.'),
    @('Vencimiento','PACO_TICKET_VENCIMIENTO_*','Creación, consulta, CheckIn y respuesta de vendedor.'),
    @('Libro de ruta','PACO_LIBRO_RUTA_PROPUESTA*, PACO_LIBRO_RUTA_APROBACION','Invitaciones y aprobación pública.'),
    @('Identidad','AspNetUsers, AspNetRoles y relaciones','Compatibilidad con ASP.NET Identity; entidades sin sincronización.')
  )
  Add-Heading '9.1 Reglas de cambio' 2
  Add-Numbered @('Leer el servicio y el script SQL asociado antes de modificar un contrato.', 'Ejecutar DDL y procedimientos solo mediante revisión y respaldo en el ambiente objetivo.', 'Mantener synchronize=false.', 'Parametrizar todos los valores; no concatenar entrada del usuario en SQL.', 'Verificar transacción, idempotencia y registro de historial para cambios de estado.', 'Agregar prueba de servicio y prueba manual contra una base no productiva.')

  Add-Heading '10. AUTENTICACIÓN Y SEGURIDAD' 1
  Add-FlowDiagram 'Flujo de autenticación y consumo protegido' @('POST /api/auth/Post','Identity + hash ASP.NET','JWT HS256`nid/rol/roles','localStorage + interceptor','JwtStrategy + guardas') 'El token se envía como Bearer. La autorización final reside en el backend; ocultar una opción del menú no constituye un control de seguridad.'
  Add-Table 'Controles de autenticación y autorización' @('Control','Aplicación') @(
    @('ApiUserGuard','Valida JWT y expiración.'),
    @('AdminGuard','Restringe operaciones administrativas.'),
    @('SuperUserGuard','Protege administración de cuentas y roles reservados.'),
    @('MasterDataGuard','Restringe mantenimiento de vendedores y relaciones jerárquicas.'),
    @('TicketWriteGuard','Impide escritura a TICKET_SOLO_LECTURA salvo rol habilitado.'),
    @('TicketSettingsGuard','Protege correos relacionados y vacaciones por rol o responsable configurado.'),
    @('Tokens públicos','Guardan hash, vencen y se consumen dentro de transacciones cuando aplica.')
  )
  Add-Heading '10.1 Recomendaciones prioritarias' 2
  Add-Bullets @('Restringir CORS_ORIGIN en ambientes publicados.', 'Rotar secretos fuera del repositorio y usar HTTPS.', 'No exponer Swagger públicamente sin una decisión de infraestructura.', 'Revisar rutas públicas de Punteo y ResetPasswordAdmin contra la política vigente.', 'Eliminar valores de correo predeterminados en código y exigir configuración explícita.', 'Registrar auditoría sin incluir tokens, contraseñas, cuerpos sensibles o cadenas de conexión.')

  Add-Heading '11. REFERENCIA DE LA API' 1
  Add-Table 'Inventario resumido de API' @('Área','Métodos y rutas representativas','Acceso') @(
    @('Auth','POST /api/auth/Post','Público'),
    @('Accounts','POST /api/accounts/Post; ResetPassword; CRUD /users','Mixto; guardas por operación'),
    @('Dashboard','GET /api/Dashboard/Home','JWT'),
    @('PACO','GET GetPACO; POST PostPACO; GET Correo; marcas sin responsable','JWT'),
    @('Punteo','GET /api/Punteo','Contrato público heredado'),
    @('Tickets','GET/POST /api/Tickets; exportar; transiciones; productos; reenviar','JWT + guardas'),
    @('Tickets públicos','GET/POST respuesta-vendedor; GET/POST aprobacion','Token; existe integración sin token controlada por contrato'),
    @('Automatización','simulaciones GET; ejecuciones POST','JWT; ejecución Admin'),
    @('Vencimiento','GET/POST /api/TicketsVencimiento; aprobación y respuesta','Mixto'),
    @('Maestros','/api/master-data/vendedores y supervisores-gerentes','JWT + MasterDataGuard'),
    @('Libro de ruta','POST invitaciones; GET/POST aprobacion','Invitación protegida; aprobación por token'),
    @('Pagos S/4HANA','/api/pagos-s4hana/*','NO LIBERADO')
  )
  Add-Heading '11.1 Contrato y documentación ejecutable' 2
  Add-Paragraph 'Swagger se genera desde decoradores y DTO en /swagger. Antes de integrar un consumidor, revisar el controlador, el DTO y la respuesta real. Los endpoints heredados pueden devolver arreglos o nombres de propiedad definidos por procedimientos; normalizarlos sin coordinación rompe el frontend.'
  Add-Code @('$headers = @{ Authorization = "Bearer <token>" }','Invoke-RestMethod -Method Get `','  -Uri "http://localhost:55003/api/Dashboard/Home" `','  -Headers $headers')

  Add-Heading '12. FLUJOS TÉCNICOS PRINCIPALES' 1
  Add-Heading '12.1 Solicitudes PACO' 2
  Add-Paragraph 'El frontend construye parámetros de opción y consulta GetPACO. Las aprobaciones y acciones se envían a PostPACO; el backend delega en procedimientos heredados. Liberación, salida de marcas y ficha de cliente comparten este patrón. Cualquier cambio debe probar la combinación exacta de opcion y parámetros.'
  Add-Heading '12.2 Tickets' 2
  Add-FlowDiagram 'Flujo técnico de tickets' @('Crear/importar','Asignar por dependencia','Ejecutar transiciones','Notificar por SMTP','Vendedor cierra o reabre') 'La resolución de destinatarios, el historial, los tokens y los cambios de estado deben permanecer transaccionales. La reapertura está sujeta a reglas temporales implementadas en SQL.'
  Add-Heading '12.3 Automatización y recordatorios' 2
  Add-Paragraph 'La automatización CheckIn agrupa respuestas por dependencia y jefe de marca. Dispone de simulación y ejecución, además de renovación mensual. Los intervalos y flags provienen de TICKETS_*. Mantener dry-run activo durante la validación y revisar resultados SIN_ESTADO o SIN_JEFE_MARCA antes de habilitar escrituras.'
  Add-Heading '12.4 Enlaces públicos' 2
  Add-Paragraph 'Las respuestas de vendedor, aprobaciones de tickets y libro de ruta emplean URLs frontend configurables. El servidor web debe reenviar rutas SPA a index.html. Los tokens no deben aparecer en logs ni analítica; el backend debe distinguir inexistente, consumido, conflicto y vencido.'

  Add-Heading '13. FUNCIONALIDAD EN DESARROLLO: PAGOS-S4HANA' 1
  Add-Note 'NO INCLUIR EN EL RELEASE' 'La funcionalidad pagos-s4hana está presente en el árbol de trabajo local de ambos repositorios, pero no está confirmada en HEAD. No se debe documentar como capacidad disponible para usuarios ni desplegar junto con el release actual.' 13421823
  Add-Heading '13.1 Evidencia técnica observada' 2
  Add-Bullets @('Backend: módulo, controlador, servicio, DTO y conexión secundaria S4HanaDatabaseService sin confirmar.', 'Frontend: módulo lazy, pantalla, servicio, entrada de navegación y ruta /home/pagos-s4hana sin confirmar.', 'Contrato provisional: consultar pagos y facturas; reingresar pedidos/pagos; quitar facturas.', 'Autorización prevista: ApiUserGuard y AdminGuard para acciones de modificación.', 'Configuración provisional: PACO_S4HANA_DB_NAME.')
  Add-Heading '13.2 Criterios antes de liberar' 2
  Add-Numbered @('Aprobar requisitos funcionales y responsables del dato.', 'Revisar permisos SQL de mínimo privilegio y separación de bases.', 'Completar pruebas unitarias, integración y aceptación.', 'Confirmar idempotencia y auditoría de reingresos/quitar factura.', 'Retirar datos de prueba y validar mensajes de error.', 'Actualizar este manual, Swagger, matriz de roles y notas de release.', 'Crear commits revisables en ambos repositorios y desplegar desde una etiqueta aprobada.')

  Add-Heading '14. PRUEBAS Y CALIDAD' 1
  Add-Table 'Estrategia de pruebas' @('Nivel','Comando','Resultado 01/10/2026','Observaciones') @(
    @('Backend build','pnpm run build','Exitoso','Compilación NestJS.'),
    @('Backend unitarias','pnpm test -- --runInBand','25/25 exitosas','Incluyó el árbol local, también pagos-s4hana.'),
    @('Frontend build','npm run build','Exitoso; 2.20 MB inicial','Advertencias CommonJS; revisar budget.'),
    @('Frontend unitarias','npx ng test --watch=false --browsers=ChromeHeadless','55/55 exitosas','ChromeHeadless.'),
    @('Integración SQL','Manual/ambiente controlado','No ejecutada para este documento','Requiere base y red autorizadas.'),
    @('E2E','No existe suite completa','Pendiente','Mantener lista de smoke tests.')
  )
  Add-Heading '14.1 Criterio mínimo de aceptación' 2
  Add-Bullets @('Build limpio de frontend y backend.', 'Todas las pruebas unitarias exitosas.', 'Swagger consistente con controladores y DTO.', 'Smoke test de login/logout, roles, solicitudes, tickets, aprobaciones, catálogos, libro de ruta y punteo.', 'Sin secretos ni artefactos locales en git status.', 'Scripts SQL revisados, repetibles y aplicados primero fuera de producción.', 'Para el release actual, ausencia de pagos-s4hana en el commit y el artefacto.')

  Add-Heading '15. COMPILACIÓN Y DESPLIEGUE' 1
  Add-FlowDiagram 'Flujo de compilación y publicación' @('Checkout limpio`ndel tag aprobado','Build Angular`ndist/paco_admin','Copiar SPA`na public/','Build NestJS`ndist/main.js','Publicar + smoke test') 'También puede desplegarse Angular en un servidor separado; en ese caso configure CORS y fallback de rutas. Verifique siempre que pagos-s4hana no esté presente en el commit del release.'
  Add-Heading '15.1 Build integrado' 2
  Add-Code @('cd paco-admin-front','npm ci --ignore-scripts','npm run build','# Copiar el contenido de dist/paco_admin al directorio public del backend','cd ..\paco_admin_backend','pnpm install --frozen-lockfile','pnpm run build','pnpm run start:prod')
  Add-Heading '15.2 Controles de release' 2
  Add-Code @('git status --short','git ls-files | Select-String "pagos-s4hana|s4hana-database"','# La búsqueda anterior no debe devolver archivos para este release.','git rev-parse HEAD')
  Add-Paragraph 'En IIS, copie el web.config basado en docs/angular-iis-web.config.example y habilite URL Rewrite. Si NestJS sirve la SPA, FRONTEND_DIST_PATH debe contener index.html y assets. No cachear respuestas /api; sí se pueden cachear assets con hash según política de infraestructura.'

  Add-Heading '16. DIAGNÓSTICO Y SOPORTE' 1
  Add-Table 'Diagnóstico de incidentes' @('Síntoma','Comprobaciones','Acción probable') @(
    @('401','Token ausente, expirado, firma/issuer/audience','Reautenticar y alinear JWT_*.'),
    @('403','Roles del token y guardas','Asignar rol correcto; no omitir la guarda.'),
    @('404 al abrir enlace SPA','Fallback index.html / URL Rewrite','Configurar reescritura de rutas.'),
    @('Error SQL','Conectividad, DB_NAME, permisos y procedimiento','Validar con DBA en ambiente no productivo.'),
    @('Correo no enviado','SMTP, TLS, credenciales y registro de notificación','Corregir EMAIL_*; no exponer contraseña.'),
    @('CORS','Origen real y CORS_ORIGIN','Agregar origen explícito.'),
    @('Build Angular grande','Reporte de chunks y dependencias CommonJS','Lazy loading, budgets y actualización controlada.'),
    @('Automatización no crea ticket','Dry-run, estados, dependencia y jefe de marca','Revisar simulación y datos maestros.')
  )
  Add-Heading '16.1 Evidencia segura' 2
  Add-Paragraph 'Adjuntar timestamp, entorno, commit, ruta, método, código HTTP, identificador funcional y extracto sanitizado del log. Nunca adjuntar Authorization, tokens de enlaces, contraseñas, cadenas de conexión, PII completa ni dumps de producción.'

  Add-Heading '17. MANTENIMIENTO Y CONTRIBUCIÓN' 1
  Add-Heading '17.1 Cambio extremo a extremo' 2
  Add-Numbered @('Definir contrato y permisos.', 'Actualizar DTO/controlador/servicio y SQL cuando corresponda.', 'Actualizar interfaz/servicio/componente y rutas Angular.', 'Agregar pruebas en ambas capas.', 'Ejecutar build, pruebas y smoke test.', 'Actualizar Swagger, manual y notas de release.', 'Solicitar revisión de código y base de datos.')
  Add-Heading '17.2 Reglas de revisión' 2
  Add-Bullets @('Cambios pequeños y trazables; no mezclar migraciones de framework con funcionalidad.', 'No usar --force ni --legacy-peer-deps para ocultar incompatibilidades.', 'No cambiar valores de opcion heredados sin prueba contractual.', 'No convertir incidentalmente a standalone, signals o zoneless.', 'Revisar visualmente Material MDC, PrimeNG, tablas, fechas, diálogos y navegación responsiva.', 'Conservar compatibilidad de hashes y JWT mientras existan consumidores heredados.')

  Add-Heading '18. LIMITACIONES Y HOJA DE RUTA' 1
  Add-Bullets @('La mayoría de pruebas frontend son smoke tests de componentes; falta E2E integral.', 'Punteo conserva una ruta raíz sin guarda explícita y un contrato público heredado que debe revisarse.', 'Los procedimientos almacenados concentran reglas no visibles desde TypeScript.', 'El frontend mezcla varias bibliotecas visuales y mantiene deuda de tamaño de bundle.', 'Existen nombres y comentarios con problemas históricos de codificación.', 'La operación productiva, observabilidad centralizada y restauración de base requieren documentación de infraestructura separada.', 'Pagos-s4hana requiere completar su ciclo de seguridad, pruebas y aprobación antes de incorporarse.')

  Add-Heading '19. GLOSARIO' 1
  Add-Table 'Glosario' @('Término','Definición') @(
    @('PACO','Conjunto de solicitudes, aprobaciones y operaciones administrativas del sistema.'),
    @('SPA','Aplicación de página única ejecutada en el navegador.'),
    @('JWT','Token firmado usado para autenticar solicitudes HTTP.'),
    @('Guard','Componente que autoriza o rechaza la ejecución de una ruta.'),
    @('DTO','Objeto que define y valida datos de entrada.'),
    @('CheckIn','Fuente/formulario usado para originar tickets automatizados.'),
    @('Dry-run','Simulación que calcula resultados sin escribir cambios.'),
    @('S/4HANA','Sistema SAP relacionado con el módulo de pagos todavía no liberado.'),
    @('HEAD','Commit actualmente apuntado por la rama; base confirmada del release en este manual.')
  )

  Add-Heading '20. REFERENCIAS' 1
  Add-Paragraph 'Angular. (2026). Angular documentation. https://angular.dev/' -Alignment $wdAlignLeft
  Add-Paragraph 'Microsoft. (2026). SQL Server documentation. https://learn.microsoft.com/sql/' -Alignment $wdAlignLeft
  Add-Paragraph 'NestJS. (2026). NestJS documentation. https://docs.nestjs.com/' -Alignment $wdAlignLeft
  Add-Paragraph 'OpenJS Foundation. (2026). Node.js documentation. https://nodejs.org/docs/latest-v20.x/api/' -Alignment $wdAlignLeft
  Add-Paragraph 'PACO Admin. (2026a). paco-admin-front [Repositorio de código fuente no publicado].' -Alignment $wdAlignLeft
  Add-Paragraph 'PACO Admin. (2026b). paco_admin_backend [Repositorio de código fuente no publicado].' -Alignment $wdAlignLeft
  Add-Paragraph 'TypeORM. (2026). TypeORM documentation. https://typeorm.io/' -Alignment $wdAlignLeft
  Add-Paragraph 'Nota. Las versiones concretas se obtuvieron de package.json y archivos de bloqueo locales; las referencias web se incluyen como documentación técnica oficial, no como fuente del estado del release.' -Alignment $wdAlignLeft -Italic

  Add-PageBreak
  Add-Heading 'APÉNDICE A. COMANDOS RÁPIDOS' 1
  Add-Code @('# Backend','pnpm install --frozen-lockfile','pnpm run start:dev','pnpm run build','pnpm test -- --runInBand','','# Frontend','nvm use 20.19.0','npm ci --ignore-scripts','npm run start','npm run build','npx ng test --watch=false --browsers=ChromeHeadless')
  Add-Heading 'APÉNDICE B. LISTA DE VERIFICACIÓN DEL RELEASE' 1
  Add-Bullets @('Commit o tag aprobado identificado.', 'Árbol de trabajo limpio.', 'pagos-s4hana ausente del commit y del menú.', 'Variables del ambiente cargadas desde almacén seguro.', 'Scripts SQL aprobados y respaldos confirmados.', 'Build y pruebas exitosos.', 'Fallback SPA, CORS y HTTPS comprobados.', 'Login, roles y enlaces públicos validados.', 'Notificaciones probadas sin redirecciones de demostración.', 'Plan de reversión y responsables comunicados.')
  Add-Heading 'APÉNDICE C. MATRIZ RESUMIDA DE COMPATIBILIDAD' 1
  Add-Table 'Matriz de compatibilidad' @('Componente','Versión objetivo','Restricción') @(
    @('Node.js frontend','20.19.x','package.json declara >=20.19 <21.'),
    @('npm','10.x','Instalaciones reproducibles con package-lock.'),
    @('pnpm backend','10.18.0','Definido en packageManager.'),
    @('Angular/CLI','21.2.x','Mantener Angular, CLI, Material y CDK en major compatible.'),
    @('NestJS','10.x','Backend actual.'),
    @('SQL Server','Instancia con esquema PACO/Identity','Procedimientos requeridos y synchronize=false.'),
    @('ChromeHeadless','Disponible en CI','Necesario para Karma.')
  )
  Add-Heading 'APÉNDICE D. TRAZABILIDAD DE PAGOS-S4HANA' 1
  Add-Paragraph 'Para el release documentado, la trazabilidad se resuelve por exclusión: los archivos del módulo y sus integraciones no existen en HEAD, aunque sí en el árbol de trabajo local. Antes de empaquetar, compare el commit aprobado y no use un directorio con cambios sin confirmar.'
  Add-Code @('git status --short','git diff -- src/app.module.ts src/modules/database','git -C ..\paco-admin-front diff -- src/app/modules/home src/environments','git ls-files | Select-String "pagos-s4hana|s4hana-database"')

  # Limpiar el historial de edición reduce de forma importante el tiempo de guardado COM.
  $script:doc.UndoClear()
  Write-Output "PRE_SAVE_PAGES=$($script:doc.ComputeStatistics(2)) PARAGRAPHS=$($script:doc.Paragraphs.Count) TABLES=$($script:doc.Tables.Count)"
  $flatOpc = $script:doc.WordOpenXML
  [System.IO.File]::WriteAllText($flatOpcPath, $flatOpc, [System.Text.UTF8Encoding]::new($false))
  & (Join-Path $PSScriptRoot 'convert-flatopc-to-docx.ps1') -InputPath $flatOpcPath -OutputPath $docxPath
  if ([System.IO.File]::Exists($flatOpcPath)) { [System.IO.File]::Delete($flatOpcPath) }
  Write-Output "DOCX=$docxPath"
  Write-Output "PAGES=$($script:doc.ComputeStatistics(2))"
  Write-Output "TABLES=$($script:doc.Tables.Count)"
} finally {
  if ($script:doc) { $script:doc.Close([ref]0) }
  if ($script:word) { $script:word.Quit() }
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
