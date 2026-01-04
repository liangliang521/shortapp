//
//  SubAppExceptionHandler.h
//  shortapp
//
//  Error handler for sub-apps to catch JavaScript errors and prevent crashes
//  Reference: expo-go/ios/Exponent/Kernel/ReactAppManager/EXReactAppExceptionHandler.h
//

#import <React/RCTExceptionsManager.h>
#import <React/RCTAssert.h>

NS_ASSUME_NONNULL_BEGIN

@class SubAppLauncher;

/**
 * Error handler for sub-apps that implements RCTExceptionsManagerDelegate
 * This prevents sub-app errors from crashing the entire application
 */
@interface SubAppExceptionHandler : NSObject <RCTExceptionsManagerDelegate>

- (instancetype)initWithSubAppLauncher:(SubAppLauncher *)launcher NS_DESIGNATED_INITIALIZER;

// Convenience methods for Swift to call
- (void)handleFatalJSExceptionWithMessage:(nullable NSString *)message
                                    stack:(nullable NSArray<NSDictionary<NSString *, id> *> *)stack
                              exceptionId:(NSNumber *)exceptionId
                          extraDataAsJSON:(nullable NSString *)extraDataAsJSON;

- (void)handleSoftJSExceptionWithMessage:(nullable NSString *)message
                                   stack:(nullable NSArray<NSDictionary<NSString *, id> *> *)stack
                             exceptionId:(NSNumber *)exceptionId
                         extraDataAsJSON:(nullable NSString *)extraDataAsJSON;

@end

NS_ASSUME_NONNULL_END

