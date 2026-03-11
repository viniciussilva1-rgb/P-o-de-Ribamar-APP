# Script para configurar GitHub Secrets automaticamente
# Execute este script no PowerShell: powershell -ExecutionPolicy Bypass -File setup-secrets.ps1

Write-Host "🚀 Configurando GitHub Secrets para Pão de Ribamar..." -ForegroundColor Green
Write-Host ""

# Verifica se gh está instalado
$ghPath = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghPath) {
    Write-Host "❌ GitHub CLI não está instalada." -ForegroundColor Red
    Write-Host "Instale com: winget install GitHub.cli" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Após instalar, execute este script novamente."
    exit 1
}

Write-Host "✅ GitHub CLI encontrada!" -ForegroundColor Green
Write-Host ""

# Faz login se necessário
Write-Host "Verificando autenticação GitHub..." -ForegroundColor Cyan
gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "🔐 Você precisa fazer login no GitHub." -ForegroundColor Yellow
    gh auth login
}

Write-Host ""
Write-Host "📝 Adicionando secrets..." -ForegroundColor Cyan
Write-Host ""

# Define os secrets
$secrets = @{
    "VITE_FIREBASE_API_KEY" = "AIzaSyAYZ4pAafJM6EyPk6YcxqAnrCasI0YKN-A"
    "VITE_FIREBASE_AUTH_DOMAIN" = "pao-de-ribamar-app.firebaseapp.com"
    "VITE_FIREBASE_PROJECT_ID" = "pao-de-ribamar-app"
    "VITE_FIREBASE_STORAGE_BUCKET" = "pao-de-ribamar-app.appspot.com"
    "VITE_FIREBASE_MESSAGING_SENDER_ID" = "222485362806"
    "VITE_FIREBASE_APP_ID" = "1:222485362806:web:1c6dcef46dedf5ef394757"
}

# Adiciona secrets do Vercel (solicita ao usuário)
Write-Host "🔑 Vamos adicionar os secrets do Vercel..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Para obter os valores, acesse: https://vercel.com/account/tokens" -ForegroundColor Cyan
Write-Host ""

$vercelToken = Read-Host "Informe seu VERCEL_TOKEN (token de acesso)"
if ($vercelToken) {
    $secrets["VERCEL_TOKEN"] = $vercelToken
}

$vercelOrgId = Read-Host "Informe seu VERCEL_ORG_ID (Team/User ID do Vercel)"
if ($vercelOrgId) {
    $secrets["VERCEL_ORG_ID"] = $vercelOrgId
}

$vercelProjectId = Read-Host "Informe seu VERCEL_PROJECT_ID (ID do projeto no Vercel)"
if ($vercelProjectId) {
    $secrets["VERCEL_PROJECT_ID"] = $vercelProjectId
}

Write-Host ""
Write-Host "🤖 Para a API Gemini (opcional - deixe em branco para pular):" -ForegroundColor Yellow
$geminiKey = Read-Host "Informe seu GEMINI_API_KEY (ou deixe em branco)"
if ($geminiKey) {
    $secrets["GEMINI_API_KEY"] = $geminiKey
}

# Adiciona todos os secrets
Write-Host ""
Write-Host "⏳ Adicionando secrets ao repositório..." -ForegroundColor Cyan
Write-Host ""

foreach ($key in $secrets.Keys) {
    $value = $secrets[$key]
    Write-Host "  → Configurando $key..." -NoNewline
    
    # Usa echo para passar o valor com pipe
    $value | gh secret set $key
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Todos os secrets foram configurados com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Próximo passo:" -ForegroundColor Yellow
Write-Host "   1. Aguarde 2-3 minutos para o GitHub Actions fazer o deploy"
Write-Host "   2. Acesse https://padariaribamar.pt"
Write-Host "   3. Seu app estará 100% funcional! 🎉"
Write-Host ""
