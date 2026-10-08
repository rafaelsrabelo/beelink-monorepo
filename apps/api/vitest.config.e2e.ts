import { defineConfig } from 'vitest/config';

import { TEST_DATABASE_URL } from './test/support/test-database.js';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.e2e-spec.ts'],
    // TRUNCATE locks every table: two files at once would wipe each other's rows.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    globalSetup: ['./test/global-setup.ts'],
    // Set explicitly: env.ts would otherwise fill DATABASE_URL from apps/api/.env — the dev database.
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'test-secret-with-at-least-32-characters-long',
      // Like TEST_DATABASE_URL: a value set here wins over the shell's, so the override has its own
      // name. Where 1025 is another project's Mailpit the suite must not write to it, nor empty its
      // inbox — MAILPIT_URL (test/support/mailpit.ts) moves that half.
      SMTP_URL: process.env.TEST_SMTP_URL ?? 'smtp://localhost:1025',
      WEB_URL: 'http://localhost:3000',
      // The suites hammer the auth routes; the limit itself has its own spec, which lowers it.
      AUTH_RATE_LIMIT_MAX: '1000',
      // Same reason: one app instance serves a whole file from one address, so every shop write in
      // it shares a bucket that one real shopkeeper would never fill.
      STORE_WRITE_RATE_LIMIT_MAX: '1000',
      // And the cart's orders: a suite places more of them from one address than any shopper would.
      CUSTOMER_ORDER_RATE_LIMIT_MAX: '1000',
      // And the checkout's quotes, for the same reason.
      CUSTOMER_QUOTE_RATE_LIMIT_MAX: '1000',
      // And the shopper's messages: a suite writes more of them from one address than anyone would.
      CUSTOMER_MESSAGE_RATE_LIMIT_MAX: '1000',
      // Google's door switched on; its suite stands a fake Google in for the real one.
      GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'test-secret',
      GOOGLE_REDIRECT_URI: 'http://localhost:3000/api/customer/google/callback',
      // Melhor Envio's door switched on, the same way: its suite stands a fake Melhor Envio in.
      MELHOR_ENVIO_CLIENT_ID: 'test-melhor-envio-app',
      MELHOR_ENVIO_CLIENT_SECRET: 'test-melhor-envio-secret',
      MELHOR_ENVIO_REDIRECT_URI: 'http://localhost:3000/api/integrations/melhor-envio/callback',
      INTEGRATIONS_SECRET_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
      // A shop's own domain switched on, at a documentation address: its suite stands a fake DNS and
      // a fake probe in for the network, and no other suite reaches the routes that would ask either.
      SHOP_DOMAIN_TARGET_IPS: '203.0.113.10',
    },
  },
});
