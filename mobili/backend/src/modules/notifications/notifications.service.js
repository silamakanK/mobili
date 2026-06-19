const nodemailer = require('nodemailer')
const prisma = require('../../config/prisma')
const logger = require('../../config/logger')

function createTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

async function sendEmail({ to, subject, html }) {
  const transporter = createTransporter()
  if (!transporter) {
    logger.info(`[EMAIL simulé] To: ${to} | Subject: ${subject}`)
    return
  }
  await transporter.sendMail({ from: `"Mobili" <${process.env.SMTP_USER}>`, to, subject, html })
}

async function sendSms({ phone, message }) {
  if (!process.env.SMS_API_KEY) {
    logger.info(`[SMS simulé] To: ${phone} | ${message}`)
    return
  }
  // Connecter Infobip ou Twilio ici selon le provider choisi
  logger.info(`[SMS] To: ${phone}`)
}

async function notifyReservationConfirmed(reservationId) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      trip: { include: { route: { select: { origin: true, destination: true } } } },
      ticket: { select: { ticketCode: true } },
    },
  })
  if (!reservation) return

  const { user, trip, ticket } = reservation
  const origin = trip.route.origin
  const destination = trip.route.destination
  const date = new Date(trip.departureDate).toLocaleDateString('fr-FR')
  const ticketCode = ticket?.ticketCode || reservation.reservationCode

  const emailHtml = `
    <h2>Votre réservation est confirmée !</h2>
    <p>Bonjour ${user.firstName},</p>
    <p>Votre billet Mobili est prêt.</p>
    <table>
      <tr><td><strong>Trajet</strong></td><td>${origin} → ${destination}</td></tr>
      <tr><td><strong>Date</strong></td><td>${date} à ${trip.departureTime}</td></tr>
      <tr><td><strong>Réf. billet</strong></td><td>${ticketCode}</td></tr>
      <tr><td><strong>Montant payé</strong></td><td>${reservation.totalAmount.toLocaleString('fr-FR')} FCFA</td></tr>
    </table>
    <p>Présentez votre QR code à l'embarquement. Bon voyage !</p>
  `
  const smsMessage = `Mobili - Billet confirmé ! ${origin}→${destination} le ${date} à ${trip.departureTime}. Réf: ${ticketCode}`

  await Promise.allSettled([
    sendEmail({ to: user.email, subject: 'Votre billet Mobili est prêt', html: emailHtml }),
    sendSms({ phone: user.phone, message: smsMessage }),
    prisma.notification.create({
      data: {
        userId: reservation.userId,
        type: 'RESERVATION_CONFIRMED',
        channel: 'EMAIL',
        content: `Billet ${ticketCode} — ${origin} → ${destination}`,
        sentAt: new Date(),
        status: 'SENT',
      },
    }),
  ])
}

async function notifyTripCancelled(tripId) {
  const reservations = await prisma.reservation.findMany({
    where: { tripId, status: 'CONFIRMED' },
    include: {
      user: { select: { firstName: true, email: true, phone: true } },
      trip: { include: { route: { select: { origin: true, destination: true } } } },
    },
  })
  for (const reservation of reservations) {
    const { user, trip } = reservation
    const msg = `Mobili - Trajet ${trip.route.origin}→${trip.route.destination} annulé. Contactez le support.`
    await Promise.allSettled([
      sendEmail({ to: user.email, subject: 'Trajet annulé — Mobili', html: `<p>${msg}</p>` }),
      sendSms({ phone: user.phone, message: msg }),
    ])
  }
}

module.exports = { notifyReservationConfirmed, notifyTripCancelled }
