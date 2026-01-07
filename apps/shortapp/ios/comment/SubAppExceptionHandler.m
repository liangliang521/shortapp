//
//  SubAppExceptionHandler.m
//  videcodingpreview
//
//  Exception handler for sub-apps to catch runtime errors like missing dependencies
//

#import "SubAppExceptionHandler.h"
#import "SubAppLauncher.h"
#import <React/RCTBridge.h>
#import <React/RCTRedBox.h>
#import <React/RCTLog.h>

@implementation SubAppExceptionHandler {
  __weak SubAppLauncher *_launcher;
}

- (instancetype)initWithSubAppLauncher:(SubAppLauncher *)launcher
{
  if (self = [super init]) {
    _launcher = launcher;
  }
  return self;
}

RCT_NOT_IMPLEMENTED(- (instancetype)init)

#pragma mark - RCTExceptionsManagerDelegate

- (void)handleSoftJSExceptionWithMessage:(nullable NSString *)message
                                   stack:(nullable NSArray<NSDictionary<NSString *, id> *> *)stack
                             exceptionId:(NSNumber *)exceptionId
                         extraDataAsJSON:(nullable NSString *)extraDataAsJSON
{
  // Soft exceptions (warnings) - log but don't crash
  NSLog(@"[SubAppExceptionHandler] Soft JS Exception: %@", message);
  
  // Check if it's a module not found error
  if ([self _isModuleNotFoundError:message]) {
    [self _handleModuleNotFoundError:message stack:stack];
  }
}

- (void)handleFatalJSExceptionWithMessage:(nullable NSString *)message
                                    stack:(nullable NSArray<NSDictionary<NSString *, id> *> *)stack
                              exceptionId:(NSNumber *)exceptionId
                          extraDataAsJSON:(nullable NSString *)extraDataAsJSON
{
  NSLog(@"[SubAppExceptionHandler] ⚠️ Fatal JS Exception caught: %@", message);
  NSLog(@"[SubAppExceptionHandler] Stack trace: %@", stack);
  
  // Check if it's a module not found error (including native module errors)
  BOOL isModuleError = [self _isModuleNotFoundError:message];
  NSLog(@"[SubAppExceptionHandler] Is module not found error: %@", isModuleError ? @"YES" : @"NO");
  
  if (isModuleError) {
    [self _handleModuleNotFoundError:message stack:stack];
  } else {
    // For other fatal errors, send event to JS layer
    [self _sendErrorEventToJS:message stack:stack];
  }
  
  // IMPORTANT: Do NOT call RCTFatal() here - we want to prevent crashes
  // Instead, we send the error to JS layer and let the app handle it gracefully
  // This is different from expo-go which may call RCTFatal for production home app,
  // but for sub-apps we always want graceful error handling
  
  NSLog(@"[SubAppExceptionHandler] ✅ Error handled gracefully, app will NOT crash");
}

- (void)updateJSExceptionWithMessage:(nullable NSString *)message
                               stack:(nullable NSArray *)stack
                         exceptionId:(NSNumber *)exceptionId
{
  // Update existing error (for RedBox)
  NSLog(@"[SubAppExceptionHandler] Update JS Exception: %@", message);
}

#pragma mark - Private Methods

- (BOOL)_isModuleNotFoundError:(NSString *)message
{
  if (!message) {
    return NO;
  }
  
  NSString *lowercaseMessage = [message lowercaseString];
  return (
    [lowercaseMessage containsString:@"cannot find module"] ||
    [lowercaseMessage containsString:@"cannot find native module"] ||
    [lowercaseMessage containsString:@"module not found"] ||
    [lowercaseMessage containsString:@"native module"] ||
    [lowercaseMessage containsString:@"unable to resolve module"] ||
    [lowercaseMessage containsString:@"cannot resolve module"] ||
    [lowercaseMessage containsString:@"dependency"] ||
    [lowercaseMessage containsString:@"package"]
  );
}

- (void)_handleModuleNotFoundError:(NSString *)message stack:(nullable NSArray<NSDictionary<NSString *, id> *> *)stack
{
  NSLog(@"[SubAppExceptionHandler] Module not found error detected: %@", message);
  
  // Extract module name from error message
  NSString *moduleName = [self _extractModuleNameFromError:message];
  
  // Send event to JS layer with detailed error information
  NSMutableDictionary *errorInfo = [NSMutableDictionary dictionaryWithDictionary:@{
    @"type": @"MODULE_NOT_FOUND",
    @"message": message ?: @"Unknown module error",
    @"moduleName": moduleName ?: @"unknown"
  }];
  
  if (stack && stack.count > 0) {
    errorInfo[@"stack"] = stack;
  }
  
  [self _sendErrorEventToJS:message stack:stack errorInfo:errorInfo];
}

- (NSString *)_extractModuleNameFromError:(NSString *)message
{
  if (!message) {
    return nil;
  }
  
  // Try to extract module name from common error patterns
  // Pattern 1: "Cannot find native module 'ExpoMediaLibrary'"
  // Pattern 2: "Cannot find module 'module-name'"
  // Pattern 3: "Cannot find native module ExpoMediaLibrary" (without quotes)
  
  // First try to find quoted module name
  NSRegularExpression *quotedRegex = [NSRegularExpression regularExpressionWithPattern:@"['\"]([^'\"]+)['\"]" options:0 error:nil];
  NSTextCheckingResult *quotedMatch = [quotedRegex firstMatchInString:message options:0 range:NSMakeRange(0, message.length)];
  
  if (quotedMatch && quotedMatch.numberOfRanges > 1) {
    NSRange moduleRange = [quotedMatch rangeAtIndex:1];
    return [message substringWithRange:moduleRange];
  }
  
  // If no quoted match, try to extract from "Cannot find native module ModuleName"
  NSRegularExpression *nativeModuleRegex = [NSRegularExpression regularExpressionWithPattern:@"native module\\s+([A-Za-z0-9_]+)" options:0 error:nil];
  NSTextCheckingResult *nativeModuleMatch = [nativeModuleRegex firstMatchInString:message options:0 range:NSMakeRange(0, message.length)];
  
  if (nativeModuleMatch && nativeModuleMatch.numberOfRanges > 1) {
    NSRange moduleRange = [nativeModuleMatch rangeAtIndex:1];
    return [message substringWithRange:moduleRange];
  }
  
  return nil;
}

- (void)_sendErrorEventToJS:(NSString *)message stack:(nullable NSArray *)stack
{
  [self _sendErrorEventToJS:message stack:stack errorInfo:nil];
}

- (void)_sendErrorEventToJS:(NSString *)message stack:(nullable NSArray *)stack errorInfo:(nullable NSDictionary *)errorInfo
{
  SubAppLauncher *launcher = _launcher;
  if (!launcher) {
    return;
  }
  
  NSMutableDictionary *eventBody = [NSMutableDictionary dictionary];
  eventBody[@"message"] = message ?: @"Unknown error";
  eventBody[@"type"] = errorInfo[@"type"] ?: @"RUNTIME_ERROR";
  
  if (errorInfo) {
    [eventBody addEntriesFromDictionary:errorInfo];
  }
  
  if (stack) {
    eventBody[@"stack"] = stack;
  }
  
  // Send event via bridge
  RCTBridge *bridge = launcher.bridge;
  if (bridge && bridge.valid) {
    dispatch_async(dispatch_get_main_queue(), ^{
      [bridge enqueueJSCall:@"RCTDeviceEventEmitter.emit"
                        args:@[@"onSubAppError", eventBody]];
      NSLog(@"[SubAppExceptionHandler] Sent onSubAppError event to JS: %@", eventBody);
    });
  } else {
    // Fallback: use sendEventWithName
    dispatch_async(dispatch_get_main_queue(), ^{
      [launcher sendEventWithName:@"onSubAppError" body:eventBody];
      NSLog(@"[SubAppExceptionHandler] Sent onSubAppError event via sendEventWithName: %@", eventBody);
    });
  }
}

@end

