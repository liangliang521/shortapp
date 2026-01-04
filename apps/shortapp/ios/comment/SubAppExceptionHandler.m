//
//  SubAppExceptionHandler.m
//  shortapp
//
//  Error handler for sub-apps to catch JavaScript errors and prevent crashes
//  Reference: expo-go/ios/Exponent/Kernel/ReactAppManager/EXReactAppExceptionHandler.m
//

#import "SubAppExceptionHandler.h"
#import "SubAppLauncher.h"
#import <React/RCTRedBox.h>
#import <React/RCTBridge.h>

NS_ASSUME_NONNULL_BEGIN

@interface SubAppExceptionHandler ()

@property (nonatomic, weak) SubAppLauncher *subAppLauncher;

@end

@implementation SubAppExceptionHandler

- (instancetype)initWithSubAppLauncher:(SubAppLauncher *)launcher
{
  if (self = [super init]) {
    _subAppLauncher = launcher;
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
  // Non-fatal errors - just log them
  // In RN 0.8+, RedBox is shown automatically by React Native
  NSLog(@"[SubAppExceptionHandler] Soft JS Exception: %@", message);
  NSLog(@"[SubAppExceptionHandler] Stack: %@", stack);
  
  // Notify the launcher about the error (non-fatal)
  if (self.subAppLauncher) {
    [self.subAppLauncher notifySubAppError:message isFatal:NO];
  }
}

- (void)handleFatalJSExceptionWithMessage:(nullable NSString *)message
                                    stack:(nullable NSArray<NSDictionary<NSString *, id> *> *)stack
                              exceptionId:(NSNumber *)exceptionId
                          extraDataAsJSON:(nullable NSString *)extraDataAsJSON
{
  // Fatal errors - catch them and prevent crash
  NSLog(@"[SubAppExceptionHandler] Fatal JS Exception: %@", message);
  NSLog(@"[SubAppExceptionHandler] Stack: %@", stack);
  
  // Create error object
  NSString *description = [@"Unhandled JS Exception: " stringByAppendingString:(message ?: @"Unknown error")];
  NSDictionary *errorInfo = @{
    NSLocalizedDescriptionKey: description,
    RCTJSStackTraceKey: stack ?: @[]
  };
  NSError *error = [NSError errorWithDomain:RCTErrorDomain code:0 userInfo:errorInfo];
  
  // Notify the launcher about the fatal error
  // This will send an event to React Native to display the error
  if (self.subAppLauncher) {
    [self.subAppLauncher notifySubAppError:description isFatal:YES];
  }
  
  // IMPORTANT: Do NOT call RCTFatal(error) here
  // This prevents the app from crashing
  // Instead, we let the error be handled by the error display UI
}

- (void)updateJSExceptionWithMessage:(nullable NSString *)message
                               stack:(nullable NSArray *)stack
                         exceptionId:(NSNumber *)exceptionId
{
  // Update existing error message (for RedBox)
  NSLog(@"[SubAppExceptionHandler] Update JS Exception: %@", message);
  
  // Try to get RedBox and update it
  // Note: This might not work in all cases, but we try anyway
  @try {
    // RedBox is typically accessed through the bridge
    // Since we don't have direct access to the bridge here, we'll just log
    NSLog(@"[SubAppExceptionHandler] Error updated: %@", message);
  } @catch (NSException *exception) {
    NSLog(@"[SubAppExceptionHandler] Failed to update RedBox: %@", exception);
  }
}

@end

NS_ASSUME_NONNULL_END

