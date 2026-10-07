// App
import { grantPlatformAdminCommand } from '../modules/backoffice/admins/grant-platform-admin.command.js';

/**
 * Run where the API runs, with its environment — in production, inside the `api` container:
 *
 *   node dist/commands/grant-platform-admin.js <e-mail>
 *
 * docs/repo/deploy.md, "The first platform administrator".
 */
process.exitCode = await grantPlatformAdminCommand(process.argv[2], {
  out: (line) => void process.stdout.write(`${line}\n`),
  error: (line) => void process.stderr.write(`${line}\n`),
});
