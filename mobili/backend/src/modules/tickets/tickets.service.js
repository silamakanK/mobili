const QRCode = require('qrcode')
const PDFDocument = require('pdfkit')
const prisma = require('../../config/prisma')

function generateCode(prefix, length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = `${prefix}-`
  for (let i = 0; i < length; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

async function generateTicket(reservationId) {
  let ticketCode, qrCode
  do {
    ticketCode = generateCode('TKT', 8)
  } while (await prisma.ticket.findUnique({ where: { ticketCode } }))
  do {
    qrCode = generateCode('QR', 16)
  } while (await prisma.ticket.findUnique({ where: { qrCode } }))

  return prisma.ticket.create({ data: { reservationId, ticketCode, qrCode } })
}

async function getTicketById(id, userId) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      reservation: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          trip: {
            include: {
              route: { include: { company: { select: { name: true } } } },
              vehicle: { select: { type: true } },
            },
          },
          seat: { select: { seatNumber: true, type: true } },
        },
      },
    },
  })
  if (!ticket) {
    const err = new Error('Billet introuvable.')
    err.status = 404
    throw err
  }
  if (ticket.reservation.userId !== userId) {
    const err = new Error('Accès non autorisé.')
    err.status = 403
    throw err
  }
  return ticket
}

async function getTicketPdf(id, userId) {
  const ticket = await getTicketById(id, userId)
  const { reservation } = ticket
  const { trip, seat, user } = reservation

  const qrImageBuffer = await QRCode.toBuffer(ticket.qrCode, { type: 'png', width: 180, margin: 1 })

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 35 })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(22).font('Helvetica-Bold').text('MOBILI', { align: 'center' })
    doc
      .fontSize(9)
      .font('Helvetica')
      .text('Plateforme de transport interurbain — Mali', { align: 'center' })
    doc.moveDown(0.5)
    doc.moveTo(35, doc.y).lineTo(420, doc.y).stroke()
    doc.moveDown(0.5)

    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(`Billet #${ticket.ticketCode}`, { align: 'center' })
    doc.moveDown(0.3)
    doc.fontSize(17).text(`${trip.route.origin}  →  ${trip.route.destination}`, { align: 'center' })
    doc.moveDown(0.5)

    doc.fontSize(10).font('Helvetica')
    doc.text(`Compagnie : ${trip.route.company.name}`)
    doc.text(`Date de départ : ${new Date(trip.departureDate).toLocaleDateString('fr-FR')}`)
    doc.text(`Heure : ${trip.departureTime}`)
    doc.text(`Siège : ${seat.seatNumber}  (${seat.type})`)
    doc.moveDown(0.5)
    doc.text(`Passager : ${user.firstName} ${user.lastName}`)
    doc.text(`Téléphone : ${user.phone}`)
    doc.moveDown(0.5)
    doc.text(`Montant payé : ${reservation.totalAmount} FCFA`)
    doc
      .fillColor(ticket.isUsed ? 'red' : 'green')
      .text(`Statut : ${ticket.isUsed ? 'Utilisé' : 'Valide'}`)
      .fillColor('black')
    doc.moveDown(0.8)

    const pageWidth = doc.page.width - 70
    const qrX = 35 + (pageWidth - 130) / 2
    doc.image(qrImageBuffer, qrX, doc.y, { width: 130 })
    doc.moveDown(6)
    doc.fontSize(7).text(`Code de secours : ${ticket.qrCode}`, { align: 'center' })

    doc.end()
  })
}

async function searchTickets({ q, companyId }) {
  const tickets = await prisma.ticket.findMany({
    where: {
      reservation: {
        status: 'CONFIRMED',
        trip: { route: { companyId } },
        OR: [
          { user: { firstName: { contains: q, mode: 'insensitive' } } },
          { user: { lastName: { contains: q, mode: 'insensitive' } } },
          { user: { phone: { contains: q } } },
        ],
      },
    },
    include: {
      reservation: {
        include: {
          user: { select: { firstName: true, lastName: true, phone: true } },
          trip: { include: { route: { select: { origin: true, destination: true } } } },
          seat: { select: { seatNumber: true } },
        },
      },
    },
    take: 20,
  })
  return tickets
}

module.exports = { generateTicket, getTicketById, getTicketPdf, searchTickets }
