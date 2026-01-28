/** biome-ignore-all lint/style/noNonNullAssertion: looping */
import type { SurfaceDecisionResponse } from '../types'

export type SurfaceMarkers = {
    componentsWithInvalidSelectors: string[]
    markers: Record<string, ComponentRange[]>
}

export type ComponentRange = {
    markers: Marker[]
}

export type Marker = {
    endTag: number | null
    startMarker: boolean
    endMarker: boolean
    nextEndMarker: number | null
}

type Handler = { selector: string; componentKey: string; handler: HTMLRewriterElementContentHandlers }

/**
 * For any modifications with start or end markers, find the positions of those markers.
 */
export const findMarkerPositions = async (response: Response, surfaceDecisions: SurfaceDecisionResponse): Promise<SurfaceMarkers> => {
    const markers: SurfaceMarkers['markers'] = Object.fromEntries(
        Object.entries(surfaceDecisions.componentBehaviors).map(([key]) => [key, []]),
    )

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
                    componentKey,
                    handler: {
                        element: () => {
                            currentRange = { markers: [] }
                            markers[componentKey].push(currentRange)
                        },
                    },
                },
                {
                    selector: `${componentBehavior.metadata.cssSelector} *`,
                    componentKey,
                    handler: {
                        element(element: Element) {
                            if (!currentRange) {
                                console.warn('Invalid state - no current range')
                                return
                            }
                            ++elementCounter
                            const marker: Marker = (currentRange!.markers[elementCounter] = {
                                endMarker: false,
                                startMarker: false,
                                endTag: null,
                                nextEndMarker: null,
                            })
                            try {
                                element.onEndTag(() => {
                                    marker.endTag = elementCounter
                                })
                            } catch {
                                marker.endTag = elementCounter
                            }
                        },
                    } satisfies HTMLRewriterElementContentHandlers,
                },
                toMarker
                    ? {
                          selector: `${componentBehavior.metadata.cssSelector} ${toMarker}`,
                          componentKey,
                          handler: {
                              element() {
                                  if (!currentRange) {
                                      console.warn('Invalid state - no current range')
                                      return
                                  }
                                  currentRange.markers[elementCounter].endMarker = true
                                  for (let i = elementCounter; i >= 1; i--) {
                                      if (currentRange!.markers[i] && !currentRange.markers[i].nextEndMarker) {
                                          currentRange!.markers[i].nextEndMarker = elementCounter
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
                          componentKey,
                          handler: {
                              element() {
                                  if (!currentRange) {
                                      console.warn('Invalid state - no current range')
                                      return
                                  }
                                  currentRange.markers[elementCounter].startMarker = true
                              },
                          } satisfies HTMLRewriterElementContentHandlers,
                      }
                    : null,
            ].filter((e) => !!e)
        },
    )

    if (!Object.keys(handlers).length || !response.body) {
        return { markers, componentsWithInvalidSelectors: [] }
    }

    const componentsWithInvalidSelectors: string[] = []
    const htmlRewriter = new HTMLRewriter()
    for (const { selector, handler, componentKey } of handlers) {
        try {
            htmlRewriter.on(selector, handler)
        } catch (error) {
            console.error(`Error adding component transform for selector '${selector}' of component '${componentKey}'`, error)
            componentsWithInvalidSelectors.push(componentKey)
        }
    }

    await htmlRewriter.transform(response.clone()).text()
    return { markers, componentsWithInvalidSelectors }
}
