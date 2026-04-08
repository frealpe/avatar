import { create } from 'zustand';

export const useProbadorStore = create((set) => ({
    bodyParams: {
        height: 170, // cm
        chest: 90,   // cm
        waist: 75,   // cm
        hips: 90     // cm
    },
    updateBodyParam: (key, value) => set((state) => ({
        bodyParams: {
            ...state.bodyParams,
            [key]: parseFloat(value)
        }
    })),
    resetParams: () => set({
        bodyParams: {
            height: 170,
            chest: 90,
            waist: 75,
            hips: 90
        }
    })
}));
