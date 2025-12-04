const admin = require('firebase-admin');
const path = require('path');

// Espera que o arquivo serviceAccountKey.json esteja na raiz do projeto
const serviceAccountPath = path.resolve(__dirname, '..', 'serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (err) {
  console.error('Não foi possível carregar serviceAccountKey.json. Baixe-o do Firebase Console e coloque na raiz do projeto.');
  console.error(err.message || err);
  process.exit(1);
}

// Configurações padrão (alterar se desejar)
const email = process.env.ADMIN_EMAIL || 'viniciussiuva1@gmail.com';
const password = process.env.ADMIN_PASS || 'Padariaribamarcvs123';
const uid = process.env.ADMIN_UID || '0eANX1WiQjP7yiXky5D2dbPsW1B2';

async function run() {
  try {
    // Tenta obter usuário por email
    let userRecord = null;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('Usuário já existe no Auth:', userRecord.uid);
      // Atualiza senha caso queira forçar
      await admin.auth().updateUser(userRecord.uid, { password });
      console.log('Senha atualizada para o usuário existente.');
    } catch (e) {
      // se não existir, cria
      if (e.code && e.code === 'auth/user-not-found') {
        const created = await admin.auth().createUser({ email, password, displayName: 'Administrador' });
        userRecord = created;
        console.log('Usuário criado no Auth:', created.uid);
      } else if (e.message && e.message.includes('user-not-found')) {
        const created = await admin.auth().createUser({ email, password, displayName: 'Administrador' });
        userRecord = created;
        console.log('Usuário criado no Auth:', created.uid);
      } else {
        throw e;
      }
    }

    const effectiveUid = userRecord ? userRecord.uid : uid;

    // Cria/atualiza documento no Firestore
    const db = admin.firestore();
    await db.collection('users').doc(effectiveUid).set({
      id: effectiveUid,
      name: 'Administrador',
      email: email,
      role: 'ADMIN'
    }, { merge: true });

    console.log('Documento Firestore users/{uid} criado/atualizado com role ADMIN. UID:', effectiveUid);
    process.exit(0);
  } catch (err) {
    console.error('Erro ao criar/atualizar admin:', err);
    process.exit(1);
  }
}

run();
