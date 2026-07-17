package com.frameremover

import android.view.KeyEvent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.github.kevinejohn.keyevent.KeyEventModule

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "frameRemover"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  // Forward hardware key events (TV remote D-pad / media keys) to JS while keeping
  // the platform default behaviour (Back, Volume, focus navigation) intact.
  // getInstance() is null until React Native has initialised, so guard against
  // very early key presses.
  override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
    KeyEventModule.getInstance()?.onKeyDownEvent(keyCode, event)
    return super.onKeyDown(keyCode, event)
  }

  override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
    KeyEventModule.getInstance()?.onKeyUpEvent(keyCode, event)
    return super.onKeyUp(keyCode, event)
  }
}
