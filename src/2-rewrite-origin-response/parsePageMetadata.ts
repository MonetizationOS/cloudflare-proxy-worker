import type { PageMetadata } from '../types'

/**
 * Extracts all `<meta>` tags from the response, keyed by their `name` or `property` attribute.
 * Uses HTMLRewriter (lol-html) for reliable, streaming HTML parsing.
 */
export async function parsePageMetadata(response: Response): Promise<PageMetadata> {
    const metadata: PageMetadata = {}

    try {
        await new HTMLRewriter()
            .on('meta', {
                element(element) {
                    const key = element.getAttribute('name') ?? element.getAttribute('property')
                    const value = element.getAttribute('content')
                    if (key && value !== null) {
                        metadata[key] = value
                    }
                },
            })
            .transform(response)
            .text()
    } catch (err) {
        console.error('Error parsing page metadata', err)
    }

    return metadata
}
