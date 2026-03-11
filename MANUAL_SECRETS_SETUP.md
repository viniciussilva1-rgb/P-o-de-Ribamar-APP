# 🔐 GUIA COMPLETO: Configurar GitHub Secrets Manualmente

Vejo que a automação está tendo dificuldades. Vou te guiar passo a passo para configurar tudo **manualmente em 5 minutos**.

## ✅ Passo 1: Gerar GitHub Personal Access Token

1. Acesse: https://github.com/settings/tokens
2. Clique em **"Generate new token"** → **"Generate new token (classic)"**
3. Dê um nome: `Pão de Ribamar Deploy`
4. Selecione a permissão: `repo` (acesso completo)
5. Clique em **"Generate token"**
6. **COPIE o token** (você não verá novamente!)

---

## ✅ Passo 2: Obter Valores do Vercel

1. Acesse: https://vercel.com/account/tokens
2. Clique em **"Create Token"**
3. Dê um nome e defina scope para seu projeto
4. **COPIE o token** (este é seu VERCEL_TOKEN)

5. Acesse: https://vercel.com/account/general
6. Procure por **"User ID"** ou **"Team ID"** (este é seu VERCEL_ORG_ID)

7. Acesse seu projeto Pão de Ribamar no Vercel
8. Vá em **Settings** → **General**
9. Copie o **Project ID** (este é seu VERCEL_PROJECT_ID)

---

## ✅ Passo 3: Adicionar Secrets no GitHub

1. Acesse seu repositório: https://github.com/viniciussilva1-rgb/P-o-de-Ribamar-APP
2. Clique em **Settings** (engrenagem no topo)
3. Vá para **"Secrets and variables"** → **"Actions"**
4. Clique em **"New repository secret"**

**Adicione CADA UM desses secrets:**

### Firebase Secrets (COPIE EXATAMENTE):

| Secret Name | Value |
|---|---|
| VITE_FIREBASE_API_KEY | AIzaSyAYZ4pAafJM6EyPk6YcxqAnrCasI0YKN-A |
| VITE_FIREBASE_AUTH_DOMAIN | pao-de-ribamar-app.firebaseapp.com |
| VITE_FIREBASE_PROJECT_ID | pao-de-ribamar-app |
| VITE_FIREBASE_STORAGE_BUCKET | pao-de-ribamar-app.appspot.com |
| VITE_FIREBASE_MESSAGING_SENDER_ID | 222485362806 |
| VITE_FIREBASE_APP_ID | 1:222485362806:web:1c6dcef46dedf5ef394757 |

### Vercel Secrets (USE OS VALORES QUE VOCÊ COPIOU):

| Secret Name | Value |
|---|---|
| VERCEL_TOKEN | [Cole o token que você gerou] |
| VERCEL_ORG_ID | [Cole seu User/Team ID] |
| VERCEL_PROJECT_ID | [Cole o ID do projeto] |

### API Secrets (Opcional):

| Secret Name | Value |
|---|---|
| GEMINI_API_KEY | [Sua chave da API Gemini, se tiver] |

---

## ✅ Passo 4: Disparar o Deploy

Após adicionar todos os secrets:

```bash
git commit --allow-empty -m "trigger: github secrets configured"
git push origin main
```

Ou abra a pasta do projeto no GitHub (Actions) e veja o workflow rodando.

---

## ✅ Passo 5: Verificar o Deploy

1. Acesse **GitHub → Actions**
2. Veja o workflow "Deploy para Vercel" rodando
3. Aguarde completar (2-3 minutos)
4. Abra https://padariaribamar.pt

**Pronto! Seu app estará 100% funcional! 🎉**

Se aparecer a tela de login → **SUCESSO!** ✅

---

## 🆘 Se não funcionar:

Abra o DevTools (F12) em https://padariaribamar.pt e vá na aba **Console**:
- Se ver erros do Firebase → Um dos secrets está errado
- Se estiver limpo → Parabéns! Faça login 🚀

Envie screenshot do console que ajudo a debugar!
