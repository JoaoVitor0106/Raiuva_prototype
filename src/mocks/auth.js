export const getAuth = () => ({});
export const onAuthStateChanged = (auth, callback) => {
  // Simulate logged-in user immediately for the prototype
  setTimeout(() => {
    callback({
      uid: 'prototype-user-id',
      email: 'prototype@raiuva.com',
      getIdTokenResult: async () => ({ claims: { role: 'admin' } })
    });
  }, 100);
  return () => {}; // unsubscribe function
};
export const signInWithEmailAndPassword = async () => ({ user: { uid: 'prototype-user-id' } });
export const createUserWithEmailAndPassword = async () => ({ user: { uid: 'prototype-user-id' } });
export const signOut = async () => {};

export const db = {};
export const auth = {};
