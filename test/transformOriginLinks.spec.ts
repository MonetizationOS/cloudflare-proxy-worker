import { describe, expect, it } from 'vitest'
import transformOriginLinks from '../src/2-rewrite-origin-response/transformOriginLinks'

describe('transformOriginLinks', () => {
    const requestUrl = new URL('https://proxy.com/')
    const originUrl = new URL('http://origin.com')

    it('should replace origin links with request links', () => {
        const input = '<a href="http://origin.com/page">Link</a>'
        const output = transformOriginLinks(requestUrl, originUrl, input)
        expect(output).toBe('<a href="https://proxy.com/page">Link</a>')
    })

    it('should handle https origin links', () => {
        const input = '<img src="https://origin.com/img.png">'
        const output = transformOriginLinks(requestUrl, originUrl, input)
        expect(output).toBe('<img src="https://proxy.com/img.png">')
    })

    it('should handle origin links with base path', () => {
        const input = '<img src="https://origin.com/base/img.png">'
        const output = transformOriginLinks(requestUrl, new URL('https://origin.com/base/'), input)
        expect(output).toBe('<img src="https://proxy.com/img.png">')
    })

    it('should handle protocol-relative origin links', () => {
        const input = '<script src="//origin.com/app.js"></script>'
        const output = transformOriginLinks(requestUrl, originUrl, input)
        expect(output).toBe('<script src="https://proxy.com/app.js"></script>')
    })

    it('should handle localhost links', () => {
        const input = '<a href="http://localhost:3000/local">Localhost</a>'
        const output = transformOriginLinks(new URL('http://localhost:8787'), new URL('http://localhost:3000'), input)
        expect(output).toBe('<a href="http://localhost:8787/local">Localhost</a>')
    })

    it('should return input unchanged if no origin links', () => {
        const input = '<span>No links here</span>'
        const output = transformOriginLinks(requestUrl, originUrl, input)
        expect(output).toBe(input)
    })

    it('should return input unchanged if input is empty', () => {
        const input = ''
        const output = transformOriginLinks(requestUrl, originUrl, input)
        expect(output).toBe('')
    })
})
