Los plazos se aplican únicamente al definir el plan (Jefe/Gerente de Marca,
24 horas laborables) y al aprobar o rechazar en Mercadeo (48 horas laborables).
Se cuentan desde la asignación a esa etapa, cuando aparece en la bandeja.
La primera asignación usa la creación del ticket; las siguientes usan el
historial de entrada a la etapa de cada producto. Reenviar un correo o contestar
otro producto no reinicia el plazo. Un rechazo que devuelve el producto a Marca
inicia una nueva etapa.

La jornada confirmada es lunes a viernes 08:00–17:00 y sábado 08:00–12:00,
hora de Honduras (UTC−6). El domingo no acumula horas. No se descuentan almuerzos
ni feriados porque no se indicó un calendario adicional. Las 24/48 horas son
horas acumuladas dentro de esa jornada, no días calendario.

Responder exactamente al límite no penaliza. Responder después sigue permitido:
el mismo registro del historial conserva el comentario y agrega el aviso de
respuesta tardía. También guarda `RespuestaTardia`, `ConllevaPenalizacion`,
`PlazoHoras`, `SegundosLaborales` y `FechaRecepcionEtapa`. La marca identifica la
penalización; no calcula un monto ni realiza descuentos económicos.
Los históricos anteriores a la instalación no se recalculan.

Los recordatorios se envían cada 8 horas transcurridas desde el último envío
al responsable de la etapa que sigue pendiente: Marca, Mercadeo, Gerencia
General, ejecución o vendedor. El proceso consulta pendientes cada 15 minutos;
cada reenvío genera un enlace nuevo que sirve como referencia para el siguiente
recordatorio. Dejan de enviarse al completar la etapa y no reinician el plazo
laboral de respuesta ni eliminan una penalización. Para habilitarlos:

```dotenv
TICKETS_REMINDERS_ENABLED=true
TICKETS_REMINDERS_INTERVAL_HOURS=8
TICKETS_REMINDERS_CHECK_INTERVAL_MINUTES=15
```

La reapertura se permite por producto desde un mes calendario antes de su
vencimiento hasta el propio día de vencimiento, inclusive, según la fecha de
Honduras. Por ejemplo, un producto que vence el 31 de marzo puede reabrirse
del 28 de febrero (29 en año bisiesto) al 31 de marzo. Antes de esa ventana,
después del vencimiento o sin fecha de vencimiento, la reapertura se rechaza;
el cierre sigue permitido. La fecha de creación del ticket no interviene.
Las rutas generales que reabren todo el ticket requieren que todos los productos
afectados cumplan la ventana; por producto se valida solo la selección enviada.

Reubicación se retira de los formularios y de los DTO. La base rechaza nuevos
planes de ese tipo, conservando los existentes y permitiendo que terminen su flujo.

Instalación en una base que ya tiene el módulo de tickets, en este orden:

1. `sql/tickets.sql` (incluye la función de ventana de reapertura y las rutas generales).
2. `sql/tickets-vencimiento-manual-aprobadores.sql`.
3. `sql/tickets-productos-flujo.sql`.
4. `sql/tickets.plazos-laborales.sql` (jornada y registro de penalización).
5. `sql/tickets.plazos-laborales.pruebas.sql` en un entorno de pruebas.

Publicar también el backend y el frontend del repositorio `paco-admin-front`.
Los scripts no se ejecutan automáticamente con NestJS. Las pruebas SQL usan
una transacción que revierte los datos de prueba. La caducidad y el uso único
de los enlaces de correo siguen siendo validaciones independientes del plazo
de respuesta; la bandeja permite responder tarde y se puede reenviar un enlace.
