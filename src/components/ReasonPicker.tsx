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
    gap: 4,
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
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: '#3b82f6',
  },
  triggerText: {
    color: '#ffffff',
    fontSize: 15,
  },
  triggerPlaceholder: {
    color: '#6b7280',
  },
  chevron: {
    color: '#9ca3af',
    fontSize: 12,
  },
  menu: {
    backgroundColor: '#0f1115',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderColor: '#3b82f6',
    borderTopWidth: 0,
    borderWidth: 1,
    overflow: 'hidden',
  },
  option: {
    borderTopColor: '#3a3f4b',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  optionSelected: {
    backgroundColor: '#1e3a5f',
  },
  optionText: {
    color: '#e5e7eb',
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
