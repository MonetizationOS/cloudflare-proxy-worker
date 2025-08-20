import type { SurfaceDecisionResponse } from '../types';

type ReturnImmediately = boolean;

export default function handleSurfaceBehaviour(
    response: Response,
    surfaceDecisions: SurfaceDecisionResponse
): [Response, ReturnImmediately] {
    const http = surfaceDecisions.surfaceBehavior?.http;
    if (!http || Object.keys(http).length === 0) {
        return [response, false];
    }

    let headers = new Headers(response.headers);
    let status = response.status;
    let statusText = response.statusText;
    let body: BodyInit | null = response.body;
    let returnImmediately = false;

    if ('headers' in http && http.headers) {
        headers = new Headers(http.headers);
    }

    if ('cookies' in http && http.cookies) {
        headers.delete('Set-Cookie');
        http.cookies.forEach((cookie) => headers.append('Set-Cookie', cookie));
    }

    if ('addHeaders' in http && http.addHeaders?.length) {
        http.addHeaders.forEach(({ name, value }) => headers.set(name, value));
    }

    if ('removeHeaders' in http && http.removeHeaders?.length) {
        http.removeHeaders.forEach((name) => headers.delete(name));
    }

    if ('addCookies' in http && http.addCookies?.length) {
        http.addCookies.forEach((cookie) => headers.append('Set-Cookie', cookie));
    }

    if ('status' in http && http.status) {
        status = http.status;
    }

    if ('statusText' in http && http.statusText) {
        statusText = http.statusText;
    }

    if ('body' in http && http.body !== undefined) {
        body = http.body;
        returnImmediately = true;
    }

    return [
        new Response(body, {
            status,
            statusText,
            headers,
        }),
        returnImmediately,
    ];
}
