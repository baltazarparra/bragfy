// Mock para o Prisma Client
const mockPrismaClient = {
  user: {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation(({ data }) => {
      return Promise.resolve({
        id: 1,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    })
  },
  activity: {
    create: jest.fn().mockImplementation(({ data }) => {
      return Promise.resolve({
        id: 1,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }),
    findMany: jest.fn().mockResolvedValue([])
  },
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined)
};

class PrismaClient {
  constructor() {
    return mockPrismaClient;
  }
}

module.exports = {
  PrismaClient
};
