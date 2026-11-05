# Publicación de motivos y comentarios de tickets — 2026-11-02

El paquete contiene el backend compilado en `dist/` y el frontend de producción
en `public/`, más los manifiestos de dependencias. No contiene credenciales ni
el archivo `.env`.

En la revisión, `http://10.10.10.9:55003/ticket/aprobar` seguía entregando una
compilación diferente a la local. Una ventana de incógnito sigue descargando
esa versión hasta actualizar los archivos publicados.

## Instalación en el servidor

1. Identificar la carpeta de la aplicación que escucha en el puerto 55003 y
   conservar una copia de su `dist/` y de su frontend actual.
2. Detener el proceso o servicio del backend.
3. Sustituir `dist/` por el del paquete. Conservar `.env` y las configuraciones
   propias del servidor. Comparar los manifiestos incluidos si la instalación
   tiene dependencias diferentes; no reemplazar las credenciales.
4. Publicar el contenido de `public/` en la carpeta indicada por
   `FRONTEND_DIST_PATH`. Si esa variable no está definida, Nest utiliza `public/`
   dentro del directorio de trabajo del proceso. Actualizar **todos** los chunks,
   estilos, assets e `index.html` de la misma compilación.
5. Reiniciar el backend con su comando habitual. No requiere ejecutar SQL.

## Acceso público mediante XAMPP

La dirección pública indicada es `http://190.4.28.70:55003/`. Configurar en el
`.env` del backend las variables de `enlaces-publicos-tickets.env.example` y
reiniciar el proceso con `pnpm start:prod`. La variable
`TICKETS_PUBLIC_FRONTEND_URL` tiene prioridad sobre las dos URLs individuales.
Los correos nuevos usarán `/ticket/aprobar` y `/ticket/responder` en esa IP;
los correos ya enviados conservan su dirección anterior.

Si Apache sirve Angular desde `htdocs`, actualizar esa carpeta con el contenido
completo de `public/` del paquete. Las rutas directas `/ticket/aprobar` y
`/ticket/responder` deben resolver a Angular; `/api` debe alcanzar el backend.
La compilación de producción usa URLs de API relativas al mismo origen.

Si Nest también atiende las rutas de Angular, mantener su `FRONTEND_DIST_PATH`
apuntando a la misma compilación actualizada. La dirección pública por sí sola
no identifica qué proceso entrega el HTML: en la comprobación HTTP tanto la
IP pública como la intranet seguían devolviendo el frontend anterior.

## Comprobación después de publicar

- Comparar los nombres de scripts del `index.html` publicado con el del paquete.
- Abrir un enlace vigente de aprobación: debe aparecer «Motivo de solicitud».
- En un producto reabierto debe aparecer «Motivo de reapertura de este producto»
  con el comentario guardado en el historial. Si una reapertura antigua no tiene
  comentario, se indica que no fue registrado.
- Reabrir sin motivo o con solo espacios debe ser rechazado.
- Registrar planes, aprobar y rechazar requieren comentario por producto, tanto
  por enlace como desde la bandeja. El comentario de ejecución sigue opcional.

Las comprobaciones automatizadas usan servicios de correo simulados. No se han
enviado notificaciones reales ni se ha publicado en el servidor remoto.
