import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuração do Firebase com as chaves oficiais fornecidas
const firebaseConfig = {
  apiKey: "AIzaSyAYZ4pAafJM6EyPk6YcxqAnrCasI0YKN-A",
  authDomain: "pao-de-ribamar-app.firebaseapp.com",
  projectId: "pao-de-ribamar-app",
  storageBucket: "pao-de-ribamar-app.firebasestorage.app",
  messagingSenderId: "222485362806",
  appId: "1:222485362806:web:1c6dcef46dedf5ef394757"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços de Autenticação e Banco de Dados
export const auth = getAuth(app);
export const db = getFirestore(app);