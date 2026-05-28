import { fetchMock } from 'cloudflare:test'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { mockSurfaceDecisionsFetch } from './helpers'

function makeEnv(overrides: Partial<Env> = {}): Env {
    return {
        ORIGIN_URL: 'https://origin.example',
        SURFACE_SLUG: 'web',
        AUTHENTICATED_USER_JWT_COOKIE_NAME: 'jwt-cookie',
        ANONYMOUS_SESSION_COOKIE_NAME: 'anon-session',
        INJECT_SCRIPT_URL: 'https://example.com/web-components-latest.js',
        MONETIZATION_OS_HOST: 'https://api.monetizationos.com',
        MONETIZATION_OS_ENDPOINTS_PREFIX: '/mos-endpoints/',
        MONETIZATION_OS_SECRET_KEY: 'sk_test_123_key.payload',
        SURFACE_DECISIONS_IGNORE_PATHS: '',
        ORIGIN_REQUEST_HEADERS: {},
        ...overrides,
    }
}

describe('proxy config', () => {
    beforeAll(() => {
        fetchMock.activate()
        fetchMock.disableNetConnect()
    })

    afterEach(() => fetchMock.assertNoPendingInterceptors())

    async function fetchWithFreshWorker(request: Request, env: Env): Promise<Response> {
        vi.resetModules()
        const { default: worker } = await import('../src/index')
        return worker.fetch(request as Parameters<typeof worker.fetch>[0], env)
    }

    it('prepends the origin pathname and rewrites base-path origin links', async () => {
        fetchMock
            .get('https://origin.example')
            .intercept({ path: '/base/foo/bar?baz=1', method: 'GET' })
            .reply(200, '<body><a href="https://origin.example/base/link">Link</a></body>', {
                headers: { 'Content-Type': 'text/html' },
            })
        mockSurfaceDecisionsFetch()

        const res = await fetchWithFreshWorker(
            new Request('https://test.example/foo/bar?baz=1'),
            makeEnv({ ORIGIN_URL: 'https://origin.example/base/' }),
        )

        expect(res.status).toBe(200)
        const text = await res.text()
        expect(text).toContain('https://test.example/link')
        expect(text).not.toContain('https://origin.example/base/link')
    })

    it('forwards requests matching MONETIZATION_OS_ENDPOINTS_PREFIX to the MOS API', async () => {
        fetchMock
            .get('https://api.monetizationos.com')
            .intercept({ path: '/api/v1/envs/test_123/endpoints/foo/bar', method: 'GET' })
            .reply(200, { ok: true }, { headers: { 'Content-Type': 'application/json' } })

        const res = await fetchWithFreshWorker(new Request('https://test.example/mos-endpoints/foo/bar'), makeEnv())

        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ ok: true })
    })

    it('merges configured origin request headers and preserves untouched client headers', async () => {
        fetchMock
            .get('https://origin.example')
            .intercept({
                path: '/page.json',
                method: 'GET',
                headers: {
                    'X-Api-Key': 'secret',
                    'X-Override': 'from-env',
                    'X-Keep': 'client-value',
                },
            })
            .reply(200, { success: true }, { headers: { 'Content-Type': 'application/json' } })

        const res = await fetchWithFreshWorker(
            new Request('https://test.example/page.json', {
                headers: { 'X-Override': 'from-client', 'X-Keep': 'client-value' },
            }),
            makeEnv({
                ORIGIN_REQUEST_HEADERS: { 'X-Api-Key': 'secret', 'X-Override': 'from-env' },
            }),
        )

        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ success: true })
    })
})
