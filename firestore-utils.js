import { db } from './firebase-config.js';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from 'firebase/firestore';

const COLLECTIONS = {
  USERS: 'users',
  BOOKINGS: 'bookings',
  DESKS: 'desks',
  OFFICES: 'offices',
  CHECKINS: 'checkins',
};

// Users
export async function addUser(userData) {
  const docRef = await addDoc(collection(db, COLLECTIONS.USERS), {
    ...userData,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return docRef.id;
}

export async function getUser(userId) {
  const docRef = doc(db, COLLECTIONS.USERS, userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

export async function updateUser(userId, userData) {
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
    ...userData,
    updatedAt: new Date(),
  });
}

// Bookings
export async function createBooking(bookingData) {
  const docRef = await addDoc(collection(db, COLLECTIONS.BOOKINGS), {
    ...bookingData,
    createdAt: new Date(),
    status: 'active',
  });
  return docRef.id;
}

export async function getBooking(bookingId) {
  const docRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

export async function getUserBookings(userId) {
  const q = query(
    collection(db, COLLECTIONS.BOOKINGS),
    where('userId', '==', userId),
    orderBy('date', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function updateBooking(bookingId, bookingData) {
  await updateDoc(doc(db, COLLECTIONS.BOOKINGS, bookingId), {
    ...bookingData,
    updatedAt: new Date(),
  });
}

export async function cancelBooking(bookingId) {
  await updateDoc(doc(db, COLLECTIONS.BOOKINGS, bookingId), {
    status: 'cancelled',
    cancelledAt: new Date(),
  });
}

// Desks
export async function getDesks(officeId) {
  const q = query(
    collection(db, COLLECTIONS.DESKS),
    where('officeId', '==', officeId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getDeskAvailability(deskId, date) {
  const q = query(
    collection(db, COLLECTIONS.BOOKINGS),
    where('deskId', '==', deskId),
    where('date', '==', date)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.length === 0; // true if available
}

// Offices
export async function getOffices() {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.OFFICES));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Check-ins
export async function createCheckIn(checkInData) {
  const docRef = await addDoc(collection(db, COLLECTIONS.CHECKINS), {
    ...checkInData,
    timestamp: new Date(),
  });
  return docRef.id;
}

export async function getCheckInHistory(userId, limit_count = 10) {
  const q = query(
    collection(db, COLLECTIONS.CHECKINS),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(limit_count)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export { COLLECTIONS };
