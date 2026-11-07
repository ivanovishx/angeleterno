// Se importa primero para que las variables de .env estén disponibles en los demás módulos
try {
  process.loadEnvFile()
} catch {
  // Sin archivo .env: se usan las variables del entorno
}
