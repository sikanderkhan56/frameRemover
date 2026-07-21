import {ActivityIndicator, Text, View} from 'react-native';
import {setupStyles as styles} from '../theme/setupStyles';

type CheckingScreenProps = {
  label: string;
};

export function CheckingScreen({label}: CheckingScreenProps) {
  return (
    <View style={styles.centeredStep}>
      <ActivityIndicator color="#FF6B00" size="large" />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}
