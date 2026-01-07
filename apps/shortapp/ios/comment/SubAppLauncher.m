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
#import <React/RCTRootView.h>
#import <React/RCTBridge+Private.h>
#import <React/RCTAssert.h>
#import "shortapp-Bridging-Header.h"
#import "shortapp-Swift.h"

// React Native notification names
extern NSString *const RCTJavaScriptDidFailToLoadNotification;

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
    
    if (!manifestUrl.length || !moduleName.length) {
      reject(@"INVALID_PARAMS", @"manifestUrl or moduleName is empty", nil);
      return;
    }
    
    NSURL *manifestNSURL = [NSURL URLWithString:manifestUrl];
    if (!manifestNSURL) {
      reject(@"INVALID_URL", [NSString stringWithFormat:@"Invalid manifest URL: %@", manifestUrl], nil);
      return;
    }
    
    // Clean up old rootView before creating a new one
    UIView *oldRootView = self.currentSubAppRootView;
    if (oldRootView) {
      NSLog(@"[SubAppLauncher] Cleaning up old rootView before opening new sub-app");
      // Post cleanup notification so container views can remove it
      [[NSNotificationCenter defaultCenter] postNotificationName:@"SubAppRootViewCleanup" object:oldRootView];
      // Remove from superview if still attached
      if (oldRootView.superview) {
        [oldRootView removeFromSuperview];
      }
      self.currentSubAppRootView = nil;
    }
    
    // Wait one run loop cycle to ensure container views have processed cleanup
    dispatch_async(dispatch_get_main_queue(), ^{
      [self _startSubAppLoader:manifestNSURL moduleName:moduleName initialProps:initialProps resolve:resolve reject:reject];
    });
  });
}

RCT_EXPORT_METHOD(closeSubApp)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.currentLoader) {
      [self.currentLoader stopUpdateChecking];
    }
    self.currentLoader = nil;
    
    // Clean up exception handler
    self.exceptionHandler = nil;
    
    // Clean up rootView
    UIView *rootView = self.currentSubAppRootView;
    if (rootView) {
      if (rootView.superview) {
        [rootView removeFromSuperview];
      }
      [[NSNotificationCenter defaultCenter] postNotificationName:@"SubAppRootViewCleanup" object:rootView];
      self.currentSubAppRootView = nil;
    }
    
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
      UIView *oldRootView = instance.currentSubAppRootView;
      if (oldRootView) {
        [[NSNotificationCenter defaultCenter] postNotificationName:@"SubAppRootViewCleanup" object:oldRootView];
        if (oldRootView.superview) {
          [oldRootView removeFromSuperview];
        }
        instance.currentSubAppRootView = nil;
      }
      
      // Wait one run loop cycle before recreating
      dispatch_async(dispatch_get_main_queue(), ^{
        SubAppLoader *loader = [[SubAppLoader alloc] initWithManifestUrl:instance.currentManifestUrl];
        loader.delegate = instance;
        // Disable periodic update checking
        loader.updateCheckPolicy = SubAppUpdateCheckPolicyNever;
        instance.currentLoader = loader;
        
        // Store pending callbacks
        instance.pendingResolve = resolve;
        instance.pendingReject = reject;
        
        [loader startLoading];
      });
    } else {
      NSLog(@"[SubAppLauncher] ERROR: No loader and no manifest URL available");
      if (reject) reject(@"NO_LOADER", @"No active sub app loader. Please open a sub app first.", nil);
    }
  });
}

#pragma mark - Loader

- (void)_startSubAppLoader:(NSURL *)manifestURL
                moduleName:(NSString *)moduleName
              initialProps:(NSDictionary *)initialProps
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject
{
  if (self.currentLoader) {
    [self.currentLoader stopUpdateChecking];
  }
  
  // Store pending callbacks and info
  self.pendingResolve = resolve;
  self.pendingReject = reject;
  self.currentManifestUrl = manifestURL;
  self.currentModuleName = moduleName;
  
  // Add default scheme for sub-apps to avoid ExpoLinking errors
  // Sub-apps don't have their own app.json, so we provide a default scheme
  NSMutableDictionary *propsWithScheme = [NSMutableDictionary dictionaryWithDictionary:initialProps ?: @{}];
  // Note: ExpoLinking reads scheme from ExpoConstants, not from initialProps
  // We'll need to configure it differently
  self.currentInitialProps = propsWithScheme;
  
  // Create loader
  SubAppLoader *loader = [[SubAppLoader alloc] initWithManifestUrl:manifestURL];
  loader.delegate = self;
  // Disable periodic update checking
  loader.updateCheckPolicy = SubAppUpdateCheckPolicyNever;
  self.currentLoader = loader;
  
  // Start loading
  [loader startLoading];
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
  
    // Build rootView using a fresh factory
    @try {
      UIView *rootView = [SubAppFactoryHelper makeRootViewWithNewFactory:bundleURL
                                                            moduleName:self.currentModuleName
                                                         initialProps:self.currentInitialProps];
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
      // Do not force a background color here - let the sub-app control its own background.
      
      NSLog(@"[SubAppLauncher] RootView created successfully:");
      NSLog(@"[SubAppLauncher] - rootView: %@", rootView);
      NSLog(@"[SubAppLauncher] - rootView.frame: %@", NSStringFromCGRect(rootView.frame));
      NSLog(@"[SubAppLauncher] - rootView.backgroundColor: %@", rootView.backgroundColor);
      
      // Set up exception handler for runtime errors
      [self _setupExceptionHandlerForRootView:rootView];
      
      // Store the rootView for embedding (not presenting as modal)
      self.currentSubAppRootView = rootView;
    
    NSLog(@"[SubAppLauncher] Stored currentSubAppRootView: %@", self.currentSubAppRootView);
    NSLog(@"[SubAppLauncher] Loaded bundle=%@ module=%@", bundleURL, self.currentModuleName);
    
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

#pragma mark - Exception Handler Setup

- (void)_setupExceptionHandlerForRootView:(UIView *)rootView
{
  // Create exception handler
  self.exceptionHandler = [[SubAppExceptionHandler alloc] initWithSubAppLauncher:self];
  
  // Set up global fatal handler to catch errors that might bypass the delegate
  // This is similar to expo-go's handleFatalReactError
  __weak SubAppLauncher *weakSelf = self;
  RCTFatalHandler fatalHandler = ^(NSError *error) {
    SubAppLauncher *strongSelf = weakSelf;
    if (strongSelf && strongSelf.exceptionHandler) {
      NSString *message = error.localizedDescription ?: @"Unknown fatal error";
      NSArray *stack = error.userInfo[@"RCTJSStackTraceKey"];
      NSLog(@"[SubAppLauncher] ⚠️ Global fatal handler caught error: %@", message);
      [strongSelf.exceptionHandler handleFatalJSExceptionWithMessage:message
                                                                 stack:stack
                                                           exceptionId:@0
                                                       extraDataAsJSON:nil];
    }
  };
  
  // Set the global fatal handler
  RCTSetFatalHandler(fatalHandler);
  NSLog(@"[SubAppLauncher] Set global fatal handler");
  
  // NOTE: Why we use KVC here instead of passing exception handler during creation:
  //
  // expo-go 的实现方式：
  // - 使用 EXVersionManager 来管理 React Native 实例
  // - 在创建 EXVersionManager 时，通过 extraParams 传递 @"exceptionsManagerDelegate"
  // - EXVersionManager 在创建 RCTExceptionsManager 模块时（EXVersionManagerObjC.mm:409-411），
  //   会使用传入的 exceptionsManagerDelegate 来初始化
  // - 这样异常处理器在模块创建时就绑定了，不需要后续注册
  //
  // shortapp 的实现方式：
  // - 使用 ExpoReactNativeFactory.recreateRootView() 直接创建 rootView
  // - 这个 API 不提供传递异常处理器的接口（不像 EXVersionManager 的 extraParams）
  // - ExpoReactNativeFactory 隐藏了内部的 factory 和 host，无法在创建时传递参数
  // - 因此需要通过 KVC 获取 bridge 并手动注册异常处理器
  //
  // 这是架构差异导致的：expo-go 使用更底层的 VersionManager，而 shortapp 使用高级的 Factory API
  
  // Try to get bridge from rootView
  RCTBridge *subAppBridge = nil;
  
  // Method 1: Try to get bridge from RCTRootView (standard React Native)
  if ([rootView isKindOfClass:[RCTRootView class]]) {
    RCTRootView *rctRootView = (RCTRootView *)rootView;
    subAppBridge = rctRootView.bridge;
    NSLog(@"[SubAppLauncher] Got bridge from RCTRootView: %@", subAppBridge);
  }
  
  // Method 2: Try to get bridge via KVC (for ExpoReactNativeFactory's rootView)
  // ExpoReactNativeFactory 创建的 rootView 可能不是 RCTRootView，需要通过 KVC 访问内部属性
  if (!subAppBridge) {
    @try {
      id bridge = [rootView valueForKey:@"bridge"];
      if ([bridge isKindOfClass:[RCTBridge class]]) {
        subAppBridge = (RCTBridge *)bridge;
        NSLog(@"[SubAppLauncher] Got bridge via KVC: %@", subAppBridge);
      }
    } @catch (NSException *exception) {
      NSLog(@"[SubAppLauncher] Could not get bridge via KVC: %@", exception);
    }
  }
  
  // Method 3: Try to get bridge from reactHost (React Native new architecture)
  // 新架构使用 RCTHost，bridge 可能存储在 reactHost 中
  if (!subAppBridge) {
    @try {
      id reactHost = [rootView valueForKey:@"reactHost"];
      if (reactHost) {
        id bridge = [reactHost valueForKey:@"bridge"];
        if ([bridge isKindOfClass:[RCTBridge class]]) {
          subAppBridge = (RCTBridge *)bridge;
          NSLog(@"[SubAppLauncher] Got bridge from reactHost: %@", subAppBridge);
        }
      }
    } @catch (NSException *exception) {
      NSLog(@"[SubAppLauncher] Could not get bridge from reactHost: %@", exception);
    }
  }
  
  if (subAppBridge) {
    // Register exception handler with the bridge
    // Note: In React Native, exceptions manager is accessed via the bridge's module registry
    id exceptionsManager = [subAppBridge moduleForName:@"RCTExceptionsManager"];
    if (exceptionsManager) {
      // Try to set the delegate
      @try {
        [exceptionsManager setValue:self.exceptionHandler forKey:@"delegate"];
        NSLog(@"[SubAppLauncher] Registered exception handler with bridge");
      } @catch (NSException *exception) {
        NSLog(@"[SubAppLauncher] Could not set exception handler delegate: %@", exception);
      }
    } else {
      NSLog(@"[SubAppLauncher] Could not find RCTExceptionsManager module");
    }
  } else {
    NSLog(@"[SubAppLauncher] Could not get bridge from rootView, exception handler will use fallback event sending");
  }
  
  // Also listen for React Native error notifications
  // Note: Runtime errors are handled via RCTExceptionsManagerDelegate protocol methods
  // These notifications are for additional error handling (loading failures)
  [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(_handleReactNativeError:)
                                                 name:RCTJavaScriptDidFailToLoadNotification
                                               object:nil];
  
  // Note: Fatal runtime errors are handled via RCTExceptionsManagerDelegate.handleFatalJSExceptionWithMessage:
  // There is no RCTFatalNotification in React Native - fatal errors go through the delegate
}

- (void)_handleReactNativeError:(NSNotification *)notification
{
  // Handle JavaScript load failures
  NSError *error = notification.userInfo[@"error"];
  NSString *message = error.localizedDescription ?: @"Failed to load JavaScript bundle";
  
  NSLog(@"[SubAppLauncher] React Native load error: %@", message);
  
  if (self.exceptionHandler) {
    // Forward to exception handler
    [self.exceptionHandler handleFatalJSExceptionWithMessage:message
                                                         stack:nil
                                                   exceptionId:@0
                                               extraDataAsJSON:nil];
  }
}


- (void)dealloc
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

@end

