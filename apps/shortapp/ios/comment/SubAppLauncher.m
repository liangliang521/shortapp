//
//  SubAppLauncher.m
//  videcodingpreview
//
//  Minimal native module: openSubApp shows a simple view, closeSubApp dismisses it.
//

#import "SubAppLauncher.h"
#import "SubAppLoader.h"
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

// Private helper methods for subAppLoaderDidFinishLoading
- (NSURL *)_validateLoaderAndBundleURL:(SubAppLoader *)loader;
- (UIView *)_createRootViewWithBundleURL:(NSURL *)bundleURL;
- (void)_configureRootView:(UIView *)rootView;
- (void)_sendSubAppReadyEvent;
- (void)_postRootViewReadyNotification:(UIView *)rootView;
- (void)_resolvePendingPromise;
- (void)_handleRootViewCreationError:(NSError *)error;
- (void)_handleSubAppModuleNotFound:(NSNotification *)notification;
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
    
    // 监听子 App 模块未找到的通知
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(_handleSubAppModuleNotFound:)
                                                 name:@"SubAppModuleNotFound"
                                               object:nil];
  }
  return self;
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
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
  // Validate loader and bundle URL
  NSURL *bundleURL = [self _validateLoaderAndBundleURL:loader];
  if (!bundleURL) {
    return;
  }
  
  NSLog(@"[SubAppLauncher] Creating rootView with bundleURL: %@, moduleName: %@", bundleURL, self.currentModuleName);
  
  // Build rootView using a fresh factory
  @try {
    UIView *rootView = [self _createRootViewWithBundleURL:bundleURL];
    if (!rootView) {
      NSError *error = [NSError errorWithDomain:@"SubAppLauncher"
                                            code:-1
                                        userInfo:@{NSLocalizedDescriptionKey: @"Failed to create rootView from bundle"}];
      [self _handleRootViewCreationError:error];
      return;
    }
    
    // Configure and store root view
    [self _configureRootView:rootView];
    self.currentSubAppRootView = rootView;
    
    NSLog(@"[SubAppLauncher] Loaded bundle=%@ module=%@", bundleURL, self.currentModuleName);
    
    // Send events and notifications
    [self _sendSubAppReadyEvent];
    [self _postRootViewReadyNotification:rootView];
    
    // Resolve promise
    [self _resolvePendingPromise];
  } @catch (NSException *exception) {
    NSLog(@"[SubAppLauncher] Caught exception while creating rootView: %@", exception);
    NSString *errorMessage = exception.reason ?: @"Unknown error occurred while loading bundle";
    NSError *error = [NSError errorWithDomain:@"SubAppLauncher"
                                          code:-1
                                      userInfo:@{
      NSLocalizedDescriptionKey: errorMessage,
      @"exceptionName": exception.name ?: @"Unknown",
      @"exceptionReason": exception.reason ?: @""
    }];
    [self _handleRootViewCreationError:error];
  }
}

#pragma mark - Private Helper Methods

- (NSURL *)_validateLoaderAndBundleURL:(SubAppLoader *)loader {
  if (loader != self.currentLoader) {
    return nil; // Ignore if loader changed
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
    return nil;
  }
  
  return bundleURL;
}

- (UIView *)_createRootViewWithBundleURL:(NSURL *)bundleURL {
  return [SubAppFactoryHelper makeRootViewWithNewFactory:bundleURL
                                              moduleName:self.currentModuleName
                                           initialProps:self.currentInitialProps];
}

- (void)_configureRootView:(UIView *)rootView {
  rootView.translatesAutoresizingMaskIntoConstraints = YES;
  // Set background color for debugging (purple - sub-app root view)
  rootView.backgroundColor = [UIColor colorWithRed:0.9 green:0.8 blue:1.0 alpha:1.0];
  
  NSLog(@"[SubAppLauncher] RootView created successfully:");
  NSLog(@"[SubAppLauncher] - rootView: %@", rootView);
  NSLog(@"[SubAppLauncher] - rootView.frame: %@", NSStringFromCGRect(rootView.frame));
  NSLog(@"[SubAppLauncher] - rootView.backgroundColor: %@", rootView.backgroundColor);
  NSLog(@"[SubAppLauncher] Stored currentSubAppRootView: %@", self.currentSubAppRootView);
}

- (void)_sendSubAppReadyEvent {
  NSLog(@"[SubAppLauncher] Sending onSubAppReady event to JS");
  NSLog(@"[SubAppLauncher] - self: %@", self);
  NSLog(@"[SubAppLauncher] - bridge: %@", self.bridge);
  NSLog(@"[SubAppLauncher] - bridge.valid: %@", self.bridge.valid ? @"YES" : @"NO");
  
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
}

- (void)_postRootViewReadyNotification:(UIView *)rootView {
  NSLog(@"[SubAppLauncher] Posting SubAppRootViewReady notification");
  [[NSNotificationCenter defaultCenter] postNotificationName:@"SubAppRootViewReady" object:rootView];
  NSLog(@"[SubAppLauncher] Notification posted successfully");
}

- (void)_resolvePendingPromise {
  if (self.pendingResolve) {
    self.pendingResolve(nil);
    self.pendingResolve = nil;
    self.pendingReject = nil;
  }
}

- (void)_handleRootViewCreationError:(NSError *)error {
  NSLog(@"[SubAppLauncher] ERROR: %@", error.localizedDescription);
  if (self.pendingReject) {
    NSString *errorCode = @"BUNDLE_LOAD_ERROR";
    if ([error.userInfo[@"exceptionName"] isEqualToString:@"NO_BUNDLE"]) {
      errorCode = @"NO_BUNDLE";
    } else if ([error.localizedDescription containsString:@"Failed to create rootView"]) {
      errorCode = @"ROOTVIEW_NIL";
    }
    self.pendingReject(errorCode, error.localizedDescription, error);
    self.pendingReject = nil;
    self.pendingResolve = nil;
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

#pragma mark - Notification Handlers

- (void)_handleSubAppModuleNotFound:(NSNotification *)notification {
  NSDictionary *userInfo = notification.userInfo;
  NSString *moduleName = userInfo[@"moduleName"];
  NSString *message = userInfo[@"message"] ?: [NSString stringWithFormat:@"Cannot find native module '%@'", moduleName];
  
  NSLog(@"[SubAppLauncher] Module not found: %@", moduleName);
  
  // 发送错误事件到 JavaScript 层
  [self sendEventWithName:@"onSubAppError" body:@{
    @"message": message,
    @"moduleName": moduleName ?: @"",
    @"code": @(-1),
    @"domain": @"SubAppLauncher",
    @"isFatal": @NO // 模块未找到不是致命错误，子 App 可以继续运行
  }];
}

@end

