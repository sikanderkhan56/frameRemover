import {Text, View} from 'react-native';
import {CutSceneEditor} from '../components/CutSceneEditor';
import {
  OrangeButton,
  TextLinkButton,
} from '../components/OrangeButton';
import type {CutSceneDraft} from '../types/flow';
import {formatClockTimestamp} from '../utils/frameSkip';
import {setupStyles as styles} from '../theme/setupStyles';

type EditCutScenesScreenProps = {
  title: string;
  subtitle: string;
  videoDuration: number;
  sceneDrafts: CutSceneDraft[];
  cutSceneError: string | null;
  saveLabel: string;
  isSaving: boolean;
  onChangeDrafts: (drafts: CutSceneDraft[]) => void;
  onSave: () => void;
  onBack: () => void;
};

export function EditCutScenesScreen({
  title,
  subtitle,
  videoDuration,
  sceneDrafts,
  cutSceneError,
  saveLabel,
  isSaving,
  onChangeDrafts,
  onSave,
  onBack,
}: EditCutScenesScreenProps) {
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

        <CutSceneEditor
          errorMessage={cutSceneError}
          onChange={onChangeDrafts}
          scenes={sceneDrafts}
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
