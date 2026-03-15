# 🍔 FoodieSpot Mock Backend

Bienvenue dans l'envers du décor de **FoodieSpot** ! 👋
Ce projet est un faux backend (mock API) conçu avec amour pour vous accompagner tout au long du cours React Native à l'ESTIAM (E4). Son but ? Vous permettre de développer l'application mobile sans vous soucier de coder un vrai serveur en parallèle. Tout est déjà prêt pour vous ! 🚀

---

## 🚀 Prêt à démarrer ?

C'est super simple de lancer la machine. Suivez le guide :

```bash
# 1. On installe les dépendances (le classique)
npm install

# 2. On configure l'environnement (une petite copie suffit !)
cp .env.example .env

# 3. Et on allume les fourneaux ! (Port 4000 par défaut)
npm start

# 💡 Astuce de pro : Si vous voulez que le serveur redémarre tout seul à chaque modification :
npm run dev
```

Une fois lancé, votre beau serveur local vous attend sagement sur `http://localhost:4000`. 🎉

---

## 📡 Le Menu (Endpoints API)

Voici toutes les routes que vous pouvez utiliser dans votre application React Native. Servez-vous !

### 🔐 Authentification & Sécurité

La base de la base. Pour que vos utilisateurs puissent se connecter à leur compte.

| Méthode | Endpoint | Ce que ça fait | Auth Requise ? |
|---------|----------|----------------|----------------|
| POST | `/auth/register` | Créer un compte tout neuf | ❌ |
| POST | `/auth/login` | Se connecter | ❌ |
| POST | `/auth/refresh` | Obtenir un nouveau token tout frais | ❌ |
| POST | `/auth/logout` | Se déconnecter (au revoir !) | ✅ |
| POST | `/auth/forgot-password` | Oups, j'ai oublié mon mot de passe | ❌ |

### 👤 Gestion du Profil

Parce que chaque utilisateur est unique.

| Méthode | Endpoint | Ce que ça fait | Auth Requise ? |
|---------|----------|----------------|----------------|
| GET | `/users/profile` | Récupérer les infos du profil | ✅ |
| PUT | `/users/profile` | Mettre à jour ses petites infos | ✅ |
| POST | `/users/avatar` | Changer sa photo de profil | ✅ |
| GET | `/users/addresses` | Consulter son carnet d'adresses | ✅ |
| POST | `/users/addresses` | Ajouter une nouvelle adresse | ✅ |
| DELETE | `/users/addresses/:id` | Oups, je n'habite plus ici | ✅ |

### 🍽️ Les Restaurants

C'est quand même le cœur du projet, non ?

| Méthode | Endpoint | Ce que ça fait | Auth Requise ? |
|---------|----------|----------------|----------------|
| GET | `/categories` | Voir les styles de cuisine | ❌ |
| GET | `/restaurants` | Lister tous les restos | ❌* |
| GET | `/restaurants/nearby` | Trouver ce qu'il y a autour de moi | ❌* |
| GET | `/restaurants/:id` | Voir la fiche d'un resto | ❌* |
| GET | `/restaurants/:id/menu` | Miam, qu'est-ce qu'on mange ? | ❌ |
| GET | `/restaurants/:id/reviews` | Ce que les autres en pensent | ❌ |

*(L'authentification est optionnelle ici, mais si vous l'envoyez, le serveur inclura l'info pour savoir si le resto est dans les favoris de l'utilisateur !)*

### ❤️ Les Favoris

Pour garder les bonnes adresses sous le coude.

| Méthode | Endpoint | Ce que ça fait | Auth Requise ? |
|---------|----------|----------------|----------------|
| GET | `/favorites` | Voir mes restos préférés | ✅ |
| POST | `/favorites` | Ajouter un gros coup de cœur | ✅ |
| DELETE | `/favorites/:restaurantId` | Retirer des favoris | ✅ |

### 🛒 Commandes & Panier

Passons aux choses sérieuses : commander à manger !

| Méthode | Endpoint | Ce que ça fait | Auth Requise ? |
|---------|----------|----------------|----------------|
| GET | `/orders` | L'historique de mes commandes | ✅ |
| GET | `/orders/:id` | Le détail d'une commande précise | ✅ |
| POST | `/orders` | Confirmer une nouvelle commande | ✅ |
| POST | `/orders/:id/cancel` | Finalement, j'ai changé d'avis... | ✅ |
| POST | `/cart/validate` | Vérifier que mon panier est valide | ✅ |

### ⭐ Laisser un Avis

| Méthode | Endpoint | Ce que ça fait | Auth Requise ? |
|---------|----------|----------------|----------------|
| POST | `/reviews` | Partager son expérience (+ photos !) | ✅ |

### 📤 Upload

| Méthode | Endpoint | Ce que ça fait | Auth Requise ? |
|---------|----------|----------------|----------------|
| POST | `/uploads` | Uploader un fichier sur le serveur | ✅ |

### 🔔 Notifications Push

| Méthode | Endpoint | Ce que ça fait | Auth Requise ? |
|---------|----------|----------------|----------------|
| POST | `/notifications/register-token` | Lier le téléphone pour les alertes | ✅ |
| GET | `/notifications` | Voir l'historique des notifications | ✅ |

### 🎟️ Codes Promos

| Méthode | Endpoint | Ce que ça fait | Auth Requise ? |
|---------|----------|----------------|----------------|
| POST | `/promos/validate` | Vérifier si un code est bon | ✅ |

---

## 📝 Exemples rapides avec cURL

Parfois, un bon exemple vaut mieux qu'un long discours. Voici quelques requêtes pour tester l'API directement depuis votre terminal !

**Créer un compte :**
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456","firstName":"John","lastName":"Doe"}'
```

**Se connecter :**
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

**Voir ce qu'il y a de bon à manger :**
```bash
curl http://localhost:4000/restaurants
```

**Filtrer par catégorie (ex: pizza) :**
```bash
curl "http://localhost:4000/restaurants?category=pizza"
```

**Trouver un resto près de chez moi (avec coordonnées GPS) :**
```bash
curl "http://localhost:4000/restaurants/nearby?lat=48.8566&lng=2.3522&radius=5"
```

**Passer commande (n'oubliez pas votre Token JWT !) :**
```bash
curl -X POST http://localhost:4000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI" \
  -d '{
    "restaurantId": "rest-001",
    "items": [{"menuItemId": "item-001", "quantity": 2}],
    "deliveryAddress": {"street": "123 Rue Test", "city": "Paris", "postalCode": "75001"},
    "paymentMethod": "card"
  }'
```

---

## 🎯 Petits cadeaux : Les Codes Promos

Testez votre logique de panier avec ces codes promo fonctionnels :

| Code Secret | Ce que ça vous fait gagner | À partir de... |
|-------------|----------------------------|----------------|
| `BIENVENUE30` | 30% de réduction (jusqu'à 15€) | 20€ d'achat |
| `FOODIE10` | 10% de réduction (jusqu'à 10€) | 15€ d'achat |
| `LIVRAISON` | Les frais de port offerts ! | 25€ d'achat |

---

## 📂 Où sont rangées les "fausses" bases de données ?

Puisque c'est un mock, il n'y a pas de vraie base de données comme MySQL ou MongoDB. Tout est stocké dans de simples fichiers JSON dans le dossier `data/`. Vous pouvez aller jeter un œil, voire modifier des trucs à la main si besoin ! 👀

```text
data/
├── restaurants.json   # Tous les restaurants
├── menus.json         # Les plats proposés par chaque resto
├── categories.json    # Les catégories de cuisine
├── users.json         # Les comptes utilisateurs inscrits
├── orders.json        # L'historique des commandes
├── reviews.json       # Les avis laissés
├── favorites.json     # Qui a liké quoi
└── push-tokens.json   # Les tokens pour les notifications
```

---

## 🔧 Configuration (le fichier .env)

Si jamais vous voulez bidouiller sous le capot, voici ce que vous pouvez régler dans votre `.env` :

```env
PORT=4000
JWT_SECRET=ceci-est-votre-super-secret-key-personne-ne-doit-le-savoir
JWT_REFRESH_SECRET=encore-plus-secret-pour-rafraichir-le-token
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d
```

---

## 🎓 Un petit mot pour les étudiants

Bravo d'être arrivé(e) jusqu'ici ! 👏 
Gardez bien en tête que ce backend est une **simulation** expressément conçue pour vous faciliter la vie côté frontend (React Native). 

Il simule plein de choses super sympas pour votre TP :
- 🔐 Un vrai flux JWT (tokens qui expirent, rafraîchissement)
- 📝 De la création et de l'édition de données (CRUD)
- 🖼️ Le téléchargement d'images
- 🚚 Une simulation de progression de commande (en cours, prête, livrée...)
- 📍 Des calculs de distance pour la géolocalisation

**⚠️ Attention ⚠️**
*Ne mettez jamais ce code en production tel quel sur un vrai projet d'entreprise ! Dans la vraie vie, il faut hacher les mots de passe (avec `bcrypt` par exemple), utiliser une vraie base de données sécurisée, et valider les données beaucoup plus strictement.*

Amusez-vous bien avec FoodieSpot, bon courage pour vos developpements et **bon code !** 💻✨

---
*Réalisé pour ESTIAM E4 - Module React Native / Projet FoodieSpot*
