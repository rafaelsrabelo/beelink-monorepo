# Product

> **Tier:** product — true no matter which app is rewritten. See [the tier map](../README.md).

## Language

Every surface speaks Brazilian Portuguese (`pt-BR`): screens, e-mails and error messages. Identifiers, comments and the repository's documentation stay in English.

## Accounts

An **account** is how a person proves who they are, on every surface.

- It has a **name**, an **e-mail** and a **password**. No two accounts share an e-mail, compared without case and without surrounding spaces.
- A password has between 8 and 128 characters.
- An account is born **unverified**. Signing up sends an e-mail with a confirmation link, valid for 24 hours and usable once. Asking again sends a new link.
- An unverified account cannot sign in.
- Signing in opens a **session** on that device. A session lives while it is used at least once every 30 days; signing out ends that device's session only.
- A forgotten password is replaced through an e-mailed link, valid for 1 hour and usable once. Replacing the password ends every session of the account.
- Whether an e-mail has an account is never revealed: "forgot password" and "resend confirmation" answer the same way for any address, and a wrong password reads the same as an unknown e-mail.

The API enforces these rules. The apps display them; they never re-decide them — a rule written twice will disagree with itself within a quarter.
