---
title: "Cross-Chain Bridge APIs: Move Assets Between Blockchains (2026)"
meta_description: "How to use cross-chain bridge APIs — LI.FI, Socket, Across, and LayerZero — to transfer tokens between Ethereum, Arbitrum, Base, Polygon, and Solana."
keywords: "cross-chain bridge API, LI.FI API, Socket API, cross-chain transfer API, LayerZero API"
---

# Cross-Chain Bridge APIs: Move Assets Between Blockchains (2026)

Cross-chain bridges let you move tokens between networks. Bridge aggregators like LI.FI and Socket route through the best bridge automatically.

## LI.FI (Best Aggregator)

```javascript
const LIFI = 'https://li.quest/v1';

// Get a quote for bridging USDC from Ethereum to Arbitrum
const quote = await fetch(
  `${LIFI}/quote?fromChain=ETH&toChain=ARB&fromToken=USDC&toToken=USDC&fromAmount=1000000000&fromAddress=0xYourAddress`
).then(r => r.json());

console.log('To amount:', quote.estimate.toAmount / 1e6, 'USDC');
console.log('Fee:', quote.estimate.feeCosts.map(f => `${f.amount / 1e6} ${f.token.symbol}`).join(', '));
console.log('Duration:', quote.estimate.executionDuration, 'seconds');
console.log('Tool:', quote.toolDetails.name);

// Execute the route
import { createConfig, executeRoute } from '@lifi/sdk';

const config = createConfig({ integrator: 'MyApp' });
const route = await getRoutes({ fromChainId: 1, toChainId: 42161, /* ... */ });
await executeRoute(signer, route.routes[0], {
  updateRouteHook: (updatedRoute) => console.log('Status:', updatedRoute.steps[0].execution?.status)
});
```

## Socket Protocol

```javascript
const SOCKET = 'https://api.socket.tech/v2';
const headers = { 'API-KEY': process.env.SOCKET_API_KEY };

// Get quote
const quote = await fetch(
  `${SOCKET}/quote?fromChainId=1&fromTokenAddress=0xA0b86991c...&toChainId=42161&toTokenAddress=0xFF970A61A04b...&fromAmount=1000000000&userAddress=0xAddress`,
  { headers }
).then(r => r.json());

console.log('Best route:', quote.result.routes[0].usedBridgeNames);
console.log('Output:', quote.result.routes[0].toAmount / 1e6, 'USDC');
```

## Across Protocol (Fast + Cheap)

```javascript
// Across is optimistic bridge — fast for USDC
const res = await fetch(
  'https://across.to/api/suggested-fees?token=USDC&originChainId=1&destinationChainId=42161&amount=1000000000'
).then(r => r.json());

console.log('Relay fee:', res.relayFeePct, '%');
console.log('Total fee:', parseInt(res.totalRelayFee.total) / 1e6, 'USDC');
console.log('Estimated fill time:', res.estimatedFillTimeSec, 'seconds');
```

## LayerZero (Omnichain Messaging)

```solidity
import "@layerzerolabs/solidity-examples/contracts/lzApp/NonblockingLzApp.sol";

contract MyOFT is NonblockingLzApp {
    function sendMessage(uint16 dstChainId, bytes memory payload) external payable {
        _lzSend(dstChainId, payload, payable(msg.sender), address(0), bytes(""), msg.value);
    }

    function _nonblockingLzReceive(uint16, bytes memory, uint64, bytes memory payload) internal override {
        // handle message
    }
}
```

## Wormhole

```javascript
import { Wormhole, routes } from '@wormhole-foundation/sdk';
import { EvmPlatform } from '@wormhole-foundation/sdk-evm';
import { SolanaPlatform } from '@wormhole-foundation/sdk-solana';

const wh = await Wormhole.create('Mainnet', [EvmPlatform, SolanaPlatform]);

const srcChain = wh.getChain('Ethereum');
const dstChain = wh.getChain('Solana');

const route = await routes.RouteTransferRequest.create(wh, {
  source: { chain: srcChain, address: senderAddress },
  destination: { chain: dstChain, address: recipientAddress },
  amount: '100'
});
```
