import { env } from 'cloudflare:workers'
import { createProxy } from './proxyConfig'

const proxy = createProxy(env)

export default {
    async fetch(request): Promise<Response> {
        return proxy.handle(request)
    },
} satisfies ExportedHandler<Env>
