/**
 * TODO(quitar antes de lanzar): credenciales fijas de la cuenta de prueba.
 * Las usan el servidor (server/testLogin.ts) y la versión demo (src/lib/demoApi.ts).
 */
export const TEST_LOGIN_FLAG = true

export const TEST_USER = {
  name: 'Usuario de Prueba',
  phone: '+525511112222',
  email: 'prueba@angeleterno.com',
}

/** Funciona como contraseña: es el código de 6 dígitos que se acepta siempre para TEST_USER */
export const TEST_PASSWORD = '246810'
