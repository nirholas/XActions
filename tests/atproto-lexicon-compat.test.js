import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { BskyAgent, RichText, lexicons } from '@atproto/api';

// @atproto/* builds its lexicon schemas with zod at import time and declares
// zod ^3, while package.json overrides zod to a patched 4.x (GHSA-mrhx-c7xc-m3w5
// has no 3.x fix). These tests pin that the override keeps atproto working.

const require = createRequire(import.meta.url);

describe('@atproto/api under the zod override', () => {
	it('resolves the patched zod for atproto', () => {
		const lexiconEntry = require.resolve('@atproto/lexicon');
		const zodPkg = createRequire(lexiconEntry)('zod/package.json');
		const [major, minor, patch] = zodPkg.version.split('.').map(Number);
		expect(major).toBe(4);
		expect(minor * 1000 + patch).toBeGreaterThanOrEqual(6006);
	});

	it('constructs the agent and its generated namespaces', () => {
		const agent = new BskyAgent({ service: 'https://public.api.bsky.app' });
		expect(typeof agent.api.app.bsky.actor.getProfile).toBe('function');
		expect(typeof agent.api.app.bsky.feed.getAuthorFeed).toBe('function');
	});

	it('validates a real getProfile response shape', () => {
		const profile = {
			did: 'did:plc:z72i7hdynmk6r22z27h6tvur',
			handle: 'bsky.app',
			displayName: 'Bluesky',
			followersCount: 1,
			followsCount: 2,
			postsCount: 3,
			createdAt: '2023-04-12T04:53:57.057Z',
			indexedAt: '2024-01-25T23:46:27.452Z',
		};
		expect(() => lexicons.assertValidXrpcOutput('app.bsky.actor.getProfile', profile)).not.toThrow();
	});

	it('still rejects a malformed record', () => {
		expect(() =>
			lexicons.assertValidRecord('app.bsky.feed.post', { $type: 'app.bsky.feed.post', text: 42 }),
		).toThrow();
	});

	it('detects rich text facets', () => {
		const rt = new RichText({ text: 'see https://xactions.app #xactions' });
		rt.detectFacetsWithoutResolution();
		expect(rt.facets?.length).toBe(2);
	});
});
