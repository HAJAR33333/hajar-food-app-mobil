# 🍔 FoodieSpot Mock Backend

Backend API mock pour l'application FoodieSpot - Cours React Native ESTIAM E4.

## 🚀 Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Lancer le serveur
npm start

# Ou en mode développement (auto-reload)
npm run dev
```

Le serveur démarre sur `http://localhost:4000`

## 📡 Endpoints API

### 🔐 Authentification

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/auth/register` | Inscription | ❌ |
| POST | `/auth/login` | Connexion | ❌ |
| POST | `/auth/refresh` | Rafraîchir le token | ❌ |
| POST | `/auth/logout` | Déconnexion | ✅ |
| POST | `/auth/forgot-password` | Mot de passe oublié | ❌ |

### 👤 Utilisateur

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/users/profile` | Profil utilisateur | ✅ |
| PUT | `/users/profile` | Modifier profil | ✅ |
| POST | `/users/avatar` | Upload avatar | ✅ |
| GET | `/users/addresses` | Liste adresses | ✅ |
| POST | `/users/addresses` | Ajouter adresse | ✅ |
| DELETE | `/users/addresses/:id` | Supprimer adresse | ✅ |

### 🍽️ Restaurants

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/categories` | Liste catégories | ❌ |
| GET | `/restaurants` | Liste restaurants | ❌* |
| GET | `/restaurants/nearby` | Restaurants proches | ❌* |
| GET | `/restaurants/:id` | Détail restaurant | ❌* |
| GET | `/restaurants/:id/menu` | Menu du restaurant | ❌ |
| GET | `/restaurants/:id/reviews` | Avis du restaurant | ❌ |

*Auth optionnelle pour afficher les favoris

### ❤️ Favoris

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/favorites` | Liste favoris | ✅ |
| POST | `/favorites` | Ajouter favori | ✅ |
| DELETE | `/favorites/:restaurantId` | Retirer favori | ✅ |

### 🛒 Commandes

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/orders` | Historique commandes | ✅ |
| GET | `/orders/:id` | Détail commande | ✅ |
| POST | `/orders` | Créer commande | ✅ |
| POST | `/orders/:id/cancel` | Annuler commande | ✅ |
| POST | `/cart/validate` | Valider panier | ✅ |

### ⭐ Avis

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/reviews` | Créer un avis (+ images) | ✅ |

### 📤 Upload

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/uploads` | Upload fichier | ✅ |

### 🔔 Notifications

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/notifications/register-token` | Enregistrer token push | ✅ |
| GET | `/notifications` | Liste notifications | ✅ |

### 🎟️ Promotions

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/promos/validate` | Valider code promo | ✅ |

## 📝 Exemples de requêtes

### Inscription
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456","firstName":"John","lastName":"Doe"}'
```

### Connexion
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

### Liste des restaurants
```bash
curl http://localhost:4000/restaurants
```

### Restaurants par catégorie
```bash
curl "http://localhost:4000/restaurants?category=pizza"
```

### Restaurants à proximité
```bash
curl "http://localhost:4000/restaurants/nearby?lat=48.8566&lng=2.3522&radius=5"
```

### Créer une commande (avec token)
```bash
curl -X POST http://localhost:4000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "restaurantId": "rest-001",
    "items": [{"menuItemId": "item-001", "quantity": 2}],
    "deliveryAddress": {"street": "123 Rue Test", "city": "Paris", "postalCode": "75001"},
    "paymentMethod": "card"
  }'
```

## 🎯 Codes promo disponibles

| Code | Réduction | Commande min |
|------|-----------|--------------|
| `BIENVENUE30` | 30% (max 15€) | 20€ |
| `FOODIE10` | 10% (max 10€) | 15€ |
| `LIVRAISON` | Livraison gratuite | 25€ |

## 📂 Structure des données

```
data/
├── restaurants.json   # Liste des restaurants
├── menus.json         # Menus par restaurant
├── categories.json    # Catégories
├── users.json         # Utilisateurs
├── orders.json        # Commandes
├── reviews.json       # Avis
├── favorites.json     # Favoris par user
└── push-tokens.json   # Tokens push
```

## 🔧 Configuration

Variables d'environnement (.env):

```env
PORT=4000
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d
```

## 🎓 Pour les étudiants

Ce backend est conçu pour le cours React Native. Il simule:
- Authentification JWT complète
- CRUD restaurants/commandes
- Upload de fichiers
- Progression automatique des commandes
- Géolocalisation (calcul de distance)

**Note:** En production, utilisez bcrypt pour hasher les mots de passe et une vraie base de données!

---
*ESTIAM E4 - React Native / FoodieSpot*
