import {Provider} from 'react-redux';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {VideoPlayerScreen} from './src/screens/VideoPlayerScreen';
import {store} from './src/store';

function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <VideoPlayerScreen />
      </SafeAreaProvider>
    </Provider>
  );
}

export default App;
