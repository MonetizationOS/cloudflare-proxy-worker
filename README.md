# MonetizationOS Cloudflare Proxy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Wing-Capital-HoldCo-Limited/cloudflare-proxy-worker)

Proxy your HTML-based website with MonetizationOS, enabling seamless integration of your MonetizationOS Surfaces.

Click deploy to Cloudflare to get started or fork this repo to customize it for your needs.

## Required Variables

This worker requires the following environment variables to be set in your Cloudflare configuration:

- `MONETIZATION_OS_SECRET_KEY`: Your MonetizationOS secret key. [Get your secret key](https://docs.monetizationos.com/docs/guides/environments/managing-environments#api-keys).
- `ORIGIN_URL`: The origin URL for your proxied website.
- `SURFACE_SLUG`: The slug for the MonetizationOS surface you want to target.
- `AUTHENTICATED_USER_JWT_COOKIE_NAME`: Cookie name for authenticated user JWT sessions.
- `ANONYMOUS_SESSION_COOKIE_NAME`: Cookie name for anonymous sessions.

Bindings should be set in your `wrangler.jsonc`, or a `.dev.vars.local` file when [working locally](https://developers.cloudflare.com/workers/development-testing/).

## Commands

- `npm run dev` — Start local development using [Wrangler](https://developers.cloudflare.com/workers/wrangler/).
- `npm run deploy` — Deploy the worker to Cloudflare.
- `npm test` — Run tests with Vitest.
- `npm run cf-typegen` — Generate Cloudflare type definitions.
- `npm run lint` — Run lint checks with Biome.

## Local Development

1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the development server:
   ```sh
   npm run dev
   ```

## Deployment

Deploy to Cloudflare with:

```sh
npm run deploy
```
