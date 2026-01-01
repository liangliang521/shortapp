//
//  SubAppManifestResource.h
//  videcodingpreview
//
//  Downloads and caches manifest.json files for sub-apps
//  Reference: expo-go/ios/Exponent/Kernel/AppLoader/CachedResource/EXManifestResource.m
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface SubAppManifestResource : NSObject

- (instancetype)initWithManifestUrl:(NSURL *)url;

/**
 * Load manifest from remote URL or cache
 * @param completion Block called with parsed manifest dictionary or error
 */
- (void)loadManifestWithCompletion:(void(^)(NSDictionary * _Nullable manifest, NSError * _Nullable error))completion;

/**
 * Extract bundle URL from manifest
 */
- (nullable NSURL *)bundleUrlFromManifest:(NSDictionary *)manifest;

/**
 * Extract assets array from manifest
 */
- (nullable NSArray *)assetsFromManifest:(NSDictionary *)manifest;

/**
 * Get cached manifest path for this URL
 */
- (NSString *)manifestCachePath;

/**
 * Get scope key from manifest URL (for storage isolation)
 */
- (NSString *)scopeKeyFromUrl:(NSURL *)url;

@end

NS_ASSUME_NONNULL_END

