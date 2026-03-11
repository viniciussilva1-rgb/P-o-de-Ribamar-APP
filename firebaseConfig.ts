import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

// Configuração do Firebase usando variáveis de ambiente
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços de Autenticação e Banco de Dados
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Cloud Functions helpers
export const createDriverFunction = httpsCallable<
  { email: string; password: string; name: string },
  { success: boolean; uid: string; message: string }
>(functions, "createDriver");

export const deleteDriverFunction = httpsCallable<
  { uid: string },
  { success: boolean; message: string }
>(functions, "deleteDriver");

export const updateDriverFunction = httpsCallable<
  { uid: string; name?: string; phone?: string; newPassword?: string },
  { success: boolean; message: string }
>(functions, "updateDriver");
