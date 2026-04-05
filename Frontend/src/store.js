import { legacy_createStore as createStore } from 'redux'

const initialState = {
  sidebarShow: false,
  asideShow: false,
  theme: 'light',
  avatarData: null, // Para guardar el avatar proveniente de la inferencia Anny
}

const changeState = (state = initialState, { type, payload, ...rest }) => {
  switch (type) {
    case 'set':
      return { ...state, ...rest }
    case 'SET_AVATAR':
      return { ...state, avatarData: payload }
    default:
      return state
  }
}

const store = createStore(changeState)
export default store
