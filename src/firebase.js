import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCVq8sJyQGLcjgdVGulpAHGiCQlzfC_tpg",
  authDomain: "spend-ledger.firebaseapp.com",
  projectId: "spend-ledger",
  storageBucket: "spend-ledger.firebasestorage.app",
  messagingSenderId: "484637638060",
  appId: "1:484637638060:web:e017372ed5ac32be98ce09",
  measurementId: "G-SY801D06WG",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
