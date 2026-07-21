import {Text, View} from 'react-native';
import {OrangeButton} from '../components/OrangeButton';
import {setupStyles as styles} from '../theme/setupStyles';

type WelcomeScreenProps = {
  isPicking: boolean;
  errorMessage: string | null;
  onChooseFile: () => void;
};

export function WelcomeScreen({
  isPicking,
  errorMessage,
  onChooseFile,
}: WelcomeScreenProps) {
  return (
    <View style={styles.welcomeContent}>
      <Text style={styles.welcomeTitle}>Frame Remover</Text>
      <Text style={styles.welcomeSubtitle}>
        Choose a video, tell us if it is a movie or web series episode, and we
        will load or create skip scenes from the backend.
      </Text>

      <OrangeButton
        label="Choose Video"
        loading={isPicking}
        onPress={onChooseFile}
      />

      {errorMessage ? (
        <Text style={styles.welcomeErrorText}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}
