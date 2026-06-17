const prisma = require('../../config/prisma')

async function listCompanies({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit
  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        logo: true,
        contactEmail: true,
        contactPhone: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.company.count({ where: { isActive: true } }),
  ])
  return { companies, total, page, limit }
}

async function getCompanyById(id) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      routes: { where: { isActive: true }, select: { id: true, origin: true, destination: true } },
      vehicles: {
        where: { isActive: true },
        select: { id: true, registrationNumber: true, type: true, totalSeats: true },
      },
    },
  })
  if (!company) {
    const err = new Error('Compagnie introuvable.')
    err.status = 404
    throw err
  }
  return company
}

async function createCompany(data) {
  return prisma.company.create({ data })
}

async function updateCompany(id, data) {
  await getCompanyById(id)
  return prisma.company.update({ where: { id }, data })
}

module.exports = { listCompanies, getCompanyById, createCompany, updateCompany }
