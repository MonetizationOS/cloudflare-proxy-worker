import getTargetUrl from './getTargetUrl'

export default function performOriginRequest(request: Request, env: Env): Promise<Response> {
    const targetUrl = getTargetUrl(request.url, env.ORIGIN_URL)
    const extraHeaders = env.ORIGIN_REQUEST_HEADERS

    if (!extraHeaders || Object.keys(extraHeaders).length === 0) {
        return fetch(targetUrl, request)
    }

    const headers = new Headers(request.headers)
    for (const [name, value] of Object.entries(extraHeaders)) {
        headers.set(name, value)
    }

    return fetch(targetUrl, new Request(request, { headers }))
}
