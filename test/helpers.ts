import type { SurfaceDecisionResponse } from '@monetizationos/proxy'
import { vi } from 'vitest'
import { mockFetch } from './fetchMock'

export { mockFetch } from './fetchMock'

export const ORIGIN = 'https://origin.example'
export const MOS_API = 'https://api.monetizationos.com'

type MockOriginFetchOptions = {
    path?: string
    status?: number
    method?: string
    requestBody?: string | null
    responseBody?: string | object
    contentType?: string
    responseHeaders?: Record<string, string | string[]>
}

type MockSurfaceDecisionsFetchOptions = {
    status?: number
    response?: Partial<SurfaceDecisionResponse>
}

export function mockOriginFetch({
    path = '/index.html',
    status = 200,
    method = 'GET',
    requestBody = null,
    responseBody = '<body><head></head><h1>Test</h1></body>',
    contentType = 'text/html',
    responseHeaders = {},
}: MockOriginFetchOptions = {}) {
    if (responseBody !== null && typeof responseBody === 'object') {
        contentType = 'application/json'
    }

    mockFetch(
        { origin: ORIGIN, path, method, ...(requestBody ? { body: requestBody } : {}) },
        { status, body: responseBody, headers: { ...responseHeaders, 'Content-Type': contentType } },
    )
}

export const surfaceDecisionsResponse: SurfaceDecisionResponse = {
    status: 'success',
    identity: { identifier: 'id', isAuthenticated: false, authType: 'anonymous', jwtClaims: {} },
    features: {},
    customer: { hasProducts: false },
    surfaceBehavior: {},
    componentsSkipped: false,
    componentBehaviors: {},
}

export function mockSurfaceDecisionsFetch({ status = 200, response }: MockSurfaceDecisionsFetchOptions = {}) {
    const mockSurfaceDecision = vi.fn()
    mockFetch({ origin: MOS_API, path: '/api/v1/surface-decisions', method: 'POST' }, async (request) => {
        mockSurfaceDecision(JSON.parse(await request.text()))
        return new Response(JSON.stringify({ ...surfaceDecisionsResponse, ...response }), {
            status,
            headers: { 'Content-Type': 'application/json' },
        })
    })
    return mockSurfaceDecision
}
