// App
import { runInTerminal } from '../modules/billing/billing-command.js';
import { runBillingReportCommand } from '../modules/billing/billing-report.command.js';
import { platformAsaasOfThisDeployment } from '../modules/billing/platform-asaas.config.js';
import { env } from '../shared/config/env.js';

/*
  bee-link's pages as charging would find them, from a terminal (BEELINK-297):

    node dist/scripts/billing-report.js [--on <YYYY-MM-DD>]

  run in the api container, where the database and the variables are — `help` says the rest. Whether
  this deployment charges is read here, as the API reads it: the switch, and the key's presence.
*/

const charging = { enforced: env.BILLING_ENFORCED, keyed: platformAsaasOfThisDeployment().configured };

await runInTerminal((db, io) => runBillingReportCommand(process.argv.slice(2), db, io, charging));
