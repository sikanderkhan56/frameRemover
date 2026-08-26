import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Ionicons} from '@react-native-vector-icons/ionicons/static';
import {
  SceneReviewSheet,
  type SceneReviewConfirmPayload,
  type SceneReviewInitialValues,
} from './SceneReviewSheet';
import {
  getSkipReasonLabel,
  getSkipReasonStyle,
} from '../constants/skipReasons';
import type {EstimatedScene} from '../types/content';
import {
  createEmptyCutSceneDraft,
  type CutSceneDraft,
} from '../types/flow';
import {
  mapAiCategoryToReason,
  parseEstimatedTimeRange,
} from '../utils/aiPreview';
import {secondsToTimeFields, timeFieldsToClock} from '../utils/cutSceneDrafts';
import {parseTimeFields} from '../utils/time';

type CutSceneEditorProps = {
  scenes: CutSceneDraft[];
  onChange: (scenes: CutSceneDraft[]) => void;
  errorMessage?: string | null;
  videoUri: string;
  videoFileName?: string;
  videoDuration: number;
  onReviewSheetVisibilityChange?: (visible: boolean) => void;
  onDurationDetected?: (duration: number) => void;
};

export type CutSceneEditorHandle = {
  /** Returns false when the AI time range cannot be parsed. */
  openFromAiSuggestion: (scene: EstimatedScene) => boolean;
};

type SheetMode = 'add' | 'edit' | 'ai';

type OpenSheetState = {
  visible: boolean;
  mode: SheetMode;
  sceneId: string | null;
  title: string;
  confirmLabel: string;
  initial: SceneReviewInitialValues;
};

function createClosedSheet(): OpenSheetState {
  return {
    visible: false,
    mode: 'add',
    sceneId: null,
    title: 'Add scene',
    confirmLabel: 'Confirm Scene',
    initial: {
      start: null,
      end: null,
      reason: '',
      aiOriginal: null,
    },
  };
}

export const CutSceneEditor = forwardRef<
  CutSceneEditorHandle,
  CutSceneEditorProps
>(function CutSceneEditor(
  {
    scenes,
    onChange,
    errorMessage,
    videoUri,
    videoFileName,
    videoDuration,
    onReviewSheetVisibilityChange,
    onDurationDetected,
  },
  ref,
) {
  const [sheet, setSheet] = useState<OpenSheetState>(createClosedSheet);

  const closeSheet = useCallback(() => {
    setSheet(createClosedSheet());
    onReviewSheetVisibilityChange?.(false);
  }, [onReviewSheetVisibilityChange]);

  const openAddSheet = useCallback(() => {
    setSheet({
      visible: true,
      mode: 'add',
      sceneId: null,
      title: 'Add scene',
      confirmLabel: 'Confirm Scene',
      initial: {
        start: null,
        end: null,
        reason: '',
        aiOriginal: null,
      },
    });
    onReviewSheetVisibilityChange?.(true);
  }, [onReviewSheetVisibilityChange]);

  const openEditSheet = useCallback(
    (scene: CutSceneDraft) => {
      const start = parseTimeFields(scene.start);
      const end = parseTimeFields(scene.end);

      setSheet({
        visible: true,
        mode: 'edit',
        sceneId: scene.id,
        title: 'Edit scene',
        confirmLabel: 'Confirm Scene',
        initial: {
          start,
          end,
          reason: scene.reason,
          aiOriginal: null,
        },
      });
      onReviewSheetVisibilityChange?.(true);
    },
    [onReviewSheetVisibilityChange],
  );

  const openFromAiSuggestion = useCallback(
    (scene: EstimatedScene) => {
      const range = parseEstimatedTimeRange(scene.estimated_time);
      if (!range) {
        return false;
      }

      const reason = mapAiCategoryToReason(scene.category);
      setSheet({
        visible: true,
        mode: 'ai',
        sceneId: null,
        title: 'Review AI scene',
        confirmLabel: 'Confirm Scene',
        initial: {
          start: range.start,
          end: range.end,
          reason,
          aiOriginal: {
            start: range.start,
            end: range.end,
            reason,
          },
        },
      });
      onReviewSheetVisibilityChange?.(true);
      return true;
    },
    [onReviewSheetVisibilityChange],
  );

  useImperativeHandle(
    ref,
    () => ({
      openFromAiSuggestion,
    }),
    [openFromAiSuggestion],
  );

  const removeScene = useCallback(
    (id: string) => {
      onChange(scenes.filter(scene => scene.id !== id));
    },
    [onChange, scenes],
  );

  const handleConfirm = useCallback(
    (payload: SceneReviewConfirmPayload) => {
      const startFields = secondsToTimeFields(payload.start);
      const endFields = secondsToTimeFields(payload.end);

      if (sheet.mode === 'edit' && sheet.sceneId) {
        onChange(
          scenes.map(scene =>
            scene.id === sheet.sceneId
              ? {
                  ...scene,
                  start: startFields,
                  end: endFields,
                  reason: payload.reason,
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
            reason: payload.reason,
          },
        ]);
      }

      closeSheet();
    },
    [closeSheet, onChange, scenes, sheet.mode, sheet.sceneId],
  );

  const sheetInitial = useMemo(() => sheet.initial, [sheet.initial]);

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

      <SceneReviewSheet
        confirmLabel={sheet.confirmLabel}
        duration={videoDuration}
        initial={sheetInitial}
        title={sheet.title}
        videoFileName={videoFileName}
        videoUri={videoUri}
        visible={sheet.visible}
        onCancel={closeSheet}
        onConfirm={handleConfirm}
        onDurationDetected={onDurationDetected}
      />
    </View>
  );
});

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
  pressed: {
    opacity: 0.85,
  },
});
