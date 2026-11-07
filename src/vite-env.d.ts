/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Número de WhatsApp del negocio para el botón de contacto, solo dígitos con lada (p. ej. 5215512345678) */
  readonly VITE_WHATSAPP_NUMBER?: string
}
