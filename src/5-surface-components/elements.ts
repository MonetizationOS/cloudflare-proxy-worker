import type { WebComponentElement, WebElement } from '../types'

export const renderElement = (element: WebElement): [string, ContentOptions] => {
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
            return [renderComponentElement(mapped), { html: true }]
        }
    } catch (error) {
        console.error('Error rendering element:', error)
        return ['', { html: false }]
    }

    console.warn(`Unsupported element type: ${element.type}`)
    return ['', { html: false }]
}

export const renderComponentElement = (component: WebComponentElement): string => {
    const [schemaSource, versionedSchemaId] = component.schema.split(':')
    const [schemaId, schemaVersion] = versionedSchemaId?.split('@') ?? []
    const webComponentTag = `${schemaSource}-${schemaId}`
    const escapedPropsAttribute = JSON.stringify(component.props).replace(/"/g, '&quot;')

    return `<${webComponentTag} version="${schemaVersion ?? ''}" props="${escapedPropsAttribute}"></${webComponentTag}>`
}
