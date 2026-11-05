# Correos sugeridos al iniciar la ejecución

La zona se determina por el primer carácter de `tbl_Ticket.CodigoVendedor`,
ignorando espacios externos y mayúsculas/minúsculas: `S` = SPS, `T` = TGU.
No se deduce una zona para otros valores, incluidos identificadores GUID.

Siempre se sugieren el correo del vendedor y el del supervisor, cuando existen.
Los siguientes contactos se agregan según el plan. Todos los nombres de la tabla
usan el dominio `@istmania.hn`.

| Plan | Ambas zonas | SPS | TGU |
| --- | --- | --- | --- |
| Promoción / descuento | Correo del Jefe de Marca del ticket; lissy.flores | — | — |
| Degustación | linda.morales | shirley.barrientos; denis.hernandez | nelly.gonzalez; maria.zelaya; claudia.perez |
| Cambio por cambio | hector.contreras; reina.espinal | ariana.garmendia; kenia.alvarez; eleasar.sagastume; carolina.puerto; cristian.caballero; mario.george | andrea.castro; robert.cabrera; jorge.varela; junior.osorto |
| Devolución/NC | hector.contreras; reina.espinal | zoila.padilla; natalia.izaguirre; más el grupo SPS de cambio por cambio | omar.caceres; gerardo.zelaya; más el grupo TGU de cambio por cambio |

`NOTA_CREDITO` conserva las mismas reglas que `DEVOLUCION`. Reubicación y otro
no agregan contactos adicionales. Sin zona reconocida se incluyen únicamente
los contactos de ambas zonas y los correos base disponibles.

Se toma el último plan de cada producto en `PLAN_APROBADO`; en tickets sin
productos se toma el último plan general. La bandeja web consulta los productos
seleccionados mediante `GET /api/Tickets/:id/correos-ejecucion?productos=40,41`.
El enlace de aprobación precarga los contactos de los productos pendientes de
ejecución. Varios tipos de plan combinan sus destinatarios sin duplicarlos.

La lista es editable: no se fuerzan nuevamente los contactos al enviar. Las
copias se envían al confirmar el inicio de ejecución y conservan la redirección
al destinatario de pruebas para tickets demo. Este cambio no requiere migración
SQL ni modifica el catálogo global de correos relacionados.
