import { env } from 'cloudflare:workers'
import { describe, expect, it, vi } from 'vitest'
import { MOS_API, mockFetch, mockSurfaceDecisionsFetch, ORIGIN } from './helpers'

describe('proxy config', () => {
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

    it('loads with all env vars empty (deploy-validation safety)', async () => {
        const restore: Array<() => void> = []
        for (const key of Object.keys(env) as Array<keyof Env>) {
            // Skip vitest-pool-workers internal bindings (e.g. __VITEST_POOL_WORKERS_RUNNER_OBJECT),
            // which the test harness relies on for RPC such as dynamic module imports.
            if (String(key).startsWith('__')) continue
            const previous = env[key]
            ;(env as Record<keyof Env, unknown>)[key] = undefined
            restore.push(() => {
                ;(env as Record<keyof Env, unknown>)[key] = previous
            })
        }
        try {
            vi.resetModules()
            await expect(import('../src/index')).resolves.toBeDefined()
        } finally {
            for (const reset of restore) reset()
        }
    })

    it('prepends the origin pathname and rewrites base-path origin links', async () => {
        mockFetch(
            { origin: ORIGIN, path: '/base/foo/bar?baz=1', method: 'GET' },
            {
                status: 200,
                body: '<body><a href="https://origin.example/base/link">Link</a></body>',
                headers: { 'Content-Type': 'text/html' },
            },
        )
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
        mockFetch(
            { origin: MOS_API, path: '/api/v1/envs/test_123/endpoints/foo/bar', method: 'GET' },
            { status: 200, body: { ok: true }, headers: { 'Content-Type': 'application/json' } },
        )

        const res = await fetchWithFreshWorker(new Request('https://test.example/mos-endpoints/foo/bar'))

        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ ok: true })
    })

    it('merges configured origin request headers and preserves untouched client headers', async () => {
        mockFetch(
            {
                origin: ORIGIN,
                path: '/page.json',
                method: 'GET',
                headers: {
                    'X-Api-Key': 'secret',
                    'X-Override': 'from-env',
                    'X-Keep': 'client-value',
                },
            },
            { status: 200, body: { success: true }, headers: { 'Content-Type': 'application/json' } },
        )

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
