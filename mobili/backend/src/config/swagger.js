const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mobili API',
      version: '1.0.0',
      description: 'API REST — Plateforme de transport interurbain au Mali',
      contact: { name: 'Équipe Mobili', email: 'dev@mobili.ml' },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Développement local' },
      { url: 'https://mobili-api.onrender.com', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['VOYAGEUR', 'AGENT', 'ADMIN_COMPANY', 'SUPER_ADMIN'] },
          },
        },
        Trip: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            departureDate: { type: 'string', format: 'date' },
            departureTime: { type: 'string', example: '08:00' },
            price: { type: 'integer', example: 6500 },
            availableSeats: { type: 'integer' },
            status: { type: 'string', enum: ['SCHEDULED', 'CANCELLED', 'COMPLETED'] },
            route: {
              type: 'object',
              properties: {
                origin: { type: 'string' },
                destination: { type: 'string' },
              },
            },
            company: {
              type: 'object',
              properties: { id: { type: 'string' }, name: { type: 'string' } },
            },
          },
        },
        Reservation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            reservationCode: { type: 'string', example: 'MOB-ABCD1234' },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED'] },
            totalAmount: { type: 'integer', example: 6500 },
          },
        },
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentification et gestion de session' },
      { name: 'Trips', description: 'Recherche et détail des trajets' },
      { name: 'Reservations', description: 'Réservation de sièges' },
      { name: 'Payments', description: 'Paiement et webhook PayDunya' },
      { name: 'Tickets', description: 'Billets électroniques et validation' },
      { name: 'Companies', description: 'Gestion des compagnies' },
      { name: 'Users', description: 'Gestion des utilisateurs' },
    ],
    paths: {
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Créer un compte',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['firstName', 'lastName', 'email', 'phone', 'password'],
                  properties: {
                    firstName: { type: 'string', example: 'Moussa' },
                    lastName: { type: 'string', example: 'Diallo' },
                    email: { type: 'string', format: 'email' },
                    phone: { type: 'string', example: '+22376000001' },
                    password: { type: 'string', minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Compte créé',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/User' },
                          token: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { description: 'Données invalides' },
            409: { description: 'Email ou téléphone déjà utilisé' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Se connecter',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Connexion réussie' },
            401: { description: 'Identifiants incorrects' },
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Se déconnecter',
          responses: { 200: { description: 'Déconnecté' } },
        },
      },
      '/api/trips': {
        get: {
          tags: ['Trips'],
          summary: 'Rechercher des trajets',
          parameters: [
            {
              name: 'from',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              example: 'Bamako',
            },
            {
              name: 'to',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              example: 'Kayes',
            },
            {
              name: 'date',
              in: 'query',
              required: true,
              schema: { type: 'string', format: 'date' },
              example: '2026-06-18',
            },
          ],
          responses: {
            200: { description: 'Liste des trajets disponibles' },
            400: { description: 'Paramètres manquants' },
          },
        },
      },
      '/api/trips/{id}': {
        get: {
          tags: ['Trips'],
          summary: "Détail d'un trajet",
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Détail du trajet avec sièges' },
            404: { description: 'Trajet introuvable' },
          },
        },
      },
      '/api/reservations': {
        post: {
          tags: ['Reservations'],
          summary: 'Créer une réservation',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['tripId', 'seatId'],
                  properties: {
                    tripId: { type: 'string', format: 'uuid' },
                    seatId: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Réservation créée (PENDING)' },
            401: { description: 'Non authentifié' },
            404: { description: 'Trajet ou siège introuvable' },
            409: { description: 'Siège déjà réservé' },
          },
        },
      },
      '/api/reservations/me': {
        get: {
          tags: ['Reservations'],
          summary: 'Mes réservations',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "Liste des réservations de l'utilisateur connecté" } },
        },
      },
      '/api/reservations/{id}': {
        get: {
          tags: ['Reservations'],
          summary: "Détail d'une réservation",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Détail complet de la réservation' },
            404: { description: 'Réservation introuvable' },
          },
        },
      },
      '/api/payments/initiate': {
        post: {
          tags: ['Payments'],
          summary: 'Initier un paiement',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['reservationId', 'method'],
                  properties: {
                    reservationId: { type: 'string', format: 'uuid' },
                    method: {
                      type: 'string',
                      enum: ['ORANGE_MONEY', 'MOOV_MONEY', 'WAVE', 'CARD'],
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Paiement initié' },
            400: { description: 'Réservation déjà payée ou non payable' },
          },
        },
      },
      '/api/payments/webhook': {
        post: {
          tags: ['Payments'],
          summary: 'Webhook de confirmation PayDunya',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['reservationCode', 'transactionId', 'status'],
                  properties: {
                    reservationCode: { type: 'string' },
                    transactionId: { type: 'string' },
                    status: { type: 'string', enum: ['success', 'failed'] },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Paiement traité' } },
        },
      },
      '/api/tickets/{id}': {
        get: {
          tags: ['Tickets'],
          summary: "Détail d'un billet",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Billet avec QR code' },
            404: { description: 'Billet introuvable' },
          },
        },
      },
      '/api/tickets/{id}/download': {
        get: {
          tags: ['Tickets'],
          summary: 'Télécharger le billet en PDF',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'PDF du billet', content: { 'application/pdf': {} } } },
        },
      },
      '/api/tickets/validate': {
        post: {
          tags: ['Tickets'],
          summary: 'Valider un billet par QR code (agent)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['qrCode'],
                  properties: { qrCode: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Billet VALIDE' },
            422: { description: 'ALREADY_USED / INVALID / NOT_FOUND' },
          },
        },
      },
    },
  },
  apis: [],
}

module.exports = swaggerJsdoc(options)
