import {useCallback, useMemo, useState} from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {Ionicons} from '@react-native-vector-icons/ionicons';
import {
  SKIP_REASONS,
  getSkipReasonLabel,
  getSkipReasonStyle,
  type SkipReason,
} from '../constants/skipReasons';
import {
  createEmptyCutSceneDraft,
  type CutSceneDraft,
} from '../types/flow';
import {
  clockToTimeFields,
  timeFieldsToClock,
} from '../utils/cutSceneDrafts';
import {parseTimeFields} from '../utils/time';

type CutSceneEditorProps = {
  scenes: CutSceneDraft[];
  onChange: (scenes: CutSceneDraft[]) => void;
  errorMessage?: string | null;
};

type SheetMode = 'add' | 'edit';

type SheetState = {
  mode: SheetMode;
  sceneId: string | null;
  start: string;
  end: string;
  reason: SkipReason | '';
  error: string | null;
};

function createEmptySheetState(): SheetState {
  return {
    mode: 'add',
    sceneId: null,
    start: '',
    end: '',
    reason: '',
    error: null,
  };
}

export function CutSceneEditor({
  scenes,
  onChange,
  errorMessage,
}: CutSceneEditorProps) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(createEmptySheetState);

  const openAddSheet = useCallback(() => {
    setSheet(createEmptySheetState());
    setSheetVisible(true);
  }, []);

  const openEditSheet = useCallback((scene: CutSceneDraft) => {
    setSheet({
      mode: 'edit',
      sceneId: scene.id,
      start: timeFieldsToClock(scene.start),
      end: timeFieldsToClock(scene.end),
      reason: scene.reason,
      error: null,
    });
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setSheet(createEmptySheetState());
  }, []);

  const removeScene = useCallback(
    (id: string) => {
      onChange(scenes.filter(scene => scene.id !== id));
    },
    [onChange, scenes],
  );

  const handleSaveSheet = useCallback(() => {
    const startFields = clockToTimeFields(sheet.start);
    const endFields = clockToTimeFields(sheet.end);
    const startSeconds = startFields ? parseTimeFields(startFields) : null;
    const endSeconds = endFields ? parseTimeFields(endFields) : null;

    if (startSeconds === null || !startFields) {
      setSheet(current => ({
        ...current,
        error: 'Enter a valid start time (HH:MM:SS).',
      }));
      return;
    }

    if (endSeconds === null || !endFields) {
      setSheet(current => ({
        ...current,
        error: 'Enter a valid end time (HH:MM:SS).',
      }));
      return;
    }

    if (!sheet.reason) {
      setSheet(current => ({
        ...current,
        error: 'Select a reason.',
      }));
      return;
    }

    if (startSeconds >= endSeconds) {
      setSheet(current => ({
        ...current,
        error: 'Start must be before end.',
      }));
      return;
    }

    if (sheet.mode === 'edit' && sheet.sceneId) {
      onChange(
        scenes.map(scene =>
          scene.id === sheet.sceneId
            ? {
                ...scene,
                start: startFields,
                end: endFields,
                reason: sheet.reason,
              }
            : scene,
        ),
      );
    } else {
      const draft = createEmptyCutSceneDraft();
      onChange([
        ...scenes,
        {
          ...draft,
          start: startFields,
          end: endFields,
          reason: sheet.reason,
        },
      ]);
    }

    closeSheet();
  }, [closeSheet, onChange, scenes, sheet]);

  const sheetTitle = sheet.mode === 'edit' ? 'Edit scene' : 'Add scene';

  const reasonChips = useMemo(
    () =>
      SKIP_REASONS.map(reason => {
        const selected = sheet.reason === reason.value;

        return (
          <Pressable
            key={reason.value}
            accessibilityRole="button"
            accessibilityState={{selected}}
            onPress={() =>
              setSheet(current => ({
                ...current,
                reason: reason.value,
                error: null,
              }))
            }
            style={[
              styles.reasonChip,
              selected && {
                backgroundColor: reason.style.backgroundColor,
                borderColor: reason.style.borderColor,
              },
            ]}>
            <Text
              style={[
                styles.reasonChipText,
                selected && {color: reason.style.textColor},
              ]}>
              {reason.label}
            </Text>
          </Pressable>
        );
      }),
    [sheet.reason],
  );

  return (
    <View style={styles.container}>
      {scenes.map(scene => {
        const reasonStyle = getSkipReasonStyle(scene.reason);
        const startLabel = timeFieldsToClock(scene.start) || '—';
        const endLabel = timeFieldsToClock(scene.end) || '—';

        return (
          <View key={scene.id} style={styles.sceneCard}>
            <View style={styles.sceneCardBody}>
              <Text style={styles.sceneTime}>
                {startLabel} — {endLabel}
              </Text>
              {scene.reason ? (
                <View
                  style={[
                    styles.reasonTag,
                    {
                      backgroundColor: reasonStyle.backgroundColor,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.reasonTagText,
                      {color: reasonStyle.textColor},
                    ]}>
                    {getSkipReasonLabel(scene.reason)}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.sceneActions}>
              <Pressable
                accessibilityLabel="Edit scene"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => openEditSheet(scene)}
                style={({pressed}) => [
                  styles.iconButton,
                  pressed && styles.pressed,
                ]}>
                <Ionicons color="#9CA3AF" name="pencil-outline" size={20} />
              </Pressable>
              <Pressable
                accessibilityLabel="Delete scene"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => removeScene(scene.id)}
                style={({pressed}) => [
                  styles.iconButton,
                  pressed && styles.pressed,
                ]}>
                <Ionicons color="#EF4444" name="trash-outline" size={20} />
              </Pressable>
            </View>
          </View>
        );
      })}

      <Pressable
        accessibilityRole="button"
        onPress={openAddSheet}
        style={({pressed}) => [
          styles.addButton,
          pressed && styles.pressed,
        ]}>
        <Text style={styles.addButtonText}>+ Add Scene</Text>
      </Pressable>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      <Modal
        animationType="slide"
        onRequestClose={closeSheet}
        transparent
        visible={sheetVisible}>
        <View style={styles.sheetRoot}>
          <Pressable
            accessibilityRole="button"
            onPress={closeSheet}
            style={styles.sheetBackdrop}
          />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{sheetTitle}</Text>

            <Text style={styles.fieldLabel}>Start time</Text>
            <TextInput
              accessibilityLabel="Start time"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              onChangeText={text =>
                setSheet(current => ({...current, start: text, error: null}))
              }
              placeholder="00:20:30"
              placeholderTextColor="#9CA3AF"
              style={styles.sheetInput}
              value={sheet.start}
            />

            <Text style={styles.fieldLabel}>End time</Text>
            <TextInput
              accessibilityLabel="End time"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              onChangeText={text =>
                setSheet(current => ({...current, end: text, error: null}))
              }
              placeholder="00:23:45"
              placeholderTextColor="#9CA3AF"
              style={styles.sheetInput}
              value={sheet.end}
            />

            <Text style={styles.fieldLabel}>Reason</Text>
            <View style={styles.reasonGrid}>{reasonChips}</View>

            {sheet.error ? (
              <Text style={styles.sheetErrorText}>{sheet.error}</Text>
            ) : null}

            <View style={styles.sheetActions}>
              <Pressable
                accessibilityRole="button"
                onPress={closeSheet}
                style={({pressed}) => [
                  styles.cancelButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handleSaveSheet}
                style={({pressed}) => [
                  styles.saveButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    width: '100%',
  },
  sceneCard: {
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
      default: {},
    }),
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#EEF0F3',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sceneCardBody: {
    flex: 1,
    gap: 8,
  },
  sceneTime: {
    color: '#111827',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  reasonTag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  reasonTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sceneActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  iconButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  addButton: {
    alignItems: 'center',
    borderColor: '#D1D5DB',
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    paddingVertical: 14,
  },
  addButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  sheetCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: '#D1D5DB',
    borderRadius: 999,
    height: 5,
    marginBottom: 10,
    width: 42,
  },
  sheetTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  fieldLabel: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  sheetInput: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  reasonChip: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  reasonChipText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  sheetErrorText: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: 4,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    alignItems: 'center',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    borderRadius: 14,
    flex: 1.4,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 12,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
