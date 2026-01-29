import type { WebContentSurfaceBehavior } from '../types'
import { renderElement } from './elements'

const transformPositions = ['before', 'prepend', 'append', 'after'] as const
const reverseTransformPositions = ['after', 'prepend']

export class ContentElementHandler implements HTMLRewriterElementContentHandlers {
    content: WebContentSurfaceBehavior

    constructor(content: WebContentSurfaceBehavior) {
        this.content = content
    }

    element(element: Element) {
        if (element.removed) {
            return
        }

        let retainElement = false
        transformPositions.forEach((key) => {
            if (this.content[key]?.length) {
                ;(reverseTransformPositions.includes(key) ? [...this.content[key]].reverse() : this.content[key]).forEach(
                    (transformation) => {
                        element[key](...renderElement(transformation))
                    },
                )
                retainElement = true
            }
        })

        if (this.content.remove) {
            if (retainElement) {
                element.replace('', { html: true })
            } else {
                element.remove()
            }
        }
    }
}
