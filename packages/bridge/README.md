简单双向通信协议（白名单）：
- `getCameraPermission`
- `pushScripe`（发起 Stripe 支付）
- `stripe.paymentResult`（支付结果事件）

### 1) 相机权限查询
调用前先发送 `getCameraPermission` 请求：
```ts
import { WebBridge, ACTIONS } from '@vibecoding/web-rn-bridge';

// 发送请求
WebBridge.send({
  type: 'request',
  action: ACTIONS.GET_CAMERA_PERMISSION, // 'getCameraPermission'
});

// 监听响应
const off = WebBridge.listen((msg) => {
  if (msg?.type === 'response' && msg.action === ACTIONS.GET_CAMERA_PERMISSION) {
    const granted = !!msg.granted;
    console.log('camera permission:', granted);
  }
});
// 组件卸载时调用 off()
```

### 2) Stripe 支付
拿到支付地址后发送 `pushScripe`，把地址相关数据带上：
```ts
import { WebBridge, ACTIONS } from '@vibecoding/web-rn-bridge';

WebBridge.send({
  type: 'request',
  action: ACTIONS.PUSH_STRIPE, // 'pushScripe'
  url: 'https://checkout.stripe.com/pay/your_session_id',
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  requestId: `stripe_${Date.now()}`, // 可选，便于关联
});

// 监听支付结果
const off = WebBridge.listen((msg) => {
  if (msg?.type === 'event' && msg.action === ACTIONS.STRIPE_RESULT) {
    const { status, message } = msg;
    console.log('stripe result:', status, message);
  }
});
// 组件卸载时调用 off()
```
