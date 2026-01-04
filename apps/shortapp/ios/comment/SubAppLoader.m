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
@end

@implementation SubAppLoader

- (instancetype)initWithManifestUrl:(NSURL *)manifestUrl {
  if (self = [super init]) {
    _manifestUrl = manifestUrl;
    _downloadedAssets = [NSMutableSet set];
    _updateCheckPolicy = SubAppUpdateCheckPolicyAlways; // Default to Always for periodic checking
    _updateCheckInterval = 60.0; // 60 seconds
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
  
  // Step 1: Load manifest or metadata
  NSString *resourceType = self.useMetadataFormat ? @"metadata" : @"manifest";
  [self _notifyProgressWithStatus:[NSString stringWithFormat:@"正在下载 %@...", resourceType] done:@0 total:@1 type:resourceType];
  
  if (self.useMetadataFormat) {
    // Load metadata.json
    [self.metadataResource loadMetadataWithCompletion:^(NSDictionary * _Nullable metadata, NSError * _Nullable error) {
      [self _notifyProgressWithStatus:[NSString stringWithFormat:@"%@ 下载完成", resourceType] done:@1 total:@1 type:resourceType];
      
      if (error) {
        self.isLoading = NO;
        if ([self.delegate respondsToSelector:@selector(subAppLoader:didFailWithError:)]) {
          [self.delegate subAppLoader:self didFailWithError:error];
        }
        return;
      }
      
      if (!metadata) {
        self.isLoading = NO;
        NSError *noMetadataError = [NSError errorWithDomain:@"SubAppLoader"
                                                       code:-1
                                                   userInfo:@{NSLocalizedDescriptionKey: @"No metadata returned"}];
        if ([self.delegate respondsToSelector:@selector(subAppLoader:didFailWithError:)]) {
          [self.delegate subAppLoader:self didFailWithError:noMetadataError];
        }
        return;
      }
      
      self.currentMetadata = metadata;
      
      // Store as manifest for compatibility
      self.currentManifest = metadata;
      
      if ([self.delegate respondsToSelector:@selector(subAppLoader:didLoadManifest:)]) {
        [self.delegate subAppLoader:self didLoadManifest:metadata];
      }
      
      // Step 2: Download bundle from metadata
      [self _notifyProgressWithStatus:@"正在下载 bundle..." done:@0 total:@1 type:@"bundle"];
      
      NSURL *bundleUrl = [self.metadataResource bundleUrlFromMetadata:metadata baseUrl:self.baseUrl];
      if (!bundleUrl) {
        self.isLoading = NO;
        NSError *noBundleError = [NSError errorWithDomain:@"SubAppLoader"
                                                      code:-1
                                                  userInfo:@{NSLocalizedDescriptionKey: @"No bundle URL found in metadata"}];
        if ([self.delegate respondsToSelector:@selector(subAppLoader:didFailWithError:)]) {
          [self.delegate subAppLoader:self didFailWithError:noBundleError];
        }
        return;
      }
      
      [self _downloadBundleFromURL:bundleUrl withCompletion:^(NSURL * _Nullable bundleURL, NSError * _Nullable error) {
        [self _notifyProgressWithStatus:@"Bundle 下载完成" done:@1 total:@1 type:@"bundle"];
        
        if (error) {
          self.isLoading = NO;
          if ([self.delegate respondsToSelector:@selector(subAppLoader:didFailWithError:)]) {
            [self.delegate subAppLoader:self didFailWithError:error];
          }
          return;
        }
        
        self.bundleURL = bundleURL;
        
        if ([self.delegate respondsToSelector:@selector(subAppLoader:didLoadBundle:)]) {
          [self.delegate subAppLoader:self didLoadBundle:bundleURL];
        }
        
        // Step 3: Download assets from metadata
        NSArray *assets = [self.metadataResource assetsFromMetadata:metadata baseUrl:self.baseUrl];
        self.totalAssets = assets ? assets.count : 0;
        self.downloadedAssetsCount = 0;
        
        if (self.totalAssets > 0) {
          [self _notifyProgressWithStatus:@"正在下载静态资源..." done:@0 total:@(self.totalAssets) type:@"assets"];
        }
        
        [self _downloadAssetsWithCompletion:^(NSError * _Nullable error) {
          if (self.totalAssets > 0) {
            [self _notifyProgressWithStatus:@"静态资源下载完成" done:@(self.totalAssets) total:@(self.totalAssets) type:@"assets"];
          }
          
          self.isLoading = NO;
          
          if (error) {
            NSLog(@"[SubAppLoader] Some assets failed to download: %@", error);
            // Continue anyway, assets are optional
          }
          
          // Step 4: Start update checking if needed
          [self _startUpdateCheckingIfNeeded];
          
          // Step 5: Notify completion
          if ([self.delegate respondsToSelector:@selector(subAppLoaderDidFinishLoading:)]) {
            [self.delegate subAppLoaderDidFinishLoading:self];
          }
        }];
      }];
    }];
  } else {
    // Load manifest.json (old format)
    [self.manifestResource loadManifestWithCompletion:^(NSDictionary * _Nullable manifest, NSError * _Nullable error) {
      [self _notifyProgressWithStatus:[NSString stringWithFormat:@"%@ 下载完成", resourceType] done:@1 total:@1 type:resourceType];
      
      if (error) {
        self.isLoading = NO;
        if ([self.delegate respondsToSelector:@selector(subAppLoader:didFailWithError:)]) {
          [self.delegate subAppLoader:self didFailWithError:error];
        }
        return;
      }
      
      if (!manifest) {
        self.isLoading = NO;
        NSError *noManifestError = [NSError errorWithDomain:@"SubAppLoader"
                                                        code:-1
                                                    userInfo:@{NSLocalizedDescriptionKey: @"No manifest returned"}];
        if ([self.delegate respondsToSelector:@selector(subAppLoader:didFailWithError:)]) {
          [self.delegate subAppLoader:self didFailWithError:noManifestError];
        }
        return;
      }
      
      self.currentManifest = manifest;
      
      if ([self.delegate respondsToSelector:@selector(subAppLoader:didLoadManifest:)]) {
        [self.delegate subAppLoader:self didLoadManifest:manifest];
      }
      
      // Step 2: Download bundle
      [self _notifyProgressWithStatus:@"正在下载 bundle..." done:@0 total:@1 type:@"bundle"];
      
      [self _downloadBundleWithCompletion:^(NSURL * _Nullable bundleURL, NSError * _Nullable error) {
        [self _notifyProgressWithStatus:@"Bundle 下载完成" done:@1 total:@1 type:@"bundle"];
        
        if (error) {
          self.isLoading = NO;
          if ([self.delegate respondsToSelector:@selector(subAppLoader:didFailWithError:)]) {
            [self.delegate subAppLoader:self didFailWithError:error];
          }
          return;
        }
        
        self.bundleURL = bundleURL;
        
        if ([self.delegate respondsToSelector:@selector(subAppLoader:didLoadBundle:)]) {
          [self.delegate subAppLoader:self didLoadBundle:bundleURL];
        }
        
        // Step 3: Download assets
        NSArray *assets = [self.manifestResource assetsFromManifest:self.currentManifest];
        self.totalAssets = assets ? assets.count : 0;
        self.downloadedAssetsCount = 0;
      
      if (self.totalAssets > 0) {
        [self _notifyProgressWithStatus:@"正在下载静态资源..." done:@0 total:@(self.totalAssets) type:@"assets"];
      }
      
      [self _downloadAssetsWithCompletion:^(NSError * _Nullable error) {
        if (self.totalAssets > 0) {
          [self _notifyProgressWithStatus:@"静态资源下载完成" done:@(self.totalAssets) total:@(self.totalAssets) type:@"assets"];
        }
        
        self.isLoading = NO;
        
        if (error) {
          NSLog(@"[SubAppLoader] Some assets failed to download: %@", error);
          // Continue anyway, assets are optional
        }
        
        // Step 4: Start update checking if needed
        [self _startUpdateCheckingIfNeeded];
        
        // Step 5: Notify completion
        if ([self.delegate respondsToSelector:@selector(subAppLoaderDidFinishLoading:)]) {
          [self.delegate subAppLoaderDidFinishLoading:self];
        }
      }];
    }];
  }];
}

- (void)_downloadBundleFromURL:(NSURL *)bundleUrl withCompletion:(void(^)(NSURL * _Nullable bundleURL, NSError * _Nullable error))completion {
  // Download bundle from the provided URL
  NSString *cachePath = [self _bundleCachePath];
  NSFileManager *fm = [NSFileManager defaultManager];
  
  // Always download fresh bundle (don't use cache to avoid loading wrong project)
  // Remove old bundle if exists
  if ([fm fileExistsAtPath:cachePath]) {
    NSError *removeError;
    [fm removeItemAtPath:cachePath error:&removeError];
    if (removeError) {
      NSLog(@"[SubAppLoader] Failed to remove cached bundle: %@", removeError);
    }
  }
  
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
  NSArray *assets = [self.manifestResource assetsFromManifest:self.currentManifest];
  if (!assets || assets.count == 0) {
    NSLog(@"[SubAppLoader] No assets to download");
    completion(nil);
    return;
  }
  
  NSLog(@"[SubAppLoader] Downloading %lu assets", (unsigned long)assets.count);
  
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
    NSURLSessionDownloadTask *task = [self.downloadSession downloadTaskWithURL:assetURL];
    
    // Store task identifier for tracking
    NSNumber *taskIdentifier = @(task.taskIdentifier);
    self.assetDownloadTasks[taskIdentifier] = task;
    
    // Use completion handler
    task = [self.downloadSession downloadTaskWithURL:assetURL
                                    completionHandler:^(NSURL *location, NSURLResponse *response, NSError *error) {
      if (error) {
        [errorLock lock];
        lastError = error;
        [errorLock unlock];
        dispatch_group_leave(group);
        return;
      }
      
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
      
      NSError *moveError;
      [fm moveItemAtURL:location toURL:[NSURL fileURLWithPath:localPath] error:&moveError];
      if (moveError) {
        [errorLock lock];
        lastError = moveError;
        [errorLock unlock];
      } else {
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
      [self.assetDownloadTasks removeObjectForKey:taskIdentifier];
      dispatch_group_leave(group);
    }];
    
    // Update task reference after creating with completion handler
    self.assetDownloadTasks[@(task.taskIdentifier)] = task;
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
  NSLog(@"[SubAppLoader] Checking for update...");
  
  [self.manifestResource loadManifestWithCompletion:^(NSDictionary * _Nullable newManifest, NSError * _Nullable error) {
    if (error) {
      NSLog(@"[SubAppLoader] Update check failed: %@", error);
      return;
    }
    
    if (!newManifest) {
      return;
    }
    
    // Compare manifests
    NSString *currentId = self.currentManifest[@"id"];
    NSString *newId = newManifest[@"id"];
    
    // Also compare commitTime or publishedTime if available
    NSString *currentTime = self.currentManifest[@"commitTime"] ?: self.currentManifest[@"publishedTime"];
    NSString *newTime = newManifest[@"commitTime"] ?: newManifest[@"publishedTime"];
    
    BOOL hasUpdate = NO;
    if (currentId && newId && ![currentId isEqualToString:newId]) {
      hasUpdate = YES;
    } else if (currentTime && newTime && ![currentTime isEqualToString:newTime]) {
      hasUpdate = YES;
    }
    
    if (hasUpdate) {
      NSLog(@"[SubAppLoader] Update detected!");
      if ([self.delegate respondsToSelector:@selector(subAppLoader:didDetectUpdate:)]) {
        [self.delegate subAppLoader:self didDetectUpdate:newManifest];
      }
      // Optionally auto-reload
      // [self reload];
    } else {
      NSLog(@"[SubAppLoader] No update available");
    }
  }];
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
  return [[self assetsDirectoryPath] stringByAppendingPathComponent:key];
}

- (NSString *)assetsDirectoryPath {
  NSString *cachesDir = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES).firstObject;
  NSString *subAppDir = [cachesDir stringByAppendingPathComponent:@"SubApps"];
  NSString *scopeKey = [self.manifestResource scopeKeyFromUrl:self.manifestUrl];
  return [[subAppDir stringByAppendingPathComponent:scopeKey] stringByAppendingPathComponent:@"assets"];
}

- (NSString *)_bundleCachePath {
  NSString *cachesDir = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES).firstObject;
  NSString *subAppDir = [cachesDir stringByAppendingPathComponent:@"SubApps"];
  NSString *scopeKey = [self.manifestResource scopeKeyFromUrl:self.manifestUrl];
  return [[subAppDir stringByAppendingPathComponent:scopeKey] stringByAppendingPathComponent:@"bundle.js"];
}

- (void)_clearCache {
  NSString *cachesDir = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES).firstObject;
  NSString *subAppDir = [cachesDir stringByAppendingPathComponent:@"SubApps"];
  NSString *scopeKey = [self.manifestResource scopeKeyFromUrl:self.manifestUrl];
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

