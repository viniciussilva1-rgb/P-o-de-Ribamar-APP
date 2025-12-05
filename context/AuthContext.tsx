/// <reference types="vite/client" />
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
          console.log('Firestore: usuário encontrado', firebaseUser.uid);
          setCurrentUser(userDoc.data() as User);
        } else {
          // Se o documento não existe, cria um novo com dados básicos
          console.log('Firestore: documento não existe, criando para', firebaseUser.uid);
          const newUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Usuário',
            email: firebaseUser.email || '',
            role: firebaseUser.email === 'viniciussiuva1@gmail.com' ? UserRole.ADMIN : UserRole.DRIVER
          };
          try {
            await setDoc(userDocRef, newUser);
            console.log('Firestore: documento criado com sucesso', firebaseUser.uid);
            setCurrentUser(newUser);
          } catch (docCreationError) {
            console.error('Erro ao criar documento do usuário:', docCreationError);
            // Mesmo com erro, mantém o usuário logado com dados mínimos
            setCurrentUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Usuário',
              email: firebaseUser.email || '',
              role: UserRole.DRIVER
            });
          }
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    // Seed do usuário administrador (apenas em ambiente de desenvolvimento)
    // Usa variáveis de ambiente VITE_ADMIN_EMAIL e VITE_ADMIN_PASS quando disponíveis.
    const seedAdmin = async () => {
      try {
        const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL as string) || 'viniciussiuva1@gmail.com';
        const adminPass = (import.meta.env.VITE_ADMIN_PASS as string) || 'Padariaribamarcvs123';

        // Tenta logar com o admin; se não existir, registra automaticamente.
        try {
          await signInWithEmailAndPassword(auth, adminEmail, adminPass);
          // já existe e está logado — desloga para não interferir no fluxo atual
          await signOut(auth);
        } catch (err) {
          // se não conseguir logar, tenta criar
          try {
            const res = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
            const newUser: User = {
              id: res.user.uid,
              name: 'Administrador',
              email: adminEmail,
              role: UserRole.ADMIN
            };
            await setDoc(doc(db, 'users', res.user.uid), newUser);
            await signOut(auth);
            console.log('Admin seeded:', adminEmail);
          } catch (createErr) {
            // Pode falhar se o usuário já existir no Auth mas não puder logar (senha diferente),
            // ou por regras do Firebase — tratar com log apenas.
            console.warn('Não foi possível seedar admin automaticamente:', createErr);
          }
        }
      } catch (e) {
        console.error('Erro no seed de admin:', e);
      }
    };

    // Executa o seed apenas em desenvolvimento
    if (import.meta.env.DEV) seedAdmin();

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      console.log('Auth: signInWithEmailAndPassword success for', email, res.user.uid);
      return true;
    } catch (error) {
      console.error("Erro no login:", error);
      return false;
    }
  };

  const register = async (email: string, pass: string, name: string): Promise<boolean> => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      console.log('Auth: createUserWithEmailAndPassword success for', email, result.user.uid);
      
      // Cria o documento do usuário no Firestore com o mesmo ID da Autenticação
      const newUser: User = {
        id: result.user.uid,
        name: name,
        email: email,
        // Se for o email do admin mestre, dá admin, senão DRIVER (padrão)
        role: email === 'viniciussiuva1@gmail.com' ? UserRole.ADMIN : UserRole.DRIVER
      };
      
      await setDoc(doc(db, 'users', result.user.uid), newUser);
      console.log('Auth: Firestore user doc created for', result.user.uid);
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