import {useCallback, useRef} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {
  CutSceneEditor,
  type CutSceneEditorHandle,
} from '../components/CutSceneEditor';
import {
  OrangeButton,
  TextLinkButton,
} from '../components/OrangeButton';
import type {EstimatedScene} from '../types/content';
import type {CutSceneDraft} from '../types/flow';
import {formatClockTimestamp} from '../utils/frameSkip';
import {mapAiCategoryToReason} from '../utils/aiPreview';
import {getSkipReasonLabel, getSkipReasonStyle} from '../constants/skipReasons';
import {setupStyles as styles} from '../theme/setupStyles';

type EditCutScenesScreenProps = {
  title: string;
  subtitle: string;
  videoUri: string;
  videoFileName?: string;
  videoDuration: number;
  sceneDrafts: CutSceneDraft[];
  cutSceneError: string | null;
  saveLabel: string;
  isSaving: boolean;
  aiSuggestions?: EstimatedScene[];
  aiMessage?: string | null;
  isLoadingAiSuggestions?: boolean;
  onAiSuggestionOpenFailed?: (scene: EstimatedScene) => void;
  onClearCutSceneError?: () => void;
  onReviewSheetVisibilityChange?: (visible: boolean) => void;
  onDurationDetected?: (duration: number) => void;
  onRefreshAiSuggestions?: () => void;
  onChangeDrafts: (drafts: CutSceneDraft[]) => void;
  onSave: () => void;
  onBack: () => void;
};

export function EditCutScenesScreen({
  title,
  subtitle,
  videoUri,
  videoFileName,
  videoDuration,
  sceneDrafts,
  cutSceneError,
  saveLabel,
  isSaving,
  aiSuggestions = [],
  aiMessage = null,
  isLoadingAiSuggestions = false,
  onAiSuggestionOpenFailed,
  onClearCutSceneError,
  onReviewSheetVisibilityChange,
  onDurationDetected,
  onRefreshAiSuggestions,
  onChangeDrafts,
  onSave,
  onBack,
}: EditCutScenesScreenProps) {
  const editorRef = useRef<CutSceneEditorHandle>(null);

  const handleUseAiSuggestion = useCallback(
    (scene: EstimatedScene) => {
      const opened = editorRef.current?.openFromAiSuggestion(scene);
      if (!opened) {
        onAiSuggestionOpenFailed?.(scene);
        return;
      }
      onClearCutSceneError?.();
    },
    [onAiSuggestionOpenFailed, onClearCutSceneError],
  );

  const showAiSection =
    isLoadingAiSuggestions ||
    aiSuggestions.length > 0 ||
    Boolean(aiMessage) ||
    Boolean(onRefreshAiSuggestions);

  return (
    <View style={styles.editScenesScreen}>
      <View style={styles.editScenesMain}>
        <Text style={styles.editScenesTitle}>{title}</Text>
        <Text style={styles.editScenesSubtitle}>{subtitle}</Text>

        {videoDuration > 0 ? (
          <Text style={styles.editScenesDuration}>
            Video duration: {formatClockTimestamp(videoDuration)}
          </Text>
        ) : (
          <Text style={styles.editScenesDuration}>Reading video duration…</Text>
        )}

        {showAiSection ? (
          <View style={localStyles.aiSection}>
            <View style={localStyles.aiHeader}>
              <Text style={localStyles.aiTitle}>AI suggested scenes</Text>
              {onRefreshAiSuggestions ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={isLoadingAiSuggestions || isSaving}
                  onPress={onRefreshAiSuggestions}
                  style={({pressed}) => [
                    localStyles.refreshButton,
                    pressed && styles.buttonPressed,
                  ]}>
                  <Text style={localStyles.refreshButtonText}>
                    {isLoadingAiSuggestions ? 'Loading…' : 'Refresh AI'}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {aiMessage ? (
              <Text style={localStyles.aiMessage}>{aiMessage}</Text>
            ) : null}

            {isLoadingAiSuggestions ? (
              <View style={localStyles.aiLoading}>
                <ActivityIndicator color="#FF6B00" />
                <Text style={localStyles.aiLoadingText}>
                  Asking AI for estimated scenes…
                </Text>
              </View>
            ) : null}

            {!isLoadingAiSuggestions && aiSuggestions.length === 0 ? (
              <Text style={localStyles.aiEmpty}>
                No estimated scenes found for this title.
              </Text>
            ) : null}

            {aiSuggestions.map((scene, index) => {
              const reason = mapAiCategoryToReason(scene.category);
              const reasonStyle = getSkipReasonStyle(reason);

              return (
                <View
                  key={`${scene.category}-${scene.estimated_time}-${index}`}
                  style={localStyles.suggestionCard}>
                  <View style={localStyles.suggestionBody}>
                    <View
                      style={[
                        localStyles.categoryTag,
                        {backgroundColor: reasonStyle.backgroundColor},
                      ]}>
                      <Text
                        style={[
                          localStyles.categoryTagText,
                          {color: reasonStyle.textColor},
                        ]}>
                        {scene.category || getSkipReasonLabel(reason)}
                      </Text>
                    </View>
                    <Text style={localStyles.suggestionTime}>
                      {scene.estimated_time}
                    </Text>
                    <Text style={localStyles.suggestionDescription}>
                      {scene.description}
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    disabled={isSaving}
                    onPress={() => handleUseAiSuggestion(scene)}
                    style={({pressed}) => [
                      localStyles.useButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={localStyles.useButtonText}>Use</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}

        <CutSceneEditor
          ref={editorRef}
          errorMessage={cutSceneError}
          onChange={onChangeDrafts}
          onReviewSheetVisibilityChange={onReviewSheetVisibilityChange}
          onDurationDetected={onDurationDetected}
          scenes={sceneDrafts}
          videoDuration={videoDuration}
          videoFileName={videoFileName}
          videoUri={videoUri}
        />
      </View>

      <View style={styles.editScenesFooter}>
        <OrangeButton
          label={saveLabel}
          loading={isSaving}
          onPress={onSave}
        />
        <TextLinkButton disabled={isSaving} label="Back" onPress={onBack} />
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  aiSection: {
    backgroundColor: '#ffffff',
    borderColor: '#EEF0F3',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  aiHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aiTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  refreshButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  refreshButtonText: {
    color: '#FF6B00',
    fontSize: 13,
    fontWeight: '700',
  },
  aiMessage: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 18,
  },
  aiLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  aiLoadingText: {
    color: '#6B7280',
    flex: 1,
    fontSize: 13,
  },
  aiEmpty: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  suggestionCard: {
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderColor: '#EEF0F3',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  suggestionBody: {
    flex: 1,
    gap: 4,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  suggestionTime: {
    color: '#111827',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  suggestionDescription: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 18,
  },
  useButton: {
    backgroundColor: '#FF6B00',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  useButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
