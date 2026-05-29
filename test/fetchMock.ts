import { expect } from 'vitest'

/**
 * Minimal replacement for the `fetchMock` that `cloudflare:test` exported before
 * vitest-pool-workers 0.13. It swaps `globalThis.fetch` for a matcher-driven mock
 * so the worker's `withOriginFetcher`/`withApiFetcher` (which call the global `fetch`)
 * hit registered interceptors instead of the network.
 */

type ReplyHeaders = Record<string, string | string[]>

type StaticReply = {
    status?: number
    body?: string | object | null
    headers?: ReplyHeaders
}

type ReplyFn = (request: Request) => Response | Promise<Response>

type MockMatch = {
    origin: string
    path: string
    method?: string
    /** Exact request body to match against (request is only matched when equal). */
    body?: string
    /** Request headers that must all be present with the given values. */
    headers?: Record<string, string>
}

type Interceptor = MockMatch & {
    method: string
    reply: StaticReply | ReplyFn
    consumed: boolean
}

const interceptors: Interceptor[] = []
const knownOrigins = new Set<string>()
let realFetch: typeof globalThis.fetch | undefined

function buildHeaders(init: ReplyHeaders = {}): Headers {
    const headers = new Headers()
    for (const [name, value] of Object.entries(init)) {
        if (Array.isArray(value)) {
            for (const entry of value) headers.append(name, entry)
        } else {
            headers.append(name, value)
        }
    }
    return headers
}

function buildResponse(reply: StaticReply): Response {
    const { status = 200, body = null, headers } = reply
    const serialized = body !== null && typeof body === 'object' ? JSON.stringify(body) : body
    return new Response(serialized, { status, headers: buildHeaders(headers) })
}

function headersMatch(request: Request, expected: Record<string, string>): boolean {
    return Object.entries(expected).every(([name, value]) => request.headers.get(name) === value)
}

export function mockFetch(match: MockMatch, reply: StaticReply | ReplyFn): void {
    knownOrigins.add(match.origin)
    interceptors.push({ ...match, method: match.method ?? 'GET', reply, consumed: false })
}

export function installFetchMock(): void {
    if (realFetch) return
    realFetch = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = input instanceof Request ? input : new Request(input, init)
        const url = new URL(request.url)
        const path = url.pathname + url.search

        for (const interceptor of interceptors) {
            if (interceptor.consumed) continue
            if (interceptor.origin !== url.origin) continue
            if (interceptor.method !== request.method) continue
            if (interceptor.path !== path) continue
            if (interceptor.headers && !headersMatch(request, interceptor.headers)) continue
            if (interceptor.body !== undefined && (await request.clone().text()) !== interceptor.body) continue

            interceptor.consumed = true
            return typeof interceptor.reply === 'function' ? interceptor.reply(request) : buildResponse(interceptor.reply)
        }

        // Mirror the old `disableNetConnect()`: fail loudly for mocked origins, but let
        // unrelated traffic (e.g. the test harness) reach the real fetch.
        if (knownOrigins.has(url.origin)) {
            throw new Error(`No matching fetch mock for ${request.method} ${request.url}`)
        }
        if (!realFetch) throw new Error('fetch mock not installed')
        return realFetch(input as RequestInfo | URL, init)
    }) as typeof globalThis.fetch
}

export function restoreFetch(): void {
    if (realFetch) {
        globalThis.fetch = realFetch
        realFetch = undefined
    }
}

export function resetFetchMock(): void {
    interceptors.length = 0
}

/** Asserts every registered mock was used, then clears them for the next test. */
export function assertNoPendingMocks(): void {
    const pending = interceptors.filter((interceptor) => !interceptor.consumed)
    const summary = pending.map((interceptor) => `${interceptor.method} ${interceptor.origin}${interceptor.path}`)
    resetFetchMock()
    expect(summary, 'pending fetch mocks were never called').toEqual([])
}
