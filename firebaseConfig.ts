import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

// Configuração do Firebase com as chaves oficiais fornecidas
const firebaseConfig = {
  apiKey: "AIzaSyAYZ4pAafJM6EyPk6YcxqAnrCasI0YKN-A",
  authDomain: "pao-de-ribamar-app.firebaseapp.com",
  projectId: "pao-de-ribamar-app",
  // Ajuste para o padrão appspot.com
  storageBucket: "pao-de-ribamar-app.appspot.com",
  messagingSenderId: "222485362806",
  appId: "1:222485362806:web:1c6dcef46dedf5ef394757"
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
