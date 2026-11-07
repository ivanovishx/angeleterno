# Ángel Eterno · angeleterno.com

Tienda de lápidas de diseño moderno en madera y metal con corte láser.
React + TypeScript (Vite, Tailwind) en el frontend y Express + SQLite (`node:sqlite`) en el API.

## Funciones

- **Catálogo** con filtros por material, búsqueda y orden por precio.
- **Personalizador** con vista previa a escala en vivo: nombre, fechas, epitafio, tipografía, símbolo y notas.
  En piezas con metal, el **20% del área de la placa** se reserva para un mensaje familiar en corte láser;
  el límite de caracteres se calcula según las medidas de cada producto (`shared/types.ts → laserCharLimit`).
- **Zonas personalizables sobre la foto real**: en el dashboard se marcan sobre la foto principal de cada producto
  el área donde el cliente puede poner su propia imagen (polígono) y la placa con nombre, fechas y mensaje (rectángulo).
  La vista previa muestra la foto tal cual y solo cambia esas zonas; la imagen del cliente se ve en tono latón,
  como quedaría en corte láser, y se guarda con el pedido. Productos sin zonas usan la ilustración genérica.
- **Cuentas sin contraseña**: registro con número de WhatsApp; el código de acceso llega por WhatsApp o correo.
- **Historial de pedidos** con barra de progreso (Recibido → En diseño → En fabricación → Enviado → Entregado).
- **Dashboard** (`/admin`): subir productos con varias fotos (arrastrar o tocar), editar, ocultar, destacar,
  elegir foto principal, y gestionar pedidos. Cada cambio de estado avisa al cliente por WhatsApp.
- Diseño responsivo pensado primero para celular.

## Desarrollo

```bash
npm install
npm run seed     # catálogo de ejemplo
npm run dev      # web en http://localhost:5173, API en :4000
```

Sin proveedores configurados, los códigos y mensajes se imprimen en la consola del API
y el código también aparece en pantalla (solo en desarrollo).

Para entrar al dashboard, registra el número que pusiste en `ADMIN_PHONES` (en `.env` de ejemplo: `5500000000`).

## ⚠ Acceso de prueba (quitar antes de lanzar)

Mientras no estén configurados WhatsApp y correo, existe una cuenta de prueba con acceso de administrador:

- **WhatsApp:** `5511112222`
- **Contraseña (código):** `246810`

Se controla con el flag `TEST_LOGIN_FLAG` en `server/testLogin.ts` (o `TEST_LOGIN=false` en `.env` para apagarlo).
Para quitarlo por completo, borra ese archivo y las líneas marcadas con `TODO(quitar antes de lanzar)`.

## Configuración (`.env`)

Ver `.env.example`:

| Variable | Uso |
| --- | --- |
| `SESSION_SECRET` | Firma de sesiones. **Obligatorio cambiarlo en producción.** |
| `ADMIN_PHONES` | Teléfonos E.164 con acceso al dashboard, separados por coma. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | Envío por WhatsApp (Twilio). |
| `RESEND_API_KEY`, `EMAIL_FROM` | Envío por correo (Resend, con dominio angeleterno.com verificado). |
| `VITE_WHATSAPP_NUMBER` | Opcional: número del negocio para el botón flotante de WhatsApp. |

## Producción

```bash
npm run build
npm start        # sirve el sitio compilado y el API en el mismo puerto (PORT)
```

Los datos viven en `data/angeleterno.db` y las imágenes en `uploads/`: el servidor necesita disco persistente
(un VPS, Render, Railway, Fly.io con volumen, etc.) y respaldos de ambas carpetas.

## Estructura

```
shared/types.ts        Tipos y reglas compartidas (materiales, límites, zona láser 20%)
server/                API Express: auth por código, catálogo, pedidos, subida de imágenes
src/components/        Layout, MemorialPreview (vista previa SVG), Customizer
src/pages/             Inicio, catálogo, producto, carrito, acceso, cuenta
src/pages/admin/       Dashboard: resumen, catálogo, formulario de producto, pedidos
```
