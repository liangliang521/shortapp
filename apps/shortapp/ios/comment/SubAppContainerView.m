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
    [self _attachSubAppRootView];
  }
}

- (void)_handleSubAppRootViewReady:(NSNotification *)notification {
  UIView *rootView = notification.object;
  NSLog(@"[SubAppContainerView] Received SubAppRootViewReady notification, rootView: %@", rootView);
  
  // Store the rootView temporarily to use if currentSubAppRootView returns null
  if (rootView) {
    // Try to attach immediately using the notification object
    if (rootView.superview != self) {
      NSLog(@"[SubAppContainerView] Attaching rootView from notification directly");
      if (rootView.superview) {
        [rootView removeFromSuperview];
      }
      rootView.frame = self.bounds;
      rootView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
      rootView.backgroundColor = [UIColor colorWithRed:0.9 green:0.8 blue:1.0 alpha:1.0];
      [self addSubview:rootView];
      NSLog(@"[SubAppContainerView] RootView attached from notification");
    }
  }
  
  // Also try the normal way
  [self _attachSubAppRootView];
}

- (void)_attachSubAppRootView {
  // Try multiple ways to get the root view
  UIView *subAppRootView = [SubAppLauncher currentSubAppRootView];
  
  // If null, try to get from notification object (stored in a static variable)
  if (!subAppRootView) {
    // Try to get from the notification center's last posted object
    // This is a workaround - we'll store it in the notification userInfo
  }
  
  NSLog(@"[SubAppContainerView] _attachSubAppRootView called");
  NSLog(@"[SubAppContainerView] - Current subAppRootView: %@", subAppRootView);
  NSLog(@"[SubAppContainerView] - Current frame: %@", NSStringFromCGRect(self.frame));
  NSLog(@"[SubAppContainerView] - Current superview: %@", self.superview);
  NSLog(@"[SubAppContainerView] - Current subviews count: %lu", (unsigned long)self.subviews.count);
  
  if (subAppRootView) {
    NSLog(@"[SubAppContainerView] - subAppRootView.superview: %@", subAppRootView.superview);
    NSLog(@"[SubAppContainerView] - subAppRootView.frame: %@", NSStringFromCGRect(subAppRootView.frame));
    
    if (subAppRootView.superview != self) {
      NSLog(@"[SubAppContainerView] Attaching sub-app root view: %@", subAppRootView);
      // Remove from previous parent if any
      if (subAppRootView.superview) {
        NSLog(@"[SubAppContainerView] Removing from previous parent: %@", subAppRootView.superview);
        [subAppRootView removeFromSuperview];
      }
      
      // Add to this container
      subAppRootView.frame = self.bounds;
      subAppRootView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
      // Set background color for debugging (purple - sub-app root view)
      subAppRootView.backgroundColor = [UIColor colorWithRed:0.9 green:0.8 blue:1.0 alpha:1.0];
      
      [self addSubview:subAppRootView];
      NSLog(@"[SubAppContainerView] Sub-app root view attached successfully");
      NSLog(@"[SubAppContainerView] - New subviews count: %lu", (unsigned long)self.subviews.count);
    } else {
      NSLog(@"[SubAppContainerView] Sub-app root view already attached to this container");
    }
  } else {
    NSLog(@"[SubAppContainerView] No sub-app root view available yet");
  }
}

- (void)layoutSubviews {
  [super layoutSubviews];
  NSLog(@"[SubAppContainerView] layoutSubviews, frame: %@, subviews count: %lu", 
        NSStringFromCGRect(self.frame), (unsigned long)self.subviews.count);
  // Ensure sub-app root view fills the container
  for (UIView *subview in self.subviews) {
    if (subview != self.subviews.firstObject) { // Skip React Native's own subviews
      NSLog(@"[SubAppContainerView] Resizing subview: %@ to frame: %@", subview, NSStringFromCGRect(self.bounds));
      subview.frame = self.bounds;
    }
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

