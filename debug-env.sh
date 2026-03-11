#!/bin/bash

echo "Verificando build..."
echo "Variáveis de ambiente no build:"
echo "VITE_FIREBASE_API_KEY: ${VITE_FIREBASE_API_KEY:0:10}..."
echo "VITE_FIREBASE_AUTH_DOMAIN: $VITE_FIREBASE_AUTH_DOMAIN"
echo "VITE_FIREBASE_PROJECT_ID: $VITE_FIREBASE_PROJECT_ID"
