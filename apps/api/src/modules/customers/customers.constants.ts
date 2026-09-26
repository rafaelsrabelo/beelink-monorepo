// Types
import type { CustomerStage, StoreCustomerSort } from '@harness-monorepo/contracts';

/** A page of the panel's customers list: a screenful, as the leads list reads. */
export const CUSTOMERS_PAGE_SIZE = 20;
export const CUSTOMERS_PAGE_SIZE_MAX = 100;

/** The longest search the list takes: a name, an e-mail or a phone fits well under it. */
export const CUSTOMERS_SEARCH_MAX_LENGTH = 80;

export const CUSTOMER_STAGES = ['LEAD', 'CUSTOMER', 'INACTIVE'] as const satisfies readonly CustomerStage[];
export const CUSTOMER_SORTS = ['RECENT', 'LAST_ORDER', 'MOST_ORDERS', 'TOP_SPENT'] as const satisfies readonly StoreCustomerSort[];
