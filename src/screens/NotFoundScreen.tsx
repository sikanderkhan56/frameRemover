import {Pressable, Text, View} from 'react-native';
import {
  OrangeButton,
  OutlineButton,
} from '../components/OrangeButton';
import {setupStyles as styles} from '../theme/setupStyles';

type NotFoundScreenProps = {
  title: string;
  subtitle: string;
  onAddCutScenes: () => void;
  onPlayWithoutSkips: () => void;
  onEditDetails: () => void;
};

export function NotFoundScreen({
  title,
  subtitle,
  onAddCutScenes,
  onPlayWithoutSkips,
  onEditDetails,
}: NotFoundScreenProps) {
  return (
    <View style={styles.resultScreen}>
      <Text style={styles.resultTitle}>{title}</Text>
      <Text style={styles.resultSubtitle}>{subtitle}</Text>

      <OrangeButton
        label="Add cut scenes"
        onPress={onAddCutScenes}
        style={styles.resultPrimaryButton}
      />

      <OutlineButton
        label="Play without skipping"
        onPress={onPlayWithoutSkips}
      />

      <Pressable
        accessibilityRole="button"
        onPress={onEditDetails}
        style={({pressed}) => [
          styles.resultTextButton,
          pressed && styles.buttonPressed,
        ]}>
        <Text style={styles.resultTextButtonLabel}>
          Edit details and try again
        </Text>
      </Pressable>
    </View>
  );
}
