import { type ElementHandlers, type HtmlRewriterSession, type MOSProxy, MOSProxyBuilder } from '@monetizationos/proxy'

let proxy: MOSProxy | undefined

function getProxy(env: Env): MOSProxy {
    return (proxy ??= new MOSProxyBuilder()
        .withConfig({
            originUrl: env.ORIGIN_URL,
            surfaceSlug: env.SURFACE_SLUG,
            mosHost: env.MONETIZATION_OS_HOST || 'https://api.monetizationos.com',
            mosSecretKey: env.MONETIZATION_OS_SECRET_KEY,
            mosEndpointsPrefix: env.MONETIZATION_OS_ENDPOINTS_PREFIX || '/mos-endpoints/',
            anonymousSessionCookieName: env.ANONYMOUS_SESSION_COOKIE_NAME,
            authenticatedUserJwtCookieName: env.AUTHENTICATED_USER_JWT_COOKIE_NAME,
            injectScriptUrl: env.INJECT_SCRIPT_URL || undefined,
            surfaceDecisionsIgnorePaths: env.SURFACE_DECISIONS_IGNORE_PATHS,
            originRequestHeaders: env.ORIGIN_REQUEST_HEADERS ?? {},
        })
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
        .build())
}

export default {
    async fetch(request, env): Promise<Response> {
        return getProxy(env).handle(request)
    },
} satisfies ExportedHandler<Env>

class CloudflareHtmlRewriterSession implements HtmlRewriterSession {
    private readonly rewriter = new HTMLRewriter()

    on(selector: string, handlers: ElementHandlers): HtmlRewriterSession {
        this.rewriter.on(selector, handlers as HTMLRewriterElementContentHandlers)
        return this
    }

    transform(response: Response): Response {
        return this.rewriter.transform(response)
    }
}
