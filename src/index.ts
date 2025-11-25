import performOriginRequest from './1-origin-request/performOriginRequest'
import rewriteOriginResponse from './2-rewrite-origin-response/rewriteOriginResponse'
import getSurfaceDecisions from './3-surface-decisions/getSurfaceDecisions'
import handleSurfaceBehavior from './4-surface-behavior/handleSurfaceBehavior'
import handleSurfaceComponents from './5-surface-components/handleSurfaceComponents'

export default {
    async fetch(request, env): Promise<Response> {
        // Step 1: Origin request
        const originResponse = await performOriginRequest(request, env)
        if (!originResponse.headers.get('Content-Type')?.startsWith('text/html')) {
            return originResponse
        }

        try {
            // Step 2: Rewrite Origin Links
            const rewrittenResponse = await rewriteOriginResponse(request, env, originResponse)
            if (!rewrittenResponse) {
                return originResponse
            }

            // Step 3: MonetizationOS Surface Decisions
            const [modifiedResponse, surfaceDecisions] = await getSurfaceDecisions(request, env, rewrittenResponse)
            if (!surfaceDecisions) {
                return modifiedResponse
            }

            // Step 4: Apply Surface Behavior
            const [surfaceDecisionResponse, returnImmediately] = handleSurfaceBehavior(modifiedResponse, surfaceDecisions)
            if (returnImmediately) {
                return surfaceDecisionResponse
            }

            // Step 5: Apply Surface Component Behaviors
            return handleSurfaceComponents(surfaceDecisionResponse, surfaceDecisions)
        } catch (err) {
            console.error('Error processing response', err)
            return originResponse
        }
    },
} satisfies ExportedHandler<Env>
