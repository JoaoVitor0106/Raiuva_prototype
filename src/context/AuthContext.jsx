import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // Mocked state for the portfolio prototype
  const [currentUser, setCurrentUser] = useState({ uid: 'mock-user-123', email: 'prototype@raiuva.com' });
  const [userData, setUserData] = useState({ name: 'Visitante (Protótipo)', role: 'admin' });
  const [sellerData, setSellerData] = useState({ farmName: 'Fazenda Protótipo', rating: 5.0 });
  const [isSellerMode, setIsSellerMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);
  const [isLocalAdmin, setIsLocalAdmin] = useState(true);

  const toggleMode = () => {
    setIsSellerMode(!isSellerMode);
  };

  const loginAsAdmin = () => {
    setIsLocalAdmin(true);
  };

  const logout = async () => {
    console.log("Logout simulado no protótipo");
  };

  const value = {
    currentUser,
    userData,
    sellerData,
    isSellerMode,
    isAdmin,
    isLocalAdmin,
    loginAsAdmin,
    toggleMode,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};


