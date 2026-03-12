import { parsePageMetadata } from '../2-rewrite-origin-response/parsePageMetadata'
import type { SurfaceDecisionResponse } from '../types'
import fetchSurfaceDecisions from './fetchSurfaceDecisions'
import handleAuthIdentifier from './handleAuthIdentifier'

export default async function getSurfaceDecisions(
    request: Request,
    env: Env,
    response: Response,
): Promise<[Response, SurfaceDecisionResponse | null]> {
    const [modifiedResponse, authIdentifier] = handleAuthIdentifier(request, env, response)

    const html = await modifiedResponse.clone().text()
    const pageMetadata = parsePageMetadata(html)

    const surfaceDecisions = await fetchSurfaceDecisions({
        surfaceSlug: env.SURFACE_SLUG,
        ...authIdentifier,
        path: new URL(request.url).pathname,
        cf: request.cf,
        pageMetadata,
    })

    return [modifiedResponse, surfaceDecisions]
}
