import {Provider} from 'react-redux';
import {StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {VideoPlayerScreen} from './src/screens/VideoPlayerScreen';
import {store} from './src/store';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'light-content'}
          backgroundColor="#0f1115"
        />
        <VideoPlayerScreen />
      </SafeAreaProvider>
    </Provider>
  );
}

export default App;
