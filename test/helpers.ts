import { fetchMock } from 'cloudflare:test'
import { vi } from 'vitest'
import type { SurfaceDecisionResponse } from '../src/types'

type MockOriginFetchOptions = {
    path?: string
    status?: number
    method?: string
    requestBody?: string | null
    responseBody?: string | object
    contentType?: string
    responseHeaders?: Record<string, string>
}

type MockSurfaceDecisionsFetchOptions = {
    status?: number
    response?: SurfaceDecisionResponse
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

    const headers: Record<string, string> = { ...responseHeaders, 'Content-Type': contentType }

    return fetchMock
        .get('https://origin.example')
        .intercept({ path, method, ...(requestBody ? { body: requestBody } : {}) })
        .reply(status, responseBody, { headers })
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

export function mockSurfaceDecisionsFetch({ status = 200, response = surfaceDecisionsResponse }: MockSurfaceDecisionsFetchOptions = {}) {
    const mockSurfaceDecision = vi.fn()
    fetchMock
        .get('https://api.monetizationos.com')
        .intercept({ path: '/api/v1/surface-decisions', method: 'POST' })
        .reply((data) => {
            mockSurfaceDecision(JSON.parse(data.body as string))
            return {
                statusCode: status,
                data: JSON.stringify(response),
                responseOptions: { headers: { 'Content-Type': 'application/json' } },
            }
        })
    return mockSurfaceDecision
}
