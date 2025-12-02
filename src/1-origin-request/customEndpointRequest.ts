import { env } from 'cloudflare:workers'

const mosApiHost = new URL(env.MONETIZATION_OS_HOST || 'https://api.monetizationos.com')
const prefix = env.MONETIZATION_OS_ENDPOINTS_PREFIX || '/mos-endpoints/'

export default async function customEndpointRequest(request: Request): Promise<Response | null> {
    const requestUrl = new URL(request.url)
    if (requestUrl.pathname.startsWith(prefix)) {
        const target = new URL(request.url)

        target.protocol = mosApiHost.protocol
        target.host = mosApiHost.host
        target.port = mosApiHost.port
        target.pathname =
            `/api/v1/envs/${extractEnvironmentFromMosKey()}/endpoints/` +
            requestUrl.pathname.replace(new RegExp(`^${prefix}`), '').replace(/^\//, '')
        return await fetch(target, request)
    }
    return null
}

const extractEnvironmentFromMosKey = () => {
    const [, environmentPrefix, environmentSuffix] = env.MONETIZATION_OS_SECRET_KEY.split('_')
    return `${environmentPrefix}_${environmentSuffix}`
}
