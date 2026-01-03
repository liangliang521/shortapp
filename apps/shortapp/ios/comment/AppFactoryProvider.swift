//
//  AppFactoryProvider.swift
//  videcodingpreview
//
//  Holds the shared ExpoReactNativeFactory created in AppDelegate.
//

import Foundation
import Expo

@objc(AppFactoryProvider)
class AppFactoryProvider: NSObject {
  private static var mainFactory: ExpoReactNativeFactory?

  @objc static func setMainFactory(_ factory: ExpoReactNativeFactory) {
    mainFactory = factory
  }

  @objc static func getMainFactory() -> ExpoReactNativeFactory? {
    return mainFactory
  }
}


