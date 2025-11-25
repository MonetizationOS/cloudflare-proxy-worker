import { env } from 'cloudflare:workers'
import type { SurfaceDecisionError, SurfaceDecisionResponse } from '../types'

type FetchSurfaceDecisionsArgs = {
    surfaceSlug: string
    anonymousIdentifier?: string | undefined
    userJwt?: string | undefined
    path: string
    resourceMetadata?: Record<string, unknown>
}

const host = env.MONETIZATION_OS_HOST_OVERRIDE ?? 'https://api.monetizationos.com'

export default async function fetchSurfaceDecisions({
    surfaceSlug,
    anonymousIdentifier,
    userJwt,
    path,
    resourceMetadata = {},
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
                    ...resourceMetadata,
                    id: path,
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
