/**
 * Envío de mensajes por WhatsApp (Twilio) y correo (Resend).
 * Si las credenciales no están configuradas, el mensaje se imprime en consola
 * para poder probar en desarrollo.
 */

export function whatsappConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM)
}

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY)
}

export async function sendWhatsApp(phone: string, body: string) {
  if (!whatsappConfigured()) {
    console.log(`\n📱 [WhatsApp simulado → ${phone}]\n${body}\n`)
    return
  }
  const sid = process.env.TWILIO_ACCOUNT_SID!
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ From: process.env.TWILIO_WHATSAPP_FROM!, To: `whatsapp:${phone}`, Body: body }),
  })
  if (!res.ok) throw new Error(`Twilio respondió ${res.status}: ${await res.text()}`)
}

export async function sendEmail(to: string, subject: string, text: string) {
  if (!emailConfigured()) {
    console.log(`\n✉️  [Correo simulado → ${to}] ${subject}\n${text}\n`)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? 'Ángel Eterno <hola@angeleterno.com>',
      to,
      subject,
      text,
    }),
  })
  if (!res.ok) throw new Error(`Resend respondió ${res.status}: ${await res.text()}`)
}
