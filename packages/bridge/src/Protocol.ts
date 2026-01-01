export const ACTIONS = {
  GET_CAMERA_PERMISSION: 'getCameraPermission',
  PUSH_STRIPE: 'pushScripe', // 按用户约定命名
  STRIPE_RESULT: 'stripe.paymentResult',
} as const;

export type AllowedAction = typeof ACTIONS[keyof typeof ACTIONS];

export function isAllowedAction(action?: string): action is AllowedAction {
  return !!action && Object.values(ACTIONS).includes(action as AllowedAction);
}

