const fs = require('fs');
const path = require('path');

// This script creates only documentation XML. Packaging reuses the user's Word template.
const output = path.resolve(process.argv[2] || path.join(__dirname, 'manual-usuario-paco-admin'));
fs.mkdirSync(output, { recursive: true });
const parts = [];
const figures = [];
const tables = [];
let bookmark = 0;
const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function paragraph(text, style = 'Normal', options = {}) {
  const properties = `<w:pStyle w:val="${style}"/>${options.center ? '<w:jc w:val="center"/>' : ''}${options.keep ? '<w:keepNext/>' : ''}${options.compact ? '<w:spacing w:line="240" w:lineRule="auto" w:after="80"/>' : ''}`;
  const run = `${options.bold ? '<w:b/>' : ''}${options.italic ? '<w:i/>' : ''}${options.color ? `<w:color w:val="${options.color}"/>` : ''}`;
  return `<w:p><w:pPr>${properties}</w:pPr><w:r><w:rPr>${run}</w:rPr><w:t xml:space="preserve">${escape(text)}</w:t></w:r></w:p>`;
}
function p(text, options) { parts.push(paragraph(text, 'Normal', options)); }
function heading(text, level = 1) {
  const id = ++bookmark;
  parts.push(`<w:p><w:pPr><w:pStyle w:val="Ttulo${level}"/>${level === 1 ? '<w:pageBreakBefore/>' : ''}</w:pPr><w:bookmarkStart w:id="${id}" w:name="sec_${id}"/><w:r><w:t>${escape(text)}</w:t></w:r><w:bookmarkEnd w:id="${id}"/></w:p>`);
}
function steps(items) { items.forEach((text, index) => p(`${index + 1}. ${text}`, { compact: true })); }
function bullets(items) { items.forEach((text) => p(`• ${text}`, { compact: true })); }
function note(text) { p(`Nota. ${text}`, { italic: true, compact: true }); }
function result(text) { p(`Resultado esperado: ${text}`, { bold: true, compact: true }); }
function table(title, headers, rows) {
  const num = tables.length + 1;
  tables.push({ num, title });
  parts.push(paragraph(`Tabla ${num}. ${title}`, 'UserTableCaption', { bold: true, keep: true, compact: true }));
  const width = Math.floor(9026 / headers.length);
  const cell = (text, head) => `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${head ? '<w:shd w:fill="4A3A70"/>' : ''}</w:tcPr>${paragraph(text, 'Normal', { compact: true, bold: head, color: head ? 'FFFFFF' : '000000' })}</w:tc>`;
  const row = (r, head) => `<w:tr><w:trPr><w:cantSplit/>${head ? '<w:tblHeader/>' : ''}</w:trPr>${r.map((s) => cell(s, head)).join('')}</w:tr>`;
  parts.push(`<w:tbl><w:tblPr><w:tblW w:w="9026" w:type="dxa"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map((n)=>`<w:${n} w:val="single" w:sz="4" w:color="D9D3E6"/>`).join('')}</w:tblBorders><w:tblCellMar><w:top w:w="90" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${headers.map(()=>`<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${row(headers,true)}${rows.map((r)=>row(r,false)).join('')}</w:tbl>`);
  p('');
}
function screen(title, details) {
  const num = figures.length + 1;
  const code = `CAP-${String(num).padStart(2,'0')}`;
  figures.push({ num, title, code, details });
  parts.push(paragraph(`Figura ${num}. ${title}`, 'UserFigureCaption', { bold: true, keep: true, compact: true }));
  parts.push(`<w:tbl><w:tblPr><w:tblW w:w="9026" w:type="dxa"/><w:tblBorders>${['top','left','bottom','right'].map(n=>`<w:${n} w:val="dashed" w:sz="8" w:color="9F93BA"/>`).join('')}</w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="9026"/></w:tblGrid><w:tr><w:trPr><w:trHeight w:val="2500" w:hRule="atLeast"/><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="9026" w:type="dxa"/><w:vAlign w:val="center"/><w:shd w:fill="F6F4FA"/></w:tcPr>${paragraph(`[${code}] INSERTAR CAPTURA DE PANTALLA`, 'Normal', { center:true,bold:true,compact:true })}${paragraph(title,'Normal',{center:true,compact:true})}${paragraph(`Mostrar: ${details}`,'Normal',{center:true,compact:true})}</w:tc></w:tr></w:tbl>`);
  note(`Captura pendiente de incorporación. Identificador editorial: ${code}. Use datos de ejemplo y mantenga visibles los controles descritos.`);
}
function field(instruction, placeholder) {
  return `<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${escape(instruction)} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>${escape(placeholder)}</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`;
}

parts.push('<!--COVER_LOGO-->');
parts.push(paragraph('MANUAL DE USUARIO', 'Ttulo', { center:true,bold:true }));
parts.push(paragraph('Sistema PACO Admin', 'Subttulo', { center:true }));
p('Guía de operación por áreas y perfiles', { center:true });
p('Versión documental 1.0 · 2 de octubre de 2026', { center:true });
p('Distribuidora Istmania, S. A.', { center:true });
p('Equipo de desarrollo PACO Admin', { center:true });
p('Documento editable con espacios reservados para capturas de pantalla.', { center:true,italic:true });

heading('CONTROL DEL DOCUMENTO');
table('Historial de revisiones', ['Versión','Fecha','Descripción'], [['1.0','02/10/2026','Manual de usuario basado en el manual técnico revisado y en las pantallas del proyecto. Capturas pendientes.']]);
table('Alcance y uso del documento', ['Elemento','Descripción'], [
  ['Referencia','Manual_tecnico_PACO_Admin.docx, versión documental 1.0, entregado por el responsable del proyecto.'],
  ['Destinatarios','Usuarios de operación, aprobadores, vendedores, supervisores y administradores.'],
  ['Cobertura','Acceso, solicitudes, tickets, respuestas por correo, libro de ruta, punteo, catálogos, usuarios y áreas complementarias.'],
  ['Exclusión','Pagos S4HANA / pagos-s4hana se encuentra en desarrollo y no está incluido en el release.'],
  ['Capturas','Cada recuadro CAP-xx señala la pantalla y los elementos que debe mostrar la imagen. Las instrucciones ya están redactadas.']
]);
p('Esta guía explica las operaciones visibles de PACO Admin. Los menús y botones dependen de los permisos de su cuenta, del estado del registro y de la configuración habilitada. Las áreas complementarias pueden requerir un enlace directo del administrador.');
note('La referencia técnica se utilizó como material documental. Las instrucciones operativas de este manual se contrastaron con las plantillas y acciones del frontend revisado el 2 de octubre de 2026. No se realizaron operaciones sobre datos productivos.');

heading('ÍNDICE GENERAL');
parts.push(field('TOC \\o "1-2" \\h \\z \\u', 'Actualizar tabla de contenido en Word.'));
heading('ÍNDICE DE TABLAS');
parts.push(field('TOC \\h \\z \\t "UserTableCaption,1"', 'Actualizar índice de tablas en Word.'));
heading('ÍNDICE DE FIGURAS');
parts.push(field('TOC \\h \\z \\t "UserFigureCaption,1"', 'Actualizar índice de figuras en Word.'));

heading('1. INTRODUCCIÓN');
heading('1.1 Objetivo',2);
p('Guiar al usuario en la consulta y gestión de pedidos, descuentos, incidencias, ubicaciones y datos administrativos de PACO Admin. Cada procedimiento indica cómo ingresar al área, qué información revisar, qué acción realizar y cómo reconocer el resultado.');
heading('1.2 Requisitos para utilizar PACO Admin',2);
bullets(['Contar con la dirección de acceso proporcionada por el administrador y conexión a la red autorizada.','Tener usuario activo y contraseña, cuando el área requiere iniciar sesión.','Usar un navegador actualizado; permitir descargas para los reportes y abrir pestañas para consultar mapas.','Contar con el perfil correspondiente a la operación. Los enlaces enviados por correo permiten determinadas revisiones sin iniciar sesión.']);
heading('1.3 Cómo leer esta guía',2);
p('Siga los pasos del área que le corresponde. Los nombres de botones se escriben tal como se muestran en la aplicación, con acentuación normalizada. Un campo deshabilitado o un botón ausente puede depender de su perfil o de la etapa del proceso. Los recuadros de figuras serán sustituidos por capturas de la aplicación.');
note('Pagos S4HANA queda fuera de los procedimientos de este manual por encontrarse en desarrollo.');

heading('2. PERFILES Y NAVEGACIÓN');
table('Perfiles y tareas habituales', ['Perfil','Tareas habituales','Observación'], [
  ['Usuario operativo / aprobador','Consultar solicitudes y revisar descuentos.','El permiso para decidir depende de la solicitud.'],
  ['Consulta general','Revisar Solicitudes todas y el flujo de aprobación.','La consulta no concede autorización para modificar.'],
  ['Solo lectura de tickets','Consultar bandeja, productos, planes e historial; exportar reportes.','La edición no se ofrece cuando la cuenta es exclusivamente de consulta.'],
  ['Jefe de Marca','Definir planes y atender productos reabiertos.','Opera en las etapas asignadas.'],
  ['Mercadeo / Gerencia General','Aprobar o devolver planes.','Los productos pueden avanzar de manera independiente.'],
  ['Supervisor / responsable de ejecución','Iniciar ejecución de planes aprobados y revisar ubicaciones.','El acceso al punteo se realiza mediante código o enlace asignado.'],
  ['Vendedor','Confirmar solución, cerrar o reabrir dentro del plazo permitido.','Puede recibir un enlace por correo.'],
  ['Administrador de catálogos','Mantener vendedores y jerarquías.','Requiere permisos de datos maestros.'],
  ['Superusuario','Crear, editar, desactivar y restablecer cuentas autorizadas.','Los roles administrativos reservados se gestionan fuera del formulario.']
]);
heading('2.1 Menú principal y cuenta',2);
steps(['Abra el menú lateral con el botón de la esquina superior izquierda.','Seleccione Dashboard, Solicitudes pendientes, Solicitudes aprobadas, Solicitudes todas, Tickets, Vendedores y jerarquías o Administrar usuarios, según las opciones visibles.','Abra el menú de su nombre de usuario para Cambiar contraseña o Cerrar sesión.','En pantallas estrechas, despliegue el menú antes de elegir un área y utilice el desplazamiento de las tablas para consultar todas las columnas.']);
screen('Menú principal y menú de usuario','menú lateral, nombre de la cuenta y opciones de cambio de contraseña y cierre de sesión');
heading('2.2 Áreas que se abren mediante enlace',2);
p('Punteo y las revisiones de tickets o libro de ruta cuentan con accesos específicos. Liberación de créditos, Fichas clientes y Salida marcas tienen pantallas disponibles, pero sus opciones están ocultas en el menú de la versión revisada. Utilice el enlace habilitado que entregue el administrador; la ausencia del menú no implica que su cuenta tenga permiso para operar.');
table('Accesos de referencia', ['Área','Ruta dentro del sitio','Forma de ingreso'], [
  ['Dashboard','/home/inicio','Menú Dashboard.'],['Tickets','/home/tickets','Menú Tickets.'],['Vendedores y jerarquías','/home/catalogos','Menú con el mismo nombre, si está autorizado.'],['Usuarios','/home/usuarios','Menú Administrar usuarios.'],['Punteo','/punteo','Enlace de supervisor o dirección proporcionada.'],['Liberación de créditos','/home/liberacion','Enlace habilitado por el administrador.'],['Fichas clientes','/home/ficha-solicitudes/index','Enlace habilitado por el administrador.'],['Salida marcas','/home/salidas-marcas','Enlace habilitado por el administrador.'],['Aprobación o respuesta de tickets','/ticket/aprobar o /ticket/responder','Enlace completo recibido por correo.'],['Libro de ruta','/libro-ruta/aprobar','Enlace completo recibido por correo.']
]);
note('Las rutas anteriores se agregan a la dirección oficial del sitio. Para enlaces de correo, abra el vínculo completo; no elimine sus parámetros.');

heading('3. ACCESO Y SESIÓN');
heading('3.1 Iniciar sesión',2);
steps(['Abra la dirección de PACO Admin.','En Inicio de Sesión, escriba Nombre Usuario y Contraseña.','Seleccione Iniciar cuando ambos campos estén completos.','Espere a que se muestre el panel administrativo y confirme que la cuenta corresponde a su usuario.']);
result('Se abre el área administrativa con las opciones disponibles para su perfil.');
note('Si no puede ingresar, compruebe los datos y contacte al administrador. La pantalla revisada no ofrece un enlace activo de recuperación automática de contraseña.');
screen('Inicio de sesión','Nombre Usuario, Contraseña y botón Iniciar, sin mostrar la contraseña');
heading('3.2 Cambiar contraseña',2);
steps(['Abra el menú de su nombre de usuario y seleccione Cambiar contraseña.','Escriba Nueva Contraseña y repítala en Confirmar Contraseña.','Seleccione Confirmar. Si las contraseñas no coinciden, complete nuevamente ambos campos.','Cuando se confirme el cambio, ingrese de nuevo con la nueva contraseña. Use Volver si desea cancelar.']);
result('La aplicación informa que la contraseña fue cambiada y dirige al inicio de sesión.');
screen('Cambio de contraseña','ambos campos y botones Confirmar y Volver');
heading('3.3 Cerrar sesión y sesión vencida',2);
steps(['Guarde las operaciones que tenga pendientes.','Abra el menú de usuario y seleccione Cerrar sesión.','Si el sistema solicita autenticación durante una operación, ingrese nuevamente y consulte el registro antes de repetir una acción.']);
result('La cuenta deja de estar disponible en el panel y se presenta el acceso al sistema.');

heading('4. DASHBOARD');
p('Acceso: menú Dashboard. La pantalla Consulta de datos ofrece el resumen operativo de solicitudes.');
table('Indicadores del Dashboard', ['Indicador','Cómo interpretarlo'], [['Pedidos sin aprobar','Cantidad de solicitudes pendientes de revisión.'],['Pedidos aprobados en el mes','Cantidad de pedidos aprobados durante el período actual.'],['Ver lista / Ver pendientes','Abre el listado relacionado, según el perfil.']]);
steps(['Espere a que terminen de cargar los indicadores.','Revise las cantidades del resumen.','Seleccione Ver pendientes o Ver lista para acceder a la bandeja correspondiente.','Si aparece un aviso de carga fallida, revise la conexión y vuelva a consultar; no interprete un indicador sin cargar como ausencia de solicitudes.']);
screen('Dashboard: consulta de datos','tarjetas Pedidos sin aprobar y Pedidos aprobados en el mes, con sus accesos');

heading('5. SOLICITUDES Y DESCUENTOS');
heading('5.1 Consultar solicitudes pendientes',2);
p('Acceso: menú Solicitudes pendientes. La bandeja presenta las solicitudes asignadas para revisión.');
steps(['Busque por vendedor, cliente o código en el campo Buscar.','Revise vendedor, fecha, código y nombre del cliente.','Use las flechas de paginación para consultar otros registros.','Seleccione Ver detalle, identificado con el icono de un ojo, en la solicitud que desea revisar.']);
result('Se muestra el encabezado y el detalle del pedido seleccionado.');
note('El buscador de esta bandeja filtra los registros cargados. Si no encuentra una solicitud, cambie de página o retire la búsqueda. El mensaje No tiene solicitudes pendientes indica que la bandeja está vacía.');
screen('Solicitudes pendientes','buscador, columnas principales, botón Ver detalle y paginador');
heading('5.2 Revisar datos y descuentos',2);
table('Datos del detalle de solicitud', ['Campo','Qué revisar'], [['Encabezado','Número de pedido, vendedor, cliente, fecha y comentario.'],['Productos','SKU, descripción, cantidad y unidad de medida.'],['Desc Sistema','Descuento de origen que acompaña al producto.'],['Desc Negociado','Descuento adicional propuesto o ajustado para la revisión.'],['Total Descuento','Suma de los descuentos del producto; debe respetar el límite permitido.'],['Total Línea','Importe resultante de cantidad, precio y descuentos.']]);
steps(['Confirme que abrió el pedido correcto.','Revise cada producto y el comentario de la solicitud.','Ajuste Desc Negociado si el campo está habilitado y su responsabilidad lo permite.','Compruebe Total Descuento y Total Línea antes de decidir.']);
screen('Detalle de solicitud y descuentos','encabezado, tabla de productos, descuentos y botones de decisión');
heading('5.3 Aprobar descuento',2);
steps(['En el detalle, seleccione Aprobar descuento.','Revise el mensaje de confirmación y seleccione Confirmar; elija Volver para cancelar.','Si aparece El descuento total excede el límite permitido, ajuste el descuento adicional y vuelva a revisar.','Espere el aviso de éxito y el regreso a Solicitudes pendientes.']);
result('Se registra la aprobación del descuento adicional y la bandeja se actualiza.');
screen('Confirmación de aprobación de descuento','pregunta de confirmación y botones Confirmar y Volver');
heading('5.4 Rechazar descuento',2);
steps(['Seleccione Rechazar descuento.','Lea la advertencia: se asignará cero al descuento adicional del pedido.','Seleccione Confirmar únicamente si desea aplicar el rechazo.','Espere el mensaje y el regreso a la bandeja.']);
result('El pedido se procesa sin conceder descuento adicional.');
note('Rechazar descuento afecta los valores adicionales de las líneas del pedido; no equivale a eliminar la solicitud.');
heading('5.5 Solicitudes todas y flujo de aprobación',2);
p('Acceso: menú Solicitudes todas, visible para los perfiles de consulta. Abra Ver detalle para revisar la información disponible y, cuando se muestre, el Flujo de aprobación con responsables, estados y fechas de autorización.');
screen('Consulta general y flujo de aprobación','pedido consultado, responsables del flujo y sus estados');

heading('6. SOLICITUDES APROBADAS Y REPORTES');
heading('6.1 Consultar aprobaciones',2);
steps(['Abra Solicitudes aprobadas.','Utilice Buscar y la paginación para ubicar el pedido.','Seleccione Ver detalle para consultar el encabezado y los productos del pedido aprobado.','Use Volver para regresar a la bandeja.']);
screen('Solicitudes aprobadas','buscador, registros aprobados, Ver detalle y Exportar Datos');
heading('6.2 Exportar por rango de fechas',2);
steps(['Seleccione Exportar Datos.','En Rango de fechas, elija Fecha inicial y Fecha final.','Compruebe que la fecha inicial no sea posterior a la final.','Seleccione Exportar y espere la descarga.','Abra el archivo CSV con Excel u otra herramienta compatible. Si no hay información para el período, cambie el rango.']);
result('Se descarga un archivo de solicitudes aprobadas del período seleccionado.');
note('El reporte por fechas se consulta al exportar; su contenido no se limita necesariamente a la página que está viendo. Si el CSV aparece en una sola columna, impórtelo con separador punto y coma.');
screen('Exportación de solicitudes aprobadas','selector de fechas y botones Cancelar y Exportar');

heading('7. TICKETS: CONSULTA, IMPORTACIÓN Y REPORTES');
heading('7.1 Consultar la bandeja',2);
steps(['Abra Tickets.','Complete uno o varios filtros: Buscar, Estado, Cliente, Vendedor, Fecha desde y Fecha hasta.','Seleccione Consultar.','Revise número, título, cliente, vendedor, fecha y estado.','Seleccione Ver detalle en el ticket elegido.']);
note('La bandeja puede iniciar en un estado acorde con su perfil. Para ampliar la consulta, seleccione Todos los estados. La ausencia de resultados puede depender de los filtros.');
screen('Bandeja de tickets y filtros','filtros, Consultar, Excel, PDF y tarjetas de tickets');
heading('7.2 Leer el detalle y el historial',2);
steps(['Confirme número de ticket, cliente, vendedor, prioridad y estado.','Revise Respuestas del ticket, que contiene la información del reporte de origen.','En Avance por producto, consulte artículo, marca, lote, vencimiento, cantidad y plan.','Revise Historial para conocer las acciones realizadas, las fechas, los responsables y los comentarios.']);
result('Puede identificar qué productos requieren atención y cuál es la etapa de cada uno.');
screen('Detalle de ticket y avance por producto','encabezado, productos, planes e historial');
heading('7.3 Importar formularios CheckIn',2);
p('Esta acción se ofrece a cuentas con capacidad de escritura.');
steps(['En la bandeja, seleccione Importar formularios CheckIn.','Busque la respuesta, marca o artículo.','Revise el formulario completo antes de seleccionarlo.','Complete los datos solicitados: Código cliente, Cliente y correos del vendedor, Jefe de Marca, Mercadeo y Gerencia General cuando corresponda.','Seleccione una o varias respuestas y compruebe el contador de formularios seleccionados.','Seleccione Crear tickets seleccionados y revise el mensaje del resultado.','Regrese a la bandeja y consulte los tickets creados.']);
note('Cada respuesta completa seleccionada origina un ticket. Evite repetir la importación del mismo reporte sin comprobar primero el resultado.');
screen('Importación de formularios CheckIn','formularios disponibles, datos del cliente y destinatarios, selección y Crear tickets seleccionados');
heading('7.4 Exportar tickets a Excel o PDF',2);
steps(['Establezca los filtros del reporte y compruebe las fechas.','Seleccione Excel o PDF.','Espere la descarga y abra el archivo generado.','Revise el resumen y el historial incluido. Si no se encuentran tickets, ajuste los filtros.']);
result('Se descarga un reporte de los tickets que coinciden con los filtros. El archivo Excel contiene hojas de resumen e historial.');
note('El reporte consulta la selección completa de filtros, no únicamente la página visible.');

heading('8. TICKETS: PLANES, APROBACIÓN Y EJECUCIÓN');
table('Estados y siguiente intervención habitual', ['Estado','Qué significa para el usuario'], [['Pendiente de plan','El Jefe de Marca debe proponer una solución.'],['Pendiente de Mercadeo','Mercadeo debe revisar el plan.'],['Pendiente de Gerencia','Se requiere autorización de Gerencia General.'],['Plan aprobado','La solución puede pasar al inicio de ejecución.'],['En ejecución','Las acciones del plan se encuentran en desarrollo.'],['Pendiente de cierre','El vendedor debe confirmar el resultado.'],['Cerrado','Se registró el cierre correspondiente.'],['Reabierto urgente','La solución requiere nueva atención del Jefe de Marca.'],['Cancelado','El registro tiene estado de cancelación; revise el historial.']]);
heading('8.1 Seleccionar productos',2);
steps(['En Avance por producto, marque Seleccionar en los productos que quiere procesar.','Verifique el contador Productos seleccionados.','Elija la acción disponible para su perfil y el estado de los productos.','Si aparece Seleccione los productos, marque al menos un producto elegible y seleccione Continuar.']);
note('Los productos pueden encontrarse en etapas diferentes. Solo se procesan los que admiten la acción elegida; los demás continúan su propio flujo.');
heading('8.2 Definir un plan de acción',2);
steps(['Como Jefe de Marca, seleccione Definir plan de acción o Definir plan para seleccionados.','Elija Motivo: Cambio x Cambio, Devolución, Descuento, Promoción, Degustación, Nota de crédito u Otro.','Complete Descripción, Fecha compromiso y Responsable de ejecución.','Seleccione una fecha de compromiso que no sea anterior al día actual y agregue Comentario si es necesario.','Seleccione Enviar a Mercadeo y espere la confirmación.','Revise el nuevo estado y el registro en el historial.']);
result('Se registra el plan y los productos pasan a la revisión aplicable.');
screen('Definición de plan de acción','motivo, descripción, fecha compromiso, responsable y Enviar a Mercadeo');
note('Marca dispone de 24 horas laborables para definir el plan y Mercadeo de 48 horas para decidir, desde la recepción en cada etapa. Horario: lunes a viernes 08:00-17:00 y sábado 08:00-12:00, hora de Honduras. Responder tarde sigue permitido y queda registrado con penalización.');
heading('8.3 Aprobar o rechazar un plan',2);
steps(['Como responsable de Mercadeo o Gerencia, abra el ticket pendiente de su etapa.','Revise el motivo, la propuesta, el responsable y la fecha de compromiso.','Seleccione los productos que desea atender.','Use Aprobar plan, Aprobar por Gerencia o Aprobar seleccionados para autorizar; use la opción de rechazo correspondiente para devolver.','Agregue un comentario que explique la decisión y seleccione Confirmar.','Compruebe el estado de cada producto y el Historial.']);
result('La decisión queda registrada; un plan rechazado vuelve al flujo de revisión correspondiente.');
screen('Decisión sobre un plan de ticket','plan mostrado, productos seleccionados y opciones de aprobación o rechazo');
heading('8.4 Iniciar ejecución y reenviar notificación',2);
steps(['Como Jefe de Marca o supervisor autorizado, abra un ticket con productos en Plan aprobado.','Seleccione los productos y use Iniciar ejecución o Iniciar ejecución de seleccionados.','Agregue Comentario y Correos relacionados (CC) cuando sea necesario. Separe varios correos con coma o punto y coma.','Seleccione Iniciar y notificar y compruebe el mensaje y el estado resultante.','Si un ticket está Pendiente de cierre y el vendedor necesita otro envío, use Reenviar enlace al vendedor y espere el aviso de reenvío.']);
screen('Inicio de ejecución y notificación','comentario, destinatarios en copia y botón Iniciar y notificar');

heading('9. TICKETS: ATENCIÓN DESDE EL CORREO');
p('Estas pantallas se abren desde el vínculo completo del correo recibido. La acción disponible depende de la etapa y de la vigencia del enlace.');
heading('9.1 Registrar planes por producto',2);
steps(['Abra el correo de asignación y seleccione el enlace de gestión.','Compruebe ticket, cliente y productos.','Para cada producto, complete motivo, plan de acción, fecha compromiso y responsable.','Si los planes son iguales, use Copiar el primer plan a todos y luego ajuste las excepciones.','Revise cualquier aviso de política y la ruta de aprobación que se muestra.','Seleccione Registrar planes y decisiones. Espere Respuesta registrada.']);
note('La decisión Rechazar y cerrar por política solo aparece cuando el producto es elegible. Revise la fecha mínima que indica la pantalla. La autorización especial que omite Mercadeo únicamente se aplica cuando la aplicación la informa para ese producto.');
screen('Plan por producto desde el enlace de correo','campos del plan, productos, avisos aplicables y Registrar planes y decisiones');
heading('9.2 Aprobar, devolver o iniciar ejecución desde el enlace',2);
steps(['Abra el vínculo de aprobación y revise el plan de cada producto.','Seleccione Aprobar o Rechazar y devolver al Jefe de Marca para cada producto, según lo que corresponda.','Si la pantalla corresponde al inicio de ejecución, revise los planes aprobados y complete los correos en copia.','Seleccione Registrar decisiones o Iniciar ejecución y notificar al vendedor, según la pantalla.','Verifique Respuesta registrada y el estado informado.']);
screen('Aprobación de productos desde el correo','planes, decisiones individuales y botón de registro');
heading('9.3 Confirmar la solución como vendedor',2);
steps(['Abra el vínculo recibido para confirmar el resultado.','Revise cliente, ticket y plan de cada producto.','Seleccione Solución satisfactoria — cerrar si el producto quedó resuelto, o Requiere atención — reabrir si necesita revisión.','Agregue un comentario de producto para explicar lo ocurrido.','Seleccione Registrar decisiones y espere Respuesta registrada.','Si el ticket conserva el flujo general, utilice Cerrar ticket o Reabrir ticket en lugar de las decisiones por producto.']);
result('Los productos cerrados concluyen su atención; los productos reabiertos regresan al Jefe de Marca sin detener a los cerrados.');
note('La reapertura se permite durante el último mes calendario antes del vencimiento de cada producto, incluida su fecha de vencimiento. Consulte la ventana mostrada por producto; fuera de ella solo puede cerrar.');
screen('Confirmación del vendedor y plazo de reapertura','plan aprobado, resultado por producto, fecha límite y Registrar decisiones');
heading('9.4 Enlace no disponible',2);
table('Mensajes de enlaces y qué hacer', ['Mensaje','Acción del usuario'], [['El enlace no existe / no contiene un código válido','Abra nuevamente el enlace completo del correo original.'],['El enlace ya fue utilizado o el ticket cambió de estado','Consulte el resultado o solicite un enlace actualizado al responsable.'],['El enlace venció','Solicite al responsable que reenvíe o renueve la notificación.'],['No fue posible procesar la respuesta','Revise conexión y estado del registro antes de reenviar.']]);

heading('10. CORREOS RELACIONADOS Y SUPLENCIAS');
p('Acceso: Tickets → Correos relacionados, cuando la opción esté habilitada para el responsable autorizado.');
heading('10.1 Crear o editar una suplencia',2);
steps(['Seleccione Nuevo correo o el icono de edición del registro existente.','Escriba Correo principal y Correo relacionado.','Defina Inicio de vigencia y Fin de vigencia si corresponde. La fecha final no debe ser anterior a la inicial.','Marque Es el suplente principal cuando esa persona deba asumir la suplencia principal.','Seleccione Guardar y compruebe Correo relacionado guardado correctamente.']);
note('Solo un correo relacionado puede ser el suplente principal de cada correo principal. Verifique la vigencia antes de activar vacaciones.');
screen('Correos relacionados y suplencia','formulario, correos, vigencia, suplente principal y Guardar');
heading('10.2 Activar vacaciones o eliminar la relación',2);
steps(['Ubique el registro del correo principal.','Cambie el control Vacaciones y espere Vacaciones activadas o Vacaciones desactivadas.','Para quitar una suplencia, use el icono de eliminar.','Revise qué correo dejará de ser suplente y confirme Eliminar; use Cancelar para conservarlo.']);
result('La tabla muestra la nueva condición del principal o elimina la relación indicada.');

heading('11. LIBRO DE RUTA: APROBACIÓN');
p('Acceso: vínculo de aprobación del libro de ruta recibido por correo.');
steps(['Abra el vínculo y confirme RutaVendedor, Semana, remitente y estado.','Revise los indicadores Ruta actual, Preliminar, Agregados, Retirados y Cambios de orden.','Compare Ruta actual con Ruta preliminar por cada día de la semana.','Escriba Comentario de revisión cuando rechace o solicite cambios; es obligatorio para ambas decisiones.','Seleccione Aprobar ruta, Solicitar cambios o Rechazar.','Espere Respuesta registrada y compruebe el estado final.']);
result('Se registra la decisión sobre la propuesta de libro de ruta.');
screen('Comparación y aprobación del libro de ruta','ruta actual, preliminar, indicadores, comentario y tres botones de decisión');

heading('12. PUNTEO: VALIDACIÓN DE UBICACIONES');
heading('12.1 Consultar pendientes del supervisor',2);
steps(['Abra el acceso Punteo proporcionado por el administrador o supervisor.','Si el enlace no tiene un supervisor precargado, ingrese Código de supervisor y seleccione Consultar pendientes.','La opción TODO permite consultar todos los pendientes; úsela cuando su responsabilidad abarque esa consulta.','Revise el contador y busque por cliente, nombre o vendedor.','Si aparece el selector Supervisor, úselo para delimitar los resultados.']);
screen('Acceso y bandeja de punteo','código de supervisor, pendientes, buscador y filtro de supervisor');
heading('12.2 Comparar ubicaciones y tomar una decisión',2);
steps(['Identifique el cliente y el ID punteo que va a revisar.','Seleccione Nueva para abrir el punto propuesto en Google Maps.','Seleccione Anterior cuando esté habilitado o use Comparar ambas para revisar el recorrido entre puntos.','Regrese a la tabla y seleccione Aprobar o Rechazar para el registro correcto.','Espere La ubicación fue aprobada o La ubicación fue rechazada.','Compruebe que la bandeja se haya actualizado.']);
note('La decisión se envía al pulsar el botón; esta pantalla no muestra una confirmación previa. Revise el cliente antes de elegir. Anterior y Comparar ambas se deshabilitan si no existe una coordenada anterior válida.');
screen('Revisión y decisión de punteo','cliente, ID, fecha, botones Nueva, Anterior, comparación, Aprobar y Rechazar');
heading('12.3 Vista de ubicaciones y cambio de supervisor',2);
steps(['Seleccione Ver todas las ubicaciones para consultar las tarjetas con coordenadas y enlaces de mapa.','Seleccione Ver tabla para volver a la bandeja de decisiones.','Use Cambiar supervisor para regresar al ingreso del código y consultar otro grupo.']);
screen('Vista de ubicaciones de clientes','tarjetas, coordenadas nuevas y anteriores y Comparar recorrido');

heading('13. VENDEDORES Y JERARQUÍAS');
p('Acceso: menú Vendedores y jerarquías, para los perfiles autorizados.');
heading('13.1 Crear o editar un vendedor',2);
steps(['Seleccione la pestaña Vendedores.','Use Nuevo vendedor o el icono de edición del vendedor existente.','Complete ID SAP, Código vendedor, Nombre, Correo y Código supervisor.','Marque Aplica descuento adicional cuando corresponda a la autorización del vendedor.','Seleccione Guardar vendedor y revise el mensaje y el registro en la tabla.','Use Limpiar para reiniciar el formulario o Ocultar formulario para cerrar su visualización.']);
screen('Catálogo de vendedores','tabla y formulario con datos SAP, correo, supervisor y descuento adicional');
heading('13.2 Mantener supervisores y gerentes',2);
steps(['Seleccione la pestaña Supervisores y gerentes.','Use Nueva relación o el icono de edición.','Complete Código vendedor y los nombres, códigos y correos del supervisor y del gerente.','Compruebe que los correos corresponden a las personas que deben intervenir.','Seleccione Guardar relación y confirme la actualización en la tabla.']);
result('La relación jerárquica del vendedor queda registrada.');
screen('Relaciones de supervisores y gerentes','campos de vendedor, supervisor, gerente y Guardar relación');

heading('14. ADMINISTRAR USUARIOS');
p('Acceso: menú Administrar usuarios, exclusivo del perfil Superusuario.');
heading('14.1 Consultar cuentas y crear un usuario',2);
steps(['Use Actualizar para consultar los datos vigentes.','Busque por correo, nombre o rol.','Seleccione Nuevo usuario.','Complete Correo / usuario, Contraseña inicial, Nombre de contacto y Celular. La contraseña inicial debe tener al menos seis caracteres.','Seleccione los roles permitidos para la responsabilidad de la cuenta y marque Usuario activo cuando deba poder ingresar.','Seleccione Crear usuario y espere Usuario creado.']);
screen('Administración de usuarios','listado, búsqueda, estado activo, acciones y Nuevo usuario');
screen('Creación o edición de usuario','correo, contacto, roles, Usuario activo y botón de guardado');
heading('14.2 Editar, restablecer contraseña y desactivar',2);
steps(['Seleccione el icono de editar de la cuenta. Ajuste los datos, roles o estado y use Guardar cambios.','Para restablecer una contraseña, seleccione el icono de restablecimiento, ingrese una nueva contraseña de al menos seis caracteres y confirme.','Para desactivar, seleccione el icono de desactivación de una cuenta activa.','Revise la confirmación con el correo de la cuenta y acepte solo si desea impedir su ingreso.','Compruebe Usuario desactivado y el estado Inactivo en el listado.']);
note('La desactivación conserva la cuenta. Los roles ADMIN y SUPERUSUARIO están protegidos y su asignación se realiza fuera de este formulario. Para reactivar una cuenta autorizada, edítela y marque Usuario activo.');

heading('15. ÁREAS COMPLEMENTARIAS');
p('Estas áreas se describen porque forman parte de la cobertura del proyecto. En la interfaz revisada sus accesos están ocultos en el menú; abra el vínculo habilitado por el administrador. Los pasos no implican que la opción esté disponible para todos los usuarios.');
heading('15.1 Liberación de créditos y pedidos',2);
steps(['Abra el vínculo de Liberación de créditos.','Revise Resumen de Pedidos no Autorizados. La pantalla muestra Zona, Asesor y Mes; la consulta disponible depende de la configuración habilitada.','Seleccione Ver en el cliente que desea revisar.','Examine límite de crédito, deuda, pedidos, cartera actual y vencimientos.','En el desglose, elija Acción para cada pedido y registre Motivo.','Seleccione Guardar y verifique el resultado consultando nuevamente el cliente.']);
note('Las opciones de Acción provienen del catálogo del sistema. No se debe asumir que seleccionar Zona, Asesor o Mes aplica automáticamente un filtro a la tabla: confirme los datos cargados antes de operar.');
screen('Liberación de créditos: resumen','cliente, monto, cantidad, resumen de pedidos y Ver');
screen('Liberación de créditos: detalle y acciones','cartera actual, desglose de pedidos, Acción, Motivo y Guardar');
heading('15.2 Fichas de clientes',2);
steps(['Abra el vínculo de Fichas clientes y seleccione Agregar.','Complete Solicitante: nombre, lugar y fecha.','Complete Datos del Cliente: negocio, cliente, RTN, identificación, dirección, barrio, departamento y ciudad.','Use Agregar Teléfono e ingrese Número de Teléfono y Prefijo. Elimine filas innecesarias con Eliminar Teléfono.','Complete Datos de Venta: asesor, supervisor, canal, lista de precio y clasificación del negocio.','Ingrese los enlaces solicitados en DNI URL y Fotografía URL, además de Latitud y Longitud. Estos campos reciben direcciones de documentos, no una carga de archivos.','Marque Autorizada o Rechazada de acuerdo con la revisión. Si rechaza, escriba Motivo de Rechazo.','Seleccione Enviar cuando el formulario esté completo. Compruebe con el responsable el registro si la pantalla no presenta una confirmación visible.']);
note('La pantalla de entrada revisada ofrece Agregar; no muestra una bandeja de fichas guardadas. Evite enviar repetidamente una ficha sin verificar primero su registro.');
screen('Ficha de cliente: solicitante y datos del cliente','datos generales, dirección y teléfonos');
screen('Ficha de cliente: venta y decisión','datos de venta, enlaces, coordenadas, autorización y Enviar');
heading('15.3 Salida de marcas',2);
steps(['Abra el vínculo de Salida marcas y revise las solicitudes del usuario.','Seleccione Ver en la solicitud que desea atender.','Compruebe vendedor, cliente, RTN, fecha y comentario.','Seleccione una clasificación del pedido; este dato habilita la aprobación.','Revise los artículos, cantidades, unidad de medida, precio y total. Ajuste cantidades únicamente cuando estén habilitadas y corresponda a su tarea.','Seleccione Aprobar o Rechazar y atienda cualquier confirmación que aparezca.','Compruebe el resultado en la bandeja antes de repetir la operación.']);
screen('Salida de marcas: listado y detalle','solicitud, clasificación, cantidades, total y botones Aprobar y Rechazar');
heading('15.4 Cobertura de tickets de vencimiento',2);
p('Los reportes de vencimiento se atienden mediante los tickets y los enlaces de revisión descritos en los capítulos 7 a 9. El repositorio incluye además pantallas separadas de tickets de vencimiento, pero la navegación principal revisada no publica un acceso a esa bandeja. Si recibe un vínculo específico, confirme con el administrador el recorrido habilitado; esta guía no asigna una ruta de acceso inexistente.');

heading('16. MENSAJES, CONSULTAS Y SOPORTE');
table('Situaciones frecuentes', ['Situación','Cómo proceder'], [['No puede iniciar sesión','Revise Nombre Usuario y Contraseña. Solicite al administrador revisar cuenta y permisos si persiste.'],['Las contraseñas no coinciden','Complete nuevamente Nueva Contraseña y Confirmar Contraseña con el mismo valor.'],['Acceso prohibido / opción ausente','Solicite al administrador revisar su perfil; las áreas pueden depender de permisos o configuración.'],['No hay solicitudes, tickets o punteos','Retire filtros, consulte otras páginas o el supervisor correcto y verifique que la carga terminó.'],['No se pudo cargar / Reintentar','Compruebe conexión y use Reintentar cuando esté disponible.'],['Descuento excede el límite','Ajuste el descuento adicional de los productos y revise el total.'],['No hay datos para el rango','Cambie las fechas o filtros del reporte.'],['Enlace vencido o utilizado','Solicite un nuevo enlace al responsable; conserve la referencia del ticket o ruta.'],['No fue posible guardar','Consulte el registro para descartar que se haya procesado antes de repetir.'],['Mapa no abre','Permita la nueva pestaña y revise que el registro tenga coordenadas.']]);
heading('16.1 Solicitar ayuda',2);
steps(['Informe su área de trabajo y el procedimiento que estaba realizando.','Indique fecha, hora y número del pedido, ticket, punteo o propuesta.','Copie el mensaje mostrado y describa el resultado esperado.','Adjunte una captura del problema con datos personales innecesarios ocultos.','Envíe la solicitud al canal de soporte interno establecido por su organización.']);
note('No envíe contraseñas ni enlaces completos de aprobación a personas ajenas al proceso. El contacto de soporte se consulta al administrador de PACO Admin.');

heading('17. GLOSARIO');
table('Términos de uso', ['Término','Significado'], [['Bandeja','Listado de registros disponibles para consulta o gestión.'],['Solicitud','Pedido o gestión que requiere revisión.'],['Descuento negociado','Descuento adicional considerado durante la aprobación.'],['Ticket','Registro de una incidencia con seguimiento y decisiones.'],['Plan de acción','Propuesta para resolver un problema, con responsable y fecha de compromiso.'],['CheckIn','Sistema de origen de los formularios utilizados para crear tickets.'],['Punteo','Registro de una ubicación de cliente propuesta para validación.'],['Suplente','Persona relacionada que puede asumir la atención durante la ausencia del principal.'],['Libro de ruta','Plan de visitas del vendedor organizado por día y orden.'],['CC','Destinatarios que reciben copia de una notificación.'],['CSV','Archivo de datos que puede abrirse o importarse en una hoja de cálculo.']]);

heading('18. REFERENCIAS');
p('Equipo de desarrollo PACO Admin. (2026a). Manual técnico para desarrolladores: Sistema PACO Admin (versión documental 1.0) [Documento interno].');
p('Equipo de desarrollo PACO Admin. (2026b). PACO Admin: Interfaces y procedimientos de usuario [Código fuente interno de los repositorios paco-admin-front y paco_admin_backend; revisión del 2 de octubre de 2026].');
note('Este manual adapta la presentación y el alcance de la referencia interna entregada por el responsable del proyecto. Las instrucciones de las áreas corresponden a la revisión de sus pantallas y acciones.');

heading('APÉNDICE A. INCORPORACIÓN DE CAPTURAS');
steps(['Abra este documento en Microsoft Word y ubique el recuadro CAP-xx del área que va a ilustrar.','Obtenga la captura de la pantalla indicada, con datos de ejemplo y los controles mencionados en Mostrar.','Seleccione el texto del recuadro y sustitúyalo por la imagen mediante Insertar → Imágenes. Mantenga la imagen En línea con el texto.','Ajuste el ancho de la imagen al área disponible (máximo aproximado: 15.9 cm). La altura del recuadro se adapta al contenido.','Conserve el número y título de la figura. Retire la nota Captura pendiente de incorporación del recuadro que haya completado.','Cuando finalice, seleccione todo con Ctrl+A y actualice los campos con F9. En cada índice, elija Actualizar toda la tabla.','Revise los saltos de página y exporte el PDF final.']);
note('Las capturas deben corresponder a la versión liberada. Excluya Pagos S4HANA y evite que su entrada aparezca en la captura del menú. No es necesario incorporar imágenes de pantallas que no estén habilitadas para el alcance operativo de su organización.');
table('Lista de capturas previstas', ['ID','Figura / pantalla','Contenido requerido'], figures.map(f=>[f.code,`${f.num}. ${f.title}`,f.details]));
heading('APÉNDICE B. GUÍA RÁPIDA DE OPERACIÓN');
table('Tareas y puntos de entrada', ['Necesidad','Acceso','Capítulo'], [['Revisar pedidos pendientes','Solicitudes pendientes → Ver detalle','5'],['Descargar aprobaciones','Solicitudes aprobadas → Exportar Datos','6'],['Consultar o importar incidencias','Tickets → Consultar / Importar formularios CheckIn','7'],['Proponer o aprobar soluciones','Detalle de ticket → acción habilitada','8'],['Confirmar resultado de productos','Enlace recibido por correo','9'],['Configurar suplencias','Tickets → Correos relacionados','10'],['Revisar visitas de vendedor','Enlace Libro de ruta','11'],['Validar ubicación de cliente','Punteo → supervisor → Nueva / Aprobar / Rechazar','12'],['Mantener catálogo','Vendedores y jerarquías','13'],['Crear o desactivar cuenta','Administrar usuarios','14'],['Atender áreas complementarias','Enlace habilitado por el administrador','15']]);

const sectPr = '<w:sectPr><w:headerReference w:type="default" r:id="rIdUserHeader"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:space="708"/></w:sectPr>';
const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${parts.join('')}${sectPr}</w:body></w:document>`;
fs.writeFileSync(path.join(output, 'document-source.xml'),xml,'utf8');
console.log(JSON.stringify({ output, figures:figures.length, tables:tables.length, paragraphs:parts.length }));
