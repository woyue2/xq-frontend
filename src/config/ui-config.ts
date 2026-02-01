/**
 * UI Configuration - Centralized Palette & Design Tokens
 * 
 * This file separates UI styling from component logic for better maintainability.
 * Standardizing on Red for "Good Questions" and professional tones for difficulty.
 */

export const UI_CONFIG = {
    colors: {
        // Badges & Labels
        goodQuestion: "bg-red-600 text-white shadow-sm border-none font-bold", // "Good Question" is strictly Red

        // Difficulty Levels
        difficulty: {
            easy: "bg-emerald-50 text-emerald-700 border-emerald-100",
            medium: "bg-blue-50 text-blue-700 border-blue-100",
            hard: "bg-orange-50 text-orange-700 border-orange-100", // No more pink for hard!
        },

        // Roles
        roles: {
            teacher: "bg-blue-600 text-white",
            student: "bg-emerald-500 text-white",
            parent: "bg-orange-500 text-white", // Changed from pink to orange
        },

        // Plus Button (from user's premium design)
        plusButton: {
            base: "bg-gradient-to-tr from-blue-600 to-cyan-600 border-4 border-white/20 backdrop-blur-md shadow-2xl",
            icon: "text-white"
        }
    }
};
