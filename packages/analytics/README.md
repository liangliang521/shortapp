# @turbo-app/analytics

Unified analytics API with Google, Facebook and ThinkingAnalytics adapters.

- One `track(event, params)` for all providers
- Standard events normalized: `login`, `purchase`, `screen_view`, `signup`
- Adapters are thin; hook real SDKs in app layer

## Quick start

```ts
import { analytics, GoogleAdapter, FacebookAdapter, ThinkingAnalyticsAdapter } from '@turbo-app/analytics';

analytics.register(new GoogleAdapter());
analytics.register(new FacebookAdapter());
analytics.register(new ThinkingAnalyticsAdapter());
await analytics.initialize();

analytics.track('login', { method: 'google' });
analytics.track('purchase', { value: 9.99, currency: 'USD', transaction_id: 'order_123' });
```

