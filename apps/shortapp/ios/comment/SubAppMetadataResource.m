//
//  SubAppMetadataResource.m
//  shortapp
//
//  Downloads and caches metadata.json files for sub-apps (new format)
//  Supports fileMetadata.ios.bundle and fileMetadata.ios.assets
//

#import "SubAppMetadataResource.h"

@interface SubAppMetadataResource ()
@property (nonatomic, strong) NSURL *metadataUrl;
@property (nonatomic, strong, readonly) NSURL *baseUrl;
@property (nonatomic, strong, nullable) NSData *metadataData;
@end

@implementation SubAppMetadataResource

- (instancetype)initWithMetadataUrl:(NSURL *)url baseUrl:(NSURL *)baseUrl {
  if (self = [super init]) {
    _metadataUrl = url;
    _baseUrl = baseUrl;
  }
  return self;
}

- (void)loadMetadataWithCompletion:(void(^)(NSDictionary * _Nullable metadata, NSError * _Nullable error))completion {
  // Always download fresh metadata (don't use cache to avoid loading wrong project)
  // Remove old cache if exists
  NSString *cachePath = [self metadataCachePath];
  NSFileManager *fm = [NSFileManager defaultManager];
  if ([fm fileExistsAtPath:cachePath]) {
    NSError *removeError;
    [fm removeItemAtPath:cachePath error:&removeError];
    if (removeError) {
      NSLog(@"[SubAppMetadata] Failed to remove cached metadata: %@", removeError);
    } else {
      NSLog(@"[SubAppMetadata] Removed cached metadata: %@", cachePath);
    }
  }
  
  // Download from remote
  [self _downloadMetadataWithCompletion:^(NSDictionary * _Nullable metadata, NSError * _Nullable error) {
    if (metadata && !error) {
      [self _writeMetadataToCache:metadata];
    }
    completion(metadata, error);
  }];
}

- (void)_downloadMetadataWithCompletion:(void(^)(NSDictionary * _Nullable metadata, NSError * _Nullable error))completion {
  NSURLSession *session = [NSURLSession sharedSession];
  NSURLSessionDataTask *task = [session dataTaskWithURL:self.metadataUrl
                                       completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
    if (error) {
      completion(nil, error);
      return;
    }
    
    // Validate response
    if ([response isKindOfClass:[NSHTTPURLResponse class]]) {
      NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
      if (httpResponse.statusCode != 200) {
        NSError *httpError = [NSError errorWithDomain:@"SubAppMetadataResource"
                                                  code:httpResponse.statusCode
                                              userInfo:@{NSLocalizedDescriptionKey: [NSString stringWithFormat:@"HTTP %ld", (long)httpResponse.statusCode]}];
        completion(nil, httpError);
        return;
      }
    }
    
    // Parse JSON
    NSError *parseError;
    NSDictionary *metadata = [NSJSONSerialization JSONObjectWithData:data
                                                               options:kNilOptions
                                                                 error:&parseError];
    if (parseError || !metadata) {
      completion(nil, parseError ?: [NSError errorWithDomain:@"SubAppMetadataResource"
                                                         code:-1
                                                     userInfo:@{NSLocalizedDescriptionKey: @"Invalid metadata JSON"}]);
      return;
    }
    
    self.metadataData = data;
    completion(metadata, nil);
  }];
  
  [task resume];
}

- (void)_writeMetadataToCache:(NSDictionary *)metadata {
  NSString *cachePath = [self metadataCachePath];
  NSString *cacheDir = [cachePath stringByDeletingLastPathComponent];
  
  // Create directory if needed
  NSFileManager *fm = [NSFileManager defaultManager];
  if (![fm fileExistsAtPath:cacheDir]) {
    NSError *error;
    [fm createDirectoryAtPath:cacheDir withIntermediateDirectories:YES attributes:nil error:&error];
    if (error) {
      NSLog(@"[SubAppMetadata] Failed to create cache directory: %@", error);
      return;
    }
  }
  
  // Write metadata
  NSError *writeError;
  NSData *jsonData = [NSJSONSerialization dataWithJSONObject:metadata
                                                      options:NSJSONWritingPrettyPrinted
                                                        error:&writeError];
  if (jsonData && !writeError) {
    [jsonData writeToFile:cachePath atomically:YES];
    NSLog(@"[SubAppMetadata] Cached metadata to %@", cachePath);
  } else {
    NSLog(@"[SubAppMetadata] Failed to write cache: %@", writeError);
  }
}

- (nullable NSURL *)bundleUrlFromMetadata:(NSDictionary *)metadata baseUrl:(NSURL *)baseUrl {
  // Extract fileMetadata.ios.bundle
  NSDictionary *fileMetadata = metadata[@"fileMetadata"];
  if (![fileMetadata isKindOfClass:[NSDictionary class]]) {
    NSLog(@"[SubAppMetadata] No fileMetadata found in metadata");
    return nil;
  }
  
  NSDictionary *iosMetadata = fileMetadata[@"ios"];
  if (![iosMetadata isKindOfClass:[NSDictionary class]]) {
    NSLog(@"[SubAppMetadata] No ios metadata found in fileMetadata");
    return nil;
  }
  
  NSString *bundlePath = iosMetadata[@"bundle"];
  if (![bundlePath isKindOfClass:[NSString class]] || bundlePath.length == 0) {
    NSLog(@"[SubAppMetadata] No bundle path found in ios metadata");
    return nil;
  }
  
  // Construct full URL: baseUrl + bundlePath
  // baseUrl example: https://shortapp.dev/clip/68eee66720f64b3b96d6ae1739c47cc2
  // bundlePath example: _expo/static/js/ios/entry-5f2f00bc5916f0ccb0843c4951ea421d.hbc
  // Result: https://shortapp.dev/clip/68eee66720f64b3b96d6ae1739c47cc2/_expo/static/js/ios/entry-5f2f00bc5916f0ccb0843c4951ea421d.hbc
  
  NSString *baseUrlString = [baseUrl absoluteString];
  // Ensure baseUrl ends with /
  if (![baseUrlString hasSuffix:@"/"]) {
    baseUrlString = [baseUrlString stringByAppendingString:@"/"];
  }
  
  // Remove leading / from bundlePath if present
  if ([bundlePath hasPrefix:@"/"]) {
    bundlePath = [bundlePath substringFromIndex:1];
  }
  
  NSString *fullBundleUrlString = [baseUrlString stringByAppendingString:bundlePath];
  NSURL *bundleURL = [NSURL URLWithString:fullBundleUrlString];
  
  NSLog(@"[SubAppMetadata] Bundle URL: %@", bundleURL);
  return bundleURL;
}

- (nullable NSArray *)assetsFromMetadata:(NSDictionary *)metadata baseUrl:(NSURL *)baseUrl {
  // Extract fileMetadata.ios.assets
  NSDictionary *fileMetadata = metadata[@"fileMetadata"];
  if (![fileMetadata isKindOfClass:[NSDictionary class]]) {
    NSLog(@"[SubAppMetadata] No fileMetadata found in metadata");
    return nil;
  }
  
  NSDictionary *iosMetadata = fileMetadata[@"ios"];
  if (![iosMetadata isKindOfClass:[NSDictionary class]]) {
    NSLog(@"[SubAppMetadata] No ios metadata found in fileMetadata");
    return nil;
  }
  
  NSArray *assets = iosMetadata[@"assets"];
  if (![assets isKindOfClass:[NSArray class]]) {
    NSLog(@"[SubAppMetadata] No assets array found in ios metadata");
    return nil;
  }
  
  // Check for fileHashes mapping (maps original paths to hash paths)
  NSDictionary *fileHashes = iosMetadata[@"fileHashes"];
  if (fileHashes && [fileHashes isKindOfClass:[NSDictionary class]]) {
    NSLog(@"[SubAppMetadata] Found fileHashes mapping with %lu entries", (unsigned long)fileHashes.count);
  }
  
  // Transform assets to include full URLs
  NSMutableArray *transformedAssets = [NSMutableArray arrayWithCapacity:assets.count];
  NSString *baseUrlString = [baseUrl absoluteString];
  
  // Ensure baseUrl ends with /
  if (![baseUrlString hasSuffix:@"/"]) {
baseUrlString = [baseUrlString stringByAppendingString:@"/"];
  }
  
  for (NSDictionary *asset in assets) {
    if (![asset isKindOfClass:[NSDictionary class]]) {
      continue;
    }
    
    NSString *assetPath = asset[@"path"];
    NSString *assetExt = asset[@"ext"];
    NSString *assetHash = asset[@"hash"];
    
    if (![assetPath isKindOfClass:[NSString class]] || assetPath.length == 0) {
      continue;
    }
    
    // Try to find original path from fileHashes mapping
    // fileHashes maps: originalPath -> hash
    // We need to find: hash -> originalPath (reverse lookup)
    NSString *originalPath = nil;
    if (fileHashes && [fileHashes isKindOfClass:[NSDictionary class]]) {
      // Extract hash from assetPath (e.g., "assets/7d40544b..." -> "7d40544b...")
      NSString *hashFromPath = assetPath;
      if ([hashFromPath hasPrefix:@"assets/"]) {
        hashFromPath = [hashFromPath substringFromIndex:7];
      }
      
      // Reverse lookup: find original path by hash
      for (NSString *origPath in fileHashes.allKeys) {
        NSString *hashValue = fileHashes[origPath];
        if ([hashValue isKindOfClass:[NSString class]] && [hashValue isEqualToString:hashFromPath]) {
          originalPath = origPath;
          if (transformedAssets.count < 3) {
            NSLog(@"[SubAppMetadata] Found original path mapping: %@ -> %@", origPath, hashFromPath);
          }
          break;
        }
      }
    }
    
    // Also try direct fields in asset dictionary
    if (!originalPath) {
      originalPath = asset[@"filePath"] ?: asset[@"sourcePath"] ?: asset[@"name"] ?: asset[@"file"];
    }
    
    // Log asset structure for debugging (only first few to avoid spam)
    if (transformedAssets.count < 3) {
      NSLog(@"[SubAppMetadata] Asset[%lu] structure: %@", (unsigned long)transformedAssets.count, asset);
    }
    
    // Remove leading / from assetPath if present
    if ([assetPath hasPrefix:@"/"]) {
      assetPath = [assetPath substringFromIndex:1];
    }
    
    // Construct full asset URL: baseUrl + assetPath
    // baseUrl example: https://shortapp.dev/clip/68eee66720f64b3b96d6ae1739c47cc2
    // assetPath example: assets/31b5ffea3daddc69dd01a1f3d6cf63c5
    // Result: https://shortapp.dev/clip/68eee66720f64b3b96d6ae1739c47cc2/assets/31b5ffea3daddc69dd01a1f3d6cf63c5
    
    NSString *fullAssetUrlString = [baseUrlString stringByAppendingString:assetPath];
    NSURL *assetURL = [NSURL URLWithString:fullAssetUrlString];
    
    // Create asset dictionary with url and key
    // IMPORTANT: We need to store both the hash path (for downloading) and original path (for JS lookup)
    NSMutableDictionary *transformedAsset = [NSMutableDictionary dictionaryWithDictionary:asset];
    transformedAsset[@"url"] = fullAssetUrlString;
    transformedAsset[@"key"] = assetPath; // Use hash path as key for downloading
    if (originalPath && originalPath.length > 0) {
      transformedAsset[@"originalPath"] = originalPath; // Store original path for mapping
      NSLog(@"[SubAppMetadata] Found original path: %@ -> hash path: %@", originalPath, assetPath);
    } else {
      NSLog(@"[SubAppMetadata] No original path found for asset: %@", assetPath);
    }
    
    [transformedAssets addObject:transformedAsset];
  }
  
  NSLog(@"[SubAppMetadata] Found %lu assets", (unsigned long)transformedAssets.count);
  return transformedAssets;
}

- (NSString *)metadataCachePath {
  NSString *cachesDir = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES).firstObject;
  NSString *subAppDir = [cachesDir stringByAppendingPathComponent:@"SubApps"];
  NSString *scopeKey = [self scopeKeyFromUrl:self.metadataUrl];
  return [[subAppDir stringByAppendingPathComponent:scopeKey] stringByAppendingPathComponent:@"metadata.json"];
}

- (NSString *)scopeKeyFromUrl:(NSURL *)url {
  // Use URL host + path as scope key
  // Remove filename (metadata.json or manifest.json) from path
  NSString *host = url.host ?: @"unknown";
  NSString *path = url.path ?: @"";
  
  // Remove filename from path (e.g., /metadata.json or /manifest.json)
  // Keep only the directory path
  if ([path hasSuffix:@"/metadata.json"] || [path hasSuffix:@"metadata.json"]) {
    path = [path stringByReplacingOccurrencesOfString:@"/metadata.json" withString:@""];
    path = [path stringByReplacingOccurrencesOfString:@"metadata.json" withString:@""];
  } else if ([path hasSuffix:@"/manifest.json"] || [path hasSuffix:@"manifest.json"]) {
    path = [path stringByReplacingOccurrencesOfString:@"/manifest.json" withString:@""];
    path = [path stringByReplacingOccurrencesOfString:@"manifest.json" withString:@""];
  }
  
  // Normalize path: remove trailing slash and leading slash
  path = [path stringByTrimmingCharactersInSet:[NSCharacterSet characterSetWithCharactersInString:@"/"]];
  
  // Remove special characters for filesystem
  NSString *scopeKey = [[host stringByAppendingString:path] stringByReplacingOccurrencesOfString:@"/" withString:@"_"];
  scopeKey = [scopeKey stringByReplacingOccurrencesOfString:@"." withString:@"_"];
  scopeKey = [scopeKey stringByReplacingOccurrencesOfString:@"-" withString:@"_"];
  scopeKey = [scopeKey stringByReplacingOccurrencesOfString:@" " withString:@"_"];
  
  NSLog(@"[SubAppMetadata] scopeKey for URL %@: %@", url, scopeKey);
  return scopeKey;
}

@end

