import { describe, expect, it } from 'vitest'
import { parsePageMetadata } from '../src/2-rewrite-origin-response/parsePageMetadata'

describe('parsePageMetadata', () => {
    it('extracts meta name tags', () => {
        const html = `<meta name="category" content="None/, None/subscriber-only, ">`
        expect(parsePageMetadata(html)).toEqual({
            category: 'None/, None/subscriber-only, ',
        })
    })

    it('extracts meta property tags', () => {
        const html = `<meta property="article:published_time" content="2026-03-09T15:13:00-0500">`
        expect(parsePageMetadata(html)).toEqual({
            'article:published_time': '2026-03-09T15:13:00-0500',
        })
    })

    it('extracts multiple meta tags', () => {
        const html = `
<meta name="category" content="None/subscriber-only">
<meta property="article:published_time" content="2026-03-09T15:13:00-0500">
<meta property="og:title" content="Breaking News">
<meta name="author" content="Jane Doe">
        `
        expect(parsePageMetadata(html)).toEqual({
            category: 'None/subscriber-only',
            'article:published_time': '2026-03-09T15:13:00-0500',
            'og:title': 'Breaking News',
            author: 'Jane Doe',
        })
    })

    it('handles content attribute before name/property', () => {
        const html = `<meta content="2026-03-09T15:13:00" property="datePublished">`
        expect(parsePageMetadata(html)).toEqual({
            datePublished: '2026-03-09T15:13:00',
        })
    })

    it('handles self-closing tags', () => {
        const html = `<meta name="robots" content="noindex, nofollow" />`
        expect(parsePageMetadata(html)).toEqual({
            robots: 'noindex, nofollow',
        })
    })

    it('returns empty object when no meta tags', () => {
        expect(parsePageMetadata('<html><body>no meta</body></html>')).toEqual({})
    })

    it('ignores meta tags without content', () => {
        const html = `<meta charset="utf-8">`
        expect(parsePageMetadata(html)).toEqual({})
    })
})
