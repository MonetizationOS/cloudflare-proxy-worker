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

    const [metadataStream, passThroughStream] = modifiedResponse.body?.tee() ?? [null, null]
    const pageMetadata = metadataStream ? await parsePageMetadata(new Response(metadataStream, modifiedResponse)) : {}

    const surfaceDecisions = await fetchSurfaceDecisions({
        surfaceSlug: env.SURFACE_SLUG,
        ...authIdentifier,
        path: new URL(request.url).pathname,
        queryParams: new URL(request.url).searchParams.size > 0 ? Object.fromEntries(new URL(request.url).searchParams) : undefined,
        cf: request.cf,
        pageMetadata,
    })

    return [passThroughStream ? new Response(passThroughStream, modifiedResponse) : modifiedResponse, surfaceDecisions]
}
