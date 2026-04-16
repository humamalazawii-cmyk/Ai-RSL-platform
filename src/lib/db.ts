import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

// ============================================
// PRISMA CLIENT (singleton)
// ============================================
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient({ log: ['error', 'warn'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ============================================
// CONSTANTS
// ============================================
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-please';
const INVESTOR_PASS = process.env.INVESTOR_PASSWORD || 'RSL2026';

// ============================================
// PASSWORD HELPERS
// ============================================
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try { return await bcrypt.compare(password, hash); } catch { return false; }
}

export function checkInvestorPassword(password: string): boolean {
  return password === INVESTOR_PASS;
}

// ============================================
// SESSION (JWT) HELPERS
// ============================================
export interface Session {
  type: 'investor' | 'user';
  visitorId?: number;
  userId?: string;
  email?: string;
  role?: string;
}

export function createSession(payload: Session, expiresIn: string = '7d'): string {
  return jwt.sign(payload as object, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifySession(token: string): Session | null {
  try { return jwt.verify(token, JWT_SECRET) as Session; } catch { return null; }
}

export async function getInvestorSession(): Promise<Session | null> {
  const token = cookies().get('rsl-investor')?.value;
  if (!token) return null;
  const session = verifySession(token);
  return session?.type === 'investor' ? session : null;
}

export async function getUserSession(): Promise<Session | null> {
  const token = cookies().get('rsl-user')?.value;
  if (!token) return null;
  const session = verifySession(token);
  return session?.type === 'user' ? session : null;
}

// ============================================
// VISITOR TRACKING HELPERS
// ============================================
export async function registerVisitor(data: {
  name: string; email: string; phone?: string; company?: string;
  ipAddress: string; userAgent: string;
}) {
  return prisma.visitor.upsert({
    where: { email: data.email },
    update: { lastVisit: new Date(), totalVisits: { increment: 1 } },
    create: data,
  });
}

export async function logPageView(visitorId: number, path: string) {
  return prisma.pageView.create({ data: { visitorId, path } });
}
