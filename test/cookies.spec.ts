import { fetchMock, SELF } from 'cloudflare:test'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { mockOriginFetch, mockSurfaceDecisionsFetch } from './helpers'

describe('MonetizationOS Proxy', () => {
    beforeAll(() => {
        fetchMock.activate()
        fetchMock.disableNetConnect()
    })

    afterEach(() => fetchMock.assertNoPendingInterceptors())

    it.each([
        {
            originSetCookie: ['anon-session=origin-id; Path=/'],
            requestCookie: '',
            expectedIdentity: { anonymousIdentifier: 'origin-id' },
        },
        {
            originSetCookie: ['jwt-cookie=origin-jwt; Path=/'],
            requestCookie: '',
            expectedIdentity: { userJwt: 'origin-jwt' },
        },
        {
            originSetCookie: [],
            requestCookie: 'anon-session=request-id; Path=/',
            expectedIdentity: { anonymousIdentifier: 'request-id' },
        },
        {
            originSetCookie: ['other-cookie=other-value; Path=/'],
            requestCookie: 'anon-session=request-id; Path=/',
            expectedIdentity: { anonymousIdentifier: 'request-id' },
        },
        {
            originSetCookie: [],
            requestCookie: 'jwt-cookie=request-jwt; Path=/',
            expectedIdentity: { userJwt: 'request-jwt' },
        },
        {
            originSetCookie: ['anon-session=origin-id; Path=/'],
            requestCookie: 'anon-session=request-id; Path=/',
            expectedIdentity: { anonymousIdentifier: 'origin-id' },
        },
    ])('extracts identity from request - %s', async ({ originSetCookie, requestCookie, expectedIdentity }) => {
        mockOriginFetch({
            responseHeaders: {
                'Set-Cookie': originSetCookie,
            },
        })
        const mockSurfaceDecision = mockSurfaceDecisionsFetch({
            response: {
                identity: {
                    identifier: 'response-id',
                    authType: 'anonymous',
                    isAuthenticated: false,
                    jwtClaims: {},
                },
            },
        })

        const response = await SELF.fetch(new Request('https://test.example/index.html', { headers: { Cookie: requestCookie } }))
        expect(response.status).toBe(200)

        expect(response.headers.get('Set-Cookie')).toStrictEqual(originSetCookie.length ? originSetCookie.join(',') : null)
        expect(mockSurfaceDecision).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ identity: expectedIdentity }))
    })

    it('requests id and sets cookie with generated MOS ID', async () => {
        mockOriginFetch()
        const mockSurfaceDecision = mockSurfaceDecisionsFetch({
            response: {
                identity: {
                    identifier: 'response-id',
                    authType: 'anonymous',
                    isAuthenticated: false,
                    jwtClaims: {},
                },
            },
        })

        const response = await SELF.fetch(new Request('https://test.example/index.html'))
        expect(response.status).toBe(200)
        expect(await response.text()).toStrictEqual('<body><head></head><h1>Test</h1></body>')

        expect(response.headers.get('Set-Cookie')).toBe('anon-session=response-id; Path=/')
        expect(mockSurfaceDecision).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ identity: { createAnonymousIdentifier: true } }),
        )
    })
})
