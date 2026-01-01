//
//  SubAppUpdateManager.h
//  videcodingpreview
//
//  Native module for sub-apps to check for updates and reload
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

NS_ASSUME_NONNULL_BEGIN

@interface SubAppUpdateManager : RCTEventEmitter <RCTBridgeModule>
@end

NS_ASSUME_NONNULL_END

