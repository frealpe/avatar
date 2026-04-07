import { create } from 'zustand'

const useStore = create((set) => ({
  sidebarShow: false,
  asideShow: false,
  theme: 'light',
  avatarData: null, // Para guardar el avatar proveniente de la inferencia Anny

  // Equivalente al dispatch({ type: 'set', ...rest })
  set: (payload) => set((state) => ({ ...state, ...payload })),

  // Equivalente al dispatch({ type: 'SET_AVATAR', payload })
  setAvatar: (payload) => set((state) => ({ ...state, avatarData: payload })),
}))

export default useStore
