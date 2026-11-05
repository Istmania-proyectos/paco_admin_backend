# Automatización de tickets de CheckIn

## Regla de agrupación

El formulario configurado (14 por defecto) se procesa con esta llave:

`formulario + dependencia_respuesta + jefe de marca`

Las preguntas `45` (Casa) y `46` (Marca) se ordenan por
`respuesta_detalle` y se emparejan por ocurrencia. En ambos valores se utiliza
únicamente el texto anterior a la primera coma. La combinación resultante se
compara con las asignaciones activas de `dbo.tbl_Casa_Usuario`.

- Una dependencia con productos de un solo jefe produce un ticket.
- Una dependencia con productos de dos jefes produce dos tickets.
- Una respuesta puede quedar relacionada a ambos tickets.
- Una Casa/Marca sin jefe, con más de un jefe activo o con un jefe sin correo
  aparece como error de simulación y no se importa.
- Si aparecen respuestas nuevas para una dependencia ya importada, se agregan
  al ticket vigente del mismo jefe en lugar de crear un duplicado.

El campo mostrado como `Cliente` es `codigo - descripcion`; el código también
se conserva por separado.

Si un ticket muestra artículos de otros formularios, ejecutar
`sql/tickets.automatizacion-checkin.diagnostico.sql` indicando su número.
El resultado permite comparar la dependencia de cada respuesta con la del
ticket. El bloque de inserción de detalles debe filtrar tanto la dependencia
actual como el jefe de marca; filtrar solo el jefe mezcla grupos distintos.
La corrección se instala ejecutando `sql/tickets.automatizacion-checkin.sql`
en la base correspondiente. No elimina los detalles o productos ya copiados:
estos requieren revisión antes de cualquier reparación. La regresión SQL está
en `sql/tickets.automatizacion-checkin.pruebas.sql` y solo usa tablas temporales.

## Instalación SQL

Ejecutar, en orden y sobre la base de pruebas:

1. `sql/tickets.sql`
2. `sql/tickets.aprobacion-correo.sql`
3. `sql/tickets.automatizacion-checkin.sql`

El script supone que el linked server de CheckIn se llama `10.10.10.10`, igual
que los scripts actuales. Si el nombre configurado es otro, debe reemplazarse
antes de ejecutar.

## Simulación

Si aparece `Timeout: Request failed to complete in 15000ms`, configurar
`DB_REQUEST_TIMEOUT_MS=120000` en el `.env` del backend, recompilar y reiniciar
el servicio. El valor está en milisegundos y aplica a las consultas SQL del
backend; si no se define, se conserva el límite de 15000 ms. Aumentarlo permite
consultas más largas, pero no resuelve bloqueos ni consultas lentas en CheckIn.
Para medir la importación sin crear tickets, ejecutar primero el procedimiento
`dbo.PACO_TICKET_AUTOMATIZAR_CHECKIN` con `@Formulario=14, @Ejecutar=0` desde
SQL Server Management Studio sobre la base de PACO Admin.

Los endpoints requieren JWT y rol `ADMIN`.

```http
GET /api/Tickets/automatizacion/simulacion?formulario=14
GET /api/Tickets/automatizacion/renovaciones/simulacion?dias=30
```

Ambos son de solo lectura: no crean tickets, no generan tokens y no envían
correo. Devuelven los destinatarios hipotéticos por separado:

- `CorreoJefeMarca`, resuelto por Casa/Marca.
- `CorreoMercadeo`, estático.
- `CorreoGerenciaGeneral`, estático.
- `CorreoVendedor`, tomado del vendedor asignado al cliente en SAP.

El responsable se resuelve con `R.cliente = APP_CLIENTES_S4.CardCode` en
`PACO_S4HANA`, y `SlpCode = tbl_Vendedor.id_sap_vendedor` en PACO Admin.
`SlpCode` es alfanumerico (por ejemplo `S07`). Se guardan el
`codigo_vendedor`, `nombre_vendedor` y `email` del maestro habitual. El
supervisor se sigue resolviendo en `tbl_Supervisor_Gerente` usando ese
`codigo_vendedor`. `R.usuario` conserva quien envio el formulario; no define
al responsable ni el destinatario del enlace de cierre/reapertura.

Las filas repetidas de un mismo `CardCode/SlpCode` se deduplican. Un grupo
sin vendedor, con varios vendedores, sin maestro o sin correo no se importa;
la simulacion devuelve `SIN_VENDEDOR_CLIENTE`, `VENDEDOR_AMBIGUO`,
`SIN_VENDEDOR_MAESTRO` o `VENDEDOR_SIN_CORREO`. Si una dependencia contiene
varios clientes devuelve `CLIENTE_AMBIGUO`.

### Correccion de tickets ya importados

Reinstalar `sql/tickets.automatizacion-checkin.sql` para las importaciones
nuevas. Ejecutar `sql/tickets.checkin-vendedor.pruebas.sql` para verificar la
resolucion con tablas temporales. Luego instalar
`sql/tickets.checkin-vendedor-reparacion.sql` y revisar primero:

```sql
EXEC dbo.PACO_TICKET_CHECKIN_REASIGNAR_VENDEDOR @Ejecutar=0;
-- Aplicar solamente un ticket revisado:
EXEC dbo.PACO_TICKET_CHECKIN_REASIGNAR_VENDEDOR @Ejecutar=1, @IdTicket=123;
```

`sql/tickets.checkin-vendedor-reparacion.pruebas.sql` verifica con tablas
temporales que la simulacion no escribe, la correccion invalida los enlaces
anteriores, conserva el estado y es idempotente.

La reparacion cubre tickets activos de CheckIn del formulario 14, incluso si
el formulario ya esta marcado como migrado. Excluye demos, deja historial,
mantiene el estado del ticket e invalida los enlaces anteriores sin usar si
cambia el codigo o correo del vendedor. Los casos sin asignacion valida
quedan sin modificar y se muestran en el resultado. La reparacion no envia
correos: para tickets pendientes de cierre, reenviar la notificacion desde la
bandeja (`POST /api/Tickets/{id}/reenviar-notificacion`) para emitir el enlace
al vendedor correcto. Compilar/publicar el backend para actualizar tambien
la etiqueta del correo a "Vendedor responsable del cliente".

`ContactosHipoteticos` presenta los cuatro roles en una sola cadena para
facilitar la revisión funcional, aunque cada correo también se devuelve en su
propio campo.

Los estados principales de diagnóstico son `LISTO_CREAR`,
`LISTO_ACTUALIZAR`, `YA_IMPORTADO`, `SIN_JEFE_MARCA`,
`ASIGNACION_AMBIGUA` y `JEFE_SIN_CORREO`.

## Ejecución manual controlada

Después de configurar como mínimo el correo de Mercadeo:

```http
POST /api/Tickets/automatizacion/ejecutar
Content-Type: application/json

{"formulario":14}
```

```http
POST /api/Tickets/automatizacion/renovaciones/ejecutar
Content-Type: application/json

{"dias":30}
```

La creación y su trazabilidad ocurren en una transacción SQL. Después del
commit, el backend genera el enlace y envía la notificación. Los errores de
SMTP quedan aislados del ticket y se registran con el mecanismo existente.

## Renovación mensual

Un ticket activo que continúa sin `CERRADO` o `CANCELADO` después del número
configurado de días:

1. genera un ticket hijo con prioridad `ALTA`;
2. copia los detalles y los destinatarios;
3. adjunta en la descripción y el historial un resumen cronológico del ticket
   anterior;
4. marca el anterior como `CANCELADO` con la acción `RENOVAR_MENSUAL`;
5. mueve el grupo CheckIn al ticket nuevo, evitando renovaciones duplicadas.

Cada ticket puede tener un único sucesor mensual. Si el sucesor tampoco se
resuelve, al cumplir su propio mes generará el siguiente ciclo.

## Activación periódica futura

La tarea interna nace desactivada:

```dotenv
TICKETS_AUTOMATION_ENABLED=false
TICKETS_AUTOMATION_DRY_RUN=true
TICKETS_AUTOMATION_INTERVAL_MINUTES=60
TICKETS_AUTOMATION_FORM_ID=14
TICKETS_AUTOMATION_RENEWAL_DAYS=30
TICKETS_AUTOMATION_USER_ID=AUTOMATIZACION_CHECKIN
TICKETS_MARKETING_MANAGER_EMAIL=
TICKETS_GENERAL_MANAGER_EMAIL=
```

Primero se configura `ENABLED=true` conservando `DRY_RUN=true` y se revisan
los ciclos en logs. Solo después de validar destinatarios y resultados se
cambia `DRY_RUN=false`. El intervalo mínimo aceptado es cinco minutos y se
impide que dos ciclos se ejecuten simultáneamente en la misma instancia.

En despliegues con varias instancias del backend se recomienda ejecutar la
automatización en una sola instancia o sustituir el temporizador por un SQL
Agent/planificador con exclusión distribuida.

## Modo demostración

La bandeja de Tickets contiene el botón `Modo demostración`. El usuario
configurado en `TICKETS_DEMO_EMAIL` debe escribir `TEST` para iniciar el
escenario.

- Se crean como máximo dos tickets automáticos.
- Cada ticket queda marcado permanentemente con `EsDemo=1` y `CorreoDemo`.
- Jefe de Marca, Mercadeo, Gerencia General y Vendedor conservan su rol en el
  flujo, pero la entrega SMTP se redirige al correo de demostración.
- El correo incluye una franja `MODO DEMOSTRACIÓN`, el rol representado y el
  destinatario real que fue protegido.
- Los tickets normales no se redirigen.
- No se puede iniciar otra demostración mientras existan tickets demo activos.
- La banda de demo incluye `Borrar tickets demo`; solicita nuevamente `TEST`,
  respalda los registros y elimina exclusivamente tickets con `EsDemo=1`.

Los destinatarios estáticos configurados para el flujo real son:

- Mercadeo: `jairo.canales@istmania.hn`
- Gerencia General: `manuel.munguia@istmania.hn`

Cada notificación al siguiente encargado contiene el resumen completo del
ticket: encabezado, cliente, vendedor, respuestas de CheckIn, plan vigente,
tipo de acción, responsable, fecha compromiso, comentarios e historial.

El inicio de demo está reservado al usuario cuyo nombre de sesión coincide con
`TICKETS_DEMO_EMAIL`; no depende de que tenga el rol `ADMIN`.
