import { env, fetchMock, SELF } from 'cloudflare:test'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { mockOriginFetch, mockSurfaceDecisionsFetch, surfaceDecisionsResponse } from './helpers'

describe('MonetizationOS Proxy', () => {
    beforeAll(() => {
        fetchMock.activate()
        fetchMock.disableNetConnect()
    })

    afterEach(() => fetchMock.assertNoPendingInterceptors())

    it('proxies GET JSON requests', async () => {
        mockOriginFetch({
            path: '/hello/world?x=1&y=two',
            method: 'GET',
            responseBody: { success: true },
        })

        const req = new Request('https://test.example/hello/world?x=1&y=two')
        const res = await SELF.fetch(req)
        expect(res.status).toBe(200)
        const response = (await res.json()) as { success: boolean }
        expect(response.success).toBe(true)
    })

    it('proxies POST requests with body', async () => {
        mockOriginFetch({
            path: '/api/submit',
            method: 'POST',
            requestBody: 'payload-123',
            responseBody: { success: true },
        })

        const req = new Request('https://test.example/api/submit', {
            method: 'POST',
            headers: { 'content-type': 'text/plain' },
            body: 'payload-123',
        })
        const res = await SELF.fetch(req)
        expect(res.status).toBe(200)
        const json = (await res.json()) as { success: boolean }
        expect(json.success).toBe(true)
    })

    it('proxies mos API requests', async () => {
        fetchMock
            .get('https://api.monetizationos.com')
            .intercept({ path: '/api/v1/envs/test_123/endpoints/custom-endpoint', method: 'GET' })
            .reply(200, 'response')

        const req = new Request('https://test.example/mos-endpoints/custom-endpoint', {
            method: 'GET',
            headers: { 'content-type': 'text/plain' },
        })

        const res = await SELF.fetch(req)
        expect(res.status).toBe(200)
        expect(await res.text()).toBe('response')
    })

    it('fetch surface decisions for HTML responses', async () => {
        mockOriginFetch()
        mockSurfaceDecisionsFetch()

        const req = new Request('https://test.example/index.html')
        const res = await SELF.fetch(req)
        expect(res.status).toBe(200)
    })

    it('does not duplicate anonymous cookie if origin already sets it', async () => {
        const originSetCookieValue = `${env.ANONYMOUS_SESSION_COOKIE_NAME}=test`

        mockOriginFetch({ responseHeaders: { 'Set-Cookie': originSetCookieValue } })
        mockSurfaceDecisionsFetch()

        const req = new Request('https://test.example/index.html')
        const res = await SELF.fetch(req)
        const setCookies: string[] = []
        res.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie') setCookies.push(value)
        })
        expect(setCookies.length).toBe(1)
        expect(setCookies[0]).toBe(originSetCookieValue)
    })

    it('rewrites origin header links', async () => {
        mockOriginFetch({ responseHeaders: { Location: 'https://origin.example/redirect' } })
        mockSurfaceDecisionsFetch()

        const req = new Request('https://test.example/index.html')
        const res = await SELF.fetch(req)
        expect(res.status).toBe(200)
        res.headers.forEach((value, name) => {
            if (name.toLowerCase() === 'location') {
                expect(value).toBe('https://test.example/redirect')
            }
        })
    })

    it.each([
        {
            name: 'absolute https links',
            body: '<body><a href="https://origin.example/a">A</a></body>',
            includes: ['https://test.example/a'],
            excludes: ['https://origin.example/a'],
        },
        {
            name: 'absolute http links',
            body: '<body><img src="http://origin.example/img.png"></body>',
            includes: ['https://test.example/img.png'],
            excludes: ['http://origin.example/img.png'],
        },
        {
            name: 'protocol-relative links',
            body: '<body><link rel="stylesheet" href="//origin.example/styles.css"></body>',
            includes: ['https://test.example/styles.css'],
            excludes: ['//origin.example/styles.css'],
        },
        {
            name: 'multiple occurrences and other domains untouched',
            body: `<body>
                <a href="https://origin.example/x">X</a>
                <a href="//origin.example/x2">X2</a>
                <a href="https://other.example/y">Y</a>
                </body>`,
            includes: ['https://test.example/x', 'https://test.example/x2', 'https://other.example/y'],
            excludes: ['https://origin.example/x', '//origin.example/x2'],
        },
    ])('rewrites origin body links - $name', async ({ body, includes, excludes }) => {
        mockOriginFetch({ responseBody: body })
        mockSurfaceDecisionsFetch()

        const req = new Request('https://test.example/index.html')
        const res = await SELF.fetch(req)
        expect(res.status).toBe(200)
        const text = await res.text()
        includes.forEach((s: string) => {
            expect(text).toContain(s)
        })
        excludes.forEach((s: string) => {
            expect(text).not.toContain(s)
        })
    })

    it.each([
        {
            name: 'body string',
            http: { body: 'DENIED' },
            assert: async (res: Response) => {
                expect(res.status).toBe(200)
                expect(await res.text()).toBe('DENIED')
            },
        },
        {
            name: 'body null',
            http: { body: null },
            assert: async (res: Response) => {
                expect(res.status).toBe(200)
                expect(await res.text()).toBe('')
            },
        },
        {
            name: 'set headers + cookies + status + statusText (replace)',
            http: {
                headers: { 'Content-Type': 'text/plain', 'X-Custom': '123' },
                cookies: ['session=123; Path=/', 'delicious=cookies; Path=/'] as const,
                status: 201,
                statusText: 'Updated',
                body: 'OK',
            },
            assert: async (res: Response) => {
                expect(res.status).toBe(201)
                expect(res.statusText).toBe('Updated')
                expect(res.headers.get('content-type')).toBe('text/plain')
                expect(res.headers.get('x-custom')).toBe('123')
                const setCookies: string[] = []
                res.headers.forEach((v, k) => {
                    if (k.toLowerCase() === 'set-cookie') setCookies.push(v)
                })
                expect(setCookies).toContain('session=123; Path=/')
                expect(setCookies).toContain('delicious=cookies; Path=/')
                expect(await res.text()).toBe('OK')
            },
        },
        {
            name: 'addHeaders (modify)',
            http: { addHeaders: [{ name: 'X-Added', value: '42' }] },
            assert: async (res: Response) => {
                expect(res.headers.get('x-added')).toBe('42')
                expect(res.headers.get('content-type')).toBe('text/html')
                expect(res.status).toBe(200)
                expect(await res.text()).toContain('<h1>Test</h1>')
            },
        },
        {
            name: 'removeHeaders (modify)',
            http: { removeHeaders: ['Content-Type'] },
            assert: async (res: Response) => {
                expect(res.headers.get('content-type')).toBeNull()
                expect(res.status).toBe(200)
                expect(await res.text()).toContain('<h1>Test</h1>')
            },
        },
        {
            name: 'addCookies (modify)',
            http: { addCookies: ['c=3; Path=/', 'd=4; Path=/'] },
            assert: async (res: Response) => {
                const setCookies: string[] = []
                res.headers.forEach((v, k) => {
                    if (k.toLowerCase() === 'set-cookie') setCookies.push(v)
                })
                expect(setCookies).toContain('c=3; Path=/')
                expect(setCookies).toContain('d=4; Path=/')
                expect(res.status).toBe(200)
                expect(await res.text()).toContain('<h1>Test</h1>')
            },
        },
        {
            name: 'status and statusText (modify)',
            http: { status: 418, statusText: "I'm a teapot" },
            assert: async (res: Response) => {
                expect(res.status).toBe(418)
                expect(res.statusText).toBe("I'm a teapot")
                expect(await res.text()).toContain('<h1>Test</h1>')
            },
        },
    ])('applies surfaceBehavior http modifications - $name', async ({ http, assert }) => {
        mockOriginFetch()
        mockSurfaceDecisionsFetch({
            response: { ...surfaceDecisionsResponse, surfaceBehavior: { http }, componentsSkipped: http.body !== undefined },
        })

        const req = new Request('https://test.example/index.html')
        const res = await SELF.fetch(req)
        await assert(res)
    })

    it.each([
        {
            name: 'before',
            content: { before: [{ type: 'HTML', content: 'BEFORE' } as const] },
            assert: (text: string) => {
                expect(text).toContain('BEFORE')
                expect(text.indexOf('BEFORE')).toBeLessThan(text.indexOf('<h1>Test</h1>'))
            },
        },
        {
            name: 'after',
            content: { after: [{ type: 'HTML', content: 'AFTER' } as const] },
            assert: (text: string) => {
                expect(text).toContain('AFTER')
                expect(text.indexOf('<h1>Test</h1>')).toBeLessThan(text.indexOf('AFTER'))
            },
        },
        {
            name: 'remove',
            content: { remove: true },
            assert: (text: string) => {
                expect(text).not.toContain('<h1>Test</h1>')
            },
        },
        {
            name: 'before + after + remove',
            content: {
                before: [{ type: 'HTML', content: 'BEFORE' } as const],
                after: [{ type: 'TEXT', content: 'AFTER' } as const],
                remove: true,
            },
            assert: (text: string) => {
                expect(text).toContain('BEFORE')
                expect(text).toContain('AFTER')
                expect(text.indexOf('BEFORE')).toBeLessThan(text.indexOf('AFTER'))
                expect(text).not.toContain('<h1>Test</h1>')
            },
        },
        {
            name: 'ignore custom',
            content: {
                before: [{ type: 'CUSTOM', content: 'UNKNOWN' } as const],
            },
            assert: (text: string) => {
                expect(text).not.toContain('UNKNOWN')
                expect(text).toContain('<h1>Test</h1>')
            },
        },
        {
            name: 'MOS element',
            content: {
                before: [
                    {
                        type: 'ELEMENT',
                        schema: 'mos:test@1.0',
                        props: {
                            prop1: 'value1',
                            prop2: true,
                        },
                    } as const,
                ],
            },
            assert: (text: string) => {
                expect(text).not.toContain('UNKNOWN')
                expect(text).toContain('<h1>Test</h1>')
                expect(text).toContain(
                    '<mos-test version="1.0" props="{&quot;prop1&quot;:&quot;value1&quot;,&quot;prop2&quot;:true}"></mos-test>',
                )
                expect(text).toContain('<head><script src="https://example.com/web-components-latest.js" async defer></script></head>')
            },
        },
    ])('rewrites HTML component content - $name', async ({ content, assert }) => {
        mockOriginFetch()
        mockSurfaceDecisionsFetch({
            response: {
                ...surfaceDecisionsResponse,
                componentBehaviors: {
                    test: {
                        metadata: { cssSelector: 'h1' },
                        content,
                    },
                },
            },
        })

        const req = new Request('https://test.example/index.html')
        const res = await SELF.fetch(req)
        expect(res.status).toBe(200)
        const text = await res.text()
        assert(text)
    })
})
