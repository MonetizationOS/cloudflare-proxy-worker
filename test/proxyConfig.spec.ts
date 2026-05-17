import { fetchMock } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { mockSurfaceDecisionsFetch } from './helpers'

describe('proxy config', () => {
    beforeAll(() => {
        fetchMock.activate()
        fetchMock.disableNetConnect()
    })

    afterEach(() => fetchMock.assertNoPendingInterceptors())

    async function fetchWithFreshWorker(request: Request, overrides: Partial<Env> = {}): Promise<Response> {
        const restore: Array<() => void> = []
        for (const [key, value] of Object.entries(overrides) as Array<[keyof Env, Env[keyof Env]]>) {
            const previous = env[key]
            ;(env as Record<keyof Env, unknown>)[key] = value
            restore.push(() => {
                ;(env as Record<keyof Env, unknown>)[key] = previous
            })
        }
        try {
            vi.resetModules()
            const { default: worker } = await import('../src/index')
            return await worker.fetch(request as Parameters<typeof worker.fetch>[0])
        } finally {
            for (const reset of restore) reset()
        }
    }

    it('prepends the origin pathname and rewrites base-path origin links', async () => {
        fetchMock
            .get('https://origin.example')
            .intercept({ path: '/base/foo/bar?baz=1', method: 'GET' })
            .reply(200, '<body><a href="https://origin.example/base/link">Link</a></body>', {
                headers: { 'Content-Type': 'text/html' },
            })
        mockSurfaceDecisionsFetch()

        const res = await fetchWithFreshWorker(new Request('https://test.example/foo/bar?baz=1'), {
            ORIGIN_URL: 'https://origin.example/base/',
        })

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

        const res = await fetchWithFreshWorker(new Request('https://test.example/mos-endpoints/foo/bar'))

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
            { ORIGIN_REQUEST_HEADERS: { 'X-Api-Key': 'secret', 'X-Override': 'from-env' } },
        )

        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ success: true })
    })
})
