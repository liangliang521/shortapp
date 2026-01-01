export type AnalyticsEventName =
    | 'login'
    | 'checkout'
    | 'purchase'
    | 'signup'
    | 'screen_view'
    | 'custom';

export type AnalyticsParams = Record<string, any>;

export interface AnalyticsAdapter {
    initialize(config?: Record<string, any>): void | Promise<void>;
    track(event: AnalyticsEventName, params?: AnalyticsParams): void | Promise<void>;
    setUserId(userId: string | null): void | Promise<void>;
    setUserProperties(properties: Record<string, any>): void | Promise<void>;
}

export interface AnalyticsConfig {
    google?: { measurementId?: string };
    facebook?: { appId?: string; autoLogAppEvents?: boolean };
    thinking?: { appId?: string; serverUrl?: string };
    debug?: boolean;
}

export type AdapterDelegate = {
    initialize?: (config?: Record<string, any>) => void | Promise<void>;
    track?: (event: string, params?: Record<string, any>) => void | Promise<void>;
    setUserId?: (userId: string | null) => void | Promise<void>;
    setUserProperties?: (properties: Record<string, any>) => void | Promise<void>;
};

export class AnalyticsClient implements AnalyticsAdapter {
    private adapters: AnalyticsAdapter[] = [];
    private debug = false;

    constructor(private config: AnalyticsConfig = {}) { }

    register(adapter: AnalyticsAdapter) {
        this.adapters.push(adapter);
    }

    async initialize() {
        this.debug = !!this.config.debug;
        for (const adapter of this.adapters) {
            await adapter.initialize?.();
        }
    }

    async track(event: AnalyticsEventName, params: AnalyticsParams = {}) {
        const mapped = mapStandardEvent(event, params);
        if (this.debug) {
            // eslint-disable-next-line no-console
            console.log('[Analytics] track', mapped.event, mapped.params);
        }
        await Promise.all(this.adapters.map(a => a.track(mapped.event as AnalyticsEventName, mapped.params)));
    }

    async setUserId(userId: string | null) {
        await Promise.all(this.adapters.map(a => a.setUserId(userId)));
    }

    async setUserProperties(properties: Record<string, any>) {
        await Promise.all(this.adapters.map(a => a.setUserProperties(properties)));
    }
}

// Platform-specific adapters (stubs; integrate SDKs in app layer)
export class GoogleAdapter implements AnalyticsAdapter {
    constructor(private delegate: AdapterDelegate = {}) { }
    initialize(config?: Record<string, any>) { return this.delegate.initialize?.(config); }
    track(event: AnalyticsEventName, params?: AnalyticsParams) {
        const { event: ge, params: gp } = mapGoogle(event, params || {});
        return this.delegate.track?.(ge, gp);
    }
    setUserId(userId: string | null) { return this.delegate.setUserId?.(userId ?? null); }
    setUserProperties(properties: Record<string, any>) { return this.delegate.setUserProperties?.(properties); }
}

export class FacebookAdapter implements AnalyticsAdapter {
    constructor(private delegate: AdapterDelegate = {}) { }
    initialize(config?: Record<string, any>) { return this.delegate.initialize?.(config); }
    track(event: AnalyticsEventName, params?: AnalyticsParams) {
        const { event: fe, params: fp } = mapFacebook(event, params || {});
        return this.delegate.track?.(fe, fp);
    }
    setUserId(userId: string | null) { return this.delegate.setUserId?.(userId ?? null); }
    setUserProperties(properties: Record<string, any>) { return this.delegate.setUserProperties?.(properties); }
}

export class ThinkingAnalyticsAdapter implements AnalyticsAdapter {
    constructor(private delegate: AdapterDelegate = {}) { }
    initialize(config?: Record<string, any>) { return this.delegate.initialize?.(config); }
    track(event: AnalyticsEventName, params?: AnalyticsParams) {
        const { event: te, params: tp } = mapThinking(event, params || {});
        return this.delegate.track?.(te, tp);
    }
    setUserId(userId: string | null) { return this.delegate.setUserId?.(userId ?? null); }
    setUserProperties(properties: Record<string, any>) { return this.delegate.setUserProperties?.(properties); }
}

// Map unified events to normalized parameter names
function mapStandardEvent(event: AnalyticsEventName, params: AnalyticsParams) {
    switch (event) {
        case 'login':
            return { event: 'login', params: { method: params.method || 'unknown', success: params.success ?? true } };
        case 'checkout':
            return { event: 'begin_checkout', params: { value: params.value ?? 0, currency: params.currency || 'USD', items: params.items || [] } };
        case 'purchase':
            return {
                event: 'purchase',
                params: {
                    value: params.value ?? params.amount ?? 0,
                    currency: params.currency || 'USD',
                    transaction_id: params.transaction_id || params.orderId,
                    items: params.items || [],
                },
            };
        case 'screen_view':
            return { event: 'screen_view', params: { screen_name: params.screen_name || params.name } };
        case 'signup':
            return { event: 'sign_up', params: { method: params.method || 'unknown' } };
        default:
            return { event, params };
    }
}

export const analytics = new AnalyticsClient();
// Provider mappers
function mapGoogle(event: AnalyticsEventName, params: AnalyticsParams) {
    const std = mapStandardEvent(event, params);
    return { event: std.event, params: std.params };
}

function mapFacebook(event: AnalyticsEventName, params: AnalyticsParams) {
    const std = mapStandardEvent(event, params);
    switch (std.event) {
        case 'login':
            return { event: 'fb_mobile_login', params: { method: std.params?.method } };
        case 'begin_checkout':
            return { event: 'fb_mobile_initiated_checkout', params: { _valueToSum: std.params?.value, fb_currency: std.params?.currency } };
        case 'sign_up':
            return { event: 'fb_mobile_complete_registration', params: { method: std.params?.method } };
        case 'purchase':
            return { event: 'fb_mobile_purchase', params: { _valueToSum: std.params?.value, fb_currency: std.params?.currency } };
        case 'screen_view':
            return { event: 'fb_mobile_content_view', params: { screen_name: std.params?.screen_name } };
        default:
            return { event: std.event, params: std.params };
    }
}

function mapThinking(event: AnalyticsEventName, params: AnalyticsParams) {
    const std = mapStandardEvent(event, params);
    return { event: std.event, params: std.params };
}

// Helpers
export function trackLogin(method: string, success = true) {
    return analytics.track('login', { method, success });
}
export function trackPurchase(value: number, currency = 'USD', transaction_id?: string, items?: any[]) {
    return analytics.track('purchase', { value, currency, transaction_id, items });
}
export function trackScreenView(screen_name: string) {
    return analytics.track('screen_view', { screen_name });
}
export function trackCheckout(value: number, currency = 'USD', items?: any[]) {
    return analytics.track('checkout', { value, currency, items });
}

// Configure & register inside package
export async function configureAnalytics(options?: {
    debug?: boolean;
    google?: { enabled?: boolean; measurementId?: string; delegate?: AdapterDelegate };
    facebook?: { enabled?: boolean; appId?: string; delegate?: AdapterDelegate };
    thinking?: { enabled?: boolean; appId?: string; serverUrl?: string; delegate?: AdapterDelegate };
}) {
    if (!options) options = {};
    if (typeof options.debug === 'boolean') (analytics as any).debug = options.debug;

    if (options.google?.enabled !== false) {
        const g = new GoogleAdapter(options.google?.delegate || {});
        analytics.register(g);
        await g.initialize?.({ measurementId: options.google?.measurementId });
    }
    if (options.facebook?.enabled !== false) {
        const f = new FacebookAdapter(options.facebook?.delegate || {});
        analytics.register(f);
        await f.initialize?.({ appId: options.facebook?.appId });
    }
    if (options.thinking?.enabled !== false) {
        const t = new ThinkingAnalyticsAdapter(options.thinking?.delegate || {});
        analytics.register(t);
        await t.initialize?.({ appId: options.thinking?.appId, serverUrl: options.thinking?.serverUrl });
    }
}

export async function configureAnalyticsFromEnv(env: Record<string, any> = (typeof process !== 'undefined' ? (process as any).env || {} : {})) {
    await configureAnalytics({
        debug: `${env.ANALYTICS_DEBUG}` === 'true',
        google: { measurementId: env.GOOGLE_MEASUREMENT_ID },
        facebook: { appId: env.FB_APP_ID },
        thinking: { appId: env.TA_APP_ID, serverUrl: env.TA_SERVER_URL },
    });
}
