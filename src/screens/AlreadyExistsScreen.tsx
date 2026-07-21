import {Pressable, Text, View} from 'react-native';
import {
  OrangeButton,
  OutlineButton,
} from '../components/OrangeButton';
import {setupStyles as styles} from '../theme/setupStyles';

type AlreadyExistsScreenProps = {
  contentLabel: string;
  existingSceneCount: number;
  errorMessage: string | null;
  onPlay: () => void;
  onEditCutScenes: () => void;
  onEditDetails: () => void;
};

export function AlreadyExistsScreen({
  contentLabel,
  existingSceneCount,
  errorMessage,
  onPlay,
  onEditCutScenes,
  onEditDetails,
}: AlreadyExistsScreenProps) {
  return (
    <View style={styles.resultScreen}>
      <Text style={styles.resultTitle}>Already in database</Text>
      <Text style={styles.resultSubtitle}>
        {contentLabel} already exists with {existingSceneCount}{' '}
        {existingSceneCount === 1 ? 'scene' : 'scenes'}. Play with existing cuts
        or edit them.
      </Text>

      <OrangeButton
        label="Play"
        onPress={onPlay}
        style={styles.resultPrimaryButton}
      />

      <OutlineButton label="Edit cut scenes" onPress={onEditCutScenes} />

      {errorMessage ? (
        <Text style={styles.movieDetailsErrorText}>{errorMessage}</Text>
      ) : null}

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
