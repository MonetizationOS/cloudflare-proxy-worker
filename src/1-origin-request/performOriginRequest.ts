import getTargetUrl from './getTargetUrl';

export default async function performOriginRequest(request: Request, env: Env): Promise<Response> {
    const targetUrl = getTargetUrl(request.url, env.ORIGIN_URL);

    const originResponse = await fetch(targetUrl, request);

    return originResponse;
}
