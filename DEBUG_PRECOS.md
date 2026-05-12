# 🔍 Guia de Debug - Preços Revertendo

## Problema: Preços voltam aos valores originais

Se os preços reverteram depois da atualização, siga estes passos:

### 1. Verificar os Logs do Console (F12)

Abra a aplicação e pressione **F12** para abrir o console. Procure por mensagens com `[PRODUCTS]` e `[SEED]`:

```
[PRODUCTS] Recebido snapshot com 25 produtos
[PRODUCTS] ✓ Carregando produtos do Firestore
```

Se vir:
```
[SEED] Tentativa X: Nenhum produto encontrado. Iniciando seed...
[SEED] ✓ Seed concluído com sucesso...
```

**Significa que o seed foi disparado e pode ter sobrescrito os preços!**

### 2. Verificar se há Erros

Procure no console por mensagens vermelhas começadas com `[SEED] ✗`:

```
[SEED] ✗ Erro ao fazer seed (Tentativa X): ...
```

Se houver, anote o erro e reporte ao desenvolvedor.

### 3. Verificar o Firestore Diretamente

1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto "pao-de-ribamar"
3. Vá para **Firestore Database**
4. Abra a coleção **products**
5. Procure por um produto (ex: "Bolinha" - id: "1")
6. Verifique o valor de `price`

**Comparar com:**
- O valor que você viu na aplicação (deve ser igual)
- Os valores em `INITIAL_PRODUCTS` em `constants.ts` (devem ser diferentes se atualizou)

### 4. Verificar se está Atualizando Corretamente

Quando você edita um preço na aplicação:

1. Na console (F12), procure por:
```
[PRODUCTS] Recebido snapshot com 25 produtos
[PRODUCTS] ✓ Carregando produtos do Firestore
```

O novo preço deve aparecer instantaneamente.

### 5. Teste de Permanência

1. Atualize um preço (ex: Bolinha de €0.25 para €0.99)
2. **Recarregue a página** (Ctrl+F5 ou Cmd+R)
3. Verifique se o preço € 0.99 aparece
4. **Aguarde 2-5 minutos**
5. **Recarregue novamente**
6. Verifique se ainda está € 0.99

### 6. Se o Problema Persistir

Anote e reporte:
- ✅ Horário em que começou
- ✅ Último preço atualizado
- ✅ Se tem acesso ao console (F12) para pegar logs
- ✅ Mensagens de erro do console (screenshot ou cópia)
- ✅ Valor que aparece no Firestore Console

---

## 📊 Estrutura de Dados

### Documento de Produto no Firestore
```
/products/{id}
├── id: string (ex: "1")
├── name: string (ex: "Bolinha")
├── category: string (ex: "Panificação")
├── price: number (ex: 0.42) ← O que é importante verificar
├── quantity: number
├── targetQuantity: number
├── unit: string
└── supportsEmpelo: boolean
```

### Constantes Originais (constants.ts)
Se você viu um preço diferente do original, ele foi atualizado com sucesso!

---

## 🔧 O que foi Corrigido

### Antes (Problema)
```typescript
batch.set(doc(db, 'products', p.id), p);
// ❌ Sobrescreve TUDO, incluindo preços atualizados
```

### Depois (Corrigido)
```typescript
batch.set(doc(db, 'products', p.id), p, { merge: true });
// ✅ Preserva campos existentes que não estão em INITIAL_PRODUCTS
```

---

## 📝 Dados Atualizados em 12 de Maio

Salve estes valores para comparação:

| Produto | Novo Preço | Original |
|---------|-----------|----------|
| Bolinha | € 0.42 | € 0.25 |
| Pão de milho | € 1.35 | € 0.45 |
| Pão de forma | € 2.08 | € 1.50 |
| Pão com chouriço | € 1.40 | € 1.20 |
| Mini bolas | € 0.32 | € 0.15 |
| Integrais | € 0.40 | € 0.40 |
| Viana | € 0.32 | € 0.80 |
| Pão de trigo | € 1.35 | € 0.30 |
| Papo Seco | € 0.32 | € 0.30 |
| Cassete | € 1.35 | € 0.35 |
| Pão pequeno | € 1.00 | € 0.25 |

---

## ⚠️ Se Reverteu Novamente

Isso significa que há uma fonte externa modificando os dados. Possíveis causas:

1. **Script de seed automático**: Pode estar rodando e resetando os produtos
2. **Cloud Function não identificada**: Alguma função na backend modificando dados
3. **Problema de merge no Firestore**: Configuração de segurança

Reporte ao desenvolvedor com:
- Screenshots do console (F12)
- Horário exato da reversão
- Se teve mudanças de rede/internet nesse período
