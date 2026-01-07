//
//  SubAppLoader.m
//  videcodingpreview
//
//  Core loader for sub-apps: downloads manifest, bundle, and assets
//  Reference: expo-go/ios/Client/HomeAppLoader.swift
//

#import "SubAppLoader.h"
#import "SubAppManifestResource.h"
#import "SubAppMetadataResource.h"
#import "SubAppLoadingProgress.h"
#import <CommonCrypto/CommonDigest.h>
#import <UIKit/UIKit.h>

@interface SubAppLoader () <NSURLSessionDownloadDelegate>
@property (nonatomic, strong, nullable) SubAppManifestResource *manifestResource;
@property (nonatomic, strong, nullable) SubAppMetadataResource *metadataResource;
@property (nonatomic, strong, nullable) NSURL *baseUrl; // Base URL for metadata format
@property (nonatomic, assign) BOOL useMetadataFormat; // YES if using metadata.json, NO if using manifest.json
@property (nonatomic, strong, nullable) NSDictionary *currentManifest;
@property (nonatomic, strong, nullable) NSDictionary *currentMetadata;
@property (nonatomic, strong, nullable) NSURL *bundleURL;
@property (nonatomic, strong) NSMutableSet<NSString *> *downloadedAssets;
@property (nonatomic, strong, nullable) NSTimer *updateCheckTimer;
@property (nonatomic, assign) BOOL isLoading;
// Progress tracking
@property (nonatomic, assign) NSInteger totalAssets;
@property (nonatomic, assign) NSInteger downloadedAssetsCount;
@property (nonatomic, strong, nullable) NSURLSessionDownloadTask *bundleDownloadTask;
@property (nonatomic, strong, nullable) NSMutableDictionary<NSNumber *, NSURLSessionDownloadTask *> *assetDownloadTasks;
@property (nonatomic, strong) NSURLSession *downloadSession;

// Private methods
- (NSString *)_getScopeKey;
- (void)_clearCache;
- (void)_notifyProgressWithStatus:(NSString *)status done:(NSNumber *)done total:(NSNumber *)total type:(NSString *)type;
- (void)_downloadBundleFromURL:(NSURL *)bundleUrl withCompletion:(void(^)(NSURL * _Nullable bundleURL, NSError * _Nullable error))completion;
- (void)_downloadBundleWithCompletion:(void(^)(NSURL * _Nullable bundleURL, NSError * _Nullable error))completion;
- (void)_downloadAssetsWithCompletion:(void(^)(NSError * _Nullable error))completion;
- (NSString *)_bundleCachePath;
- (BOOL)_verifyHash:(NSData *)data expectedHash:(NSString *)expectedHash;
- (void)_startUpdateCheckingIfNeeded;
- (void)_handleAppDidBecomeActive:(NSNotification *)notification;
- (void)_loadMetadataResource;
- (void)_loadManifestResource;
- (void)_handleMetadataLoaded:(NSDictionary *)metadata error:(NSError *)error;
- (void)_handleManifestLoaded:(NSDictionary *)manifest error:(NSError *)error;
- (void)_downloadBundleAndAssetsAfterResourceLoaded;
- (void)_startBundleDownload;
- (void)_handleBundleDownloaded:(NSURL *)bundleURL error:(NSError *)error;
- (void)_startAssetsDownload;
- (void)_handleAssetsDownloaded:(NSError *)error;
- (void)_finishLoadingWithError:(NSError *)error;
- (NSString *)_hashString:(NSString *)string;
@end

@implementation SubAppLoader

- (instancetype)initWithManifestUrl:(NSURL *)manifestUrl {
  if (self = [super init]) {
    _manifestUrl = manifestUrl;
    _downloadedAssets = [NSMutableSet set];
    _updateCheckPolicy = SubAppUpdateCheckPolicyNever; // Disable periodic checking by default
    _updateCheckInterval = 60.0; // 60 seconds (not used when policy is Never)
    _isLoading = NO;
    _totalAssets = 0;
    _downloadedAssetsCount = 0;
    _assetDownloadTasks = [NSMutableDictionary dictionary];
    
    // Detect format: check if URL contains "metadata.json"
    NSString *urlString = [manifestUrl absoluteString];
    _useMetadataFormat = [urlString containsString:@"metadata.json"];
    
    if (_useMetadataFormat) {
      // Use new metadata.json format
      // Extract base URL (everything before /metadata.json)
      NSRange metadataRange = [urlString rangeOfString:@"/metadata.json"];
      NSString *baseUrlString = [urlString substringToIndex:metadataRange.location];
      _baseUrl = [NSURL URLWithString:baseUrlString];
      
      _metadataResource = [[SubAppMetadataResource alloc] initWithMetadataUrl:manifestUrl baseUrl:_baseUrl];
      NSLog(@"[SubAppLoader] Using metadata.json format with base URL: %@", _baseUrl);
    } else {
      // Use old manifest.json format
      _manifestResource = [[SubAppManifestResource alloc] initWithManifestUrl:manifestUrl];
      NSLog(@"[SubAppLoader] Using manifest.json format");
    }
    
    // Create session with delegate for progress tracking
    NSURLSessionConfiguration *config = [NSURLSessionConfiguration defaultSessionConfiguration];
    _downloadSession = [NSURLSession sessionWithConfiguration:config delegate:self delegateQueue:[NSOperationQueue mainQueue]];
    
    // Listen for app state changes to check for updates when app comes to foreground
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(_handleAppDidBecomeActive:)
                                                 name:UIApplicationDidBecomeActiveNotification
                                               object:nil];
  }
  return self;
}

- (void)dealloc {
  [self stopUpdateChecking];
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)startLoading {
  if (self.isLoading) {
    NSLog(@"[SubAppLoader] Already loading, ignoring startLoading");
    return;
  }
  
  self.isLoading = YES;
  NSLog(@"[SubAppLoader] Starting load for manifest: %@", self.manifestUrl);
  
  // Clear cache for this project before loading (to ensure fresh data)
  [self _clearCache];
  
  // Load resource based on format
  if (self.useMetadataFormat) {
    [self _loadMetadataResource];
  } else {
    [self _loadManifestResource];
  }
}

#pragma mark - Resource Loading

- (void)_loadMetadataResource {
  NSString *resourceType = @"metadata";
  [self _notifyProgressWithStatus:[NSString stringWithFormat:@"正在下载 %@...", resourceType] done:@0 total:@1 type:resourceType];
  
  [self.metadataResource loadMetadataWithCompletion:^(NSDictionary * _Nullable metadata, NSError * _Nullable error) {
    [self _notifyProgressWithStatus:[NSString stringWithFormat:@"%@ 下载完成", resourceType] done:@1 total:@1 type:resourceType];
    [self _handleMetadataLoaded:metadata error:error];
  }];
}

- (void)_loadManifestResource {
  NSString *resourceType = @"manifest";
  [self _notifyProgressWithStatus:[NSString stringWithFormat:@"正在下载 %@...", resourceType] done:@0 total:@1 type:resourceType];
  
  [self.manifestResource loadManifestWithCompletion:^(NSDictionary * _Nullable manifest, NSError * _Nullable error) {
    [self _notifyProgressWithStatus:[NSString stringWithFormat:@"%@ 下载完成", resourceType] done:@1 total:@1 type:resourceType];
    [self _handleManifestLoaded:manifest error:error];
  }];
}

- (void)_handleMetadataLoaded:(NSDictionary *)metadata error:(NSError *)error {
  if (error) {
    [self _finishLoadingWithError:error];
    return;
  }
  
  if (!metadata) {
    NSError *noMetadataError = [NSError errorWithDomain:@"SubAppLoader"
                                                   code:-1
                                               userInfo:@{NSLocalizedDescriptionKey: @"No metadata returned"}];
    [self _finishLoadingWithError:noMetadataError];
    return;
  }
  
  self.currentMetadata = metadata;
  self.currentManifest = metadata; // Store as manifest for compatibility
  
  if ([self.delegate respondsToSelector:@selector(subAppLoader:didLoadManifest:)]) {
    [self.delegate subAppLoader:self didLoadManifest:metadata];
  }
  
  [self _downloadBundleAndAssetsAfterResourceLoaded];
}

- (void)_handleManifestLoaded:(NSDictionary *)manifest error:(NSError *)error {
  if (error) {
    [self _finishLoadingWithError:error];
    return;
  }
  
  if (!manifest) {
    NSError *noManifestError = [NSError errorWithDomain:@"SubAppLoader"
                                                    code:-1
                                                userInfo:@{NSLocalizedDescriptionKey: @"No manifest returned"}];
    [self _finishLoadingWithError:noManifestError];
    return;
  }
  
  self.currentManifest = manifest;
  
  if ([self.delegate respondsToSelector:@selector(subAppLoader:didLoadManifest:)]) {
    [self.delegate subAppLoader:self didLoadManifest:manifest];
  }
  
  [self _downloadBundleAndAssetsAfterResourceLoaded];
}

- (void)_downloadBundleAndAssetsAfterResourceLoaded {
  [self _startBundleDownload];
}

- (void)_startBundleDownload {
  [self _notifyProgressWithStatus:@"正在下载 bundle..." done:@0 total:@1 type:@"bundle"];
  
  void (^bundleCompletion)(NSURL * _Nullable bundleURL, NSError * _Nullable error) = ^(NSURL * _Nullable bundleURL, NSError * _Nullable error) {
    [self _notifyProgressWithStatus:@"Bundle 下载完成" done:@1 total:@1 type:@"bundle"];
    [self _handleBundleDownloaded:bundleURL error:error];
  };
  
  // Download bundle based on format
  if (self.useMetadataFormat) {
    NSURL *bundleUrl = [self.metadataResource bundleUrlFromMetadata:self.currentMetadata baseUrl:self.baseUrl];
    if (!bundleUrl) {
      NSError *noBundleError = [NSError errorWithDomain:@"SubAppLoader"
                                                     code:-1
                                                 userInfo:@{NSLocalizedDescriptionKey: @"No bundle URL found in metadata"}];
      [self _finishLoadingWithError:noBundleError];
      return;
    }
    [self _downloadBundleFromURL:bundleUrl withCompletion:bundleCompletion];
  } else {
    [self _downloadBundleWithCompletion:bundleCompletion];
  }
}

- (void)_handleBundleDownloaded:(NSURL *)bundleURL error:(NSError *)error {
  if (error) {
    [self _finishLoadingWithError:error];
    return;
  }
  
  self.bundleURL = bundleURL;
  
  if ([self.delegate respondsToSelector:@selector(subAppLoader:didLoadBundle:)]) {
    [self.delegate subAppLoader:self didLoadBundle:bundleURL];
  }
  
  [self _startAssetsDownload];
}

- (void)_startAssetsDownload {
  // Get assets based on format
  NSArray *assets = nil;
  if (self.useMetadataFormat && self.metadataResource && self.currentMetadata) {
    assets = [self.metadataResource assetsFromMetadata:self.currentMetadata baseUrl:self.baseUrl];
  } else if (self.manifestResource && self.currentManifest) {
    assets = [self.manifestResource assetsFromManifest:self.currentManifest];
  }
  
  self.totalAssets = assets ? assets.count : 0;
  self.downloadedAssetsCount = 0;
  
  if (self.totalAssets > 0) {
    [self _notifyProgressWithStatus:@"正在下载静态资源..." done:@0 total:@(self.totalAssets) type:@"assets"];
    [self _downloadAssetsWithCompletion:^(NSError * _Nullable error) {
      [self _handleAssetsDownloaded:error];
    }];
  } else {
    // No assets to download, finish loading
    [self _handleAssetsDownloaded:nil];
  }
}

- (void)_handleAssetsDownloaded:(NSError *)error {
  if (self.totalAssets > 0) {
    [self _notifyProgressWithStatus:@"静态资源下载完成" done:@(self.totalAssets) total:@(self.totalAssets) type:@"assets"];
    
    // Log downloaded assets summary
    NSLog(@"[SubAppLoader] ===== Assets Download Summary =====");
    NSLog(@"[SubAppLoader] Total assets: %ld", (long)self.totalAssets);
    NSLog(@"[SubAppLoader] Downloaded: %ld", (long)self.downloadedAssetsCount);
    NSLog(@"[SubAppLoader] Downloaded asset keys: %@", self.downloadedAssets);
    
    // List all files in assets directory
    NSString *assetsDir = [self assetsDirectoryPath];
    NSFileManager *fm = [NSFileManager defaultManager];
    if ([fm fileExistsAtPath:assetsDir]) {
      NSArray *files = [fm contentsOfDirectoryAtPath:assetsDir error:nil];
      NSLog(@"[SubAppLoader] Files in assets directory (%@): %@", assetsDir, files);
      
      // Recursively list all files
      NSArray *allFiles = [fm subpathsOfDirectoryAtPath:assetsDir error:nil];
      NSLog(@"[SubAppLoader] All files (recursive): %@", allFiles);
    } else {
      NSLog(@"[SubAppLoader] ⚠️ Assets directory does not exist: %@", assetsDir);
    }
    NSLog(@"[SubAppLoader] ===== End Assets Summary =====");
  }
  
  if (error) {
    NSLog(@"[SubAppLoader] ❌ Some assets failed to download: %@", error);
    // Continue anyway, assets are optional
  }
  
  // Start update checking if needed
  [self _startUpdateCheckingIfNeeded];
  
  // Notify completion
  self.isLoading = NO;
  if ([self.delegate respondsToSelector:@selector(subAppLoaderDidFinishLoading:)]) {
    [self.delegate subAppLoaderDidFinishLoading:self];
  }
}

- (void)_finishLoadingWithError:(NSError *)error {
  self.isLoading = NO;
  if ([self.delegate respondsToSelector:@selector(subAppLoader:didFailWithError:)]) {
    [self.delegate subAppLoader:self didFailWithError:error];
  }
}


- (void)_downloadBundleFromURL:(NSURL *)bundleUrl withCompletion:(void(^)(NSURL * _Nullable bundleURL, NSError * _Nullable error))completion {
  // Download bundle from the provided URL
  NSString *cachePath = [self _bundleCachePath];
  NSFileManager *fm = [NSFileManager defaultManager];
  
  NSLog(@"[SubAppLoader] Bundle URL: %@", bundleUrl);
  NSLog(@"[SubAppLoader] Bundle cache path: %@", cachePath);
  
  // Always download fresh bundle (don't use cache to avoid loading wrong project)
  // Remove old bundle if exists
  if ([fm fileExistsAtPath:cachePath]) {
    NSError *removeError;
    [fm removeItemAtPath:cachePath error:&removeError];
    if (removeError) {
      NSLog(@"[SubAppLoader] Failed to remove cached bundle: %@", removeError);
    } else {
      NSLog(@"[SubAppLoader] Removed cached bundle: %@", cachePath);
    }
  }
  
  // Download bundle with progress tracking
  NSLog(@"[SubAppLoader] Downloading bundle from: %@", bundleUrl);
  
  // Use completion handler (progress will be tracked via delegate)
  NSURLSessionDownloadTask *task = [self.downloadSession downloadTaskWithURL:bundleUrl
                                                             completionHandler:^(NSURL *location, NSURLResponse *response, NSError *error) {
    if (error) {
      completion(nil, error);
      return;
    }
    
    // Validate response
    if ([response isKindOfClass:[NSHTTPURLResponse class]]) {
      NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
      if (httpResponse.statusCode != 200) {
        NSError *httpError = [NSError errorWithDomain:@"SubAppLoader"
                                                  code:httpResponse.statusCode
                                              userInfo:@{NSLocalizedDescriptionKey: [NSString stringWithFormat:@"HTTP %ld", (long)httpResponse.statusCode]}];
        completion(nil, httpError);
        return;
      }
    }
    
    // Move to cache location
    NSString *cacheDir = [cachePath stringByDeletingLastPathComponent];
    if (![fm fileExistsAtPath:cacheDir]) {
      NSError *dirError;
      [fm createDirectoryAtPath:cacheDir withIntermediateDirectories:YES attributes:nil error:&dirError];
      if (dirError) {
        completion(nil, dirError);
        return;
      }
    }
    
    NSError *moveError;
    [fm moveItemAtURL:location toURL:[NSURL fileURLWithPath:cachePath] error:&moveError];
    if (moveError) {
      completion(nil, moveError);
      return;
    }
    
    NSLog(@"[SubAppLoader] Bundle downloaded to: %@", cachePath);
    completion([NSURL fileURLWithPath:cachePath], nil);
  }];
  
  self.bundleDownloadTask = task;
  [task resume];
}

- (void)_downloadBundleWithCompletion:(void(^)(NSURL * _Nullable bundleURL, NSError * _Nullable error))completion {
  // Extract bundle URL from manifest (old format)
  NSURL *bundleUrl = [self.manifestResource bundleUrlFromManifest:self.currentManifest];
  if (!bundleUrl) {
    NSError *noBundleError = [NSError errorWithDomain:@"SubAppLoader"
                                                  code:-1
                                              userInfo:@{NSLocalizedDescriptionKey: @"No bundle URL found in manifest"}];
    completion(nil, noBundleError);
    return;
  }
  
  // Use the common download method
  [self _downloadBundleFromURL:bundleUrl withCompletion:completion];
}

- (void)_downloadAssetsWithCompletion:(void(^)(NSError * _Nullable error))completion {
  NSArray *assets = nil;
  
  // Get assets based on format
  if (self.useMetadataFormat && self.metadataResource && self.currentMetadata) {
    assets = [self.metadataResource assetsFromMetadata:self.currentMetadata baseUrl:self.baseUrl];
  } else if (self.manifestResource && self.currentManifest) {
    assets = [self.manifestResource assetsFromManifest:self.currentManifest];
  }
  
  if (!assets || assets.count == 0) {
    NSLog(@"[SubAppLoader] No assets to download");
    completion(nil);
    return;
  }
  
  NSLog(@"[SubAppLoader] Downloading %lu assets", (unsigned long)assets.count);
  
  // Log asset details for debugging
  NSLog(@"[SubAppLoader] ===== Asset Download List =====");
  for (NSInteger i = 0; i < assets.count; i++) {
    NSDictionary *asset = assets[i];
    NSString *assetKey = asset[@"key"] ?: asset[@"hash"];
    NSString *assetUrl = asset[@"url"];
    NSString *localPath = [self assetPathForKey:assetKey];
    NSLog(@"[SubAppLoader] Asset[%ld] - key: %@", (long)i, assetKey);
    NSLog(@"[SubAppLoader]   URL: %@", assetUrl);
    NSLog(@"[SubAppLoader]   LocalPath: %@", localPath);
  }
  NSLog(@"[SubAppLoader] ===== End Asset List =====");
  
  dispatch_group_t group = dispatch_group_create();
  __block NSError *lastError = nil;
  NSLock *errorLock = [[NSLock alloc] init];
  
  for (NSDictionary *asset in assets) {
    NSString *assetUrlString = asset[@"url"];
    NSString *assetKey = asset[@"key"] ?: asset[@"hash"];
    
    if (!assetUrlString || !assetKey) {
      continue;
    }
    
    NSString *localPath = [self assetPathForKey:assetKey];
    
    // Always download fresh assets (don't use cache to avoid loading wrong project)
    // Remove old asset if exists
    NSFileManager *fm = [NSFileManager defaultManager];
    if ([fm fileExistsAtPath:localPath]) {
      NSError *removeError;
      [fm removeItemAtPath:localPath error:&removeError];
      if (removeError) {
        NSLog(@"[SubAppLoader] Failed to remove cached asset: %@", removeError);
      }
    }
    
    dispatch_group_enter(group);
    
    NSURL *assetURL = [NSURL URLWithString:assetUrlString];
    
    // Use completion handler
    NSURLSessionDownloadTask *task = [self.downloadSession downloadTaskWithURL:assetURL
                                    completionHandler:^(NSURL *location, NSURLResponse *response, NSError *error) {
      if (error) {
        NSLog(@"[SubAppLoader] ❌ Failed to download asset - key: %@, url: %@, error: %@", assetKey, assetUrlString, error);
        [errorLock lock];
        lastError = error;
        [errorLock unlock];
        dispatch_group_leave(group);
        return;
      }
      
      NSLog(@"[SubAppLoader] ✅ Downloaded asset - key: %@, url: %@, location: %@", assetKey, assetUrlString, location);
      
      // Verify hash if provided
      NSString *expectedHash = asset[@"hash"];
      if (expectedHash) {
        NSData *fileData = [NSData dataWithContentsOfURL:location];
        if (![self _verifyHash:fileData expectedHash:expectedHash]) {
          NSLog(@"[SubAppLoader] Hash verification failed for asset: %@", assetKey);
          [errorLock lock];
          lastError = [NSError errorWithDomain:@"SubAppLoader"
                                           code:-1
                                       userInfo:@{NSLocalizedDescriptionKey: @"Asset hash verification failed"}];
          [errorLock unlock];
          dispatch_group_leave(group);
          return;
        }
      }
      
      // Move to assets directory
      NSString *assetsDir = [self assetsDirectoryPath];
      NSFileManager *fm = [NSFileManager defaultManager];
      if (![fm fileExistsAtPath:assetsDir]) {
        NSError *dirError;
        [fm createDirectoryAtPath:assetsDir withIntermediateDirectories:YES attributes:nil error:&dirError];
        if (dirError) {
          [errorLock lock];
          lastError = dirError;
          [errorLock unlock];
          dispatch_group_leave(group);
          return;
        }
      }
      
      // Create directory structure for the asset path if needed
      NSString *assetDir = [localPath stringByDeletingLastPathComponent];
      if (![fm fileExistsAtPath:assetDir]) {
        NSError *dirError;
        [fm createDirectoryAtPath:assetDir withIntermediateDirectories:YES attributes:nil error:&dirError];
        if (dirError) {
          NSLog(@"[SubAppLoader] Failed to create asset directory: %@, error: %@", assetDir, dirError);
        } else {
          NSLog(@"[SubAppLoader] Created asset directory: %@", assetDir);
        }
      }
      
      // Remove existing file if it exists (to avoid "file already exists" error)
      if ([fm fileExistsAtPath:localPath]) {
        NSError *removeError;
        [fm removeItemAtPath:localPath error:&removeError];
        if (removeError) {
          NSLog(@"[SubAppLoader] Failed to remove existing asset before move: %@", removeError);
        }
      }
      
      NSError *moveError;
      [fm moveItemAtURL:location toURL:[NSURL fileURLWithPath:localPath] error:&moveError];
      if (moveError) {
        NSLog(@"[SubAppLoader] ❌ Failed to move asset from %@ to %@: %@", location, localPath, moveError);
        [errorLock lock];
        lastError = moveError;
        [errorLock unlock];
      } else {
        // Verify file exists after move
        BOOL fileExists = [fm fileExistsAtPath:localPath];
        if (!fileExists) {
          NSLog(@"[SubAppLoader] ❌ Asset file does not exist after move: %@", localPath);
        } else {
          NSDictionary *fileAttributes = [fm attributesOfItemAtPath:localPath error:nil];
          NSNumber *fileSize = fileAttributes[NSFileSize];
          NSLog(@"[SubAppLoader] ✅ Asset downloaded successfully: %@ (size: %@ bytes)", localPath, fileSize);
          
          // Create symlink for original path if available
          // This allows JS code to access resources using original paths from bundle
          NSString *originalPath = asset[@"originalPath"];
          if (originalPath && originalPath.length > 0) {
            // Remove leading / from originalPath if present
            if ([originalPath hasPrefix:@"/"]) {
              originalPath = [originalPath substringFromIndex:1];
            }
            
            // Remove "assets/" prefix if present (assetsDirectoryPath already includes "assets")
            if ([originalPath hasPrefix:@"assets/"]) {
              originalPath = [originalPath substringFromIndex:7];
            } else if ([originalPath hasPrefix:@"assets"]) {
              originalPath = [originalPath substringFromIndex:6];
              if ([originalPath hasPrefix:@"/"]) {
                originalPath = [originalPath substringFromIndex:1];
              }
            }
            
            // Create symlink path: assetsDirectoryPath/originalPath -> localPath (hash file)
            NSString *symlinkPath = [[self assetsDirectoryPath] stringByAppendingPathComponent:originalPath];
            NSString *symlinkDir = [symlinkPath stringByDeletingLastPathComponent];
            
            // Create directory structure for symlink if needed
            if (![fm fileExistsAtPath:symlinkDir]) {
              NSError *dirError;
              [fm createDirectoryAtPath:symlinkDir withIntermediateDirectories:YES attributes:nil error:&dirError];
              if (dirError) {
                NSLog(@"[SubAppLoader] Failed to create symlink directory: %@, error: %@", symlinkDir, dirError);
              } else {
                NSLog(@"[SubAppLoader] Created symlink directory: %@", symlinkDir);
              }
            }
            
            // Remove existing file/symlink if exists
            if ([fm fileExistsAtPath:symlinkPath]) {
              NSError *removeError;
              [fm removeItemAtPath:symlinkPath error:&removeError];
              if (removeError) {
                NSLog(@"[SubAppLoader] Failed to remove existing symlink: %@, error: %@", symlinkPath, removeError);
              }
            }
            
            // Create symlink using absolute path (simpler and more reliable)
            NSError *symlinkError;
            BOOL symlinkCreated = [fm createSymbolicLinkAtPath:symlinkPath
                                            withDestinationPath:localPath
                                                          error:&symlinkError];
            if (symlinkCreated) {
              NSLog(@"[SubAppLoader] ✅ Created symlink: %@ -> %@", symlinkPath, localPath);
            } else {
              NSLog(@"[SubAppLoader] ⚠️ Failed to create symlink: %@ -> %@, error: %@", symlinkPath, localPath, symlinkError);
            }
          }
        }
        
        [self.downloadedAssets addObject:assetKey];
        self.downloadedAssetsCount++;
        
        // Update progress
        [self _notifyProgressWithStatus:[NSString stringWithFormat:@"正在下载静态资源 (%ld/%ld)", (long)self.downloadedAssetsCount, (long)self.totalAssets]
                                    done:@(self.downloadedAssetsCount)
                                   total:@(self.totalAssets)
                                     type:@"assets"];
        
        if ([self.delegate respondsToSelector:@selector(subAppLoader:didLoadAsset:)]) {
          [self.delegate subAppLoader:self didLoadAsset:localPath];
        }
      }
      
      // Remove task from tracking
      NSNumber *taskIdentifier = @(task.taskIdentifier);
      [self.assetDownloadTasks removeObjectForKey:taskIdentifier];
      dispatch_group_leave(group);
    }];
    
    // Store task for tracking
    NSNumber *taskIdentifier = @(task.taskIdentifier);
    self.assetDownloadTasks[taskIdentifier] = task;
    [task resume];
  }
  
  dispatch_group_notify(group, dispatch_get_main_queue(), ^{
    completion(lastError);
  });
}

- (void)reload {
  NSLog(@"[SubAppLoader] Reloading...");
  [self stopUpdateChecking];
  self.currentManifest = nil;
  self.bundleURL = nil;
  [self.downloadedAssets removeAllObjects];
  [self startLoading];
}

- (void)checkForUpdate {
  if (self.isLoading) {
    NSLog(@"[SubAppLoader] Already loading, ignoring checkForUpdate");
    return;
  }
  
  if (!self.currentManifest && !self.currentMetadata) {
    NSLog(@"[SubAppLoader] No current manifest or metadata, cannot check for update.");
    return;
  }
  
  NSLog(@"[SubAppLoader] Checking for update...");
  
  NSString *resourceType = self.useMetadataFormat ? @"metadata" : @"manifest";
  [self _notifyProgressWithStatus:[NSString stringWithFormat:@"正在检查 %@ 更新...", resourceType] done:@0 total:@1 type:resourceType];
  
  if (self.useMetadataFormat) {
    [self.metadataResource loadMetadataWithCompletion:^(NSDictionary * _Nullable newMetadata, NSError * _Nullable error) {
      [self _notifyProgressWithStatus:[NSString stringWithFormat:@"%@ 更新检查完成", resourceType] done:@1 total:@1 type:resourceType];
    if (error) {
        NSLog(@"[SubAppLoader] Failed to check for metadata update: %@", error);
      return;
    }
      if (newMetadata && ![newMetadata isEqualToDictionary:self.currentMetadata]) {
        NSLog(@"[SubAppLoader] New metadata detected!");
        if ([self.delegate respondsToSelector:@selector(subAppLoader:didDetectUpdate:)]) {
          [self.delegate subAppLoader:self didDetectUpdate:newMetadata];
        }
      } else {
        NSLog(@"[SubAppLoader] No metadata update detected.");
      }
    }];
  } else {
    [self.manifestResource loadManifestWithCompletion:^(NSDictionary * _Nullable newManifest, NSError * _Nullable error) {
      [self _notifyProgressWithStatus:[NSString stringWithFormat:@"%@ 更新检查完成", resourceType] done:@1 total:@1 type:resourceType];
      if (error) {
        NSLog(@"[SubAppLoader] Failed to check for manifest update: %@", error);
      return;
    }
      if (newManifest && ![newManifest isEqualToDictionary:self.currentManifest]) {
        NSLog(@"[SubAppLoader] New manifest detected!");
      if ([self.delegate respondsToSelector:@selector(subAppLoader:didDetectUpdate:)]) {
        [self.delegate subAppLoader:self didDetectUpdate:newManifest];
      }
    } else {
        NSLog(@"[SubAppLoader] No manifest update detected.");
    }
  }];
  }
}

- (void)_startUpdateCheckingIfNeeded {
  if (self.updateCheckPolicy == SubAppUpdateCheckPolicyAlways) {
    self.updateCheckTimer = [NSTimer scheduledTimerWithTimeInterval:self.updateCheckInterval
                                                              target:self
                                                            selector:@selector(checkForUpdate)
                                                            userInfo:nil
                                                             repeats:YES];
  }
}

- (void)stopUpdateChecking {
  [self.updateCheckTimer invalidate];
  self.updateCheckTimer = nil;
}

- (void)_handleAppDidBecomeActive:(NSNotification *)notification {
  // When app comes to foreground, check for updates if policy allows
  if (self.updateCheckPolicy == SubAppUpdateCheckPolicyAlways || self.updateCheckPolicy == SubAppUpdateCheckPolicyOnLaunch) {
    NSLog(@"[SubAppLoader] App became active, checking for updates...");
    [self checkForUpdate];
  }
}

- (nullable NSString *)assetPathForKey:(NSString *)key {
  if (!key || key.length == 0) {
    return nil;
  }
  
  // Remove "assets/" prefix from key if present to avoid duplicate path
  // assetsDirectoryPath already ends with "assets", so we don't need it in the key
  NSString *normalizedKey = key;
  if ([normalizedKey hasPrefix:@"assets/"]) {
    normalizedKey = [normalizedKey substringFromIndex:7]; // Remove "assets/" (7 characters)
  } else if ([normalizedKey hasPrefix:@"assets"]) {
    normalizedKey = [normalizedKey substringFromIndex:6]; // Remove "assets" (6 characters)
    // Remove leading slash if present
    if ([normalizedKey hasPrefix:@"/"]) {
      normalizedKey = [normalizedKey substringFromIndex:1];
    }
  }
  
  // IMPORTANT: Preserve the full path structure for JS code compatibility
  // JS code expects resources at paths like "node_modules/.pnpm/.../Ionicons.ttf"
  // So we need to maintain the directory structure, not just extract the filename
  // This ensures JS code can find resources using the original paths from the bundle
  
  // The normalizedKey now contains the relative path from assets/ (e.g., "node_modules/.pnpm/.../Ionicons.ttf")
  // We'll use this directly to maintain the directory structure
  
  NSLog(@"[SubAppLoader] Asset key: '%@' -> normalized: '%@'", key, normalizedKey);
  
  return [[self assetsDirectoryPath] stringByAppendingPathComponent:normalizedKey];
}

- (NSString *)_hashString:(NSString *)string {
  // Simple hash function to create a unique filename from a path
  // This is a fallback when we can't extract a meaningful filename
  NSUInteger hash = [string hash];
  return [NSString stringWithFormat:@"%lu", (unsigned long)hash];
}

- (NSString *)_getScopeKey {
  // Get scope key based on format
  if (self.useMetadataFormat && self.metadataResource) {
    return [self.metadataResource scopeKeyFromUrl:self.manifestUrl];
  } else if (self.manifestResource) {
    return [self.manifestResource scopeKeyFromUrl:self.manifestUrl];
  }
  // Fallback: use URL directly
  NSString *host = self.manifestUrl.host ?: @"unknown";
  NSString *path = self.manifestUrl.path ?: @"";
  path = [path stringByTrimmingCharactersInSet:[NSCharacterSet characterSetWithCharactersInString:@"/"]];
  NSString *scopeKey = [[host stringByAppendingString:path] stringByReplacingOccurrencesOfString:@"/" withString:@"_"];
  scopeKey = [scopeKey stringByReplacingOccurrencesOfString:@"." withString:@"_"];
  scopeKey = [scopeKey stringByReplacingOccurrencesOfString:@"-" withString:@"_"];
  return scopeKey;
}

- (NSString *)assetsDirectoryPath {
  NSString *cachesDir = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES).firstObject;
  NSString *subAppDir = [cachesDir stringByAppendingPathComponent:@"SubApps"];
  NSString *scopeKey = [self _getScopeKey];
  return [[subAppDir stringByAppendingPathComponent:scopeKey] stringByAppendingPathComponent:@"assets"];
}

- (NSString *)_bundleCachePath {
  NSString *cachesDir = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES).firstObject;
  NSString *subAppDir = [cachesDir stringByAppendingPathComponent:@"SubApps"];
  NSString *scopeKey = [self _getScopeKey];
  return [[subAppDir stringByAppendingPathComponent:scopeKey] stringByAppendingPathComponent:@"bundle.js"];
}

- (void)_clearCache {
  NSString *cachesDir = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES).firstObject;
  NSString *subAppDir = [cachesDir stringByAppendingPathComponent:@"SubApps"];
  NSString *scopeKey = [self _getScopeKey];
  NSString *projectCacheDir = [subAppDir stringByAppendingPathComponent:scopeKey];
  
  NSFileManager *fm = [NSFileManager defaultManager];
  if ([fm fileExistsAtPath:projectCacheDir]) {
    NSError *error;
    [fm removeItemAtPath:projectCacheDir error:&error];
    if (error) {
      NSLog(@"[SubAppLoader] Failed to clear cache: %@", error);
    } else {
      NSLog(@"[SubAppLoader] Cleared cache for project: %@", scopeKey);
    }
  }
}

- (BOOL)_verifyHash:(NSData *)data expectedHash:(NSString *)expectedHash {
  unsigned char hash[CC_SHA256_DIGEST_LENGTH];
  CC_SHA256(data.bytes, (CC_LONG)data.length, hash);
  
  NSMutableString *hashString = [NSMutableString string];
  for (int i = 0; i < CC_SHA256_DIGEST_LENGTH; i++) {
    [hashString appendFormat:@"%02x", hash[i]];
  }
  
  return [hashString isEqualToString:expectedHash];
}

#pragma mark - Progress Notification

- (void)_notifyProgressWithStatus:(NSString *)status done:(NSNumber *)done total:(NSNumber *)total type:(NSString *)type {
  SubAppLoadingProgress *progress = [[SubAppLoadingProgress alloc] initWithStatus:status done:done total:total];
  
  dispatch_async(dispatch_get_main_queue(), ^{
    // General progress callback
    if ([self.delegate respondsToSelector:@selector(subAppLoader:didUpdateProgress:)]) {
      [self.delegate subAppLoader:self didUpdateProgress:progress];
    }
    
    // Type-specific callbacks
    if ([type isEqualToString:@"manifest"] && [self.delegate respondsToSelector:@selector(subAppLoader:didUpdateManifestProgress:)]) {
      [self.delegate subAppLoader:self didUpdateManifestProgress:progress];
    } else if ([type isEqualToString:@"bundle"] && [self.delegate respondsToSelector:@selector(subAppLoader:didUpdateBundleProgress:)]) {
      [self.delegate subAppLoader:self didUpdateBundleProgress:progress];
    } else if ([type isEqualToString:@"assets"] && [self.delegate respondsToSelector:@selector(subAppLoader:didUpdateAssetsProgress:)]) {
      [self.delegate subAppLoader:self didUpdateAssetsProgress:progress];
    }
  });
}

#pragma mark - NSURLSessionDownloadDelegate

- (void)URLSession:(NSURLSession *)session downloadTask:(NSURLSessionDownloadTask *)downloadTask
      didWriteData:(int64_t)bytesWritten
 totalBytesWritten:(int64_t)totalBytesWritten
totalBytesExpectedToWrite:(int64_t)totalBytesExpectedToWrite {
  
  if (downloadTask == self.bundleDownloadTask) {
    // Bundle download progress
    float progress = totalBytesExpectedToWrite > 0 ? (float)totalBytesWritten / (float)totalBytesExpectedToWrite : 0.0;
    NSString *status = [NSString stringWithFormat:@"正在下载 bundle (%.1f MB / %.1f MB)",
                        totalBytesWritten / 1024.0 / 1024.0,
                        totalBytesExpectedToWrite / 1024.0 / 1024.0];
    
    [self _notifyProgressWithStatus:status
                                done:@(totalBytesWritten)
                               total:@(totalBytesExpectedToWrite)
                                 type:@"bundle"];
  }
  // Asset progress is tracked by count, not bytes
}

- (void)URLSession:(NSURLSession *)session downloadTask:(NSURLSessionDownloadTask *)downloadTask
didFinishDownloadingToURL:(NSURL *)location {
  // This is called before completionHandler
  // We handle everything in completionHandler, so this is mostly for logging
}

- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didCompleteWithError:(NSError *)error {
  // Handle completion errors if needed
  if (error && task == self.bundleDownloadTask) {
    NSLog(@"[SubAppLoader] Bundle download failed: %@", error);
  }
}

@end

