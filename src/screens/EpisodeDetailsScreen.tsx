import {Text, TextInput, View} from 'react-native';
import {
  DetailsHeader,
  OrangeButton,
  TextLinkButton,
} from '../components/OrangeButton';
import {setupStyles as styles} from '../theme/setupStyles';

type EpisodeDetailsScreenProps = {
  seriesTitle: string;
  seasonNumber: string;
  episodeNumber: string;
  errorMessage: string | null;
  continueLabel: string;
  onChangeSeriesTitle: (value: string) => void;
  onChangeSeason: (value: string) => void;
  onChangeEpisode: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function EpisodeDetailsScreen({
  seriesTitle,
  seasonNumber,
  episodeNumber,
  errorMessage,
  continueLabel,
  onChangeSeriesTitle,
  onChangeSeason,
  onChangeEpisode,
  onContinue,
  onBack,
}: EpisodeDetailsScreenProps) {
  return (
    <View style={styles.movieDetailsScreen}>
      <View style={styles.movieDetailsMain}>
        <DetailsHeader onBack={onBack} title="Episode details" />

        <Text style={styles.movieDetailsSubtitle}>
          Enter the web series name plus season and episode number.
        </Text>

        <Text style={styles.movieDetailsFieldLabel}>Series name</Text>
        <TextInput
          accessibilityLabel="Series name"
          autoCapitalize="words"
          autoCorrect={false}
          onChangeText={onChangeSeriesTitle}
          placeholder="e.g. Breaking Bad"
          placeholderTextColor="#9CA3AF"
          style={styles.movieDetailsInput}
          value={seriesTitle}
        />

        <View style={styles.episodeRowInputs}>
          <View style={styles.episodeHalfInput}>
            <Text style={styles.movieDetailsFieldLabel}>Season</Text>
            <TextInput
              accessibilityLabel="Season number"
              keyboardType="number-pad"
              maxLength={3}
              onChangeText={onChangeSeason}
              placeholder="1"
              placeholderTextColor="#9CA3AF"
              style={styles.movieDetailsInput}
              value={seasonNumber}
            />
          </View>

          <View style={styles.episodeHalfInput}>
            <Text style={styles.movieDetailsFieldLabel}>Episode</Text>
            <TextInput
              accessibilityLabel="Episode number"
              keyboardType="number-pad"
              maxLength={3}
              onChangeText={onChangeEpisode}
              placeholder="3"
              placeholderTextColor="#9CA3AF"
              style={styles.movieDetailsInput}
              value={episodeNumber}
            />
          </View>
        </View>

        {errorMessage ? (
          <Text style={styles.movieDetailsErrorText}>{errorMessage}</Text>
        ) : null}
      </View>

      <View style={styles.movieDetailsFooter}>
        <OrangeButton label={continueLabel} onPress={onContinue} />
        <TextLinkButton label="Back" onPress={onBack} />
      </View>
    </View>
  );
}
