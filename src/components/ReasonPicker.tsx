import {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  SKIP_REASONS,
  type SkipReason,
  getSkipReasonLabel,
} from '../constants/skipReasons';

type ReasonPickerProps = {
  value: SkipReason | '';
  onChange: (value: SkipReason) => void;
  sceneIndex: number;
};

export function ReasonPicker({value, onChange, sceneIndex}: ReasonPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = value ? getSkipReasonLabel(value) : 'Select reason';

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel={`Scene ${sceneIndex + 1} reason`}
        accessibilityRole="button"
        accessibilityState={{expanded: isOpen}}
        onPress={() => setIsOpen(open => !open)}
        style={({pressed}) => [
          styles.trigger,
          isOpen && styles.triggerOpen,
          pressed && styles.pressed,
        ]}>
        <Text
          style={[styles.triggerText, !value && styles.triggerPlaceholder]}>
          {selectedLabel}
        </Text>
        <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
      </Pressable>

      {isOpen ? (
        <View style={styles.menu}>
          {SKIP_REASONS.map(reason => {
            const isSelected = value === reason.value;

            return (
              <Pressable
                key={reason.value}
                accessibilityRole="button"
                accessibilityState={{selected: isSelected}}
                onPress={() => {
                  onChange(reason.value);
                  setIsOpen(false);
                }}
                style={({pressed}) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                  ]}>
                  {reason.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 1,
  },
  trigger: {
    alignItems: 'center',
    backgroundColor: '#0f1115',
    borderColor: '#3a3f4b',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  triggerOpen: {
    borderColor: '#60a5fa',
  },
  triggerText: {
    color: '#ffffff',
    flex: 1,
    fontSize: 15,
  },
  triggerPlaceholder: {
    color: '#6b7280',
  },
  chevron: {
    color: '#9ca3af',
    fontSize: 11,
    marginLeft: 8,
  },
  menu: {
    backgroundColor: '#1a1f27',
    borderColor: '#3a3f4b',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  optionSelected: {
    backgroundColor: '#243044',
  },
  optionText: {
    color: '#d1d5db',
    fontSize: 15,
  },
  optionTextSelected: {
    color: '#93c5fd',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
