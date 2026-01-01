//
//  SubAppLoader.h
//  videcodingpreview
//
//  Core loader for sub-apps: downloads manifest, bundle, and assets
//  Reference: expo-go/ios/Client/HomeAppLoader.swift
//

#import <Foundation/Foundation.h>
#import "SubAppLoadingProgress.h"

NS_ASSUME_NONNULL_BEGIN

@class SubAppLoader;

@protocol SubAppLoaderDelegate <NSObject>
@optional
- (void)subAppLoader:(SubAppLoader *)loader didLoadManifest:(NSDictionary *)manifest;
- (void)subAppLoader:(SubAppLoader *)loader didLoadBundle:(NSURL *)bundleURL;
- (void)subAppLoader:(SubAppLoader *)loader didLoadAsset:(NSString *)assetPath;
- (void)subAppLoaderDidFinishLoading:(SubAppLoader *)loader;
- (void)subAppLoader:(SubAppLoader *)loader didFailWithError:(NSError *)error;
- (void)subAppLoader:(SubAppLoader *)loader didDetectUpdate:(NSDictionary *)newManifest;
// Progress callbacks
- (void)subAppLoader:(SubAppLoader *)loader didUpdateProgress:(SubAppLoadingProgress *)progress;
- (void)subAppLoader:(SubAppLoader *)loader didUpdateManifestProgress:(SubAppLoadingProgress *)progress;
- (void)subAppLoader:(SubAppLoader *)loader didUpdateBundleProgress:(SubAppLoadingProgress *)progress;
- (void)subAppLoader:(SubAppLoader *)loader didUpdateAssetsProgress:(SubAppLoadingProgress *)progress;
@end

typedef NS_ENUM(NSInteger, SubAppUpdateCheckPolicy) {
  SubAppUpdateCheckPolicyNever,      // Never check for updates
  SubAppUpdateCheckPolicyOnLaunch,   // Check on launch only
  SubAppUpdateCheckPolicyAlways      // Always check periodically
};

@interface SubAppLoader : NSObject

@property (nonatomic, weak, nullable) id<SubAppLoaderDelegate> delegate;
@property (nonatomic, assign) SubAppUpdateCheckPolicy updateCheckPolicy;
@property (nonatomic, assign) NSTimeInterval updateCheckInterval; // Default: 60 seconds
@property (nonatomic, strong, readonly, nullable) NSDictionary *currentManifest;
@property (nonatomic, strong, readonly, nullable) NSURL *bundleURL;
@property (nonatomic, strong, readonly) NSURL *manifestUrl;

- (instancetype)initWithManifestUrl:(NSURL *)manifestUrl;

/**
 * Start loading: download manifest, bundle, and assets
 */
- (void)startLoading;

/**
 * Reload: re-download everything
 */
- (void)reload;

/**
 * Check for updates: compare current manifest with remote
 */
- (void)checkForUpdate;

/**
 * Stop update checking timer
 */
- (void)stopUpdateChecking;

/**
 * Get local path for an asset by key
 */
- (nullable NSString *)assetPathForKey:(NSString *)key;

/**
 * Get assets directory path
 */
- (NSString *)assetsDirectoryPath;

@end

NS_ASSUME_NONNULL_END

