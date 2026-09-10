/** A person with an account, as every surface shows them. Account rules live in docs/product. */
export interface User {
  id: string;
  name: string;
  email: string;
  /** False until the person follows the link in the verification e-mail — an unverified account cannot sign in. */
  emailVerified: boolean;
  /** ISO-8601. JSON has no date type, so the wire carries strings, never `Date`. */
  createdAt: string;
}
