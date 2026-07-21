import {Platform, StyleSheet} from 'react-native';

export const setupStyles = StyleSheet.create({
  container: {
    backgroundColor: '#0f1115',
    flex: 1,
  },
  containerWelcome: {
    backgroundColor: '#ffffff',
  },
  containerContentType: {
    backgroundColor: '#F8F9FB',
  },
  containerMovieDetails: {
    backgroundColor: '#ffffff',
  },
  containerEditScenes: {
    backgroundColor: '#F8F9FB',
  },
  containerResult: {
    backgroundColor: '#ffffff',
  },
  setupScrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 14,
  },
  scrollContentWelcome: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  scrollContentContentType: {
    justifyContent: 'flex-start',
    paddingBottom: 12,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  scrollContentMovieDetails: {
    justifyContent: 'flex-start',
    paddingBottom: 8,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  scrollContentResult: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  scrollContentEditScenes: {
    justifyContent: 'flex-start',
    paddingBottom: 8,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  scrollContentLandscape: {
    justifyContent: 'flex-start',
    paddingVertical: 16,
  },
  welcomeContent: {
    alignItems: 'center',
    gap: 16,
    maxWidth: 420,
    width: '100%',
  },
  welcomeTitle: {
    color: '#111827',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    color: '#6B7280',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeButtonShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#FF6B00',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
    alignSelf: 'stretch',
    borderRadius: 28,
  },
  welcomeButton: {
    borderRadius: 28,
    height: 56,
    overflow: 'hidden',
    width: '100%',
  },
  welcomeButtonInner: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 28,
    width: '100%',
  },
  welcomeButtonPressed: {
    opacity: 0.88,
  },
  welcomeButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    includeFontPadding: false,
    lineHeight: 22,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  welcomeErrorText: {
    color: '#DC2626',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  contentTypeScreen: {
    flexGrow: 1,
    justifyContent: 'space-between',
    width: '100%',
  },
  contentTypeMain: {
    gap: 12,
    width: '100%',
  },
  contentTypeTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  contentTypeSubtitle: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  contentTypeCard: {
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#EEF0F3',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  contentTypeCardPressed: {
    opacity: 0.9,
  },
  contentTypeIconWrap: {
    alignItems: 'center',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  contentTypeIconMovie: {
    backgroundColor: '#FFE8D6',
  },
  contentTypeIconSeries: {
    backgroundColor: '#EDE4FF',
  },
  contentTypeCardText: {
    flex: 1,
    gap: 4,
  },
  contentTypeCardTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
  },
  contentTypeCardHint: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },
  contentTypeFooterButton: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  contentTypeFooterLabel: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
  movieDetailsScreen: {
    flexGrow: 1,
    justifyContent: 'space-between',
    width: '100%',
  },
  movieDetailsMain: {
    gap: 10,
    width: '100%',
  },
  movieDetailsHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    minHeight: 44,
  },
  movieDetailsBackIcon: {
    left: -8,
    padding: 4,
    position: 'absolute',
    zIndex: 1,
  },
  movieDetailsTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  movieDetailsSubtitle: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
    textAlign: 'center',
  },
  movieDetailsFieldLabel: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
    marginTop: 6,
  },
  movieDetailsInput: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  movieSearchField: {
    zIndex: 2,
  },
  movieSuggestionList: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  movieSuggestionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  movieSuggestionRowBorder: {
    borderTopColor: '#EEF0F3',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  movieSuggestionRowPressed: {
    backgroundColor: '#F9FAFB',
  },
  movieSuggestionTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  movieSuggestionYear: {
    color: '#6B7280',
    fontSize: 13,
  },
  movieSuggestionSceneCount: {
    color: '#FF6B00',
    fontSize: 12,
    fontWeight: '600',
  },
  movieSuggestionStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  movieSuggestionStatusText: {
    color: '#6B7280',
    fontSize: 14,
  },
  suggestionText: {
    flex: 1,
    gap: 2,
  },
  movieDetailsErrorText: {
    color: '#DC2626',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  movieDetailsFooter: {
    gap: 4,
    marginTop: 28,
    width: '100%',
  },
  movieDetailsFooterBack: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  movieDetailsFooterBackLabel: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
  episodeRowInputs: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  episodeHalfInput: {
    flex: 1,
  },
  resultScreen: {
    alignItems: 'center',
    gap: 14,
    maxWidth: 420,
    width: '100%',
  },
  resultTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  resultSubtitle: {
    color: '#6B7280',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
    textAlign: 'center',
  },
  resultPrimaryButton: {
    marginTop: 4,
  },
  resultSecondaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  resultSecondaryButtonPressed: {
    backgroundColor: '#F9FAFB',
  },
  resultSecondaryButtonText: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
  },
  resultTextButton: {
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 10,
  },
  resultTextButtonLabel: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  editScenesScreen: {
    flexGrow: 1,
    justifyContent: 'space-between',
    width: '100%',
  },
  editScenesMain: {
    gap: 12,
    width: '100%',
  },
  editScenesTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  editScenesSubtitle: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  editScenesDuration: {
    color: '#9CA3AF',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
    textAlign: 'center',
  },
  editScenesFooter: {
    gap: 4,
    marginTop: 24,
    width: '100%',
  },
  centeredStep: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 48,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 15,
    textAlign: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
});
