/**
 * Tests for CredentialAuth — multi-step login flow.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CredentialAuth } from '../../../src/client/auth/CredentialAuth.js';
import { AuthenticationError } from '../../../src/client/errors.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeFlowResponse(flowToken, subtaskId = null) {
  return {
    flow_token: flowToken,
    subtasks: subtaskId ? [{ subtask_id: subtaskId }] : [],
  };
}

function makeFetchOk(body) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  });
}

function makeFetchError(status, errors = []) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ errors }),
    headers: new Headers(),
  });
}

function createMocks() {
  const cookieAuth = {
    jar: new Map(),
    isAuthenticated: vi.fn(() => false),
    getCookieString: vi.fn(() => ''),
    updateFromResponse: vi.fn(),
  };

  const tokenManager = {
    activateGuestToken: vi.fn().mockResolvedValue('gt_12345'),
    setCsrfToken: vi.fn(),
  };

  return { cookieAuth, tokenManager };
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('CredentialAuth', () => {
  let credAuth;
  let mocks;
  let fetchMock;

  beforeEach(() => {
    mocks = createMocks();
    credAuth = new CredentialAuth(mocks.cookieAuth, mocks.tokenManager);
    fetchMock = vi.fn();
    credAuth.setFetch(fetchMock);
  });

  // Standard login flow: init → instrumentation → username → password → success
  function setupStandardFlow() {
    fetchMock
      // 1. initiate flow
      .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft_init', 'LoginJsInstrumentationSubtask')))
      // 2. instrumentation
      .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft_instr', 'LoginEnterUserIdentifierSSO')))
      // 3. username
      .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft_user', 'LoginEnterPassword')))
      // 4. password
      .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft_pass', 'LoginSuccessSubtask')));
    mocks.cookieAuth.isAuthenticated.mockReturnValue(true);
  }

  describe('login', () => {
    it('completes standard flow with correct calls', async () => {
      setupStandardFlow();

      await credAuth.login({ username: 'alice', password: 'pw123' });

      // Should have called activateGuestToken once
      expect(mocks.tokenManager.activateGuestToken).toHaveBeenCalledOnce();

      // Should have made 4 POST requests
      expect(fetchMock).toHaveBeenCalledTimes(4);

      // All POSTs go to task.json
      for (let i = 0; i < 4; i++) {
        const [url, opts] = fetchMock.mock.calls[i];
        expect(url).toContain('onboarding/task.json');
        expect(opts.method).toBe('POST');
      }

      // First call includes flow_name=login
      expect(fetchMock.mock.calls[0][0]).toContain('flow_name=login');

      // Instrumentation body
      const instrBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(instrBody.flow_token).toBe('ft_init');
      expect(instrBody.subtask_inputs[0].subtask_id).toBe('LoginJsInstrumentationSubtask');

      // Username body
      const userBody = JSON.parse(fetchMock.mock.calls[2][1].body);
      expect(userBody.flow_token).toBe('ft_instr');

      // Password body
      const passBody = JSON.parse(fetchMock.mock.calls[3][1].body);
      expect(passBody.flow_token).toBe('ft_user');
      expect(passBody.subtask_inputs[0].subtask_id).toBe('LoginEnterPassword');
    });

    it('throws on missing username', async () => {
      await expect(credAuth.login({ username: '', password: 'pw' }))
        .rejects.toThrow('Username and password are required');
    });

    it('throws on missing password', async () => {
      await expect(credAuth.login({ username: 'alice', password: '' }))
        .rejects.toThrow('Username and password are required');
    });

    it('handles email challenge when email is provided', async () => {
      fetchMock
        // init
        .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft_init', 'LoginJsInstrumentationSubtask')))
        // instrumentation
        .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft_instr', 'LoginEnterUserIdentifierSSO')))
        // username → email challenge
        .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft_user', 'LoginEnterAlternateIdentifierSubtask')))
        // email
        .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft_email', 'LoginEnterPassword')))
        // password
        .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft_pass', 'LoginSuccessSubtask')));
      mocks.cookieAuth.isAuthenticated.mockReturnValue(true);

      await credAuth.login({ username: 'alice', password: 'pw123', email: 'alice@test.com' });

      // 5 calls: init, instrumentation, username, email, password
      expect(fetchMock).toHaveBeenCalledTimes(5);

      // Email body
      const emailBody = JSON.parse(fetchMock.mock.calls[3][1].body);
      expect(emailBody.subtask_inputs[0].subtask_id).toBe('LoginEnterAlternateIdentifierSubtask');
      expect(emailBody.subtask_inputs[0].enter_text.text).toBe('alice@test.com');
    });

    it('throws when email challenge occurs but no email provided', async () => {
      fetchMock
        .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft_init', 'LoginJsInstrumentationSubtask')))
        .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft_instr', 'LoginEnterUserIdentifierSSO')))
        .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft_user', 'LoginEnterAlternateIdentifierSubtask')));

      await expect(credAuth.login({ username: 'alice', password: 'pw123' }))
        .rejects.toThrow(/email/i);
    });

    it('handles account duplication check', async () => {
      fetchMock
        .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft_init', 'LoginJsInstrumentationSubtask')))
        .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft_instr', 'LoginEnterUserIdentifierSSO')))
        .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft_user', 'LoginEnterPassword')))
        // password → duplication check
        .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft_pass', 'AccountDuplicationCheck')))
        // duplication check → success
        .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft_dup', 'LoginSuccessSubtask')));
      mocks.cookieAuth.isAuthenticated.mockReturnValue(true);

      await credAuth.login({ username: 'alice', password: 'pw123' });

      expect(fetchMock).toHaveBeenCalledTimes(5);

      // Duplication check body
      const dupBody = JSON.parse(fetchMock.mock.calls[4][1].body);
      expect(dupBody.subtask_inputs[0].subtask_id).toBe('AccountDuplicationCheck');
    });

    it('throws when cookies not set after full flow', async () => {
      setupStandardFlow();
      mocks.cookieAuth.isAuthenticated.mockReturnValue(false); // override — not authenticated

      await expect(credAuth.login({ username: 'alice', password: 'pw123' }))
        .rejects.toThrow(/cookies were not set/i);
    });
  });

  describe('request headers', () => {
    it('includes bearer token and guest token', async () => {
      setupStandardFlow();
      await credAuth.login({ username: 'alice', password: 'pw123' });

      // Every call should have Authorization and x-guest-token
      for (const [, opts] of fetchMock.mock.calls) {
        expect(opts.headers.Authorization).toMatch(/^Bearer AAAA/);
        expect(opts.headers['x-guest-token']).toBe('gt_12345');
      }
    });

    it('includes cookies when cookie jar has values', async () => {
      mocks.cookieAuth.getCookieString.mockReturnValue('ct0=abc; auth_token=xyz');
      setupStandardFlow();

      await credAuth.login({ username: 'alice', password: 'pw123' });

      // Later calls should include the Cookie header
      const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
      expect(lastCall[1].headers.Cookie).toBe('ct0=abc; auth_token=xyz');
    });

    it('updates cookies from each response', async () => {
      setupStandardFlow();
      await credAuth.login({ username: 'alice', password: 'pw123' });

      // updateFromResponse should be called for every step
      expect(mocks.cookieAuth.updateFromResponse).toHaveBeenCalledTimes(4);
    });
  });

  describe('error handling', () => {
    it('throws AuthenticationError on HTTP error', async () => {
      fetchMock.mockReturnValueOnce(makeFetchError(403, [{ message: 'Forbidden' }]));

      await expect(credAuth.login({ username: 'alice', password: 'pw123' }))
        .rejects.toThrow(AuthenticationError);
    });

    it('extracts error message from Twitter response', async () => {
      fetchMock.mockReturnValueOnce(
        makeFetchError(401, [{ message: 'Invalid credentials' }]),
      );

      await expect(credAuth.login({ username: 'alice', password: 'pw123' }))
        .rejects.toThrow('Invalid credentials');
    });

    it('throws when flow returns no flow_token', async () => {
      fetchMock.mockReturnValueOnce(makeFetchOk({ subtasks: [] }));

      await expect(credAuth.login({ username: 'alice', password: 'pw123' }))
        .rejects.toThrow(/flow_token/);
    });
  });

  describe('setFetch', () => {
    it('uses the custom fetch function', async () => {
      const customFetch = vi.fn()
        .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft1', 'LoginJsInstrumentationSubtask')))
        .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft2', 'LoginEnterUserIdentifierSSO')))
        .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft3', 'LoginEnterPassword')))
        .mockReturnValueOnce(makeFetchOk(makeFlowResponse('ft4', 'LoginSuccessSubtask')));
      mocks.cookieAuth.isAuthenticated.mockReturnValue(true);

      credAuth.setFetch(customFetch);
      await credAuth.login({ username: 'alice', password: 'pw123' });

      expect(customFetch).toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
