import { describe, expect, it } from 'vitest'
import { hasDomainMapBinding, loadDomainMap, lookupDomainEntry, normalizeHostname, resolveDomainMapSecrets } from '../src/domainMap'

describe('domainMap', () => {
    it('normalizes hostnames by stripping port and lowercasing', () => {
        expect(normalizeHostname('Example.COM:443')).toBe('example.com')
    })

    it('loads and resolves secrets from Worker env vars named in the map', () => {
        expect(
            loadDomainMap(
                {
                    'Proxy.Example:8787': {
                        ORIGIN_URL: 'https://origin.example/',
                        SURFACE_SLUG: 'web',
                        MONETIZATION_OS_SECRET_KEY_ENV: 'MOS_SECRET_PROXY_EXAMPLE',
                    },
                },
                { MOS_SECRET_PROXY_EXAMPLE: 'sk_test_example' },
            ),
        ).toStrictEqual({
            'proxy.example': {
                originUrl: 'https://origin.example',
                surfaceSlug: 'web',
                mosSecretKeyEnvVar: 'MOS_SECRET_PROXY_EXAMPLE',
                mosSecretKey: 'sk_test_example',
            },
        })
    })

    it('parses DOMAIN_MAP from a JSON string', () => {
        expect(
            loadDomainMap(
                JSON.stringify({
                    'proxy.example': {
                        originUrl: 'https://origin.example',
                        surfaceSlug: 'web',
                        mosSecretKeyEnvVar: 'MOS_SECRET_PROXY_EXAMPLE',
                    },
                }),
                { MOS_SECRET_PROXY_EXAMPLE: 'sk_test_example' },
            ),
        ).toMatchObject({
            'proxy.example': {
                mosSecretKey: 'sk_test_example',
            },
        })
    })

    it('fails when a referenced secret env var is missing', () => {
        expect(() =>
            resolveDomainMapSecrets(
                {
                    'proxy.example': {
                        originUrl: 'https://origin.example',
                        surfaceSlug: 'web',
                        mosSecretKeyEnvVar: 'MOS_SECRET_MISSING',
                    },
                },
                {},
            ),
        ).toThrow(/MOS_SECRET_MISSING/)
    })

    it('rejects invalid domain maps', () => {
        expect(() => loadDomainMap([], {})).toThrow(/must be a JSON object/)
        expect(() => loadDomainMap('[]', {})).toThrow(/must be a JSON object/)
        expect(() => loadDomainMap({}, {})).toThrow(/at least one domain/)
    })

    it('looks up entries by request hostname', () => {
        const domainMap = {
            'proxy.example': {
                originUrl: 'https://origin.example',
                surfaceSlug: 'web',
                mosSecretKeyEnvVar: 'MOS_SECRET_PROXY_EXAMPLE',
                mosSecretKey: 'sk_test_example',
            },
        }

        expect(lookupDomainEntry(domainMap, 'https://Proxy.Example:8787/page')).toStrictEqual({
            originUrl: 'https://origin.example',
            surfaceSlug: 'web',
            mosSecretKeyEnvVar: 'MOS_SECRET_PROXY_EXAMPLE',
            mosSecretKey: 'sk_test_example',
        })
        expect(lookupDomainEntry(domainMap, 'https://unknown.example/')).toBeUndefined()
    })

    it('detects when DOMAIN_MAP is set', () => {
        expect(hasDomainMapBinding(undefined)).toBe(false)
        expect(hasDomainMapBinding('')).toBe(false)
        expect(hasDomainMapBinding({})).toBe(false)
        expect(hasDomainMapBinding({ 'a.example': {} })).toBe(true)
        expect(hasDomainMapBinding('{"a.example":{}}')).toBe(true)
    })
})
