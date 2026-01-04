//
//  SubAppLauncher.m
//  videcodingpreview
//
//  Minimal native module: openSubApp shows a simple view, closeSubApp dismisses it.
//

#import "SubAppLauncher.h"
#import "SubAppLoader.h"
#import "SubAppExceptionHandler.h"
#import <UIKit/UIKit.h>
#import <React/RCTBridge.h>
#import <React/RCTUtils.h>
#import "shortapp-Bridging-Header.h"
#import "shortapp-Swift.h"

@interface SubAppLauncher () <SubAppLoaderDelegate>
@property (class, nonatomic, strong) UIViewController *currentSubAppVC;
@property (nonatomic, strong, nullable) SubAppLoader *currentLoader;
@property (nonatomic, strong, nullable) NSURL *currentManifestUrl;
@property (nonatomic, strong, nullable) NSString *currentModuleName;
@property (nonatomic, strong, nullable) NSDictionary *currentInitialProps;
@property (nonatomic, strong, nullable) RCTPromiseResolveBlock pendingResolve;
@property (nonatomic, strong, nullable) RCTPromiseRejectBlock pendingReject;
@property (nonatomic, strong, nullable) UIView *currentSubAppRootView;
@property (nonatomic, strong, nullable) SubAppExceptionHandler *exceptionHandler;

// Private method to set up error handler
- (void)_setupErrorHandlerForRootView:(UIView *)rootView;
@end


@implementation SubAppLauncher

// Global variable to store the bridge-created instance
static SubAppLauncher *g_sharedInstance = nil;

+ (SubAppLauncher *)sharedInstance {
  // Return the bridge instance if available
  if (g_sharedInstance) {
    return g_sharedInstance;
  }
  
  // Fallback to static instance (will be replaced when bridge creates the module)
  static SubAppLauncher *sharedInstance = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    sharedInstance = [[SubAppLauncher alloc] init];
  });
  return sharedInstance;
}

// Called when the module is initialized by RCTBridge
- (instancetype)init {
  if (self = [super init]) {
    // Store this instance as the shared instance
    g_sharedInstance = self;
    NSLog(@"[SubAppLauncher] Module initialized, stored as sharedInstance: %@", self);
  }
  return self;
}

+ (UIView *)currentSubAppRootView {
  SubAppLauncher *instance = [self sharedInstance];
  NSLog(@"[SubAppLauncher] currentSubAppRootView class method called, instance: %@, rootView: %@", instance, instance.currentSubAppRootView);
  return instance.currentSubAppRootView;
}

// Pick the active foreground window (iOS 13+), fallback to legacy keyWindow
static UIWindow *_SubAppActiveWindow(void) {
  UIApplication *app = RCTSharedApplication();
  if (@available(iOS 13.0, *)) {
    for (UIScene *scene in app.connectedScenes) {
      if (scene.activationState == UISceneActivationStateForegroundActive &&
          [scene isKindOfClass:[UIWindowScene class]]) {
        UIWindowScene *windowScene = (UIWindowScene *)scene;
        for (UIWindow *window in windowScene.windows) {
          if (window.isKeyWindow) {
            return window;
          }
        }
        if (windowScene.windows.firstObject) {
          return windowScene.windows.firstObject;
        }
      }
    }
  }
  return app.keyWindow;
}

RCT_EXPORT_MODULE(SubAppLauncher);

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[@"onLoadingProgress", @"onManifestProgress", @"onBundleProgress", @"onAssetsProgress", @"onSubAppReady", @"onUpdateDetected", @"onSubAppError"];
}

- (void)notifySubAppError:(NSString *)errorMessage isFatal:(BOOL)isFatal
{
  NSLog(@"[SubAppLauncher] Notifying sub-app error: %@ (fatal: %@)", errorMessage, isFatal ? @"YES" : @"NO");
  
  // Send error event to React Native
  [self sendEventWithName:@"onSubAppError" body:@{
    @"message": errorMessage ?: @"Unknown error",
    @"isFatal": @(isFatal)
  }];
}

- (void)_setupErrorHandlerForRootView:(UIView *)rootView
{
  // Try to access the bridge from the rootView
  // In new architecture, the rootView might be an RCTSurfaceHostingProxyRootView
  // which has a bridge property
  @try {
    // Try to get bridge using KVC (Key-Value Coding) or selector
    if ([rootView respondsToSelector:@selector(bridge)]) {
      RCTBridge *bridge = [rootView performSelector:@selector(bridge)];
      if (bridge && self.exceptionHandler) {
        // Try to get RCTExceptionsManager and set delegate
        id exceptionsManager = [bridge moduleForName:@"RCTExceptionsManager"];
        if (exceptionsManager && [exceptionsManager respondsToSelector:@selector(setDelegate:)]) {
          [exceptionsManager performSelector:@selector(setDelegate:) withObject:self.exceptionHandler];
          NSLog(@"[SubAppLauncher] Successfully set exception handler delegate");
        } else {
          NSLog(@"[SubAppLauncher] Could not set exception handler delegate (exceptionsManager not found or doesn't support setDelegate:)");
        }
      }
    } else {
      NSLog(@"[SubAppLauncher] RootView does not respond to bridge selector");
    }
  } @catch (NSException *exception) {
    NSLog(@"[SubAppLauncher] Failed to set up error handler: %@", exception);
    // Continue anyway - errors will still be caught via global error handler
  }
}

RCT_EXPORT_METHOD(openSubApp
                  : (NSString *)manifestUrl
                  moduleName
                  : (NSString *)moduleName
                  initialProps
                  : (NSDictionary *)initialProps
                  resolve
                  : (RCTPromiseResolveBlock)resolve
                  reject
                  : (RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UIWindow *window = _SubAppActiveWindow();
    UIViewController *rootVC = window.rootViewController;
    if (!rootVC) {
      reject(@"NO_ROOT_VC", @"Cannot find root view controller", nil);
      return;
    }
    
    NSURL *manifestNSURL = [NSURL URLWithString:manifestUrl];
    if (!manifestNSURL) {
      reject(@"INVALID_URL", [NSString stringWithFormat:@"Invalid manifest URL: %@", manifestUrl], nil);
      return;
    }
    
    // Store pending callbacks and info
    self.pendingResolve = resolve;
    self.pendingReject = reject;
    self.currentManifestUrl = manifestNSURL;
    self.currentModuleName = moduleName;
    
    // Add default scheme for sub-apps to avoid ExpoLinking errors
    // Sub-apps don't have their own app.json, so we provide a default scheme
    NSMutableDictionary *propsWithScheme = [NSMutableDictionary dictionaryWithDictionary:initialProps ?: @{}];
    // Note: ExpoLinking reads scheme from ExpoConstants, not from initialProps
    // We'll need to configure it differently
    self.currentInitialProps = propsWithScheme;
    
    // Create loader
    SubAppLoader *loader = [[SubAppLoader alloc] initWithManifestUrl:manifestNSURL];
    loader.delegate = self;
    // Use Always policy to periodically check for updates (similar to expo-go's behavior)
    loader.updateCheckPolicy = SubAppUpdateCheckPolicyAlways;
    self.currentLoader = loader;
    
    // Start loading
    [loader startLoading];
  });
}

RCT_EXPORT_METHOD(closeSubApp)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [self.currentLoader stopUpdateChecking];
    self.currentLoader = nil;
    // Keep currentManifestUrl, currentModuleName, and currentInitialProps
    // so we can reload even after closing
    
    if (SubAppLauncher.currentSubAppVC) {
      [SubAppLauncher.currentSubAppVC dismissViewControllerAnimated:YES completion:^{
        SubAppLauncher.currentSubAppVC = nil;
      }];
    }
  });
}


RCT_EXPORT_METHOD(checkForUpdate
                  : (RCTPromiseResolveBlock)resolve
                  reject
                  : (RCTPromiseRejectBlock)reject)
{
  [[self class] checkForUpdate:resolve reject:reject];
}

+ (void)checkForUpdate:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    SubAppLauncher *instance = [self sharedInstance];
    if (instance.currentLoader) {
      [instance.currentLoader checkForUpdate];
      if (resolve) resolve(@{@"status": @"checked"});
    } else if (instance.currentManifestUrl) {
      // If loader doesn't exist, create a temporary one just for checking updates
      SubAppLoader *tempLoader = [[SubAppLoader alloc] initWithManifestUrl:instance.currentManifestUrl];
      tempLoader.delegate = instance;
      [tempLoader checkForUpdate];
      if (resolve) resolve(@{@"status": @"checked"});
    } else {
      if (reject) reject(@"NO_LOADER", @"No active sub app loader. Please open a sub app first.", nil);
    }
  });
}

RCT_EXPORT_METHOD(reloadSubApp
                  : (RCTPromiseResolveBlock)resolve
                  reject
                  : (RCTPromiseRejectBlock)reject)
{
  [[self class] reloadSubApp:resolve reject:reject];
}

+ (void)reloadSubApp:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    SubAppLauncher *instance = [self sharedInstance];
    NSLog(@"[SubAppLauncher] reloadSubApp called");
    NSLog(@"[SubAppLauncher] - instance: %@", instance);
    NSLog(@"[SubAppLauncher] - currentLoader: %@", instance.currentLoader);
    NSLog(@"[SubAppLauncher] - currentManifestUrl: %@", instance.currentManifestUrl);
    NSLog(@"[SubAppLauncher] - currentModuleName: %@", instance.currentModuleName);
    
    if (instance.currentLoader) {
      // If loader exists, just reload it
      NSLog(@"[SubAppLauncher] Reloading existing loader");
      [instance.currentLoader reload];
      if (resolve) resolve(@{@"status": @"reloading"});
    } else if (instance.currentManifestUrl && instance.currentModuleName) {
      // If loader doesn't exist but we have the manifest URL, recreate the loader
      NSLog(@"[SubAppLauncher] Recreating loader from stored manifest URL: %@", instance.currentManifestUrl);
      
      // Clear old root view if exists
      if (instance.currentSubAppRootView) {
        [instance.currentSubAppRootView removeFromSuperview];
        instance.currentSubAppRootView = nil;
      }
      
          SubAppLoader *loader = [[SubAppLoader alloc] initWithManifestUrl:instance.currentManifestUrl];
          loader.delegate = instance;
          // Use Always policy to periodically check for updates (similar to expo-go's behavior)
          loader.updateCheckPolicy = SubAppUpdateCheckPolicyAlways;
          instance.currentLoader = loader;
      
      // Store pending callbacks
      instance.pendingResolve = resolve;
      instance.pendingReject = reject;
      
      [loader startLoading];
    } else {
      NSLog(@"[SubAppLauncher] ERROR: No loader and no manifest URL available");
      if (reject) reject(@"NO_LOADER", @"No active sub app loader. Please open a sub app first.", nil);
    }
  });
}

#pragma mark - SubAppLoaderDelegate

- (void)subAppLoaderDidFinishLoading:(SubAppLoader *)loader {
  if (loader != self.currentLoader) {
    return; // Ignore if loader changed
  }
  
  NSURL *bundleURL = loader.bundleURL;
  if (!bundleURL) {
    if (self.pendingReject) {
      NSError *error = [NSError errorWithDomain:@"SubAppLauncher"
                                            code:-1
                                        userInfo:@{NSLocalizedDescriptionKey: @"No bundle URL available"}];
      self.pendingReject(@"NO_BUNDLE", @"No bundle URL available", error);
      self.pendingReject = nil;
      self.pendingResolve = nil;
    }
    return;
  }
  
  NSLog(@"[SubAppLauncher] Creating rootView with bundleURL: %@, moduleName: %@", bundleURL, self.currentModuleName);
  
  // Create error handler for this sub-app
  self.exceptionHandler = [[SubAppExceptionHandler alloc] initWithSubAppLauncher:self];
  
  // Build rootView using a fresh factory
  @try {
    UIView *rootView = [SubAppFactoryHelper makeRootViewWithNewFactory:bundleURL
                                                            moduleName:self.currentModuleName
                                                         initialProps:self.currentInitialProps
                                                      exceptionHandler:self.exceptionHandler];
    if (!rootView) {
      NSLog(@"[SubAppLauncher] ERROR: Failed to create rootView from bundle");
      if (self.pendingReject) {
        self.pendingReject(@"ROOTVIEW_NIL", @"Failed to create rootView from bundle", nil);
        self.pendingReject = nil;
        self.pendingResolve = nil;
      }
      return;
    }
    rootView.translatesAutoresizingMaskIntoConstraints = YES;
    // Set background color for debugging (purple - sub-app root view)
    rootView.backgroundColor = [UIColor colorWithRed:0.9 green:0.8 blue:1.0 alpha:1.0];
    
    NSLog(@"[SubAppLauncher] RootView created successfully:");
    NSLog(@"[SubAppLauncher] - rootView: %@", rootView);
    NSLog(@"[SubAppLauncher] - rootView.frame: %@", NSStringFromCGRect(rootView.frame));
    NSLog(@"[SubAppLauncher] - rootView.backgroundColor: %@", rootView.backgroundColor);
    
    // Store the rootView for embedding (not presenting as modal)
    self.currentSubAppRootView = rootView;
    
    NSLog(@"[SubAppLauncher] Stored currentSubAppRootView: %@", self.currentSubAppRootView);
    NSLog(@"[SubAppLauncher] Loaded bundle=%@ module=%@", bundleURL, self.currentModuleName);
    
    // Try to set up error handler for the sub-app's React Native instance
    // In new architecture, we need to access the bridge/host from the rootView
    // Note: This is a best-effort attempt; errors may still be caught via RCTExceptionsManagerDelegate
    [self _setupErrorHandlerForRootView:rootView];
    
    // Send event to JS to notify that sub-app is ready
    NSLog(@"[SubAppLauncher] Sending onSubAppReady event to JS");
    NSLog(@"[SubAppLauncher] - self: %@", self);
    NSLog(@"[SubAppLauncher] - bridge: %@", self.bridge);
    NSLog(@"[SubAppLauncher] - bridge.valid: %@", self.bridge.valid ? @"YES" : @"NO");
    
    // Use self.bridge (should be set by RCTBridge when module is created)
    RCTBridge *targetBridge = self.bridge;
    
    if (targetBridge && targetBridge.valid) {
      // Use RCTDeviceEventEmitter directly
      id deviceEventEmitter = [targetBridge moduleForName:@"RCTDeviceEventEmitter"];
      if (deviceEventEmitter) {
        [targetBridge enqueueJSCall:@"RCTDeviceEventEmitter.emit"
                                args:@[@"onSubAppReady", @{@"ready": @YES}]];
        NSLog(@"[SubAppLauncher] Event sent via RCTDeviceEventEmitter");
      } else {
        // Fallback to sendEventWithName
        [self sendEventWithName:@"onSubAppReady" body:@{
          @"ready": @YES
        }];
        NSLog(@"[SubAppLauncher] Event sent via sendEventWithName");
      }
    } else {
      NSLog(@"[SubAppLauncher] ERROR: No valid bridge available, will retry");
      // Try to send after a delay
      dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        RCTBridge *retryBridge = self.bridge;
        if (retryBridge && retryBridge.valid) {
          NSLog(@"[SubAppLauncher] Retrying to send onSubAppReady event");
          [retryBridge enqueueJSCall:@"RCTDeviceEventEmitter.emit"
                                args:@[@"onSubAppReady", @{@"ready": @YES}]];
        } else {
          NSLog(@"[SubAppLauncher] ERROR: Bridge still invalid after delay");
        }
      });
    }
    
    // Also post a notification for native views to listen
    NSLog(@"[SubAppLauncher] Posting SubAppRootViewReady notification");
    [[NSNotificationCenter defaultCenter] postNotificationName:@"SubAppRootViewReady" object:rootView];
    NSLog(@"[SubAppLauncher] Notification posted successfully");
    
    if (self.pendingResolve) {
      self.pendingResolve(nil);
      self.pendingResolve = nil;
      self.pendingReject = nil;
    }
  } @catch (NSException *exception) {
    NSLog(@"[SubAppLauncher] Caught exception while creating rootView: %@", exception);
    if (self.pendingReject) {
      // Convert NSException to NSError for React Native promise rejection
      // NSException doesn't have localizedDescription, so we need to create an NSError
      NSString *errorMessage = exception.reason ?: @"Unknown error occurred while loading bundle";
      NSError *error = [NSError errorWithDomain:@"SubAppLauncher"
                                            code:-1
                                        userInfo:@{
        NSLocalizedDescriptionKey: errorMessage,
        @"exceptionName": exception.name ?: @"Unknown",
        @"exceptionReason": exception.reason ?: @""
      }];
      self.pendingReject(@"BUNDLE_LOAD_ERROR", errorMessage, error);
      self.pendingReject = nil;
      self.pendingResolve = nil;
    }
  }
}

- (void)subAppLoader:(SubAppLoader *)loader didFailWithError:(NSError *)error {
  if (loader != self.currentLoader) {
    return;
  }
  
  NSLog(@"[SubApp] Load failed: %@", error);
  if (self.pendingReject) {
    self.pendingReject(@"LOAD_ERROR", error.localizedDescription, error);
    self.pendingReject = nil;
    self.pendingResolve = nil;
  }
}

- (void)subAppLoader:(SubAppLoader *)loader didDetectUpdate:(NSDictionary *)newManifest {
  NSLog(@"[SubApp] Update detected, new manifest: %@", newManifest[@"id"]);
  
  // Send event to JS layer
  if (self.bridge && self.bridge.valid) {
    [self sendEventWithName:@"onUpdateDetected" body:@{
      @"hasUpdate": @YES,
      @"manifest": newManifest ?: @{},
      @"manifestId": newManifest[@"id"] ?: @""
    }];
    NSLog(@"[SubAppLauncher] Sent onUpdateDetected event to JS");
  }
  
  // Send notification that sub-apps can listen to
  [[NSNotificationCenter defaultCenter] postNotificationName:@"SubAppUpdateAvailableNotification"
                                                      object:nil
                                                    userInfo:@{
    @"manifest": newManifest,
    @"hasUpdate": @YES
  }];
  
  // Auto-reload when update is detected (similar to expo-go's behavior)
  // You can comment this out if you want manual reload only
  NSLog(@"[SubAppLauncher] Auto-reloading after update detection...");
  dispatch_async(dispatch_get_main_queue(), ^{
    [loader reload];
  });
}

#pragma mark - Progress Callbacks

- (void)subAppLoader:(SubAppLoader *)loader didUpdateProgress:(SubAppLoadingProgress *)progress {
  [self sendEventWithName:@"onLoadingProgress" body:@{
    @"status": progress.status ?: @"",
    @"done": progress.done ?: @0,
    @"total": progress.total ?: @0,
    @"progress": @(progress.progress)
  }];
}

- (void)subAppLoader:(SubAppLoader *)loader didUpdateManifestProgress:(SubAppLoadingProgress *)progress {
  [self sendEventWithName:@"onManifestProgress" body:@{
    @"status": progress.status ?: @"",
    @"done": progress.done ?: @0,
    @"total": progress.total ?: @0,
    @"progress": @(progress.progress)
  }];
}

- (void)subAppLoader:(SubAppLoader *)loader didUpdateBundleProgress:(SubAppLoadingProgress *)progress {
  [self sendEventWithName:@"onBundleProgress" body:@{
    @"status": progress.status ?: @"",
    @"done": progress.done ?: @0,
    @"total": progress.total ?: @0,
    @"progress": @(progress.progress)
  }];
}

- (void)subAppLoader:(SubAppLoader *)loader didUpdateAssetsProgress:(SubAppLoadingProgress *)progress {
  [self sendEventWithName:@"onAssetsProgress" body:@{
    @"status": progress.status ?: @"",
    @"done": progress.done ?: @0,
    @"total": progress.total ?: @0,
    @"progress": @(progress.progress)
  }];
}

// Simple static storage for presented VC
static UIViewController *_subAppVC = nil;

+ (UIViewController *)currentSubAppVC
{
  return _subAppVC;
}

+ (void)setCurrentSubAppVC:(UIViewController *)vc
{
  _subAppVC = vc;
}

@end

