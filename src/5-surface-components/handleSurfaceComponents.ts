import { env } from 'cloudflare:workers'
import type { SurfaceDecisionResponse } from '../types'
import { buildReplacementHandlers } from './buildReplacementHandlers'
import { ContentElementHandler } from './ContentElementHandler'
import { findMarkerPositions } from './findMarkerPositions'

export default async function handleSurfaceComponents(response: Response, surfaceDecisions: SurfaceDecisionResponse): Promise<Response> {
    if (surfaceDecisions.componentsSkipped) {
        return response
    }

    const { markers, componentsWithInvalidSelectors } = await findMarkerPositions(response, surfaceDecisions)

    let doRewrite = false
    const htmlRewriter = new HTMLRewriter()
    Object.entries(surfaceDecisions.componentBehaviors).forEach(([componentKey, componentBehavior]) => {
        if (!componentBehavior.metadata.cssSelector || !componentBehavior.content) {
            return
        }

        if (componentBehavior.metadata.cssSelector.includes(':last-child')) {
            console.warn(`Ignoring unsupported CSS selector '${componentBehavior.metadata.cssSelector}'`)
            return
        }

        const handlers = {
            [componentBehavior.metadata.cssSelector]: new ContentElementHandler(componentBehavior.content),
            ...(componentsWithInvalidSelectors.includes(componentKey)
                ? {}
                : buildReplacementHandlers(componentBehavior, markers[componentKey])),
        }

        for (const [selector, handler] of Object.entries(handlers)) {
            try {
                htmlRewriter.on(selector, handler)
                doRewrite = true
            } catch (error) {
                console.error(`Error adding component transform for selector '${componentBehavior.metadata.cssSelector}'`, error)
            }
        }
    })

    if (env.INJECT_SCRIPT_URL) {
        htmlRewriter.on('head', {
            element(element) {
                element.append(`<script src="${env.INJECT_SCRIPT_URL}" async defer></script>`, { html: true })
            },
        })
    }

    return doRewrite ? htmlRewriter.transform(response) : response
}
