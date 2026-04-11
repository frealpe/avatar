import { create } from 'zustand'

const AVATAR_STORAGE_KEY = 'modavatar_active_body'

const getStoredAvatar = () => {
  if (typeof window === 'undefined') return null

  try {
    const rawAvatar = window.localStorage.getItem(AVATAR_STORAGE_KEY)
    return rawAvatar ? JSON.parse(rawAvatar) : null
  } catch (error) {
    console.error('Error reading stored avatar', error)
    return null
  }
}

const persistAvatar = (avatarData) => {
  if (typeof window === 'undefined') return

  try {
    if (avatarData) {
      window.localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(avatarData))
    } else {
      window.localStorage.removeItem(AVATAR_STORAGE_KEY)
    }
  } catch (error) {
    console.error('Error persisting avatar', error)
  }
}

const useStore = create((set) => ({
  sidebarShow: false,
  asideShow: false,
  theme: 'light',
  avatarData: getStoredAvatar(), // Recupera el avatar activo tras recargar

  // Equivalente al dispatch({ type: 'set', ...rest })
  set: (payload) => set((state) => ({ ...state, ...payload })),

  // Equivalente al dispatch({ type: 'SET_AVATAR', payload })
  setAvatar: (payload) => {
    persistAvatar(payload)
    set((state) => ({ ...state, avatarData: payload }))
  },
}))

export default useStore
