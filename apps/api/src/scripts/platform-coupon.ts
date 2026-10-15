// App
import { runPlatformCouponCommand } from '../modules/billing/platform-coupon.command.js';
import { PrismaService } from '../shared/prisma/prisma.service.js';

/*
  bee-link's own coupons, from a terminal (BEELINK-224), until a screen makes them:

    node dist/scripts/platform-coupon.js <create | list | disable> …

  run in the api container, where the database and the variables are — `help` says the rest. All it
  does is runPlatformCouponCommand's; this file opens the database for it, and closes it.
*/

const prisma = new PrismaService();
let exitCode = 1;
try {
  await prisma.$connect();
  exitCode = await runPlatformCouponCommand(process.argv.slice(2), prisma, {
    out: (line) => process.stdout.write(`${line}\n`),
    err: (line) => process.stderr.write(`${line}\n`),
  });
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
} finally {
  await prisma.$disconnect();
}
process.exitCode = exitCode;
