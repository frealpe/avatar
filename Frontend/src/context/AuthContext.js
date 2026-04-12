import React, { createContext, useEffect, useState, useCallback } from 'react';
import useStore from '../store';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    
    const { user, token, isAuthenticated, setLogin, setLogout } = useStore();

    // Podemos añadir una función para verificar el token si el backend tiene un endpoint de renovación
    // const checkToken = useCallback(async () => { ... }, []);

    // El store (useStore) ya maneja la carga inicial desde localStorage en su definición.
    // Sin embargo, podemos usar el Context para exponer funciones de ayuda o manejar lógica adicional.

    const login = (usuario, token) => {
        setLogin(usuario, token);
    };

    const logout = () => {
        setLogout();
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isAuthenticated,
            login,
            logout
        }}>
            { children }
        </AuthContext.Provider>
    )
}
