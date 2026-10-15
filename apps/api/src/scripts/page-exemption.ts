// App
import { runInTerminal } from '../modules/billing/billing-command.js';
import { runPageExemptionCommand } from '../modules/billing/page-exemption.command.js';

/*
  The pages bee-link charges nothing for, from a terminal (BEELINK-297):

    node dist/scripts/page-exemption.js <exempt --slug <SLUG> | unexempt --slug <SLUG> | list>

  run in the api container, where the database and the variables are — `help` says the rest.
*/

await runInTerminal((db, io) => runPageExemptionCommand(process.argv.slice(2), db, io));
