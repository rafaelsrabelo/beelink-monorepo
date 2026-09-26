/** Every error the API answers. `errorCode` is stable to switch on; `message` is for logs. */
export interface ApiErrorBody {
  statusCode: number;
  errorCode: string;
  message: string;
  /**
   * What a refusal needs for the screen to answer it — which lines, how many are left. Absent on
   * almost every error; its shape is named by the code that carries it (`OrderStockDetails` for
   * `ORDER_STOCK_INSUFFICIENT`).
   */
  details?: unknown;
}
