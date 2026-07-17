import UIKit
import Network
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

#if DEBUG
  /// Must stay retained or iOS cancels the Bonjour browse and never shows Local Network.
  private static var localNetworkBrowser: NWBrowser?
  private var bonjourBrowser: NetServiceBrowser?
#endif

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
#if DEBUG
    requestLocalNetworkAccessForMetro()
#endif

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

#if DEBUG && !targetEnvironment(simulator)
    // Give the Local Network dialog a moment to appear before Metro is contacted.
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
      guard let self else { return }
      factory.startReactNative(
        withModuleName: "frameRemover",
        in: self.window,
        launchOptions: launchOptions
      )
    }
#else
    factory.startReactNative(
      withModuleName: "frameRemover",
      in: window,
      launchOptions: launchOptions
    )
#endif

    return true
  }

  // Required by react-native-orientation-locker. Fullscreen playback can
  // request landscape while the rest of the app remains portrait.
  func application(
    _ application: UIApplication,
    supportedInterfaceOrientationsFor window: UIWindow?
  ) -> UIInterfaceOrientationMask {
    Orientation.getOrientation()
  }

#if DEBUG
  /// Info.plist keys alone often do not show the Local Network prompt / Settings entry.
  /// Bonjour browse is what makes "frameRemover" appear under Local Network.
  private func requestLocalNetworkAccessForMetro() {
    let parameters = NWParameters()
    parameters.includePeerToPeer = true
    let browser = NWBrowser(
      for: .bonjour(type: "_http._tcp", domain: nil),
      using: parameters
    )
    browser.start(queue: .main)
    Self.localNetworkBrowser = browser

    let netBrowser = NetServiceBrowser()
    netBrowser.searchForServices(ofType: "_http._tcp.", inDomain: "local.")
    bonjourBrowser = netBrowser
  }
#endif
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    // Simulator + device: load JS from Metro for hot reload.
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
