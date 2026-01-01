//
//  SubAppLoadingProgress.m
//  videcodingpreview
//

#import "SubAppLoadingProgress.h"

@implementation SubAppLoadingProgress

- (instancetype)initWithStatus:(nullable NSString *)status done:(nullable NSNumber *)done total:(nullable NSNumber *)total {
  if (self = [super init]) {
    _status = status;
    _done = done;
    _total = total;
    
    // Calculate progress percentage
    if (done && total && total.floatValue > 0) {
      _progress = done.floatValue / total.floatValue;
    } else {
      _progress = 0.0;
    }
  }
  return self;
}

- (instancetype)init {
  return [self initWithStatus:nil done:nil total:nil];
}

@end

