export default function getTargetUrl(requestUrl: string, originUrl: string) {
    const origin = new URL(originUrl);
    const target = new URL(requestUrl);

    target.protocol = origin.protocol;
    target.host = origin.host;
    target.port = origin.port;
    target.pathname = origin.pathname.replace(/\/$/, '') + target.pathname;

    return target;
}
