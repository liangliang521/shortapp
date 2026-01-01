//
//  SubAppManifestResource.m
//  videcodingpreview
//
//  Downloads and caches manifest.json files for sub-apps
//  Reference: expo-go/ios/Exponent/Kernel/AppLoader/CachedResource/EXManifestResource.m
//

#import "SubAppManifestResource.h"

@interface SubAppManifestResource ()
@property (nonatomic, strong) NSURL *manifestUrl;
@property (nonatomic, strong, nullable) NSData *manifestData;
@end

@implementation SubAppManifestResource

- (instancetype)initWithManifestUrl:(NSURL *)url {
  if (self = [super init]) {
    _manifestUrl = url;
  }
  return self;
}

- (void)loadManifestWithCompletion:(void(^)(NSDictionary * _Nullable manifest, NSError * _Nullable error))completion {
  // Always download fresh manifest (don't use cache to avoid loading wrong project)
  // Remove old cache if exists
  NSString *cachePath = [self manifestCachePath];
  NSFileManager *fm = [NSFileManager defaultManager];
  if ([fm fileExistsAtPath:cachePath]) {
    NSError *removeError;
    [fm removeItemAtPath:cachePath error:&removeError];
    if (removeError) {
      NSLog(@"[SubAppManifest] Failed to remove cached manifest: %@", removeError);
    } else {
      NSLog(@"[SubAppManifest] Removed cached manifest: %@", cachePath);
    }
  }
  
  // Download from remote
  [self _downloadManifestWithCompletion:^(NSDictionary * _Nullable manifest, NSError * _Nullable error) {
    if (manifest && !error) {
      [self _writeManifestToCache:manifest];
    }
    completion(manifest, error);
  }];
}

- (void)_downloadManifestWithCompletion:(void(^)(NSDictionary * _Nullable manifest, NSError * _Nullable error))completion {
  NSURLSession *session = [NSURLSession sharedSession];
  NSURLSessionDataTask *task = [session dataTaskWithURL:self.manifestUrl
                                       completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
    if (error) {
      completion(nil, error);
      return;
    }
    
    // Validate response
    if ([response isKindOfClass:[NSHTTPURLResponse class]]) {
      NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
      if (httpResponse.statusCode != 200) {
        NSError *httpError = [NSError errorWithDomain:@"SubAppManifestResource"
                                                  code:httpResponse.statusCode
                                              userInfo:@{NSLocalizedDescriptionKey: [NSString stringWithFormat:@"HTTP %ld", (long)httpResponse.statusCode]}];
        completion(nil, httpError);
        return;
      }
    }
    
    // Parse JSON
    NSError *parseError;
    NSDictionary *manifest = [NSJSONSerialization JSONObjectWithData:data
                                                               options:kNilOptions
                                                                 error:&parseError];
    if (parseError || !manifest) {
      completion(nil, parseError ?: [NSError errorWithDomain:@"SubAppManifestResource"
                                                         code:-1
                                                     userInfo:@{NSLocalizedDescriptionKey: @"Invalid manifest JSON"}]);
      return;
    }
    
    self.manifestData = data;
    completion(manifest, nil);
  }];
  
  [task resume];
}

- (void)_writeManifestToCache:(NSDictionary *)manifest {
  NSString *cachePath = [self manifestCachePath];
  NSString *cacheDir = [cachePath stringByDeletingLastPathComponent];
  
  // Create directory if needed
  NSFileManager *fm = [NSFileManager defaultManager];
  if (![fm fileExistsAtPath:cacheDir]) {
    NSError *error;
    [fm createDirectoryAtPath:cacheDir withIntermediateDirectories:YES attributes:nil error:&error];
    if (error) {
      NSLog(@"[SubAppManifest] Failed to create cache directory: %@", error);
      return;
    }
  }
  
  // Write manifest
  NSError *writeError;
  NSData *jsonData = [NSJSONSerialization dataWithJSONObject:manifest
                                                      options:NSJSONWritingPrettyPrinted
                                                        error:&writeError];
  if (jsonData && !writeError) {
    [jsonData writeToFile:cachePath atomically:YES];
    NSLog(@"[SubAppManifest] Cached manifest to %@", cachePath);
  } else {
    NSLog(@"[SubAppManifest] Failed to write cache: %@", writeError);
  }
}

- (nullable NSURL *)bundleUrlFromManifest:(NSDictionary *)manifest {
  NSDictionary *launchAsset = manifest[@"launchAsset"];
  if (!launchAsset) {
    return nil;
  }
  
  NSString *bundleUrlString = launchAsset[@"url"];
  if (!bundleUrlString) {
    return nil;
  }
  
  return [NSURL URLWithString:bundleUrlString];
}

- (nullable NSArray *)assetsFromManifest:(NSDictionary *)manifest {
  NSArray *assets = manifest[@"assets"];
  if (![assets isKindOfClass:[NSArray class]]) {
    return nil;
  }
  return assets;
}

- (NSString *)manifestCachePath {
  NSString *cachesDir = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES).firstObject;
  NSString *subAppDir = [cachesDir stringByAppendingPathComponent:@"SubApps"];
  NSString *scopeKey = [self scopeKeyFromUrl:self.manifestUrl];
  return [[subAppDir stringByAppendingPathComponent:scopeKey] stringByAppendingPathComponent:@"manifest.json"];
}

- (NSString *)scopeKeyFromUrl:(NSURL *)url {
  // Use URL host + path as scope key
  NSString *host = url.host ?: @"unknown";
  NSString *path = url.path ?: @"";
  
  // Normalize path: remove trailing slash and leading slash
  path = [path stringByTrimmingCharactersInSet:[NSCharacterSet characterSetWithCharactersInString:@"/"]];
  
  // Remove special characters for filesystem
  NSString *scopeKey = [[host stringByAppendingString:path] stringByReplacingOccurrencesOfString:@"/" withString:@"_"];
  scopeKey = [scopeKey stringByReplacingOccurrencesOfString:@"." withString:@"_"];
  scopeKey = [scopeKey stringByReplacingOccurrencesOfString:@"-" withString:@"_"];
  scopeKey = [scopeKey stringByReplacingOccurrencesOfString:@" " withString:@"_"];
  
  NSLog(@"[SubAppManifest] scopeKey for URL %@: %@", url, scopeKey);
  return scopeKey;
}

@end

