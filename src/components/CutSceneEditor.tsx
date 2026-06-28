import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {ReasonPicker} from './ReasonPicker';
import {
  createEmptyCutSceneDraft,
  type CutSceneDraft,
  type TimeFields,
} from '../types/flow';

type CutSceneEditorProps = {
  scenes: CutSceneDraft[];
  onChange: (scenes: CutSceneDraft[]) => void;
  errorMessage?: string | null;
};

type TimeFieldsInputProps = {
  label: string;
  value: TimeFields;
  onChange: (value: TimeFields) => void;
  sceneIndex: number;
};

function TimeFieldsInput({
  label,
  value,
  onChange,
  sceneIndex,
}: TimeFieldsInputProps) {
  const updateField = (field: keyof TimeFields, text: string) => {
    const sanitized = text.replace(/[^0-9]/g, '');
    onChange({...value, [field]: sanitized});
  };

  return (
    <View style={styles.timeGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <Text style={styles.timeUnitLabel}>Hr</Text>
          <TextInput
            accessibilityLabel={`Scene ${sceneIndex + 1} ${label} hours`}
            keyboardType="number-pad"
            maxLength={3}
            onChangeText={text => updateField('hours', text)}
            placeholder="—"
            placeholderTextColor="#4b5563"
            style={styles.timeInput}
            value={value.hours}
          />
        </View>

        <Text style={styles.timeSeparator}>:</Text>

        <View style={styles.timeField}>
          <Text style={styles.timeUnitLabel}>Min</Text>
          <TextInput
            accessibilityLabel={`Scene ${sceneIndex + 1} ${label} minutes`}
            keyboardType="number-pad"
            maxLength={2}
            onChangeText={text => updateField('minutes', text)}
            placeholder="—"
            placeholderTextColor="#4b5563"
            style={styles.timeInput}
            value={value.minutes}
          />
        </View>

        <Text style={styles.timeSeparator}>:</Text>

        <View style={styles.timeField}>
          <Text style={styles.timeUnitLabel}>Sec</Text>
          <TextInput
            accessibilityLabel={`Scene ${sceneIndex + 1} ${label} seconds`}
            keyboardType="number-pad"
            maxLength={2}
            onChangeText={text => updateField('seconds', text)}
            placeholder="—"
            placeholderTextColor="#4b5563"
            style={styles.timeInput}
            value={value.seconds}
          />
        </View>
      </View>
    </View>
  );
}

export function CutSceneEditor({
  scenes,
  onChange,
  errorMessage,
}: CutSceneEditorProps) {
  const updateScene = (
    id: string,
    updater: (scene: CutSceneDraft) => CutSceneDraft,
  ) => {
    onChange(scenes.map(scene => (scene.id === id ? updater(scene) : scene)));
  };

  const removeScene = (id: string) => {
    if (scenes.length === 1) {
      return;
    }
    onChange(scenes.filter(scene => scene.id !== id));
  };

  const addScene = () => {
    onChange([...scenes, createEmptyCutSceneDraft()]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cut scenes to skip</Text>
      <Text style={styles.hint}>
        Enter when each scene starts and ends. Leave hours empty for scenes
        under 1 hour, and leave minutes empty if you only need seconds. Pick a
        reason from the list for each scene.
      </Text>

      {scenes.map((scene, index) => (
        <View key={scene.id} style={styles.sceneCard}>
          <Text style={styles.sceneLabel}>Scene {index + 1}</Text>

          <TimeFieldsInput
            label="Start time"
            sceneIndex={index}
            value={scene.start}
            onChange={start =>
              updateScene(scene.id, current => ({...current, start}))
            }
          />

          <TimeFieldsInput
            label="End time"
            sceneIndex={index}
            value={scene.end}
            onChange={end =>
              updateScene(scene.id, current => ({...current, end}))
            }
          />

          <Text style={styles.fieldLabel}>Reason</Text>
          <ReasonPicker
            sceneIndex={index}
            value={scene.reason}
            onChange={reason =>
              updateScene(scene.id, current => ({...current, reason}))
            }
          />

          {scenes.length > 1 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => removeScene(scene.id)}
              style={({pressed}) => [
                styles.removeButton,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.removeButtonText}>Remove scene</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={addScene}
        style={({pressed}) => [
          styles.addButton,
          pressed && styles.buttonPressed,
        ]}>
        <Text style={styles.addButtonText}>+ Add another scene</Text>
      </Pressable>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  hint: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 20,
  },
  sceneCard: {
    backgroundColor: '#1a1f27',
    borderRadius: 12,
    gap: 8,
    padding: 14,
  },
  sceneLabel: {
    color: '#93c5fd',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  timeGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  timeRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
  },
  timeField: {
    flex: 1,
    gap: 4,
  },
  timeUnitLabel: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  timeInput: {
    backgroundColor: '#0f1115',
    borderColor: '#3a3f4b',
    borderRadius: 8,
    borderWidth: 1,
    color: '#ffffff',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    paddingHorizontal: 10,
    paddingVertical: 10,
    textAlign: 'center',
  },
  timeSeparator: {
    color: '#6b7280',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#0f1115',
    borderColor: '#3a3f4b',
    borderRadius: 8,
    borderWidth: 1,
    color: '#ffffff',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButton: {
    alignItems: 'center',
    borderColor: '#3b82f6',
    borderRadius: 10,
    borderStyle: 'dashed',
    borderWidth: 1,
    paddingVertical: 12,
  },
  addButtonText: {
    color: '#93c5fd',
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 4,
  },
  removeButtonText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
  },
});
