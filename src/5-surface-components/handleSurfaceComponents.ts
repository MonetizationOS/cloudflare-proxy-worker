import { ContentElementHandler } from './ContentElementHandler';
import type { SurfaceDecisionResponse } from '../types';

export default function handleSurfaceComponents(response: Response, surfaceDecisions: SurfaceDecisionResponse): Response {
    if (surfaceDecisions.componentsSkipped) {
        return response;
    }

    let doRewrite = false;
    const htmlRewriter = new HTMLRewriter();
    Object.values(surfaceDecisions.componentBehaviours).forEach((componentBehaviour) => {
        if (!componentBehaviour.metadata.cssSelector || !componentBehaviour.content) {
            return;
        }

        doRewrite = true;
        htmlRewriter.on(componentBehaviour.metadata.cssSelector, new ContentElementHandler(componentBehaviour.content!));
    });

    return doRewrite ? htmlRewriter.transform(response) : response;
}
