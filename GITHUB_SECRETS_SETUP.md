# 🔒 Configuração de Environment Variables no GitHub Secrets

Se o site em `padariaribamar.pt` não está exibindo nada, é porque **as variáveis de ambiente do Firebase não foram configuradas no GitHub Secrets**.

## ⚠️ O que precisa fazer:

### 1. Acesse o GitHub
- Vá para: https://github.com/viniciussilva1-rgb/P-o-de-Ribamar-APP
- Clique em **Settings** (engrenagem no topo)

### 2. Vá para Secrets and variables
- **Settings** → **Secrets and variables** → **Actions**

### 3. Clique em "New repository secret"

### 4. Adicione CADA UM desses secrets:

```
Nome do Secret          |  Valor
VERCEL_TOKEN            |  [Gere no Vercel: https://vercel.com/account/tokens]
VERCEL_ORG_ID           |  [Copie do Vercel Dashboard Settings]
VERCEL_PROJECT_ID       |  [Copie do Vercel Dashboard Settings]

Variáveis Firebase (copyar EXATAMENTE como está):
VITE_FIREBASE_API_KEY                 = AIzaSyAYZ4pAafJM6EyPk6YcxqAnrCasI0YKN-A
VITE_FIREBASE_AUTH_DOMAIN             = pao-de-ribamar-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID              = pao-de-ribamar-app
VITE_FIREBASE_STORAGE_BUCKET          = pao-de-ribamar-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID     = 222485362806
VITE_FIREBASE_APP_ID                  = 1:222485362806:web:1c6dcef46dedf5ef394757
GEMINI_API_KEY                        = [Sua chave da Gemini API]
```

## 5. Após configurar todos os secrets:

Faça um novo push para disparar o build:
```bash
git commit --allow-empty -m "trigger: configure secrets"
git push origin main
```

Verifique em **GitHub → Actions** se o workflow passou ✅

Se passou, em 2-3 minutos seu site estará funcional em **padariaribamar.pt**!

## 🔍 Como verificar se funcionou:

1. Abra https://padariaribamar.pt
2. Abra o DevTools (F12)
3. Vá na aba **Console**
4. Se ver erros do Firebase, volte ao passo 1 e verifique os secrets
5. Se estiver limpo, tente fazer login!

---

**Dúvida?** Envie screenshot do console de erros que ajudo a debugar!
