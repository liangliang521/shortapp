//
//  SubAppFactoryHelper.swift
//  videcodingpreview
//
//  Exposes recreateRootView to ObjC callers (per-preview factory).
//

import Foundation
import Expo
import React
import ReactAppDependencyProvider
#if canImport(ReactCommon)
import ReactCommon
#endif

@objc(SubAppFactoryHelper)
@objcMembers
public class SubAppFactoryHelper: NSObject {
  // Use an existing factory (caller provides it)
  @objc public static func makeRootView(
    factory: ExpoReactNativeFactory,
    bundleURL: URL,
    moduleName: String,
    initialProps: [AnyHashable: Any]?
  ) -> UIView {
    return factory.recreateRootView(
      withBundleURL: bundleURL,
      moduleName: moduleName,
      initialProps: initialProps,
      launchOptions: nil
    )
  }

  // Per-preview: create new delegate + factory to avoid recreate assertions
  class SubAppFactoryDelegate: ExpoReactNativeFactoryDelegate {
    private let url: URL
    private weak var exceptionHandler: SubAppExceptionHandler?
    
    init(url: URL, exceptionHandler: SubAppExceptionHandler?) {
      self.url = url
      self.exceptionHandler = exceptionHandler
      super.init()
      self.dependencyProvider = RCTAppDependencyProvider()
    }
    
    public override func bundleURL() -> URL? { url }
    public override func sourceURL(for bridge: RCTBridge) -> URL? { url }
    
    // Note: Error handling is done through RCTExceptionsManagerDelegate
    // The SubAppExceptionHandler implements RCTExceptionsManagerDelegate protocol
    // and will be set up via extraModules or through the factory's error handling mechanism
    
    // Provide extra modules for bridge (old architecture)
    // Note: This may not be called in new architecture, but we provide it for compatibility
    public override func extraModules(for bridge: RCTBridge) -> [RCTBridgeModule] {
      // Call super to get default modules
      let baseModules = super.extraModules(for: bridge) ?? []
      
      // In new architecture, errors are handled via host:didReceiveJSErrorStack:message:exceptionId:isFatal:
      // For old architecture, we would need to set up RCTExceptionsManager here
      // However, since we're using new architecture, this method may not be called
      // If it is called, we'll just return the base modules
      
      return baseModules
    }
  }

  @objc(makeRootViewWithNewFactory:moduleName:initialProps:exceptionHandler:)
  public static func makeRootViewWithNewFactory(
    bundleURL: URL,
    moduleName: String,
    initialProps: [AnyHashable: Any]?,
    exceptionHandler: SubAppExceptionHandler?
  ) -> UIView {
    let delegate = SubAppFactoryDelegate(url: bundleURL, exceptionHandler: exceptionHandler)
    let factory = ExpoReactNativeFactory(delegate: delegate)
    
    // Create root view
    let rootView = factory.recreateRootView(
      withBundleURL: bundleURL,
      moduleName: moduleName,
      initialProps: initialProps,
      launchOptions: nil
    )
    
    return rootView
  }
}

