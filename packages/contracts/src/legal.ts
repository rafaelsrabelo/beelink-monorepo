/**
 * The version of bee-link's terms of use and privacy policy in force: the day the texts took effect
 * (BEELINK-171). One literal for both documents, which change together.
 *
 * A type and not a value, because this package ships none: the API records it on every acceptance
 * and the web shows it on the pages, each from a constant typed with this. Bumping it here stops both
 * from compiling until both say the new day — the text shown and the version recorded cannot drift.
 */
export type LegalVersion = "2026-09-30";

/**
 * Where an account took the terms: a sign-up form, "Continuar com Google" at a shop, or setting a
 * password from an e-mailed link — the first screen of an account that had none, or of an owner
 * taking back an address someone else signed up with.
 */
export type LegalAcceptanceChannel = "SIGN_UP" | "GOOGLE" | "PASSWORD_RESET";
