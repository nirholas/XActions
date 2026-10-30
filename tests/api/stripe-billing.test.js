/**
 * Stripe billing against the installed stripe SDK.
 *
 * The SDK pins an API version per major, and a major can remove request
 * params (stripe 23 dropped `payment_method_types` from Checkout Session
 * creation). The real SDK sends each request to a local server that accepts
 * only params the installed SDK's own SessionCreateParams declares, the way
 * Stripe rejects unknown params. Webhooks go through the real route with a
 * header signed by the SDK.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import express from 'express';
import request from 'supertest';

// stripe's exports map hides package.json, so take the package root from its entry point.
const stripeDir = createRequire(import.meta.url).resolve('stripe').replace(/([\\/]node_modules[\\/]stripe)[\\/].*$/, '$1');

/** Top-level fields of SessionCreateParams in the installed SDK's type definitions. */
function sessionCreateParamNames() {
	const source = readFileSync(join(stripeDir, 'esm/resources/Checkout/Sessions.d.ts'), 'utf8');
	const start = source.indexOf('\n    interface SessionCreateParams {\n');
	const end = source.indexOf('\n    }\n', start);
	return new Set([...source.slice(start, end).matchAll(/^ {8}(\w+)\??:/gm)].map((m) => m[1]));
}

const sent = [];
let server;
const local = vi.hoisted(() => ({ port: 0 }));

vi.mock('stripe', async (importOriginal) => {
	const { default: Stripe } = await importOriginal();
	return {
		default: class LocalStripe extends Stripe {
			constructor(key, config = {}) {
				super(key, { ...config, host: '127.0.0.1', port: local.port, protocol: 'http', maxNetworkRetries: 0 });
			}
		},
	};
});

vi.mock('@prisma/client', () => ({
	PrismaClient: class {
		subscription = {
			findUnique: async () => ({ userId: 'u1', stripeCustomerId: 'cus_local' }),
		};
	},
}));

beforeAll(async () => {
	const allowed = sessionCreateParamNames();
	server = createServer((req, res) => {
		let body = '';
		req.on('data', (chunk) => (body += chunk));
		req.on('end', () => {
			const params = new URLSearchParams(body);
			sent.push({ path: req.url, version: req.headers['stripe-version'], params });
			const unknown = [...new Set([...params.keys()].map((k) => k.split('[')[0]))].filter((k) => !allowed.has(k));
			res.setHeader('content-type', 'application/json');
			if (unknown.length) {
				res.statusCode = 400;
				res.end(JSON.stringify({ error: { type: 'invalid_request_error', message: `Received unknown parameter: ${unknown[0]}`, param: unknown[0] } }));
				return;
			}
			res.end(JSON.stringify({ id: 'cs_local', object: 'checkout.session', url: 'https://checkout.stripe.com/c/pay/cs_local' }));
		});
	});
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	local.port = server.address().port;
	process.env.STRIPE_SECRET_KEY = 'sk_test_local';
	process.env.STRIPE_PRO_PRICE_ID = 'price_local_pro';
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

describe('Stripe checkout', () => {
	it('creates a card-only subscription session with params the pinned API version accepts', async () => {
		vi.resetModules();
		const { createCheckoutSession } = await import('../../api/services/stripeService.js');
		const session = await createCheckoutSession({ id: 'u1', email: 'a@example.com', username: 'a' }, 'pro');

		expect(session.id).toBe('cs_local');
		const { path, version, params } = sent.at(-1);
		expect(path).toBe('/v1/checkout/sessions');
		expect(version).toBe((await import('stripe')).default.API_VERSION);
		expect(params.get('mode')).toBe('subscription');
		expect(params.get('customer')).toBe('cus_local');
		expect(params.get('line_items[0][price]')).toBe('price_local_pro');
		expect(params.getAll('allowed_payment_method_types[0]')).toEqual(['card']);
		expect(params.get('metadata[tier]')).toBe('pro');
	});
});

describe('Stripe webhooks', () => {
	async function app() {
		vi.resetModules();
		const { default: router } = await import('../../api/routes/webhooks.js');
		const a = express();
		a.use('/webhooks', router);
		return a;
	}

	it('accepts an event signed with the endpoint secret', async () => {
		process.env.STRIPE_WEBHOOK_SECRET = 'whsec_local';
		const { default: Stripe } = await import('stripe');
		const payload = JSON.stringify({ id: 'evt_local', object: 'event', type: 'customer.created', data: { object: {} } });
		const header = new Stripe('sk_test_local').webhooks.generateTestHeaderString({ payload, secret: 'whsec_local' });

		const res = await request(await app()).post('/webhooks/stripe').set('stripe-signature', header).set('content-type', 'application/json').send(payload);
		expect(res.status).toBe(200);
	});

	it('rejects an event signed with another secret', async () => {
		process.env.STRIPE_WEBHOOK_SECRET = 'whsec_local';
		const { default: Stripe } = await import('stripe');
		const payload = JSON.stringify({ id: 'evt_forged', object: 'event', type: 'customer.created', data: { object: {} } });
		const header = new Stripe('sk_test_local').webhooks.generateTestHeaderString({ payload, secret: 'whsec_other' });

		const res = await request(await app()).post('/webhooks/stripe').set('stripe-signature', header).set('content-type', 'application/json').send(payload);
		expect(res.status).toBe(400);
	});
});
