import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { auth, db } from '../firebaseConfig'; // Importa a auth do Firebase
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (email: string, pass: string, name: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Observa mudanças no estado de autenticação (Login/Logout)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Se o usuário logou, busca os dados dele no Firestore (Permissões, Nome, etc)
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setCurrentUser(userDoc.data() as User);
        } else {
          // Fallback: Tenta buscar por email na coleção de users (caso tenha sido criado pelo Admin sem ID do Auth)
          // Em um app real, sincronizaríamos isso melhor. Aqui, vamos assumir que o registro cria o doc.
          console.log("Usuário logado no Auth, mas sem documento no Firestore correspondente ao UID.");
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      return true;
    } catch (error) {
      console.error("Erro no login:", error);
      return false;
    }
  };

  const register = async (email: string, pass: string, name: string): Promise<boolean> => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      
      // Cria o documento do usuário no Firestore com o mesmo ID da Autenticação
      const newUser: User = {
        id: result.user.uid,
        name: name,
        email: email,
        // Se for o email do admin mestre, dá admin, senão DRIVER (padrão)
        role: email === 'viniciussiuva1@gmail.com' ? UserRole.ADMIN : UserRole.DRIVER
      };
      
      await setDoc(doc(db, 'users', result.user.uid), newUser);
      return true;
    } catch (error) {
      console.error("Erro no registro:", error);
      return false;
    }
  };

  const logout = () => {
    signOut(auth);
  };

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  return (
    <AuthContext.Provider value={{ currentUser, login, register, logout, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};