import {StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {VideoPlayerScreen} from './src/screens/VideoPlayerScreen';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'light-content'}
        backgroundColor="#0f1115"
      />
      <VideoPlayerScreen />
    </SafeAreaProvider>
  );
}

export default App;
