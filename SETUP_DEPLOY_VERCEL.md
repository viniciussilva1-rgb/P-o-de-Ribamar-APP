# 🚀 Guia de Deploy Automático no Vercel

## 1️⃣ Obter os IDs do Vercel

**No Vercel Dashboard:**

1. Vá para **Settings → Tokens**
2. Crie um novo token (copia `VERCEL_TOKEN`)
3. Vá para **Settings → General** 
   - Procure por **Project ID** (copia `VERCEL_PROJECT_ID`)
   - Procure por **Team ID** ou **User ID** (copia `VERCEL_ORG_ID`)

## 2️⃣ Adicionar Secrets no GitHub

**No seu repositório GitHub:**

1. **Settings → Secrets and variables → Actions**
2. Clique em **New repository secret**
3. Adicione os seguintes secrets:

```
VERCEL_TOKEN = [Cole o token do Vercel]
VERCEL_ORG_ID = [Cole o Team/User ID]
VERCEL_PROJECT_ID = [Cole o Project ID]
VITE_FIREBASE_API_KEY = AIzaSyAYZ4pAafJM6EyPk6YcxqAnrCasI0YKN-A
VITE_FIREBASE_AUTH_DOMAIN = pao-de-ribamar-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID = pao-de-ribamar-app
VITE_FIREBASE_STORAGE_BUCKET = pao-de-ribamar-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID = 222485362806
VITE_FIREBASE_APP_ID = 1:222485362806:web:1c6dcef46dedf5ef394757
GEMINI_API_KEY = [Sua chave da API Gemini]
```

## 3️⃣ Workflow Automático

O arquivo `.github/workflows/deploy.yml` já foi criado.

**O que faz:**
- A cada `push` na branch `main`, faz um build automático
- Injeta as variáveis de ambiente do GitHub Secrets
- Faz deploy automático no Vercel (produção)

## 4️⃣ Testar

Faça um push à `main`:
```bash
git add .
git commit -m "test: trigger deploy"
git push origin main
```

Depois vá a **GitHub → Actions** para ver o workflow a correr.

Se tudo correr bem, em ~2min o site `padariaribamar.pt` terá o novo tema dark profissional! 🎨

## ⚠️ Se der erro

- Verifique se os secrets estão corretos
- Verifique se o `VERCEL_PROJECT_ID` é exato
- Veja o log no **GitHub Actions → Workflows** para mais detalhes
