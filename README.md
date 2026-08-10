<div align="center">
  <a href="https://monetizationos.com">
  <img alt="MonetizationOS logo" src="https://app.monetizationos.com/static/monetizationos-logo.png" height="48">
  </a>
  <h1>MonetizationOS Cloudflare Proxy</h1>
</div>

[MonetizationOS](https://monetizationos.com) powers monetization for human and bot users alike. Use this Cloudflare Worker to proxy your website and integrate MonetizationOS Surfaces, enabling seamless monetization experiences for sites served with static HTML.

This worker includes handling for both HTTP response modification and CSS-targeted Components for content modifications including: removal/truncation, displaying offerings, and custom messaging.

The shared proxy pipeline is provided by [`@monetizationos/proxy`](https://www.npmjs.com/package/@monetizationos/proxy). This repository contains the Cloudflare Worker entrypoint, environment binding mapping, and Cloudflare-specific adapters for `HTMLRewriter` and request metadata.

Read more about using MonetizationOS at [docs.monetizationos.com](https://docs.monetizationos.com).

## Getting Started

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/MonetizationOS/cloudflare-proxy-worker)

Click deploy to Cloudflare to get started or fork this repo to customize it for your needs.

## Required Variables

**By default, the worker runs in single-domain mode.** Set these environment variables in your Cloudflare configuration:

- `MONETIZATION_OS_SECRET_KEY`: Your MonetizationOS secret key. [Get your secret key](https://docs.monetizationos.com/docs/guides/environments/managing-environments#api-keys).
- `ORIGIN_URL`: The origin URL for your proxied website.
- `SURFACE_SLUG`: The slug for the MonetizationOS surface you want to target.
- `AUTHENTICATED_USER_JWT_COOKIE_NAME`: Cookie name for authenticated user JWT sessions.
- `ANONYMOUS_SESSION_COOKIE_NAME`: Cookie name for anonymous sessions.
- `INJECT_SCRIPT_URL`: URL of the MonetizationOS web components script to inject when component transforms run.
- `MONETIZATION_OS_HOST`: MonetizationOS API host. Defaults to `https://api.monetizationos.com` in the worker config.
- `MONETIZATION_OS_ENDPOINTS_PREFIX`: Path prefix for proxied custom endpoints. Defaults to `/mos-endpoints/` in the worker config.

Bindings should be set in your `wrangler.jsonc`, or a `.dev.vars.local` file when [working locally](https://developers.cloudflare.com/workers/development-testing/).

## Optional: multi-domain mode

Use this when **one Worker** must proxy several public hostnames, each with its own origin, surface slug, and secret key. Set `DOMAIN_MAP` and omit (or ignore) `ORIGIN_URL`, `SURFACE_SLUG`, and `MONETIZATION_OS_SECRET_KEY` — those come from the map instead. Cookie names and other shared settings still come from Worker vars.

In `wrangler.jsonc` `vars` (see also [`config/domain-map.example.json`](config/domain-map.example.json)):

```jsonc
"DOMAIN_MAP": {
  "site-a.example.com": {
    "originUrl": "https://origin-a.example",
    "surfaceSlug": "web",
    "mosSecretKeyEnvVar": "MONETIZATION_OS_SECRET_KEY_SITE_A"
  },
  "site-b.example.com": {
    "originUrl": "https://origin-b.example",
    "surfaceSlug": "other-web",
    "mosSecretKeyEnvVar": "MONETIZATION_OS_SECRET_KEY_SITE_B"
  }
}
```

Each map key is the public hostname clients send in the `Host` header (port is ignored, casing is normalized). Each value provides that domain's origin, surface slug, and the **name of a Worker secret/var** that holds its MOS secret key. Secret values are never stored in `DOMAIN_MAP`.

Field names can use either camelCase (`originUrl`, `surfaceSlug`, `mosSecretKeyEnvVar`) or env-var-style aliases (`ORIGIN_URL`, `SURFACE_SLUG`, `MONETIZATION_OS_SECRET_KEY_ENV`). Trailing slashes on `originUrl` are stripped. In the Cloudflare dashboard, `DOMAIN_MAP` may also be a JSON string.

Set one secret (or var) per site. The variable **names** are committed in `DOMAIN_MAP`; the **values** are configured only as Worker secrets:

```bash
npx wrangler secret put MONETIZATION_OS_SECRET_KEY_SITE_A
npx wrangler secret put MONETIZATION_OS_SECRET_KEY_SITE_B
```

Attach every public hostname to the same Worker (Custom Domains or routes). Unknown hosts return `404` with `No proxy configuration for this host`.

## Optional: paths that skip surface decisions

`SURFACE_DECISIONS_IGNORE_PATHS` is a comma-separated list of regular expressions. Matching pathnames still proxy to the origin and rewrite origin links, but skip MonetizationOS surface decisions and component transforms.

## Optional: cookies forwarded to surface decisions

`SURFACE_DECISIONS_COOKIES` is a comma-separated list of regular expressions. Cookie names matching any pattern are forwarded to the MonetizationOS surface-decisions API as `http.cookies`. Matching cookies are read from the incoming request `Cookie` header and from the origin response `Set-Cookie` headers; when the same name appears in both, the origin value is used. When unset or when no cookies match, `http.cookies` is omitted from the surface-decisions payload.

In `wrangler.jsonc` `vars`:

```jsonc
"SURFACE_DECISIONS_COOKIES": "^__session$, ^theme$, ^mos_"
```

Each pattern is a regex tested against the cookie **name**. Plain names like `^__session$` match exactly; prefixes like `^mos_` match any cookie whose name starts with `mos_`.

## Optional: headers sent to the origin

`ORIGIN_REQUEST_HEADERS` adds or overrides outgoing headers on every upstream fetch to `ORIGIN_URL`. Set it to a JSON object mapping header names to values. Leave it as `{}` when no extra headers are needed.

In `wrangler.jsonc` `vars`:

```jsonc
"ORIGIN_REQUEST_HEADERS": { "X-Api-Key": "secret", "X-Custom": "my-value" }
```

In the Cloudflare dashboard, the variable supports JSON input directly.

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
