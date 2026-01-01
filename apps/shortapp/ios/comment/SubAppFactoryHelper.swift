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
    init(url: URL) {
      self.url = url
      super.init()
      self.dependencyProvider = RCTAppDependencyProvider()
    }
    public override func bundleURL() -> URL? { url }
    public override func sourceURL(for bridge: RCTBridge) -> URL? { url }
  }

  @objc(makeRootViewWithNewFactory:moduleName:initialProps:)
  public static func makeRootViewWithNewFactory(
    bundleURL: URL,
    moduleName: String,
    initialProps: [AnyHashable: Any]?
  ) -> UIView {
    let delegate = SubAppFactoryDelegate(url: bundleURL)
    let factory = ExpoReactNativeFactory(delegate: delegate)
    return factory.recreateRootView(
      withBundleURL: bundleURL,
      moduleName: moduleName,
      initialProps: initialProps,
      launchOptions: nil
    )
  }
}

