//
//  SubAppUpdateManager.m
//  videcodingpreview
//
//  Native module for sub-apps to check for updates and reload
//

#import "SubAppUpdateManager.h"
#import "SubAppLauncher.h"

static NSString *const kSubAppUpdateAvailableNotification = @"SubAppUpdateAvailableNotification";

@implementation SubAppUpdateManager {
  BOOL _hasListeners;
}

RCT_EXPORT_MODULE(SubAppUpdateManager);

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (instancetype)init {
  if (self = [super init]) {
    // Listen for update notifications from SubAppLauncher
    [[NSNotificationCenter defaultCenter] addObserver:self
                                               selector:@selector(_handleUpdateAvailable:)
                                                   name:kSubAppUpdateAvailableNotification
                                                 object:nil];
  }
  return self;
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (NSArray<NSString *> *)supportedEvents {
  return @[@"onUpdateAvailable", @"onUpdateChecked"];
}

- (void)startObserving {
  _hasListeners = YES;
}

- (void)stopObserving {
  _hasListeners = NO;
}

- (void)_handleUpdateAvailable:(NSNotification *)notification {
  if (!_hasListeners) return;
  
  NSDictionary *userInfo = notification.userInfo;
  [self sendEventWithName:@"onUpdateAvailable" body:userInfo];
}

RCT_EXPORT_METHOD(checkForUpdate
                  : (RCTPromiseResolveBlock)resolve
                  reject
                  : (RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    // Forward to SubAppLauncher's class method
    [SubAppLauncher checkForUpdate:resolve reject:reject];
  });
}

RCT_EXPORT_METHOD(reload
                  : (RCTPromiseResolveBlock)resolve
                  reject
                  : (RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    // Forward to SubAppLauncher's class method
    [SubAppLauncher reloadSubApp:resolve reject:reject];
  });
}

@end

