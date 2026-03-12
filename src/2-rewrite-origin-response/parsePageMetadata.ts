import type { PageMetadata } from '../types'

/**
 * Matches `<meta name="..." content="...">` and `<meta property="..." content="...">`
 * in either attribute order.
 */
const META_TAG_REGEX = /<meta\s+(?:[^>]*?\s)?(?:(?:name|property)=["']([^"']+)["'])\s+(?:[^>]*?\s)?content=["']([^"']*)["'][^>]*>/gi

const META_TAG_CONTENT_FIRST_REGEX =
    /<meta\s+(?:[^>]*?\s)?content=["']([^"']*)["']\s+(?:[^>]*?\s)?(?:name|property)=["']([^"']+)["'][^>]*>/gi

/**
 * Extracts all `<meta>` tags from the HTML, keyed by their `name` or `property` attribute.
 * Handles both attribute orderings (name/property before or after content).
 */
export function parsePageMetadata(html: string): PageMetadata {
    const metadata: PageMetadata = {}

    for (const match of html.matchAll(META_TAG_REGEX)) {
        const key = match[1]?.trim()
        const value = match[2]
        if (key && value !== undefined) {
            metadata[key] = value
        }
    }

    for (const match of html.matchAll(META_TAG_CONTENT_FIRST_REGEX)) {
        const value = match[1]
        const key = match[2]?.trim()
        if (key && value !== undefined && !(key in metadata)) {
            metadata[key] = value
        }
    }

    return metadata
}
