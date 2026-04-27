import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import performOriginRequest from '../src/1-origin-request/performOriginRequest'

function makeEnv(originRequestHeaders: Record<string, string> = {}): Env {
    return {
        ORIGIN_URL: 'https://origin.example',
        SURFACE_SLUG: 'web',
        AUTHENTICATED_USER_JWT_COOKIE_NAME: 'jwt-cookie',
        ANONYMOUS_SESSION_COOKIE_NAME: 'anon-session',
        INJECT_SCRIPT_URL: '',
        MONETIZATION_OS_HOST: 'https://api.monetizationos.com',
        MONETIZATION_OS_ENDPOINTS_PREFIX: '/mos-endpoints/',
        MONETIZATION_OS_SECRET_KEY: 'sk_test',
        SURFACE_DECISIONS_IGNORE_PATHS: '',
        ORIGIN_REQUEST_HEADERS: originRequestHeaders,
    } as unknown as Env
}

function capturedHeaders(mockFetch: ReturnType<typeof vi.fn>): Headers {
    const arg = mockFetch.mock.calls[0][1]
    return arg instanceof Request ? arg.headers : new Headers()
}

describe('performOriginRequest', () => {
    let mockFetch: ReturnType<typeof vi.fn>

    beforeEach(() => {
        mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
        vi.stubGlobal('fetch', mockFetch)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('forwards the request as-is when ORIGIN_REQUEST_HEADERS is empty', async () => {
        const request = new Request('https://test.example/page.json')
        await performOriginRequest(request, makeEnv({}))
        // When empty, fetch is called with the original request directly
        expect(mockFetch).toHaveBeenCalledOnce()
        const secondArg = mockFetch.mock.calls[0][1]
        expect(secondArg).toBe(request)
    })

    it('merges ORIGIN_REQUEST_HEADERS into the upstream request', async () => {
        const request = new Request('https://test.example/page.json')
        await performOriginRequest(request, makeEnv({ 'X-Api-Key': 'secret', 'X-Custom': 'foo' }))
        const headers = capturedHeaders(mockFetch)
        expect(headers.get('x-api-key')).toBe('secret')
        expect(headers.get('x-custom')).toBe('foo')
    })

    it('overrides a header the client already sent', async () => {
        const request = new Request('https://test.example/page.json', {
            headers: { 'X-Override': 'from-client' },
        })
        await performOriginRequest(request, makeEnv({ 'X-Override': 'from-env' }))
        expect(capturedHeaders(mockFetch).get('x-override')).toBe('from-env')
    })

    it('preserves client headers not mentioned in ORIGIN_REQUEST_HEADERS', async () => {
        const request = new Request('https://test.example/page.json', {
            headers: { 'X-Keep': 'client-value' },
        })
        await performOriginRequest(request, makeEnv({ 'X-Extra': 'added' }))
        const headers = capturedHeaders(mockFetch)
        expect(headers.get('x-keep')).toBe('client-value')
        expect(headers.get('x-extra')).toBe('added')
    })
})
