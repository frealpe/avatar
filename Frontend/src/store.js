import { create } from 'zustand'

const AVATAR_STORAGE_KEY = 'modavatar_active_body'
const AUTH_STORAGE_KEY = 'modavatar_auth'

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

const getStoredAuth = () => {
  if (typeof window === 'undefined') return { user: null, token: null, isAuthenticated: false }

  try {
    const rawAuth = window.localStorage.getItem(AUTH_STORAGE_KEY)
    return rawAuth ? JSON.parse(rawAuth) : { user: null, token: null, isAuthenticated: false }
  } catch (error) {
    console.error('Error reading stored auth', error)
    return { user: null, token: null, isAuthenticated: false }
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

const persistAuth = (authData) => {
  if (typeof window === 'undefined') return

  try {
    if (authData) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData))
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  } catch (error) {
    console.error('Error persisting auth', error)
  }
}

const useStore = create((set) => ({
  sidebarShow: false,
  asideShow: false,
  theme: 'light',
  avatarData: getStoredAvatar(), 
  backgroundJobs: [],
  simulationNotification: null,
  ...getStoredAuth(),

  // Equivalente al dispatch({ type: 'set', ...rest })
  set: (payload) => set((state) => ({ ...state, ...payload })),

  // Authentication actions
  setLogin: (user, token) => {
    const authData = { user, token, isAuthenticated: true }
    persistAuth(authData)
    
    // Si el usuario trae un avatar de la BD, activarlo automáticamente
    if (user && user.avatar) {
      persistAvatar(user.avatar)
      set((state) => ({ ...state, ...authData, avatarData: user.avatar }))
    } else {
      set((state) => ({ ...state, ...authData }))
    }
  },

  setLogout: () => {
    const authData = { user: null, token: null, isAuthenticated: false }
    persistAuth(null)
    set((state) => ({ ...state, ...authData }))
  },

  // Equivalente al dispatch({ type: 'SET_AVATAR', payload })
  setAvatar: (payload) => {
    persistAvatar(payload)
    set((state) => ({ ...state, avatarData: payload }))
  },
}))

export default useStore
