import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Inicializa o Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

interface CreateDriverRequest {
  email: string;
  password: string;
  name: string;
}

/**
 * Cloud Function: createDriver
 * 
 * Cria um novo entregador no Firebase Auth e Firestore.
 * Apenas admins autenticados podem chamar esta função.
 * 
 * O admin NÃO é deslogado — a criação acontece no backend.
 */
export const createDriver = onCall<CreateDriverRequest>(
  async (request) => {
    // 1. Verifica se o usuário está autenticado
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Você precisa estar logado para criar um entregador."
      );
    }

    // 2. Verifica se é admin (busca no Firestore)
    const callerUid = request.auth.uid;
    const callerDoc = await db.collection("users").doc(callerUid).get();
    
    if (!callerDoc.exists) {
      throw new HttpsError(
        "permission-denied",
        "Usuário não encontrado no sistema."
      );
    }

    const callerData = callerDoc.data();
    const callerRole = String(callerData?.role ?? "").toUpperCase();
    
    if (callerRole !== "ADMIN") {
      throw new HttpsError(
        "permission-denied",
        "Apenas administradores podem criar entregadores."
      );
    }

    // 3. Valida os dados recebidos
    const { email, password, name } = request.data;

    if (!email || !password || !name) {
      throw new HttpsError(
        "invalid-argument",
        "Email, senha e nome são obrigatórios."
      );
    }

    if (password.length < 6) {
      throw new HttpsError(
        "invalid-argument",
        "A senha deve ter pelo menos 6 caracteres."
      );
    }

    try {
      // 4. Cria o usuário no Firebase Auth
      const userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: name,
      });

      const uid = userRecord.uid;

      // 5. Cria o documento em 'users' com role DRIVER
      await db.collection("users").doc(uid).set({
        id: uid,
        name: name,
        email: email,
        role: "DRIVER",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: callerUid,
      });

      // 6. Retorna sucesso
      return {
        success: true,
        uid: uid,
        message: `Entregador "${name}" criado com sucesso!`,
      };

    } catch (error: unknown) {
      console.error("Erro ao criar entregador:", error);

      // Trata erros específicos do Firebase Auth
      if (error && typeof error === "object" && "code" in error) {
        const firebaseError = error as { code: string; message: string };
        
        if (firebaseError.code === "auth/email-already-exists") {
          throw new HttpsError(
            "already-exists",
            "Este email já está em uso por outro usuário."
          );
        }
        
        if (firebaseError.code === "auth/invalid-email") {
          throw new HttpsError(
            "invalid-argument",
            "O email fornecido é inválido."
          );
        }

        throw new HttpsError(
          "internal",
          firebaseError.message || "Erro ao criar entregador."
        );
      }

      throw new HttpsError(
        "internal",
        "Erro desconhecido ao criar entregador."
      );
    }
  }
);

/**
 * Cloud Function: deleteDriver
 * 
 * Remove um entregador do Firebase Auth e Firestore.
 * Também remove todos os clientes e rotas associados ao entregador.
 * Apenas admins podem executar.
 */
export const deleteDriver = onCall<{ uid: string }>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Você precisa estar logado."
      );
    }

    const callerUid = request.auth.uid;
    const callerDoc = await db.collection("users").doc(callerUid).get();
    const callerRole = String(callerDoc.data()?.role ?? "").toUpperCase();

    if (callerRole !== "ADMIN") {
      throw new HttpsError(
        "permission-denied",
        "Apenas administradores podem remover entregadores."
      );
    }

    const { uid } = request.data;

    if (!uid) {
      throw new HttpsError(
        "invalid-argument",
        "UID do entregador é obrigatório."
      );
    }

    try {
      // 1. Remove todos os CLIENTES do entregador
      const clientsSnapshot = await db.collection("clients")
        .where("driverId", "==", uid)
        .get();
      
      const clientDeletePromises = clientsSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(clientDeletePromises);
      const clientsDeleted = clientsSnapshot.size;

      // 2. Remove todas as ROTAS do entregador
      const routesSnapshot = await db.collection("routes")
        .where("driverId", "==", uid)
        .get();
      
      const routeDeletePromises = routesSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(routeDeletePromises);
      const routesDeleted = routesSnapshot.size;

      // 3. Remove o documento do usuário no Firestore
      await db.collection("users").doc(uid).delete();

      // 4. Remove do Firebase Auth
      await auth.deleteUser(uid);

      return { 
        success: true, 
        message: `Entregador removido com sucesso! ${clientsDeleted} cliente(s) e ${routesDeleted} rota(s) também foram removidos.`,
        clientsDeleted,
        routesDeleted
      };
    } catch (error) {
      console.error("Erro ao remover entregador:", error);
      throw new HttpsError(
        "internal",
        "Erro ao remover entregador."
      );
    }
  }
);
