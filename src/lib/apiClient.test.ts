import { describe, it, expect } from 'vitest';
import { buildUrl, applyAuth, buildBody, createEmptyRequest, normalizeEnvironments } from './apiClient';
import type { ApiKeyValue } from '../types';

describe('buildUrl', () => {
  it('returns base URL when no params', () => {
    expect(buildUrl('https://example.com/api', [])).toBe('https://example.com/api');
  });

  it('appends query params', () => {
    const params: ApiKeyValue[] = [
      { id: '1', key: 'page', value: '1', enabled: true },
      { id: '2', key: 'limit', value: '10', enabled: true },
    ];
    const url = buildUrl('https://example.com/api', params);
    expect(url).toContain('page=1');
    expect(url).toContain('limit=10');
  });

  it('skips disabled params', () => {
    const params: ApiKeyValue[] = [
      { id: '1', key: 'page', value: '1', enabled: false },
      { id: '2', key: 'limit', value: '10', enabled: true },
    ];
    expect(buildUrl('https://example.com/api', params)).not.toContain('page=');
  });
});

describe('applyAuth', () => {
  it('adds Bearer token', () => {
    const request = createEmptyRequest();
    request.auth.type = 'bearer';
    request.auth.bearerToken = 'my-token';
    const { headers } = applyAuth(request, {}, 'https://example.com/api');
    expect(headers.Authorization).toBe('Bearer my-token');
  });

  it('adds Basic auth', () => {
    const request = createEmptyRequest();
    request.auth.type = 'basic';
    request.auth.basicUsername = 'admin';
    request.auth.basicPassword = 'pass';
    const { headers } = applyAuth(request, {}, 'https://example.com/api');
    expect(headers.Authorization).toBe('Basic ' + btoa('admin:pass'));
  });

  it('does nothing when auth type is none', () => {
    const request = createEmptyRequest();
    request.auth.type = 'none';
    const { headers } = applyAuth(request, {}, 'https://example.com/api');
    expect(headers.Authorization).toBeUndefined();
  });
});

describe('buildBody', () => {
  it('returns null body for GET', () => {
    const request = createEmptyRequest();
    request.method = 'GET';
    const { body } = buildBody(request, {});
    expect(body).toBeNull();
  });

  it('sets Content-Type for JSON', () => {
    const request = createEmptyRequest();
    request.method = 'POST';
    request.bodyType = 'json';
    request.bodyContent = '{"key":"value"}';
    const { headers } = buildBody(request, {});
    expect(headers['Content-Type']).toBe('application/json');
  });
});

describe('createEmptyRequest', () => {
  it('creates a valid request with defaults', () => {
    const req = createEmptyRequest();
    expect(req.id).toBeDefined();
    expect(req.method).toBe('GET');
    expect(req.url).toBe('');
    expect(req.auth.type).toBe('none');
    expect(req.bodyType).toBe('none');
    expect(req.createdAt).toBeGreaterThan(0);
  });
});

describe('normalizeEnvironments', () => {
  it('returns defaults when no environments provided', () => {
    const result = normalizeEnvironments(undefined, null);
    expect(result.environments.length).toBe(4);
    expect(result.activeEnvironmentId).toBe('local');
  });

  it('restores existing activeEnvironmentId', () => {
    const envs = [
      { id: 'custom', name: 'Custom', isActive: false, createdAt: 0, updatedAt: 0, variables: [] },
    ];
    const result = normalizeEnvironments(envs, 'custom');
    expect(result.activeEnvironmentId).toBe('custom');
  });
});
