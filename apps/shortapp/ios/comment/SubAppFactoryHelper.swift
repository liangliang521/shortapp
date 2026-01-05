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
    
    // 捕获子 App 尝试使用但未安装的原生模块
    public override func bridge(_ bridge: RCTBridge, didNotFindModule moduleName: String) -> Bool {
      NSLog("[SubAppFactoryDelegate] Module not found: %@", moduleName)
      
      // 发送错误通知到主 App
      let errorInfo: [String: Any] = [
        "moduleName": moduleName,
        "message": "Cannot find native module '\(moduleName)'",
        "isFatal": false
      ]
      
      NotificationCenter.default.post(
        name: NSNotification.Name("SubAppModuleNotFound"),
        object: nil,
        userInfo: errorInfo
      )
      
      // 返回 NO 表示模块确实不存在，停止查找
      // 这样可以避免重复查找，同时让 JS 层抛出错误
      return false
    }
  }

  @objc(makeRootViewWithNewFactory:moduleName:initialProps:)
  public static func makeRootViewWithNewFactory(
    bundleURL: URL,
    moduleName: String,
    initialProps: [AnyHashable: Any]?
  ) -> UIView {
    let delegate = SubAppFactoryDelegate(url: bundleURL)
    let factory = ExpoReactNativeFactory(delegate: delegate)
    
    // Create root view
    let rootView = factory.recreateRootView(
      withBundleURL: bundleURL,
      moduleName: moduleName,
      initialProps: initialProps,
      launchOptions: nil
    )
    
    // Set up error handling for the root view
    // We'll wrap the root view in an error boundary at the JS level
    // For now, we just ensure the view doesn't crash the app
    
    return rootView
  }
}

