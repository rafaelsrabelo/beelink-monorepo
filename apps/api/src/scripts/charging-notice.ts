// App
import { runInTerminal } from '../modules/billing/billing-command.js';
import { runChargingNoticeCommand } from '../modules/billing/charging-notice.command.js';

/*
  The notice that charging starts, from a terminal (BEELINK-297):

    node dist/scripts/charging-notice.js <send --on <YYYY-MM-DD> | status>

  run in the api container, where the database and the variables are — `help` says the rest. It only
  writes the notices: the api service that is running sends them.
*/

await runInTerminal((db, io) => runChargingNoticeCommand(process.argv.slice(2), db, io));
