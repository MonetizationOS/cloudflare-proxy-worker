import type { WebContentSurfaceBehavior, WebElement } from '../types'

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

        if (this.content.before?.length) {
            element.before(renderElements(this.content.before), { html: true })
            retainElement = true
        }

        if (this.content.after?.length) {
            element.after(renderElements(this.content.after), { html: true })
            retainElement = true
        }

        if (this.content.remove) {
            if (retainElement) {
                element.replace('', { html: true })
            } else {
                element.remove()
            }
        }
    }
}

function renderElements(elements: WebElement[]): string {
    return elements
        .map(({ content, type }) => {
            if (type === 'CUSTOM') {
                console.warn('Custom content type not supported')
                return ''
            }
            return content
        })
        .join('\n')
}
