/** Every error the API answers. `errorCode` is stable to switch on; `message` is for logs. */
export interface ApiErrorBody {
  statusCode: number;
  errorCode: string;
  message: string;
}
