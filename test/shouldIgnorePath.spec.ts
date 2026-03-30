import { describe, expect, it, vi } from 'vitest'
import shouldIgnorePath from '../src/3-surface-decisions/shouldIgnorePath'

function makeArgs(pathname: string, ignorePaths: string) {
    return [new Request(`https://test.example${pathname}`), { SURFACE_DECISIONS_IGNORE_PATHS: ignorePaths } as Env] as const
}

describe('shouldIgnorePath', () => {
    it('returns false for empty SURFACE_DECISIONS_IGNORE_PATHS', () => {
        expect(shouldIgnorePath(...makeArgs('/any/path', ''))).toBe(false)
    })

    it('returns false when no patterns match', () => {
        expect(shouldIgnorePath(...makeArgs('/page', '^/api/'))).toBe(false)
    })

    it('matches a single regex pattern', () => {
        expect(shouldIgnorePath(...makeArgs('/api/users', '^/api/'))).toBe(true)
    })

    it('matches with multiple comma-separated patterns', () => {
        expect(shouldIgnorePath(...makeArgs('/static/app.js', '^/api/,^/static/'))).toBe(true)
        expect(shouldIgnorePath(...makeArgs('/api/data', '^/api/,^/static/'))).toBe(true)
        expect(shouldIgnorePath(...makeArgs('/page', '^/api/,^/static/'))).toBe(false)
    })

    it('trims whitespace around patterns', () => {
        expect(shouldIgnorePath(...makeArgs('/api/test', ' ^/api/ , ^/static/ '))).toBe(true)
    })

    it('skips empty segments from extra commas', () => {
        expect(shouldIgnorePath(...makeArgs('/api/test', ',^/api/,,^/static/,'))).toBe(true)
    })

    it('skips invalid regex and returns false when no valid patterns match', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        expect(shouldIgnorePath(...makeArgs('/page', '[invalid'))).toBe(false)
        expect(warnSpy).toHaveBeenCalledWith('Invalid SURFACE_DECISIONS_IGNORE_PATHS regex pattern: [invalid')
        warnSpy.mockRestore()
    })

    it('skips invalid regex but still matches valid patterns', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        expect(shouldIgnorePath(...makeArgs('/api/test', '[invalid,^/api/'))).toBe(true)
        expect(warnSpy).toHaveBeenCalledWith('Invalid SURFACE_DECISIONS_IGNORE_PATHS regex pattern: [invalid')
        warnSpy.mockRestore()
    })

    it('returns false when all patterns are invalid', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        expect(shouldIgnorePath(...makeArgs('/api/test', '[bad,[worse'))).toBe(false)
        expect(warnSpy).toHaveBeenCalledTimes(2)
        warnSpy.mockRestore()
    })

    it('supports complex regex patterns', () => {
        expect(shouldIgnorePath(...makeArgs('/assets/img/logo.png', '\\.(png|jpg|css|js)$'))).toBe(true)
        expect(shouldIgnorePath(...makeArgs('/page.html', '\\.(png|jpg|css|js)$'))).toBe(false)
    })
})
