//
//  SubAppLauncher.h
//  videcodingpreview
//
//  Minimal native module that shows a simple view on open.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

NS_ASSUME_NONNULL_BEGIN

@class SubAppLauncher;

@interface SubAppLauncher : RCTEventEmitter <RCTBridgeModule>

// Class methods for SubAppUpdateManager to call
+ (void)checkForUpdate:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
+ (void)reloadSubApp:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;

// Get current sub-app root view for embedding
+ (UIView * _Nullable)currentSubAppRootView;

@end

NS_ASSUME_NONNULL_END

