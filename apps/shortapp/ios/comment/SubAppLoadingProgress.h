//
//  SubAppLoadingProgress.h
//  videcodingpreview
//
//  Progress information for sub-app loading
//  Reference: expo-go/ios/Exponent/Versioned/Core/Internal/EXResourceLoader.h
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface SubAppLoadingProgress : NSObject

@property (nonatomic, copy, nullable) NSString *status;
@property (nonatomic, strong, nullable) NSNumber *done;
@property (nonatomic, strong, nullable) NSNumber *total;
@property (nonatomic, assign) float progress; // 0.0 - 1.0

- (instancetype)initWithStatus:(nullable NSString *)status done:(nullable NSNumber *)done total:(nullable NSNumber *)total;

@end

NS_ASSUME_NONNULL_END

