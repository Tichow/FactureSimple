# 🧾 FactureSimple

**Application de facturation moderne, sécurisée et multi-utilisateur**

[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-green.svg)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3+-blue.svg)](https://tailwindcss.com/)

---

## ✨ **Fonctionnalités**

- 🏢 **Profils utilisateur personnalisables** - Chaque utilisateur configure ses données d'entreprise
- 🔐 **Sécurité avancée** - Chiffrement des données sensibles, isolation RLS
- 📱 **Interface responsive** - Compatible mobile, tablette et desktop
- 📄 **Génération PDF** - Factures professionnelles avec logo personnalisé
- 📊 **Historique intelligent** - Suivi des brouillons et factures finalisées
- 🔢 **Numérotation automatique** - Système intelligent de numérotation
- 💾 **Sauvegarde temps réel** - Synchronisation automatique avec Supabase

---

## 🚀 **Installation**

### **Prérequis**
- Node.js 18+
- Compte Supabase (gratuit)
- Git

### **1. Cloner le projet**
```bash
git clone <votre-repo>
cd facture-pro
```

### **2. Installer les dépendances**
```bash
npm install
```

### **3. Configuration Supabase**

1. **Créer un projet** sur [supabase.com](https://supabase.com)
2. **Récupérer vos clés** : Settings → API
3. **Créer `.env.local`** :
```env
REACT_APP_SUPABASE_URL=https://votre-projet.supabase.co
REACT_APP_SUPABASE_ANON_KEY=votre_anon_key
REACT_APP_ENCRYPTION_KEY=votre_clé_de_chiffrement_personnalisée
```

### **4. Configurer la base de données**

1. **Supabase SQL Editor** → New Query
2. **Si erreur `invoice_audit_log`** → Exécuter `REPAIR-URGENCE.sql` d'abord
3. **Exécuter** `debug-supabase.sql` (table invoices)
4. **Exécuter** `user-profiles-setup.sql` (table profils)

### **5. Lancer l'application**
```bash
npm start
```

➡️ **Ouverture automatique** sur `http://localhost:3000`

---

## 👥 **Utilisation**

### **🔐 Inscription/Connexion**
- Accès restreint aux emails autorisés (configurable)
- Système d'authentification sécurisé via Supabase
- Confirmation par email obligatoire

### **⚙️ Configuration du profil**
1. **Premier login** → Clic sur "Paramètres"
2. **Configurer** :
   - 🏢 **Mon Entreprise** : nom, adresse, SIRET, téléphone
   - 👥 **Client par défaut** : informations client récurrent
   - 🛠️ **Services** : prestations habituelles avec prix
3. **Sauvegarder** → Configuration terminée !

### **📄 Créer une facture**
1. **Nouvelle facture** → Données pré-remplies automatiquement
2. **Personnaliser** si nécessaire (sans modifier le profil)
3. **Aperçu** → Vérification avant génération
4. **Télécharger PDF** ou **Finaliser** la facture

### **📊 Gestion**
- **Historique** : Toutes vos factures (brouillons + finalisées)
- **Recherche** : Par numéro, client, montant
- **Réutilisation** : Charger une ancienne facture comme modèle

---

## 🔒 **Sécurité**

### **🛡️ Protection des données**
- **Chiffrement client** : Données sensibles chiffrées avant envoi
- **RLS Supabase** : Isolation totale entre utilisateurs
- **Pas de données en dur** : Code source 100% anonyme
- **HTTPS obligatoire** : Communications sécurisées

### **🔐 Données chiffrées**
- Noms et adresses d'entreprise
- Téléphones et SIRET
- Informations clients sensibles

### **👁️ Données en clair** (non sensibles)
- Articles et descriptions
- Prix et quantités
- Dates et conditions de paiement

---

## 🏗️ **Architecture**

### **Frontend**
- **React 18** + **TypeScript** + **Tailwind CSS**
- **jsPDF** pour la génération de PDF
- **Lucide React** pour les icônes

### **Backend**
- **Supabase** (PostgreSQL + Auth + RLS)
- **Tables** : `invoices`, `user_profiles`
- **Chiffrement** : XOR + Base64 (upgradeable)

### **Structure du projet**
```
facture-pro/
├── src/
│   └── App.tsx                    # Application complète
├── public/
│   ├── index.html                 # jsPDF CDN
│   └── logo.png                   # Logo personnalisable
├── debug-supabase.sql             # Setup table invoices
├── user-profiles-setup.sql        # Setup table profils
└── README.md                      # Ce fichier
```

---

## 🔧 **Configuration avancée**

### **🎨 Personnalisation du logo**
Remplacez `public/logo.png` par votre logo (recommandé : 200x200px, PNG/JPG)

### **📧 Emails autorisés**
Modifiez dans `App.tsx` :
```typescript
const allowedEmails = [
  'votre@email.com',
  'autre@email.com'
];
```

### **🎯 Numérotation des factures**
Format actuel : `AAAA-MM-NNNN` (Année-Mois-Numéro)
- Commence à 12 (configurable)
- Détection automatique des conflits
- Gestion des brouillons

### **💰 Devise et formats**
- Euro (€) par défaut
- Format français (DD/MM/AAAA)
- Décimales : 2 chiffres

---

## 🚀 **Déploiement**

### **Vercel (recommandé)**
```bash
npm run build
vercel --prod
```

### **Netlify**
```bash
npm run build
# Glisser-déposer le dossier build/
```

### **Variables d'environnement**
N'oubliez pas de configurer vos variables sur la plateforme :
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`  
- `REACT_APP_ENCRYPTION_KEY`

---

## 🐛 **Dépannage**

### **🚨 "Erreur technique: new row violates row-level security policy for table invoice_audit_log"**
➡️ **SOLUTION URGENTE** : Exécutez `REPAIR-URGENCE.sql` dans Supabase SQL Editor

### **"Mode démo actif"**
➡️ Vérifiez votre fichier `.env.local` et redémarrez (`npm start`)

### **"Table inexistante"**
➡️ Exécutez les scripts SQL dans Supabase SQL Editor

### **Erreur de sauvegarde**
➡️ Utilisez le bouton "Debug DB" dans l'application

### **PDF non généré**
➡️ Vérifiez que jsPDF est chargé dans `public/index.html`

---

## 📚 **Documentation complète**

- 📖 **[Guide des profils utilisateur](GUIDE-PROFILS-UTILISATEUR.md)** - Configuration et utilisation
- 🔧 **[Script de debug Supabase](debug-supabase.sql)** - Réparation des tables
- 👤 **[Configuration des profils](user-profiles-setup.sql)** - Setup avancé

---

## 🤝 **Contribution**

1. **Fork** le projet
2. **Créez** votre branche (`git checkout -b feature/ma-fonctionnalite`)
3. **Committez** (`git commit -m 'Ajout: ma fonctionnalité'`)
4. **Poussez** (`git push origin feature/ma-fonctionnalite`)
5. **Ouvrez** une Pull Request

---

## 📄 **Licence**

Ce projet est sous licence MIT. Voir `LICENSE` pour plus de détails.

---

## 💡 **Support**

- 🐛 **Bugs** : Ouvrez une issue GitHub
- 💬 **Questions** : Utilisez les discussions GitHub
- 📧 **Contact** : [Votre email de contact]

---

**🎉 Fait avec ❤️ pour simplifier la facturation !**
