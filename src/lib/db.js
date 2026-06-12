import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// the pg pool doesn't connect until the first query, so importing this
// without DATABASE_URL (e.g. during `next build`) is fine
function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = createClient();
} else {
  // reuse across hot reloads so dev doesn't leak connections
  if (!global.prisma) {
    global.prisma = createClient();
  }
  prisma = global.prisma;
}

export { prisma };
