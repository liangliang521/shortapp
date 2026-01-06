//
//  SubAppContainerView.m
//  videcodingpreview
//
//  Native view container for sub-apps
//

#import "SubAppContainerView.h"
#import "SubAppLauncher.h"
#import <React/RCTUIManager.h>
#import <React/RCTView.h>

@interface SubAppContainerView : RCTView
@property (nonatomic, weak, nullable) UIView *lastAttachedRootView;
@end

@implementation SubAppContainerView

- (instancetype)init {
  if (self = [super init]) {
    NSLog(@"[SubAppContainerView] init called");
    // Set background color for debugging (orange)
    self.backgroundColor = [UIColor colorWithRed:1.0 green:0.96 blue:0.9 alpha:1.0];
    
    // Listen for sub-app root view ready notification
    [[NSNotificationCenter defaultCenter] addObserver:self
                                               selector:@selector(_handleSubAppRootViewReady:)
                                                   name:@"SubAppRootViewReady"
                                                 object:nil];
    
    // Listen for cleanup notification
    [[NSNotificationCenter defaultCenter] addObserver:self
                                               selector:@selector(_handleSubAppRootViewCleanup:)
                                                   name:@"SubAppRootViewCleanup"
                                                 object:nil];
  }
  return self;
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)didMoveToSuperview {
  [super didMoveToSuperview];
  NSLog(@"[SubAppContainerView] didMoveToSuperview, superview: %@, frame: %@", 
        self.superview, NSStringFromCGRect(self.frame));
  if (self.superview) {
    // When the view is added to the hierarchy, attach the sub-app root view
    dispatch_async(dispatch_get_main_queue(), ^{
      [self _attachSubAppRootView];
    });
  } else {
    // When removed from hierarchy, clean up
    UIView *rootView = [SubAppLauncher currentSubAppRootView];
    if (rootView && rootView.superview == self) {
      [rootView removeFromSuperview];
    }
    self.lastAttachedRootView = nil;
  }
}

- (void)_handleSubAppRootViewReady:(NSNotification *)notification {
  [self _attachSubAppRootView];
}

- (void)_handleSubAppRootViewCleanup:(NSNotification *)notification {
  UIView *oldRootView = notification.object;
  if (oldRootView && oldRootView.superview == self) {
    NSLog(@"[SubAppContainerView] Removing old rootView from container due to cleanup");
    [oldRootView removeFromSuperview];
  }
  if (oldRootView == self.lastAttachedRootView) {
    self.lastAttachedRootView = nil;
  }
}

- (void)_attachSubAppRootView {
  if (!self.superview) {
    return;
  }
  
  UIView *subAppRootView = [SubAppLauncher currentSubAppRootView];
  
  // Don't re-attach the same rootView
  if (!subAppRootView || subAppRootView == self.lastAttachedRootView) {
    return;
  }
  
  NSLog(@"[SubAppContainerView] _attachSubAppRootView called");
  NSLog(@"[SubAppContainerView] - Current subAppRootView: %@", subAppRootView);
  NSLog(@"[SubAppContainerView] - Current frame: %@", NSStringFromCGRect(self.frame));
  NSLog(@"[SubAppContainerView] - Current superview: %@", self.superview);
  NSLog(@"[SubAppContainerView] - Current subviews count: %lu", (unsigned long)self.subviews.count);
  
  // Remove from previous parent if any
  if (subAppRootView.superview) {
    NSLog(@"[SubAppContainerView] Removing from previous parent: %@", subAppRootView.superview);
    [subAppRootView removeFromSuperview];
  }
  
  // Use async dispatch to ensure we're on main thread and avoid view controller hierarchy issues
  dispatch_async(dispatch_get_main_queue(), ^{
    if (!self.superview) {
      return;
    }
    
    UIView *toAttach = [SubAppLauncher currentSubAppRootView];
    if (!toAttach || toAttach == self.lastAttachedRootView) {
      return;
    }
    
    // Configure the view
    toAttach.frame = self.bounds;
    toAttach.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    toAttach.backgroundColor = [UIColor colorWithRed:0.9 green:0.8 blue:1.0 alpha:1.0];
    
    // Add to container with exception handling
    @try {
      [self addSubview:toAttach];
      self.lastAttachedRootView = toAttach;
      NSLog(@"[SubAppContainerView] Sub-app root view attached successfully");
      NSLog(@"[SubAppContainerView] - New subviews count: %lu", (unsigned long)self.subviews.count);
    } @catch (NSException *exception) {
      NSLog(@"[SubAppContainerView] ERROR: Failed to attach rootView: %@", exception);
      // Clean up if attachment failed
      if (toAttach.superview == self) {
        [toAttach removeFromSuperview];
      }
      [[NSNotificationCenter defaultCenter] postNotificationName:@"SubAppRootViewCleanup" object:toAttach];
    }
  });
}

- (void)layoutSubviews {
  [super layoutSubviews];
  NSLog(@"[SubAppContainerView] layoutSubviews, frame: %@, subviews count: %lu", 
        NSStringFromCGRect(self.frame), (unsigned long)self.subviews.count);
  // Ensure sub-app root view fills the container
  for (UIView *subview in self.subviews) {
    subview.frame = self.bounds;
  }
}

@end

@implementation SubAppContainerViewManager

RCT_EXPORT_MODULE(SubAppContainerView)

- (UIView *)view {
  SubAppContainerView *view = [[SubAppContainerView alloc] init];
  // Set background color for debugging (orange)
  view.backgroundColor = [UIColor colorWithRed:1.0 green:0.96 blue:0.9 alpha:1.0];
  NSLog(@"[SubAppContainerViewManager] Created view: %@", view);
  return view;
}

@end

