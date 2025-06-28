import React, { createContext, useState, useContext } from 'react';

const ConfirmationResultContext = createContext();

export const useConfirmationResult = () => useContext(ConfirmationResultContext);

export const ConfirmationResultProvider = ({ children }) => {
  const [confirmationResult, setConfirmationResult] = useState(null);
  return (
    <ConfirmationResultContext.Provider value={{ confirmationResult, setConfirmationResult }}>
      {children}
    </ConfirmationResultContext.Provider>
  );
};
