//
//  SubAppExceptionHandler.h
//  videcodingpreview
//
//  Exception handler for sub-apps to catch runtime errors like missing dependencies
//

#import <React/RCTExceptionsManager.h>
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@class SubAppLauncher;

@interface SubAppExceptionHandler : NSObject <RCTExceptionsManagerDelegate>

- (instancetype)initWithSubAppLauncher:(SubAppLauncher *)launcher NS_DESIGNATED_INITIALIZER;

@end

NS_ASSUME_NONNULL_END

