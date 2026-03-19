import { env } from 'cloudflare:workers'
import type { PageMetadata, SurfaceDecisionError, SurfaceDecisionResponse } from '../types'

type FetchSurfaceDecisionsArgs = {
    surfaceSlug: string
    anonymousIdentifier?: string | undefined
    userJwt?: string | undefined
    path: string
    url: string
    cf: CfProperties<unknown> | undefined
    pageMetadata?: PageMetadata
}

const host = env.MONETIZATION_OS_HOST || 'https://api.monetizationos.com'

export default async function fetchSurfaceDecisions({
    surfaceSlug,
    anonymousIdentifier,
    userJwt,
    path,
    url,
    cf,
    pageMetadata,
}: FetchSurfaceDecisionsArgs): Promise<SurfaceDecisionResponse | null> {
    try {
        return await fetch(`${host}/api/v1/surface-decisions`, {
            method: 'POST',
            body: JSON.stringify({
                surfaceSlug,
                identity: {
                    anonymousIdentifier,
                    userJwt,
                },
                resource: {
                    id: path,
                    meta: pageMetadata,
                },
                http: {
                    url,
                },
                cloudflare: {
                    cf,
                },
            }),

            headers: {
                Authorization: `Bearer ${env.MONETIZATION_OS_SECRET_KEY}`,
            },
        })
            .then((r) => r.json<SurfaceDecisionResponse | SurfaceDecisionError>())
            .then((data) => {
                if (data.status === 'error') {
                    throw new Error(data.message)
                }
                return data
            })
    } catch (error) {
        console.error('Error fetching surface decisions:', error)
        return null
    }
}
