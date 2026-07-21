import {Pressable, Text, View} from 'react-native';
import {Ionicons} from '@react-native-vector-icons/ionicons/static';
import type {ContentType} from '../types/content';
import {setupStyles as styles} from '../theme/setupStyles';

type ContentTypeScreenProps = {
  onSelectType: (type: ContentType) => void;
  onChooseDifferentVideo: () => void;
};

export function ContentTypeScreen({
  onSelectType,
  onChooseDifferentVideo,
}: ContentTypeScreenProps) {
  return (
    <View style={styles.contentTypeScreen}>
      <View style={styles.contentTypeMain}>
        <Text style={styles.contentTypeTitle}>What are you watching?</Text>
        <Text style={styles.contentTypeSubtitle}>
          This helps us look up the right cut scenes in the database.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => onSelectType('movie')}
          style={({pressed}) => [
            styles.contentTypeCard,
            pressed && styles.contentTypeCardPressed,
          ]}>
          <View style={[styles.contentTypeIconWrap, styles.contentTypeIconMovie]}>
            <Ionicons color="#FF6B00" name="film-outline" size={24} />
          </View>
          <View style={styles.contentTypeCardText}>
            <Text style={styles.contentTypeCardTitle}>Movie</Text>
            <Text style={styles.contentTypeCardHint}>
              Enter title and release year
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => onSelectType('episode')}
          style={({pressed}) => [
            styles.contentTypeCard,
            pressed && styles.contentTypeCardPressed,
          ]}>
          <View
            style={[styles.contentTypeIconWrap, styles.contentTypeIconSeries]}>
            <Ionicons color="#7C3AED" name="tv-outline" size={24} />
          </View>
          <View style={styles.contentTypeCardText}>
            <Text style={styles.contentTypeCardTitle}>Web series episode</Text>
            <Text style={styles.contentTypeCardHint}>
              Enter series name, season, and episode
            </Text>
          </View>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onChooseDifferentVideo}
        style={({pressed}) => [
          styles.contentTypeFooterButton,
          pressed && styles.buttonPressed,
        ]}>
        <Text style={styles.contentTypeFooterLabel}>
          Choose a different video
        </Text>
      </Pressable>
    </View>
  );
}
