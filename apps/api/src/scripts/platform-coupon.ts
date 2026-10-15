// App
import { runInTerminal } from '../modules/billing/billing-command.js';
import { runPlatformCouponCommand } from '../modules/billing/platform-coupon.command.js';

/*
  bee-link's own coupons, from a terminal (BEELINK-224), until a screen makes them:

    node dist/scripts/platform-coupon.js <create | list | disable> …

  run in the api container, where the database and the variables are — `help` says the rest. All it
  does is runPlatformCouponCommand's; runInTerminal opens the database for it, and closes it.
*/

await runInTerminal((db, io) => runPlatformCouponCommand(process.argv.slice(2), db, io));
