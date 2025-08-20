import fetchSurfaceDecisions from './fetchSurfaceDecisions';
import { SurfaceDecisionResponse } from '../types';
import handleAuthIdentifier from './handleAuthIdentifier';

export default async function getSurfaceDecisions(
    request: Request,
    env: Env,
    response: Response
): Promise<[Response, SurfaceDecisionResponse | null]> {
    const [modifiedResponse, authIdentifier] = handleAuthIdentifier(request, env, response);

    const surfaceDecisions = await fetchSurfaceDecisions({
        surfaceSlug: env.SURFACE_SLUG,
        ...authIdentifier,
        path: new URL(request.url).pathname,
    });

    return [modifiedResponse, surfaceDecisions];
}
