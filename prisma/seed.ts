import { PrismaClient, Role, AccountType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default organization
  const org = await prisma.organization.upsert({
    where: { id: 'default-org' },
    update: {},
    create: {
      id: 'default-org',
      name: 'شركة تجريبية',
      sector: 'TRADING',
      country: 'IQ',
      baseCurrency: 'IQD',
      accountStandard: 'IRAQI',
    },
  });
  console.log('✓ Organization:', org.name);

  // Create super admin
  const adminPass = await bcrypt.hash('RSL-Admin-2026', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rsl-ai.com' },
    update: { passwordHash: adminPass },
    create: {
      email: 'admin@rsl-ai.com',
      passwordHash: adminPass,
      name: 'Hammam Al-Azzawi',
      role: Role.SUPER_ADMIN,
      organizationId: org.id,
    },
  });
  console.log('✓ Admin user:', admin.email);

  // Sample Iraqi Chart of Accounts (minimal starter - 10 accounts)
  const accounts = [
    { code: '1', nameAr: 'الأصول', type: AccountType.ASSET, level: 1 },
    { code: '11', nameAr: 'الأصول المتداولة', type: AccountType.ASSET, level: 2, parent: '1' },
    { code: '111', nameAr: 'النقدية وما يعادلها', type: AccountType.ASSET, level: 3, parent: '11' },
    { code: '11101', nameAr: 'الصندوق', type: AccountType.ASSET, level: 4, parent: '111' },
    { code: '11102', nameAr: 'البنك', type: AccountType.ASSET, level: 4, parent: '111' },
    { code: '2', nameAr: 'الخصوم', type: AccountType.LIABILITY, level: 1 },
    { code: '3', nameAr: 'حقوق الملكية', type: AccountType.EQUITY, level: 1 },
    { code: '4', nameAr: 'الإيرادات', type: AccountType.REVENUE, level: 1 },
    { code: '5', nameAr: 'المصروفات', type: AccountType.EXPENSE, level: 1 },
    { code: '51', nameAr: 'مصروفات تشغيلية', type: AccountType.EXPENSE, level: 2, parent: '5' },
  ];

  const codeToId: Record<string, string> = {};
  for (const a of accounts) {
    const parentId = a.parent ? codeToId[a.parent] : null;
    const acc = await prisma.account.upsert({
      where: { organizationId_code: { organizationId: org.id, code: a.code } },
      update: {},
      create: {
        organizationId: org.id,
        code: a.code,
        nameAr: a.nameAr,
        type: a.type,
        level: a.level,
        parentId,
      },
    });
    codeToId[a.code] = acc.id;
  }
  console.log(`✓ ${accounts.length} sample accounts created`);

  // UoM seed (minimal)
  const weight = await prisma.uoMCategory.upsert({
    where: { id: 'weight' },
    update: {},
    create: { id: 'weight', nameAr: 'الوزن', nameEn: 'Weight', baseUnit: 'kg' },
  });
  for (const u of [
    { code: 'kg', nameAr: 'كيلوغرام', conversionRate: 1, isBase: true },
    { code: 'g', nameAr: 'غرام', conversionRate: 0.001 },
    { code: 'ton', nameAr: 'طن', conversionRate: 1000 },
  ]) {
    await prisma.unitOfMeasure.upsert({
      where: { code: u.code },
      update: {},
      create: { ...u, categoryId: weight.id },
    });
  }
  console.log('✓ UoM categories created');

  console.log('✅ Seed complete!');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
