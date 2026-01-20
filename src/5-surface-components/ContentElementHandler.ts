import type { WebComponentElement, WebContentSurfaceBehavior, WebElement } from '../types'

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
            this.content.before.forEach((transformation) => {
                element.before(...this.renderElement(transformation))
            })
            retainElement = true
        }

        if (this.content.after?.length) {
            this.content.after.reverse().forEach((transformation) => {
                element.after(...this.renderElement(transformation))
            })
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

    private renderElement(element: WebElement): [string, ContentOptions] {
        try {
            const mapped = {
                ...element,
                type: element.type?.toLowerCase(),
            } as WebElement

            if (mapped.type === 'html') {
                return [mapped.content, { html: true }]
            }

            if (mapped.type === 'text') {
                return [mapped.content, { html: false }]
            }

            if (mapped.type === 'element') {
                return [this.renderComponentElement(mapped), { html: true }]
            }
        } catch (error) {
            console.error('Error rendering element:', error)
            return ['', { html: false }]
        }

        console.warn(`Unsupported element type: ${element.type}`)
        return ['', { html: false }]
    }

    private renderComponentElement(component: WebComponentElement): string {
        const [schemaSource, versionedSchemaId] = component.schema.split(':')
        const [schemaId, schemaVersion] = versionedSchemaId?.split('@') ?? []
        const webComponentTag = `${schemaSource}-${schemaId}`
        const escapedPropsAttribute = JSON.stringify(component.props).replace(/"/g, '&quot;')

        return `<${webComponentTag} version="${schemaVersion ?? ''}" props="${escapedPropsAttribute}"></${webComponentTag}>`
    }
}
