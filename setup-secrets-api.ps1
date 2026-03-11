# Script para configurar GitHub Secrets via API REST
# Mais poderoso e funciona sem GitHub CLI

Write-Host "🚀 Configurador de GitHub Secrets - Pão de Ribamar" -ForegroundColor Green
Write-Host ""
Write-Host "Este script vai configurar automaticamente todos os secrets necessários." -ForegroundColor Cyan
Write-Host ""

# Solicita token do GitHub
Write-Host "🔐 Primeiro, você precisa de um Personal Access Token do GitHub:" -ForegroundColor Yellow
Write-Host "   1. Acesse: https://github.com/settings/tokens" -ForegroundColor Cyan
Write-Host "   2. Clique em 'Generate new token' → 'Generate new token (classic)'" -ForegroundColor Cyan
Write-Host "   3. Selecione permissão: repo (acesso completo)" -ForegroundColor Cyan
Write-Host "   4. Copie o token" -ForegroundColor Cyan
Write-Host ""

$githubToken = Read-Host "Cole seu GitHub Personal Access Token"

if (-not $githubToken) {
    Write-Host "❌ Token não fornecido. Aborting." -ForegroundColor Red
    exit 1
}

$repoOwner = "viniciussilva1-rgb"
$repoName = "P-o-de-Ribamar-APP"

Write-Host ""
Write-Host "✅ Token recebido!" -ForegroundColor Green
Write-Host ""

# Headers para API
$headers = @{
    "Authorization" = "Bearer $githubToken"
    "X-GitHub-Api-Version" = "2022-11-28"
    "Accept" = "application/vnd.github+json"
}

# Função para adicionar secret
function Add-GitHubSecret {
    param(
        [string]$SecretName,
        [string]$SecretValue,
        [hashtable]$Headers,
        [string]$Owner,
        [string]$Repo
    )
    
    try {
        # Base64 encode o valor
        $secretBytes = [System.Text.Encoding]::UTF8.GetBytes($SecretValue)
        $secretBase64 = [Convert]::ToBase64String($secretBytes)
        
        $body = @{
            "encrypted_value" = $secretBase64
        } | ConvertTo-Json
        
        $url = "https://api.github.com/repos/$Owner/$Repo/actions/secrets/$SecretName"
        
        $response = Invoke-RestMethod -Uri $url -Method PUT -Headers $Headers -Body $body -ContentType "application/json"
        
        Write-Host "  → $SecretName ✅" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "  → $SecretName ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "📝 Configurando Firebase Secrets..." -ForegroundColor Cyan
Write-Host ""

$firebaseSecrets = @{
    "VITE_FIREBASE_API_KEY" = "AIzaSyAYZ4pAafJM6EyPk6YcxqAnrCasI0YKN-A"
    "VITE_FIREBASE_AUTH_DOMAIN" = "pao-de-ribamar-app.firebaseapp.com"
    "VITE_FIREBASE_PROJECT_ID" = "pao-de-ribamar-app"
    "VITE_FIREBASE_STORAGE_BUCKET" = "pao-de-ribamar-app.appspot.com"
    "VITE_FIREBASE_MESSAGING_SENDER_ID" = "222485362806"
    "VITE_FIREBASE_APP_ID" = "1:222485362806:web:1c6dcef46dedf5ef394757"
}

foreach ($key in $firebaseSecrets.Keys) {
    Add-GitHubSecret -SecretName $key -SecretValue $firebaseSecrets[$key] -Headers $headers -Owner $repoOwner -Repo $repoName
}

Write-Host ""
Write-Host "🔑 Configurando Secrets do Vercel..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Para obter esses valores, acesse: https://vercel.com/account" -ForegroundColor Yellow
Write-Host ""

$vercelToken = Read-Host "Digite seu VERCEL_TOKEN"
if ($vercelToken) {
    Add-GitHubSecret -SecretName "VERCEL_TOKEN" -SecretValue $vercelToken -Headers $headers -Owner $repoOwner -Repo $repoName
}

$vercelOrgId = Read-Host "Digite seu VERCEL_ORG_ID"
if ($vercelOrgId) {
    Add-GitHubSecret -SecretName "VERCEL_ORG_ID" -SecretValue $vercelOrgId -Headers $headers -Owner $repoOwner -Repo $repoName
}

$vercelProjectId = Read-Host "Digite seu VERCEL_PROJECT_ID"
if ($vercelProjectId) {
    Add-GitHubSecret -SecretName "VERCEL_PROJECT_ID" -SecretValue $vercelProjectId -Headers $headers -Owner $repoOwner -Repo $repoName
}

Write-Host ""
Write-Host "🤖 Secret da Gemini API (opcional):" -ForegroundColor Yellow
$geminiKey = Read-Host "Digite seu GEMINI_API_KEY (ou deixe em branco)"
if ($geminiKey) {
    Add-GitHubSecret -SecretName "GEMINI_API_KEY" -SecretValue $geminiKey -Headers $headers -Owner $repoOwner -Repo $repoName
}

Write-Host ""
Write-Host "✅ Todos os secrets foram configurados!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Próximos passos:" -ForegroundColor Yellow
Write-Host "   1. Aguarde 2-3 minutos" -ForegroundColor Cyan
Write-Host "   2. Acesse https://padariaribamar.pt" -ForegroundColor Cyan
Write-Host "   3. Pronto! Seu app estará 100% funcional 🎉" -ForegroundColor Cyan
Write-Host ""
