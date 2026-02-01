/**
 * Feature Flags Configuration
 * Used to control the visibility of new features during development and rollout.
 */

export const featureFlags = {
    // Enable "Good Question" badge interactivity (click to view list)
    ENABLE_GOOD_QUESTION_INTERACTION: true,
};

export const useFeatureFlag = (flag: keyof typeof featureFlags) => {
    return featureFlags[flag];
};
