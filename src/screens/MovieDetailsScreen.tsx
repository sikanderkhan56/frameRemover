import {ActivityIndicator, Pressable, Text, TextInput, View} from 'react-native';
import {
  DetailsHeader,
  OrangeButton,
  TextLinkButton,
} from '../components/OrangeButton';
import type {MovieSuggestion} from '../types/content';
import {setupStyles as styles} from '../theme/setupStyles';

type MovieDetailsScreenProps = {
  movieTitle: string;
  releaseYear: string;
  movieSuggestions: MovieSuggestion[];
  isLoadingSuggestions: boolean;
  hasLoadedSuggestions: boolean;
  selectedMovieSuggestionId: string | null;
  errorMessage: string | null;
  continueLabel: string;
  onChangeTitle: (title: string) => void;
  onChangeYear: (year: string) => void;
  onSelectSuggestion: (suggestion: MovieSuggestion) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function MovieDetailsScreen({
  movieTitle,
  releaseYear,
  movieSuggestions,
  isLoadingSuggestions,
  hasLoadedSuggestions,
  selectedMovieSuggestionId,
  errorMessage,
  continueLabel,
  onChangeTitle,
  onChangeYear,
  onSelectSuggestion,
  onContinue,
  onBack,
}: MovieDetailsScreenProps) {
  return (
    <View style={styles.movieDetailsScreen}>
      <View style={styles.movieDetailsMain}>
        <DetailsHeader onBack={onBack} title="Movie details" />

        <Text style={styles.movieDetailsSubtitle}>
          Enter the movie title and release year so we can find the right
          version (remakes share names but differ by year).
        </Text>

        <Text style={styles.movieDetailsFieldLabel}>Movie title</Text>
        <View style={styles.movieSearchField}>
          <TextInput
            accessibilityLabel="Movie title"
            autoCapitalize="words"
            autoCorrect={false}
            onChangeText={onChangeTitle}
            placeholder="e.g. Inception"
            placeholderTextColor="#9CA3AF"
            style={styles.movieDetailsInput}
            value={movieTitle}
          />

          {!selectedMovieSuggestionId &&
          movieTitle.trim().length >= 2 &&
          (isLoadingSuggestions ||
            hasLoadedSuggestions ||
            movieSuggestions.length > 0) ? (
            <View style={styles.movieSuggestionList}>
              {isLoadingSuggestions ? (
                <View style={styles.movieSuggestionStatus}>
                  <ActivityIndicator color="#FF6B00" size="small" />
                  <Text style={styles.movieSuggestionStatusText}>
                    Searching…
                  </Text>
                </View>
              ) : movieSuggestions.length > 0 ? (
                movieSuggestions.map((suggestion, index) => (
                  <Pressable
                    accessibilityLabel={`${suggestion.title}, ${suggestion.release_year}`}
                    accessibilityRole="button"
                    key={suggestion.movie_id}
                    onPress={() => onSelectSuggestion(suggestion)}
                    style={({pressed}) => [
                      styles.movieSuggestionRow,
                      index > 0 && styles.movieSuggestionRowBorder,
                      pressed && styles.movieSuggestionRowPressed,
                    ]}>
                    <View style={styles.suggestionText}>
                      <Text numberOfLines={1} style={styles.movieSuggestionTitle}>
                        {suggestion.title}
                      </Text>
                      <Text style={styles.movieSuggestionYear}>
                        {suggestion.release_year}
                      </Text>
                    </View>
                    <Text style={styles.movieSuggestionSceneCount}>
                      {suggestion.scene_count}{' '}
                      {suggestion.scene_count === 1 ? 'scene' : 'scenes'}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <View style={styles.movieSuggestionStatus}>
                  <Text style={styles.movieSuggestionStatusText}>
                    No matching movies
                  </Text>
                </View>
              )}
            </View>
          ) : null}
        </View>

        <Text style={styles.movieDetailsFieldLabel}>Release year</Text>
        <TextInput
          accessibilityLabel="Release year"
          keyboardType="number-pad"
          maxLength={4}
          onChangeText={onChangeYear}
          placeholder="e.g. 2010"
          placeholderTextColor="#9CA3AF"
          style={styles.movieDetailsInput}
          value={releaseYear}
        />

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
