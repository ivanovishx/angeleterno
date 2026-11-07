/**
 * TODO(quitar antes de lanzar): acceso de prueba con credenciales fijas.
 * Permite entrar sin recibir el código por WhatsApp o correo mientras no hay proveedores configurados.
 * Para apagarlo sin borrar el código: TEST_LOGIN=false en .env. Para quitarlo: borra este archivo y sus usos en index.ts y db.ts.
 */
export const TEST_LOGIN_FLAG = true

export const TEST_USER = {
  name: 'Usuario de Prueba',
  phone: '+525511112222',
  email: 'prueba@angeleterno.com',
}

/** Funciona como contraseña: es el código de 6 dígitos que se acepta siempre para TEST_USER */
export const TEST_PASSWORD = '246810'

export function testLoginEnabled() {
  return TEST_LOGIN_FLAG && process.env.TEST_LOGIN !== 'false'
}

export function isTestPhone(phone: string) {
  return testLoginEnabled() && phone === TEST_USER.phone
}
