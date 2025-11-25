import { fetchMock } from 'cloudflare:test'
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
    responseBody = '<body><h1>Test</h1></body>',
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
    return fetchMock
        .get('https://api.monetizationos.com')
        .intercept({ path: '/api/v1/surface-decisions', method: 'POST' })
        .reply(status, response)
}
