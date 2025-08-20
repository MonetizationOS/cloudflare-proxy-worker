
import { describe, it, expect } from 'vitest';
import getTargetUrl from '../src/1-origin-request/getTargetUrl';

describe('getTargetUrl', () => {
  it('should replace protocol, host, port, and prepend origin pathname', () => {
    const requestUrl = 'http://example.com/foo/bar?baz=1';
    const originUrl = 'https://origin.com:8080/base/';
    const result = getTargetUrl(requestUrl, originUrl);
    expect(result.protocol).toBe('https:');
    expect(result.host).toBe('origin.com:8080');
    expect(result.port).toBe('8080');
    expect(result.pathname).toBe('/base/foo/bar');
    expect(result.search).toBe('?baz=1');
  });

  it('should handle origin pathname without trailing slash', () => {
    const requestUrl = 'http://example.com/x';
    const originUrl = 'https://origin.com/base';
    const result = getTargetUrl(requestUrl, originUrl);
    expect(result.pathname).toBe('/base/x');
  });

  it('should handle empty origin pathname', () => {
    const requestUrl = 'http://example.com/y';
    const originUrl = 'https://origin.com';
    const result = getTargetUrl(requestUrl, originUrl);
    expect(result.pathname).toBe('/y');
  });

  it('should preserve query and hash from requestUrl', () => {
    const requestUrl = 'http://example.com/z?foo=bar#section';
    const originUrl = 'https://origin.com/';
    const result = getTargetUrl(requestUrl, originUrl);
    expect(result.search).toBe('?foo=bar');
    expect(result.hash).toBe('#section');
  });
});
