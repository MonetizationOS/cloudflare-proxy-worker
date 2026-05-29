import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { mockOriginFetch, mockSurfaceDecisionsFetch, surfaceDecisionsResponse } from './helpers'

describe('pageMetadata in surface decisions', () => {
    it('sends parsed meta tags in the surface decision request', async () => {
        mockOriginFetch({
            responseBody: `<html><head>
                <meta name="category" content="subscriber-only">
                <meta property="article:published_time" content="2026-03-09T15:13:00-0500">
                <meta property="og:title" content="Breaking News">
            </head><body><p>Content</p></body></html>`,
        })

        const mock = mockSurfaceDecisionsFetch({
            response: {
                ...surfaceDecisionsResponse,
                componentBehaviors: {},
            },
        })

        await SELF.fetch(new Request('https://test.example/index.html'))

        expect(mock).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({
                resource: expect.objectContaining({
                    meta: {
                        category: 'subscriber-only',
                        'article:published_time': '2026-03-09T15:13:00-0500',
                        'og:title': 'Breaking News',
                    },
                }),
            }),
        )
    })

    it('sends empty meta when origin has no meta tags', async () => {
        mockOriginFetch({
            responseBody: `<html><head></head><body><p>Content</p></body></html>`,
        })

        const mock = mockSurfaceDecisionsFetch({
            response: {
                ...surfaceDecisionsResponse,
                componentBehaviors: {},
            },
        })

        await SELF.fetch(new Request('https://test.example/index.html'))

        expect(mock).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({
                resource: expect.objectContaining({
                    meta: {},
                }),
            }),
        )
    })
})
