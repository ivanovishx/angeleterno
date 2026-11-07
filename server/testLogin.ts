/**
 * TODO(quitar antes de lanzar): acceso de prueba con credenciales fijas (shared/testLogin.ts).
 * Permite entrar sin recibir el código por WhatsApp o correo mientras no hay proveedores configurados.
 * Para apagarlo sin borrar el código: TEST_LOGIN=false en .env. Para quitarlo: borra este archivo,
 * shared/testLogin.ts y las líneas marcadas con TODO(quitar antes de lanzar).
 */
import { TEST_LOGIN_FLAG, TEST_USER } from '../shared/testLogin.ts'

export { TEST_PASSWORD, TEST_USER } from '../shared/testLogin.ts'

export function testLoginEnabled() {
  return TEST_LOGIN_FLAG && process.env.TEST_LOGIN !== 'false'
}

export function isTestPhone(phone: string) {
  return testLoginEnabled() && phone === TEST_USER.phone
}
