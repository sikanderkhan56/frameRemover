import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Ionicons} from '@react-native-vector-icons/ionicons/static';
import {setupStyles as styles} from '../theme/setupStyles';

type OrangeButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function OrangeButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
}: OrangeButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({pressed}) => [
        styles.welcomeButtonShadow,
        style,
        (pressed || disabled || loading) && styles.welcomeButtonPressed,
      ]}>
      <LinearGradient
        colors={['#FF8A00', '#FF6B00']}
        end={{x: 0.5, y: 1}}
        start={{x: 0.5, y: 0}}
        style={styles.welcomeButton}>
        <View style={styles.welcomeButtonInner}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.welcomeButtonText}>{label}</Text>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

type TextLinkButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function TextLinkButton({
  label,
  onPress,
  disabled = false,
  style,
}: TextLinkButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.movieDetailsFooterBack,
        style,
        pressed && styles.buttonPressed,
      ]}>
      <Text style={styles.movieDetailsFooterBackLabel}>{label}</Text>
    </Pressable>
  );
}

type OutlineButtonProps = {
  label: string;
  onPress: () => void;
};

export function OutlineButton({label, onPress}: OutlineButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.resultSecondaryButton,
        pressed && styles.resultSecondaryButtonPressed,
      ]}>
      <Text style={styles.resultSecondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

type DetailsHeaderProps = {
  title: string;
  onBack: () => void;
};

export function DetailsHeader({title, onBack}: DetailsHeaderProps) {
  return (
    <View style={styles.movieDetailsHeader}>
      <Pressable
        accessibilityLabel="Back"
        accessibilityRole="button"
        hitSlop={12}
        onPress={onBack}
        style={({pressed}) => [
          styles.movieDetailsBackIcon,
          pressed && styles.buttonPressed,
        ]}>
        <Ionicons color="#111827" name="chevron-back" size={28} />
      </Pressable>
      <Text style={styles.movieDetailsTitle}>{title}</Text>
    </View>
  );
}
