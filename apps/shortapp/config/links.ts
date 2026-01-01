/**
 * App Links Configuration
 * Centralized management of all external and internal links
 */

import { Linking } from 'react-native';

// External links
export const EXTERNAL_LINKS = {
  // Legal & Terms
  TERMS_OF_SERVICE: 'https://shortapp.dev/terms-of-service/',
  PRIVACY_POLICY: 'https://shortapp.dev/privacy-policy/',

  // Pricing & Subscription
  PRICING: 'https://vibecodeapp.com/pricing',
  BILLING_MANAGEMENT: 'https://vibecodeapp.com/account/billing',

  // Platform-specific subscription management
  IOS_SUBSCRIPTION_MANAGEMENT: 'https://apps.apple.com/account/subscriptions',
  ANDROID_SUBSCRIPTION_MANAGEMENT: 'https://play.google.com/store/account/subscriptions',

  // Support & Help
  SUPPORT: 'https://vibecodeapp.com/support',
  FAQ: 'https://vibecodeapp.com/faq',

  // Social & Community
  TWITTER: 'https://twitter.com/vibecodeapp',
  DISCORD: 'https://discord.gg/r2unYpFuMP',

  // Documentation
  DOCS: 'https://docs.vibecodeapp.com',
  API_DOCS: 'https://api.vibecodeapp.com/docs',

  // App Store
  APP_STORE: 'https://apps.apple.com/app/vibecode',
  EXPO_DEV_CLIENT: 'https://expo.dev/client',
} as const;

// Internal app routes (for deep linking)
export const INTERNAL_LINKS = {
  HOME: 'vibecoding://home',
  PROJECTS: 'vibecoding://projects',
  SETTINGS: 'vibecoding://settings',
  AI_CHAT: 'vibecoding://ai-chat',
} as const;

// Combined links object for backward compatibility
export const APP_LINKS = {
  // External links
  TERMS_OF_SERVICE: EXTERNAL_LINKS.TERMS_OF_SERVICE,
  PRIVACY_POLICY: EXTERNAL_LINKS.PRIVACY_POLICY,
  PRICING: EXTERNAL_LINKS.PRICING,
  BILLING_MANAGEMENT: EXTERNAL_LINKS.BILLING_MANAGEMENT,
  IOS_SUBSCRIPTION_MANAGEMENT: EXTERNAL_LINKS.IOS_SUBSCRIPTION_MANAGEMENT,
  ANDROID_SUBSCRIPTION_MANAGEMENT: EXTERNAL_LINKS.ANDROID_SUBSCRIPTION_MANAGEMENT,
  SUPPORT: EXTERNAL_LINKS.SUPPORT,
  FAQ: EXTERNAL_LINKS.FAQ,
  TWITTER: EXTERNAL_LINKS.TWITTER,
  DISCORD: EXTERNAL_LINKS.DISCORD,
  DOCS: EXTERNAL_LINKS.DOCS,
  API_DOCS: EXTERNAL_LINKS.API_DOCS,
  APP_STORE: EXTERNAL_LINKS.APP_STORE,
  EXPO_DEV_CLIENT: EXTERNAL_LINKS.EXPO_DEV_CLIENT,
  // Internal links
  INTERNAL: INTERNAL_LINKS,
} as const;

export type ExternalLinkKey = keyof typeof EXTERNAL_LINKS;
export type InternalLinkKey = keyof typeof INTERNAL_LINKS;

/**
 * Get external link URL by key
 */
export const getExternalLink = (key: ExternalLinkKey): string => {
  return EXTERNAL_LINKS[key];
};

/**
 * Get internal app link by key
 */
export const getInternalLink = (key: InternalLinkKey): string => {
  return INTERNAL_LINKS[key];
};

/**
 * Get any link URL by key (for backward compatibility)
 */
export const getLink = (key: ExternalLinkKey | 'INTERNAL'): string | typeof INTERNAL_LINKS => {
  if (key === 'INTERNAL') {
    return INTERNAL_LINKS;
  }
  return EXTERNAL_LINKS[key];
};

/**
 * Check if a URL is an internal app link
 */
export const isInternalLink = (url: string): boolean => {
  return url.startsWith('vibecoding://');
};

/**
 * Open link with appropriate method (external browser or internal navigation)
 */
export const openLink = async (url: string): Promise<void> => {
  if (!url) {
    console.error('URL is null or undefined');
    return;
  }

  if (isInternalLink(url)) {
    // Handle internal navigation
    console.log('Internal navigation:', url);
    // TODO: Implement internal navigation logic
  } else {
    // Open external link
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.error('Cannot open URL:', url);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  }
};
