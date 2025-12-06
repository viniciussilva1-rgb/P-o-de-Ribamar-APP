import { useEffect, useRef } from 'react';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

/**
 * useSyncEntregadorFirestore
 *
 * Sincroniza automaticamente o usuário autenticado (Firebase Auth) com a coleção
 * "entregadores" no Firestore, garantindo que exista um documento com o mesmo UID.
 *
 * - Coleção: "entregadores"
 * - Documento: ID igual ao UID do usuário autenticado
 * - Campos criados quando não existir:
 *   - nome: displayName do usuário ou 'Desconhecido'
 *   - email: email do usuário
 *   - role: 'entregador'
 *   - criadoEm: timestamp atual (serverTimestamp)
 *
 * Pode ser usado no layout (React/Next.js) ou na página principal.
 */
export function useSyncEntregadorFirestore(enabled: boolean = true) {
  const didInitRef = useRef(false);

  useEffect(() => {
    if (!enabled || didInitRef.current) return;
    didInitRef.current = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) return;
        const uid = firebaseUser.uid;
        const nome = firebaseUser.displayName || 'Desconhecido';
        const email = firebaseUser.email || '';

        const entregadorRef = doc(db, 'entregadores', uid);
        const snap = await getDoc(entregadorRef);

        if (!snap.exists()) {
          await setDoc(entregadorRef, {
            id: uid,
            nome,
            email,
            role: 'entregador',
            criadoEm: serverTimestamp() as Timestamp,
          });
        }
      } catch (err) {
        // Loga o erro, mas não interrompe a aplicação
        console.error('[useSyncEntregadorFirestore] Falha na sincronização:', err);
      }
    });

    return () => unsubscribe();
  }, [enabled]);
}

export default useSyncEntregadorFirestore;
