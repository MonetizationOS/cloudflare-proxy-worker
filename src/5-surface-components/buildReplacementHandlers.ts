import type { SubSurfaceBehaviorApi } from '../types'
import { renderElement } from './elements'
import type { ComponentRange } from './findMarkerPositions'

type ReplacementState = {
    operation: 'SCANNING' | 'REMOVING' | 'REPLACED'
}
export type ReplacementHandler = { selector: string; handler: HTMLRewriterElementContentHandlers }

/**
 * Build handlers for HtmlRewriter to do range replacements.
 * Requires that the document has already been passed once to find marker positions.
 */
export const buildReplacementHandlers = (subSurface: SubSurfaceBehaviorApi, ranges: ComponentRange[]): ReplacementHandler[] => {
    const modification = subSurface.content?.replaceRange
    if (!modification) {
        return []
    }

    if (modification.fromMarker && modification.toMarker && modification.fromMarker === modification.toMarker) {
        console.warn(`fromMarker and toMarker are the same ('${modification.fromMarker}'). This is not supported.`)
        return []
    }

    // State
    let elementCounter = 0
    let rangeIndex = -1
    const states: ReplacementState[] = []
    const getCurrentState = () => {
        const state = states[states.length - 1]
        if (!state) {
            console.warn('Invalid state - no replacement is in progress')
            return
        }
        return state
    }

    const onChildElement = (element: Element) => {
        elementCounter++
        if (element.removed) {
            return
        }

        const state = getCurrentState()
        const marker = ranges[rangeIndex].markers[elementCounter]

        // If waiting to start replacement and this is a start marker, begin removing at the end of this element
        if (state?.operation === 'SCANNING') {
            if (marker?.startMarker) {
                for (const after of (modification.replaceWith ?? []).reverse()) {
                    element.after(...renderElement(after))
                }
                try {
                    element.onEndTag(() => {
                        state.operation = 'REMOVING'
                    })
                } catch {
                    state.operation = 'REMOVING'
                }
            }
            return
        }

        // If removing...
        if (state?.operation === 'REMOVING') {
            // ... and this is an end marker, insert the replacement before and stop replacing ...
            if (marker?.endMarker) {
                state.operation = 'REPLACED'
                return
            }

            // .. or if this element ends after the next end marker, then it must contain that marker, so include it ...
            if (
                marker?.endTag !== elementCounter && //
                marker?.nextEndMarker &&
                marker?.endTag &&
                marker?.endTag >= marker?.nextEndMarker
            ) {
                return
            }

            // ... otherwise, remove the element
            element.remove()
            return
        }
    }

    const parentHandler: HTMLRewriterElementContentHandlers = {
        element(element: Element) {
            rangeIndex++
            if (element.removed) {
                return
            }

            const state: ReplacementState = { operation: modification.fromMarker ? 'SCANNING' : 'REMOVING' }
            states.push(state)

            // If removing from the beginning, insert the replacement now
            if (state.operation === 'REMOVING') {
                for (const prepend of (modification.replaceWith ?? []).reverse()) {
                    element.prepend(...renderElement(prepend))
                }
            }

            // After the end of this element, finish the replacement
            element.onEndTag(() => {
                states.pop()
            })
        },

        text: (element: Text) => {
            const state = getCurrentState()
            if (state?.operation === 'REMOVING') {
                element.remove()
            }
        },
    }

    return [
        { selector: `${subSurface.metadata.cssSelector}`, handler: parentHandler },
        { selector: `${subSurface.metadata.cssSelector} *`, handler: { element: onChildElement } },
    ]
}
