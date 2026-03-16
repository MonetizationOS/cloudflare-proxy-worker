import { fetchMock, SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { parsePageMetadata } from '../src/2-rewrite-origin-response/parsePageMetadata'
import { mockOriginFetch, mockSurfaceDecisionsFetch, surfaceDecisionsResponse } from './helpers'

describe('parsePageMetadata', () => {
    it('extracts meta name tags', async () => {
        const html = `<meta name="category" content="None/, None/subscriber-only, ">`
        expect(await parsePageMetadata(new Response(html))).toEqual({
            category: 'None/, None/subscriber-only, ',
        })
    })

    it('extracts meta property tags', async () => {
        const html = `<meta property="article:published_time" content="2026-03-09T15:13:00-0500">`
        expect(await parsePageMetadata(new Response(html))).toEqual({
            'article:published_time': '2026-03-09T15:13:00-0500',
        })
    })

    it('extracts multiple meta tags', async () => {
        const html = `
<meta name="category" content="None/subscriber-only">
<meta property="article:published_time" content="2026-03-09T15:13:00-0500">
<meta property="og:title" content="Breaking News">
<meta name="author" content="Jane Doe">
        `
        expect(await parsePageMetadata(new Response(html))).toEqual({
            category: 'None/subscriber-only',
            'article:published_time': '2026-03-09T15:13:00-0500',
            'og:title': 'Breaking News',
            author: 'Jane Doe',
        })
    })

    it('handles content attribute before name/property', async () => {
        const html = `<meta content="2026-03-09T15:13:00" property="datePublished">`
        expect(await parsePageMetadata(new Response(html))).toEqual({
            datePublished: '2026-03-09T15:13:00',
        })
    })

    it('handles self-closing tags', async () => {
        const html = `<meta name="robots" content="noindex, nofollow" />`
        expect(await parsePageMetadata(new Response(html))).toEqual({
            robots: 'noindex, nofollow',
        })
    })

    it('returns empty object when no meta tags', async () => {
        expect(await parsePageMetadata(new Response('<html><body>no meta</body></html>'))).toEqual({})
    })

    it('ignores meta tags without content', async () => {
        const html = `<meta charset="utf-8">`
        expect(await parsePageMetadata(new Response(html))).toEqual({})
    })

    it('handles newlines inside a meta tag', async () => {
        const html = `<meta\n  name="category"\n  content="subscriber-only"\n/>`
        expect(await parsePageMetadata(new Response(html))).toEqual({
            category: 'subscriber-only',
        })
    })

    it('handles content with special characters', async () => {
        const html = `<meta name="description" content="Hello &amp; World <em>test</em>">`
        expect(await parsePageMetadata(new Response(html))).toEqual({
            description: 'Hello &amp; World <em>test</em>',
        })
    })

    it('parses meta tags that appear before a malformed unclosed sibling tag', async () => {
        // The <link> tag is missing its closing ">", so lol-html treats everything after it
        // (including the og:title meta) as attributes of that broken tag.
        // Only the meta tags that appeared before the malformed tag are captured.
        const html = `<html><head>
<meta name="category" content="subscriber-only">
<link rel="stylesheet" href="style.css"
<meta property="og:title" content="Breaking News">
</head><body><p>Unclosed paragraph</body></html>`
        expect(await parsePageMetadata(new Response(html))).toEqual({
            category: 'subscriber-only',
        })
    })

    it('does not parse meta tags inside an unclosed <title> (RCDATA content model)', async () => {
        // Per the HTML5 spec, <title> uses RCDATA - its content is raw text until </title>.
        // An unclosed <title> swallows everything that follows as text, including meta tags.
        const html = `<html><head><title>Unclosed title
<meta name="category" content="subscriber-only">
</head><body></body></html>`
        expect(await parsePageMetadata(new Response(html))).toEqual({})
    })
})

describe('pageMetadata in surface decisions', () => {
    it('sends parsed meta tags in the surface decision request', async () => {
        fetchMock.activate()
        fetchMock.disableNetConnect()

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

        fetchMock.assertNoPendingInterceptors()
    })

    it('sends empty meta when origin has no meta tags', async () => {
        fetchMock.activate()
        fetchMock.disableNetConnect()

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

        fetchMock.assertNoPendingInterceptors()
    })
})
