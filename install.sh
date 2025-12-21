#!/bin/bash

echo "🚀 Installation de la Plateforme Chatbot..."
echo ""

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé. Installez Node.js 18+ d'abord.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node --version) détecté${NC}"
echo ""

# Installer les dépendances du projet racine
echo -e "${BLUE}📦 Installation des dépendances racine...${NC}"
npm install

# Installer les dépendances du backend
echo -e "${BLUE}📦 Installation des dépendances backend...${NC}"
cd backend
npm install
cd ..

# Installer les dépendances du frontend
echo -e "${BLUE}📦 Installation des dépendances frontend...${NC}"
cd frontend
npm install
cd ..

# Installer les dépendances du widget
echo -e "${BLUE}📦 Installation des dépendances widget...${NC}"
cd widget
npm install
cd ..

# Créer le dossier data
echo -e "${BLUE}📁 Création du dossier data...${NC}"
mkdir -p backend/data

# Compiler le widget
echo -e "${BLUE}🔨 Compilation du widget...${NC}"
cd widget
npm run build
cd ..

echo ""
echo -e "${GREEN}✅ Installation terminée avec succès!${NC}"
echo ""
echo -e "${BLUE}Pour démarrer la plateforme :${NC}"
echo -e "  ${GREEN}npm run dev${NC}         # Démarre tout (backend + frontend)"
echo ""
echo -e "${BLUE}Ou séparément :${NC}"
echo -e "  ${GREEN}cd backend && npm run dev${NC}   # Backend sur http://localhost:3001"
echo -e "  ${GREEN}cd frontend && npm run dev${NC}  # Frontend sur http://localhost:3000"
echo ""
echo -e "${BLUE}📖 Consultez README.md pour plus d'informations${NC}"
