export const getFirestore = () => ({});
export const doc = (db, collectionName, docId) => ({ id: docId || 'mock-id', path: `${collectionName}/${docId}` });
export const collection = (db, collectionName) => ({ id: collectionName, path: collectionName });
export const setDoc = async () => {};
export const updateDoc = async () => {};
export const addDoc = async () => ({ id: `new-mock-id-${Date.now()}` });
export const deleteDoc = async () => {};
export const getDoc = async (docRef) => {
  if (docRef.path.includes('users')) return { exists: () => true, data: () => ({ name: 'Visitante', role: 'admin' }) };
  return { exists: () => false, data: () => null };
};
export const getDocs = async () => ({ docs: [] });
export const query = (ref) => ref;
export const where = () => ({});
export const orderBy = () => ({});
export const limit = () => ({});
export const increment = () => 1;

export const onSnapshot = (ref, callback) => {
  setTimeout(() => {
    if (ref && ref.path && ref.path.includes('orders')) {
      callback({
        exists: () => true,
        docs: [
          { id: 'ped-12345', data: () => ({ type: 'delivery', buyer: 'Maria Eduarda', items: ['2x Red Bull Energy Drink', '1x Bala Fini'], total: 25.00, status: 'PENDING', paymentMethod: 'pix', pixTxId: 'PIX-123', room: 'Bloco K, Sala 201', referencePoint: 'Perto da escada rolante', createdAtTimestamp: Date.now() - 120000 }) },
          { id: 'ped-98765', data: () => ({ type: 'pdv', buyer: 'Cliente Avulso', items: ['1x Monster Energy Zero Ultra'], total: 12.00, status: 'COMPLETED', paymentMethod: 'cash', changeFor: '20,00', room: 'Balcão', createdAtTimestamp: Date.now() - 3600000 }) },
          { id: 'ped-55555', data: () => ({ type: 'delivery', buyer: 'João Pedro', items: ['1x Monster Energy Original'], total: 12.00, status: 'ACCEPTED', paymentMethod: 'card', room: 'Bloco M, Lab 4', createdAtTimestamp: Date.now() - 600000 }) }
        ],
        data: () => null
      });
    } else {
      callback({
        exists: () => true,
        docs: [
          { id: 'item-1', data: () => ({ title: 'Red Bull Energy Drink', category: 'redbull', price: 10, stock: 100, description: 'Energético Clássico 250ml', isAvailable: true, imageUrl: '/images/redbull.jpg' }) },
          { id: 'item-2', data: () => ({ title: 'Monster Energy Original', category: 'monster', price: 12, stock: 50, description: 'Energético Lata Verde 473ml', isAvailable: true, imageUrl: '/images/monster-green.jpg' }) },
          { id: 'item-3', data: () => ({ title: 'Monster Energy Zero Ultra', category: 'monster', price: 12, stock: 30, description: 'Energético Lata Branca 473ml', isAvailable: true, imageUrl: '/images/monster-white.jpg' }) }
        ],
        data: () => ({ isAvailable: true, status: 'pending', total: 100 })
      });
    }
  }, 100);
  return () => {};
};

export const db = {};
export const auth = {};
