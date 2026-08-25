import { type ConfigFactory, hostPathMatcher, type MOSConfigInput, type MOSProxy, MOSProxyBuilder } from '@monetizationos/proxy'
import { hasDomainMapBinding, loadDomainMap } from './domainMap'
import { CloudflareHtmlRewriterSession } from './htmlRewriter'

/** Build shared MOS config fields that apply in both single- and multi-domain modes. */
function buildSharedConfig(workerEnv: Env): Partial<MOSConfigInput> {
    return {
        mosHost: workerEnv.MONETIZATION_OS_HOST || 'https://api.monetizationos.com',
        mosEndpointsPrefix: workerEnv.MONETIZATION_OS_ENDPOINTS_PREFIX || '/mos-endpoints/',
        anonymousSessionCookieName: workerEnv.ANONYMOUS_SESSION_COOKIE_NAME,
        authenticatedUserJwtCookieName: workerEnv.AUTHENTICATED_USER_JWT_COOKIE_NAME,
        injectScriptUrl: workerEnv.INJECT_SCRIPT_URL || undefined,
        surfaceDecisionsIgnorePaths: workerEnv.SURFACE_DECISIONS_IGNORE_PATHS,
        surfaceDecisionsCookies: workerEnv.SURFACE_DECISIONS_COOKIES,
        originRequestHeaders: workerEnv.ORIGIN_REQUEST_HEADERS ?? {},
    }
}

/**
 * Resolve static config or a host-based factory.
 * Multi-domain mode is enabled when `DOMAIN_MAP` is set; otherwise single-domain env vars are used.
 */
export function resolveConfigSource(workerEnv: Env): MOSConfigInput | ConfigFactory {
    const shared = buildSharedConfig(workerEnv)

    if (hasDomainMapBinding(workerEnv.DOMAIN_MAP)) {
        const domainMap = loadDomainMap(workerEnv.DOMAIN_MAP, workerEnv)
        const rules = Object.entries(domainMap).map(([host, entry]) => ({
            host,
            config: {
                originUrl: entry.originUrl,
                surfaceSlug: entry.surfaceSlug,
                mosSecretKey: entry.mosSecretKey,
            },
        }))

        return hostPathMatcher(rules, shared)
    }

    return {
        ...shared,
        originUrl: workerEnv.ORIGIN_URL || 'https://example.local',
        surfaceSlug: workerEnv.SURFACE_SLUG ?? '',
        mosSecretKey: workerEnv.MONETIZATION_OS_SECRET_KEY ?? '',
    }
}

/** Build the MOS proxy for the given Worker env (single- or multi-domain). */
export function createProxy(workerEnv: Env): MOSProxy {
    return new MOSProxyBuilder()
        .withConfig(resolveConfigSource(workerEnv))
        .withUnresolvedConfigHandler(() => new Response('No proxy configuration for this host', { status: 404 }))
        .withOriginFetcher(fetch)
        .withApiFetcher(fetch)
        .withHtmlRewriter({
            capabilities: {
                onEndTag: true,
                nthChild: true,
            },
            create() {
                return new CloudflareHtmlRewriterSession()
            },
        })
        .withClientMetadata({
            build(request) {
                return {
                    cloudflare: {
                        cf: request.cf,
                    },
                }
            },
        })
        .withClientIP((request) => request.headers.get('CF-Connecting-IP') ?? undefined)
        .build()
}
