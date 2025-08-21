const protocolPattern = '(https?:)?//';

export default function transformOriginLinks(requestUrl: URL, originUrl: URL, input: string): string {
    if (!input) {
        return input;
    }

    const originPort = originUrl.port ? `:${originUrl.port}` : '';
    const originBasePath = originUrl.pathname.replace(/\/$/, '') ?? '';
    const originUrlRegex = new RegExp(`${protocolPattern}${originUrl.hostname}${originPort}${originBasePath}`, 'g');

    const requestPort = requestUrl.port ? `:${requestUrl.port}` : '';
    const requestUrlValue = `${requestUrl.protocol}//${requestUrl.hostname}${requestPort}`;

    return input.replaceAll(originUrlRegex, requestUrlValue);
}
