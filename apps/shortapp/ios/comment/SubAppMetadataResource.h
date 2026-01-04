//
//  SubAppMetadataResource.h
//  shortapp
//
//  Downloads and caches metadata.json files for sub-apps (new format)
//  Supports fileMetadata.ios.bundle and fileMetadata.ios.assets
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface SubAppMetadataResource : NSObject

- (instancetype)initWithMetadataUrl:(NSURL *)url baseUrl:(NSURL *)baseUrl;

/**
 * Load metadata from remote URL or cache
 * @param completion Block called with parsed metadata dictionary or error
 */
- (void)loadMetadataWithCompletion:(void(^)(NSDictionary * _Nullable metadata, NSError * _Nullable error))completion;

/**
 * Extract bundle URL from metadata
 * @param metadata The parsed metadata dictionary
 * @param baseUrl Base URL for constructing full bundle URL
 */
- (nullable NSURL *)bundleUrlFromMetadata:(NSDictionary *)metadata baseUrl:(NSURL *)baseUrl;

/**
 * Extract assets array from metadata
 * @param metadata The parsed metadata dictionary
 * @param baseUrl Base URL for constructing full asset URLs
 */
- (nullable NSArray *)assetsFromMetadata:(NSDictionary *)metadata baseUrl:(NSURL *)baseUrl;

/**
 * Get cached metadata path for this URL
 */
- (NSString *)metadataCachePath;

/**
 * Get scope key from metadata URL (for storage isolation)
 */
- (NSString *)scopeKeyFromUrl:(NSURL *)url;

@end

NS_ASSUME_NONNULL_END

