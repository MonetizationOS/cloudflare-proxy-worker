/** biome-ignore-all lint/style/noNonNullAssertion: looping */
import type { SurfaceDecisionResponse } from '../types'

export type SurfaceMarkers = Record<string, ComponentRange[]>

export type ComponentRange = {
    markers: Marker[]
}

export type Marker = {
    endTag: number | null
    startMarker: boolean
    endMarker: boolean
    nextEndMarker: number | null
}

type Handler = { selector: string; handler: HTMLRewriterElementContentHandlers }

/**
 * For any modifications with start or end markers, find the positions of those markers.
 */
export const findMarkerPositions = async (response: Response, surfaceDecisions: SurfaceDecisionResponse): Promise<SurfaceMarkers> => {
    const markers: SurfaceMarkers = Object.fromEntries(Object.entries(surfaceDecisions.componentBehaviors).map(([key]) => [key, []]))

    const handlers: Handler[] = Object.entries(surfaceDecisions.componentBehaviors).flatMap<Handler>(
        ([componentKey, componentBehavior]) => {
            const modification = componentBehavior.content?.replaceRange
            if (!componentBehavior.metadata?.cssSelector || !modification) {
                return []
            }
            const { toMarker, fromMarker } = modification
            let elementCounter = 0
            let currentRange: ComponentRange | null = null

            return [
                {
                    selector: `${componentBehavior.metadata.cssSelector}`,
                    handler: {
                        element: () => {
                            currentRange = { markers: [] }
                            markers[componentKey].push(currentRange)
                        },
                    },
                },
                {
                    selector: `${componentBehavior.metadata.cssSelector} *`,
                    handler: {
                        element(element: Element) {
                            ++elementCounter
                            const marker: Marker = (currentRange!.markers[elementCounter] = {
                                endMarker: false,
                                startMarker: false,
                                endTag: null,
                                nextEndMarker: null,
                            })
                            element.onEndTag(() => {
                                marker.endTag = elementCounter
                            })
                        },
                    } satisfies HTMLRewriterElementContentHandlers,
                },
                toMarker
                    ? {
                          selector: `${componentBehavior.metadata.cssSelector} ${toMarker}`,
                          handler: {
                              element() {
                                  currentRange!.markers[elementCounter].endMarker = true
                                  for (let j = elementCounter; j >= 1; j--) {
                                      if (currentRange!.markers[j] && !currentRange!.markers[j].nextEndMarker) {
                                          currentRange!.markers[j].nextEndMarker = elementCounter
                                      } else {
                                          break
                                      }
                                  }
                              },
                          } satisfies HTMLRewriterElementContentHandlers,
                      }
                    : null,
                fromMarker
                    ? {
                          selector: `${componentBehavior.metadata.cssSelector} ${fromMarker}`,
                          handler: {
                              element() {
                                  currentRange!.markers[elementCounter].startMarker = true
                              },
                          } satisfies HTMLRewriterElementContentHandlers,
                      }
                    : null,
            ].filter((e) => !!e)
        },
    )

    if (!Object.keys(handlers).length || !response.body) {
        return markers
    }

    const htmlRewriter = new HTMLRewriter()
    for (const { selector, handler } of handlers) {
        htmlRewriter.on(selector, handler)
    }

    await htmlRewriter.transform(response.clone()).text()
    return markers
}
