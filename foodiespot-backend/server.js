import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===========================================
// Configuration
// ===========================================
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || "development";
const JWT_SECRET = process.env.JWT_SECRET || "foodiespot-super-secret-jwt-key-change-in-production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "foodiespot-super-secret-refresh-key-change-in-production";
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "1h";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";

const UPLOADS_DIR = process.env.UPLOADS_DIR 
  ? path.resolve(__dirname, process.env.UPLOADS_DIR) 
  : path.join(__dirname, "uploads");
const DATA_DIR = process.env.DATA_DIR 
  ? path.resolve(__dirname, process.env.DATA_DIR) 
  : path.join(__dirname, "data");

// Créer les dossiers s'ils n'existent pas
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ===========================================
// Database helpers (JSON files)
// ===========================================
function loadJSON(filename) {
  try {
    const filepath = path.join(DATA_DIR, filename);
    const raw = fs.readFileSync(filepath, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`No ${filename} found, starting with empty data.`);
    return filename === "menus.json" ? {} : [];
  }
}

function saveJSON(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf8");
}

// Charger les données
let restaurants = loadJSON("restaurants.json");
let menus = loadJSON("menus.json");
let categories = loadJSON("categories.json");
let users = loadJSON("users.json");
let orders = loadJSON("orders.json");
let reviews = loadJSON("reviews.json") || [];
let favorites = loadJSON("favorites.json") || {};
let pushTokens = loadJSON("push-tokens.json") || {};

// ===========================================
// Express App Setup
// ===========================================
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));

// Multer pour upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

// ===========================================
// Middleware - Authentication
// ===========================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Token d'accès requis" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Token invalide ou expiré" });
    }
    req.user = decoded;
    next();
  });
};

// Middleware optionnel (ne bloque pas si pas de token)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err) {
        req.user = decoded;
      }
    });
  }
  next();
};

// ===========================================
// Helper functions
// ===========================================
function generateTokens(user) {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// ===========================================
// Routes - Health Check
// ===========================================
app.get("/health", (req, res) => {
  res.json({ 
    ok: true, 
    status: "ok",
    service: "FoodieSpot API", 
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    ts: Date.now() 
  });
});

// ===========================================
// Routes - Authentication (Module 08)
// ===========================================
app.post("/auth/register", (req, res) => {
  const { email, password, firstName, lastName, phone } = req.body || {};

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ 
      success: false, 
      message: "Email, mot de passe, prénom et nom sont requis" 
    });
  }

  // Vérifier si l'email existe déjà
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({ success: false, message: "Cet email est déjà utilisé" });
  }

  const newUser = {
    id: uuidv4(),
    email,
    password, // En prod: hasher avec bcrypt!
    firstName,
    lastName,
    phone: phone || "",
    avatar: "",
    addresses: [],
    notificationsEnabled: true,
    preferences: {
      theme: "system",
      language: "fr"
    },
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveJSON("users.json", users);

  const { password: _, ...userWithoutPassword } = newUser;
  const tokens = generateTokens(newUser);

  res.status(201).json({
    success: true,
    data: {
      user: userWithoutPassword,
      token: tokens.accessToken,
      ...tokens,
      expiresIn: 3600
    }
  });
});

app.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email et mot de passe requis" });
  }

  // Pour le mock: on accepte tout ou on vérifie dans users.json
  let user = users.find(u => u.email === email);
  
  if (!user) {
    // Créer un utilisateur mock si n'existe pas
    user = {
      id: uuidv4(),
      email,
      firstName: email.split("@")[0],
      lastName: "Demo",
      phone: "",
      avatar: "",
      addresses: [
        {
          id: uuidv4(),
          label: "Maison",
          street: "123 Rue de Paris",
          city: "Paris",
          postalCode: "75001",
          country: "France",
          latitude: 48.8566,
          longitude: 2.3522,
          isDefault: true
        }
      ],
      notificationsEnabled: true,
      preferences: {
        theme: "system",
        language: "fr"
      },
      createdAt: new Date().toISOString()
    };
    users.push({ ...user, password });
    saveJSON("users.json", users);
  }

  const { password: _, ...userWithoutPassword } = user;
  const tokens = generateTokens(user);

  // Format compatible avec le frontend (user + token à la racine de data)
  res.json({
    success: true,
    data: {
      user: userWithoutPassword,
      token: tokens.accessToken,
      ...tokens,
      expiresIn: 3600
    }
  });
});

app.post("/auth/refresh", (req, res) => {
  const { refreshToken } = req.body || {};

  if (!refreshToken) {
    return res.status(400).json({ success: false, message: "Refresh token requis" });
  }

  jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Refresh token invalide" });
    }

    const accessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    res.json({
      success: true,
      data: { accessToken, expiresIn: 3600 }
    });
  });
});

app.post("/auth/logout", authenticateToken, (req, res) => {
  // En prod: invalider le refresh token
  res.json({ success: true, message: "Déconnexion réussie" });
});

app.post("/auth/forgot-password", (req, res) => {
  const { email } = req.body || {};
  // Mock: toujours succès
  res.json({ success: true, message: "Email de récupération envoyé" });
});

// ===========================================
// Routes - User Profile
// ===========================================
app.get("/users/profile", authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
  }
  const { password: _, ...userWithoutPassword } = user;
  res.json({ success: true, data: userWithoutPassword });
});

app.put("/users/profile", authenticateToken, (req, res) => {
  const { firstName, lastName, phone } = req.body || {};
  const userIndex = users.findIndex(u => u.id === req.user.userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
  }

  if (firstName) users[userIndex].firstName = firstName;
  if (lastName) users[userIndex].lastName = lastName;
  if (phone !== undefined) users[userIndex].phone = phone;

  saveJSON("users.json", users);

  const { password: _, ...userWithoutPassword } = users[userIndex];
  res.json({ success: true, data: userWithoutPassword });
});

app.post("/users/avatar", authenticateToken, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Aucun fichier uploadé" });
  }

  const userIndex = users.findIndex(u => u.id === req.user.userId);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
  }

  const avatarUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  users[userIndex].avatar = avatarUrl;
  saveJSON("users.json", users);

  res.json({ success: true, data: { url: avatarUrl } });
});

// ===========================================
// Routes - User Preferences (A - Dark Mode)
// ===========================================
app.get("/users/preferences", authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
  }
  
  res.json({
    success: true,
    data: {
      theme: user.preferences?.theme || "system",
      notificationsEnabled: user.notificationsEnabled ?? true,
      language: user.preferences?.language || "fr",
      soundEnabled: user.preferences?.soundEnabled ?? true,
      vibrationEnabled: user.preferences?.vibrationEnabled ?? true
    }
  });
});

app.patch("/users/preferences", authenticateToken, (req, res) => {
  const { theme, notificationsEnabled, language, soundEnabled, vibrationEnabled } = req.body;
  const userIndex = users.findIndex(u => u.id === req.user.userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
  }

  if (!users[userIndex].preferences) {
    users[userIndex].preferences = {};
  }

  if (theme !== undefined) users[userIndex].preferences.theme = theme;
  if (notificationsEnabled !== undefined) users[userIndex].notificationsEnabled = notificationsEnabled;
  if (language !== undefined) users[userIndex].preferences.language = language;
  if (soundEnabled !== undefined) users[userIndex].preferences.soundEnabled = soundEnabled;
  if (vibrationEnabled !== undefined) users[userIndex].preferences.vibrationEnabled = vibrationEnabled;

  saveJSON("users.json", users);

  res.json({
    success: true,
    data: {
      theme: users[userIndex].preferences.theme || "system",
      notificationsEnabled: users[userIndex].notificationsEnabled,
      language: users[userIndex].preferences.language || "fr",
      soundEnabled: users[userIndex].preferences.soundEnabled ?? true,
      vibrationEnabled: users[userIndex].preferences.vibrationEnabled ?? true
    }
  });
});

// ===========================================
// Routes - Addresses (I - Gestion des adresses)
// ===========================================
app.get("/users/addresses", authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
  }
  res.json({ success: true, data: user.addresses || [] });
});

app.post("/users/addresses", authenticateToken, (req, res) => {
  const { label, street, apartment, city, postalCode, country, latitude, longitude, isDefault, instructions } = req.body;
  
  const userIndex = users.findIndex(u => u.id === req.user.userId);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
  }

  const newAddress = {
    id: uuidv4(),
    label: label || "Adresse",
    street,
    apartment,
    city,
    postalCode,
    country: country || "France",
    latitude: latitude || 48.8566,
    longitude: longitude || 2.3522,
    isDefault: isDefault || false,
    instructions,
    createdAt: new Date().toISOString()
  };

  if (newAddress.isDefault) {
    users[userIndex].addresses = users[userIndex].addresses.map(a => ({ ...a, isDefault: false }));
  }

  if (!users[userIndex].addresses) {
    users[userIndex].addresses = [];
  }

  users[userIndex].addresses.push(newAddress);
  saveJSON("users.json", users);

  res.status(201).json({ success: true, data: newAddress });
});

app.put("/users/addresses/:addressId", authenticateToken, (req, res) => {
  const { label, street, apartment, city, postalCode, country, latitude, longitude, isDefault, instructions } = req.body;
  
  const userIndex = users.findIndex(u => u.id === req.user.userId);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
  }

  const addressIndex = users[userIndex].addresses.findIndex(a => a.id === req.params.addressId);
  if (addressIndex === -1) {
    return res.status(404).json({ success: false, message: "Adresse non trouvée" });
  }

  // Si cette adresse devient default, retirer le default des autres
  if (isDefault) {
    users[userIndex].addresses = users[userIndex].addresses.map(a => ({ ...a, isDefault: false }));
  }

  // Mettre à jour l'adresse
  users[userIndex].addresses[addressIndex] = {
    ...users[userIndex].addresses[addressIndex],
    label: label ?? users[userIndex].addresses[addressIndex].label,
    street: street ?? users[userIndex].addresses[addressIndex].street,
    apartment: apartment ?? users[userIndex].addresses[addressIndex].apartment,
    city: city ?? users[userIndex].addresses[addressIndex].city,
    postalCode: postalCode ?? users[userIndex].addresses[addressIndex].postalCode,
    country: country ?? users[userIndex].addresses[addressIndex].country,
    latitude: latitude ?? users[userIndex].addresses[addressIndex].latitude,
    longitude: longitude ?? users[userIndex].addresses[addressIndex].longitude,
    isDefault: isDefault ?? users[userIndex].addresses[addressIndex].isDefault,
    instructions: instructions ?? users[userIndex].addresses[addressIndex].instructions,
    updatedAt: new Date().toISOString()
  };

  saveJSON("users.json", users);

  res.json({ success: true, data: users[userIndex].addresses[addressIndex] });
});

app.delete("/users/addresses/:addressId", authenticateToken, (req, res) => {
  const userIndex = users.findIndex(u => u.id === req.user.userId);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
  }

  const addressExists = users[userIndex].addresses.some(a => a.id === req.params.addressId);
  if (!addressExists) {
    return res.status(404).json({ success: false, message: "Adresse non trouvée" });
  }

  users[userIndex].addresses = users[userIndex].addresses.filter(a => a.id !== req.params.addressId);
  saveJSON("users.json", users);

  res.json({ success: true, message: "Adresse supprimée" });
});

// ===========================================
// Routes - Geocoding (I - pour la carte)
// ===========================================
app.get("/geocode/reverse", (req, res) => {
  const { lat, lng } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: "lat et lng requis" });
  }

  // Mock du reverse geocoding
  const streets = [
    "Rue de Rivoli", "Avenue des Champs-Élysées", "Boulevard Haussmann",
    "Rue du Faubourg Saint-Honoré", "Avenue Montaigne", "Rue de la Paix",
    "Boulevard Saint-Germain", "Rue de Rennes", "Avenue de l'Opéra"
  ];
  
  const randomStreet = streets[Math.floor(Math.random() * streets.length)];
  const randomNumber = Math.floor(Math.random() * 150) + 1;

  const result = {
    street: `${randomNumber} ${randomStreet}`,
    city: "Paris",
    postalCode: `750${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}`,
    country: "France",
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
    formatted: `${randomNumber} ${randomStreet}, Paris, France`
  };

  res.json({ success: true, data: result });
});

app.get("/geocode/search", (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ success: false, message: "Query requis" });
  }

  // Mock du geocoding search
  const results = [
    {
      street: q,
      city: "Paris",
      postalCode: "75001",
      country: "France",
      latitude: 48.8566 + (Math.random() - 0.5) * 0.02,
      longitude: 2.3522 + (Math.random() - 0.5) * 0.02,
      formatted: `${q}, Paris, France`
    }
  ];

  res.json({ success: true, data: results });
});

// ===========================================
// Routes - User (alias pour compatibilité frontend)
// ===========================================
app.patch("/user/profile", authenticateToken, (req, res) => {
  const userIndex = users.findIndex(u => u.id === req.user.userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
  }

  const allowedFields = ['firstName', 'lastName', 'phone', 'photo', 'notificationsEnabled'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      users[userIndex][field] = req.body[field];
    }
  });

  // Support pour le champ "name" du frontend
  if (req.body.name) {
    const nameParts = req.body.name.split(' ');
    users[userIndex].firstName = nameParts[0];
    users[userIndex].lastName = nameParts.slice(1).join(' ') || '';
  }

  saveJSON("users.json", users);

  const { password: _, ...userWithoutPassword } = users[userIndex];
  res.json({ success: true, data: userWithoutPassword });
});

app.post("/user/favorites/:restaurantId", authenticateToken, (req, res) => {
  const { restaurantId } = req.params;
  
  if (!favorites[req.user.userId]) {
    favorites[req.user.userId] = [];
  }

  const index = favorites[req.user.userId].indexOf(restaurantId);
  
  if (index === -1) {
    favorites[req.user.userId].push(restaurantId);
    saveJSON("favorites.json", favorites);
    res.json({ success: true, message: "Ajouté aux favoris", isFavorite: true });
  } else {
    favorites[req.user.userId].splice(index, 1);
    saveJSON("favorites.json", favorites);
    res.json({ success: true, message: "Retiré des favoris", isFavorite: false });
  }
});

app.get("/user/favorites", authenticateToken, (req, res) => {
  const userFavs = favorites[req.user.userId] || [];
  const favoriteRestaurants = restaurants.filter(r => userFavs.includes(r.id));
  res.json({ success: true, data: favoriteRestaurants });
});

app.post("/upload", authenticateToken, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Aucun fichier uploadé" });
  }
  
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.status(201).json({ success: true, url: fileUrl, data: { url: fileUrl, id: req.file.filename } });
});

// ===========================================
// Routes - Categories
// ===========================================
app.get("/categories", (req, res) => {
  res.json({ success: true, data: categories });
});

// ===========================================
// Routes - Search (F - Suggestions et historique)
// ===========================================
app.get("/search/suggestions", (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.json({ success: true, data: [] });
  }

  const query = q.toString().toLowerCase();
  
  // Suggestions basées sur les noms de restaurants
  const restaurantSuggestions = restaurants
    .filter(r => r.name.toLowerCase().includes(query))
    .map(r => ({ type: 'restaurant', id: r.id, text: r.name, image: r.image }))
    .slice(0, 3);

  // Suggestions basées sur les cuisines
  const allCuisines = [...new Set(restaurants.flatMap(r => r.cuisine))];
  const cuisineSuggestions = allCuisines
    .filter(c => c.toLowerCase().includes(query))
    .map(c => ({ type: 'cuisine', text: c }))
    .slice(0, 3);

  // Suggestions basées sur les catégories
  const categorySuggestions = categories
    .filter(c => c.name.toLowerCase().includes(query))
    .map(c => ({ type: 'category', id: c.id, text: c.name, icon: c.icon }))
    .slice(0, 2);

  // Suggestions basées sur les plats
  const allDishes = Object.values(menus).flatMap(menu => 
    menu.flatMap(cat => cat.items.map(item => ({ ...item, restaurantId: cat.restaurantId })))
  );
  const dishSuggestions = allDishes
    .filter(d => d.name && d.name.toLowerCase().includes(query))
    .map(d => ({ type: 'dish', id: d.id, text: d.name, price: d.price }))
    .slice(0, 2);

  res.json({
    success: true,
    data: [...restaurantSuggestions, ...cuisineSuggestions, ...categorySuggestions, ...dishSuggestions]
  });
});

app.get("/search/popular", (req, res) => {
  const popularSearches = [
    { text: "Pizza", count: 1250, icon: "🍕" },
    { text: "Burger", count: 980, icon: "🍔" },
    { text: "Sushi", count: 870, icon: "🍣" },
    { text: "Healthy", count: 650, icon: "🥗" },
    { text: "Poke Bowl", count: 420, icon: "🥙" },
    { text: "Tacos", count: 380, icon: "🌮" },
    { text: "Ramen", count: 350, icon: "🍜" },
    { text: "Indien", count: 320, icon: "🍛" }
  ];
  
  res.json({ success: true, data: popularSearches });
});

app.get("/search/trending", (req, res) => {
  // Restaurants tendances
  const trending = restaurants
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 5)
    .map(r => ({
      id: r.id,
      name: r.name,
      image: r.image,
      rating: r.rating,
      cuisine: r.cuisine[0]
    }));

  res.json({ success: true, data: trending });
});

app.get("/restaurants/search", optionalAuth, (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.json({ success: true, data: [] });
  }

  const query = q.toString().toLowerCase();
  let result = restaurants.filter(r => 
    r.name.toLowerCase().includes(query) ||
    r.cuisine.some(c => c.toLowerCase().includes(query)) ||
    r.description.toLowerCase().includes(query) ||
    r.categories.some(c => c.toLowerCase().includes(query))
  );

  // Ajouter favoris si user connecté
  if (req.user) {
    const userFavs = favorites[req.user.userId] || [];
    result = result.map(r => ({ ...r, isFavorite: userFavs.includes(r.id) }));
  }

  res.json({ success: true, data: result });
});

// ===========================================
// Routes - Restaurants (Module 04)
// ===========================================
app.get("/restaurants", optionalAuth, (req, res) => {
  const { category, cuisine, search, sortBy, lat, lng, radius, priceRange, rating, page = 1, limit = 20 } = req.query;
  
  let result = [...restaurants];

  // Filtrer par catégorie
  if (category) {
    result = result.filter(r => r.categories.includes(category));
  }

  // Filtrer par cuisine
  if (cuisine) {
    result = result.filter(r => r.cuisine.some(c => c.toLowerCase().includes(cuisine.toLowerCase())));
  }

  // Recherche textuelle
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(r => 
      r.name.toLowerCase().includes(q) ||
      r.cuisine.some(c => c.toLowerCase().includes(q)) ||
      r.description.toLowerCase().includes(q)
    );
  }

  // Filtrer par prix
  if (priceRange) {
    const prices = priceRange.split(",").map(Number);
    result = result.filter(r => prices.includes(r.priceRange));
  }

  // Filtrer par note minimum
  if (rating) {
    result = result.filter(r => r.rating >= parseFloat(rating));
  }

  // Calculer la distance si lat/lng fournis
  if (lat && lng) {
    result = result.map(r => ({
      ...r,
      distance: calculateDistance(parseFloat(lat), parseFloat(lng), r.latitude, r.longitude)
    }));

    // Filtrer par rayon
    if (radius) {
      result = result.filter(r => r.distance <= parseFloat(radius));
    }
  }

  // Ajouter favoris si user connecté
  if (req.user) {
    const userFavs = favorites[req.user.userId] || [];
    result = result.map(r => ({ ...r, isFavorite: userFavs.includes(r.id) }));
  }

  // Trier
  switch (sortBy) {
    case "distance":
      result.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      break;
    case "rating":
      result.sort((a, b) => b.rating - a.rating);
      break;
    case "deliveryTime":
      result.sort((a, b) => a.deliveryTime.min - b.deliveryTime.min);
      break;
    case "popularity":
      result.sort((a, b) => b.reviewCount - a.reviewCount);
      break;
    default:
      result.sort((a, b) => b.rating - a.rating);
  }

  // Pagination
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const paginatedResult = result.slice(startIndex, startIndex + parseInt(limit));

  res.json({
    success: true,
    data: paginatedResult,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: result.length,
      totalPages: Math.ceil(result.length / parseInt(limit))
    }
  });
});

app.get("/restaurants/nearby", optionalAuth, (req, res) => {
  const { lat, lng, radius = 5 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: "Latitude et longitude requises" });
  }

  let result = restaurants.map(r => ({
    ...r,
    distance: calculateDistance(parseFloat(lat), parseFloat(lng), r.latitude, r.longitude)
  }));

  result = result.filter(r => r.distance <= parseFloat(radius));
  result.sort((a, b) => a.distance - b.distance);

  if (req.user) {
    const userFavs = favorites[req.user.userId] || [];
    result = result.map(r => ({ ...r, isFavorite: userFavs.includes(r.id) }));
  }

  res.json({ success: true, data: result });
});

app.get("/restaurants/:id", optionalAuth, (req, res) => {
  const restaurant = restaurants.find(r => r.id === req.params.id);
  
  if (!restaurant) {
    return res.status(404).json({ success: false, message: "Restaurant non trouvé" });
  }

  let result = { ...restaurant };

  if (req.user) {
    const userFavs = favorites[req.user.userId] || [];
    result.isFavorite = userFavs.includes(restaurant.id);
  }

  // Ajouter les avis récents
  const restaurantReviews = reviews
    .filter(r => r.restaurantId === req.params.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);
  
  result.recentReviews = restaurantReviews;

  res.json({ success: true, data: result });
});

app.get("/restaurants/:id/menu", (req, res) => {
  const menu = menus[req.params.id];
  
  if (!menu) {
    return res.status(404).json({ success: false, message: "Menu non trouvé" });
  }

  res.json({ success: true, data: menu });
});

app.get("/restaurants/:id/reviews", (req, res) => {
  const { page = 1, limit = 10, sortBy = "recent" } = req.query;
  
  let restaurantReviews = reviews.filter(r => r.restaurantId === req.params.id);
  
  // Trier
  switch (sortBy) {
    case "rating_high":
      restaurantReviews.sort((a, b) => b.rating - a.rating);
      break;
    case "rating_low":
      restaurantReviews.sort((a, b) => a.rating - b.rating);
      break;
    case "recent":
    default:
      restaurantReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Stats
  const stats = {
    total: restaurantReviews.length,
    average: restaurantReviews.length > 0 
      ? Math.round(restaurantReviews.reduce((sum, r) => sum + r.rating, 0) / restaurantReviews.length * 10) / 10 
      : 0,
    distribution: {
      5: restaurantReviews.filter(r => r.rating === 5).length,
      4: restaurantReviews.filter(r => r.rating === 4).length,
      3: restaurantReviews.filter(r => r.rating === 3).length,
      2: restaurantReviews.filter(r => r.rating === 2).length,
      1: restaurantReviews.filter(r => r.rating === 1).length
    }
  };

  // Pagination
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const paginatedReviews = restaurantReviews.slice(startIndex, startIndex + parseInt(limit));

  res.json({ 
    success: true, 
    data: paginatedReviews,
    stats,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: restaurantReviews.length,
      totalPages: Math.ceil(restaurantReviews.length / parseInt(limit))
    }
  });
});

// ===========================================
// Routes - Estimation livraison (J)
// ===========================================
app.get("/restaurants/:id/delivery-estimate", optionalAuth, (req, res) => {
  const { lat, lng } = req.query;
  const restaurant = restaurants.find(r => r.id === req.params.id);
  
  if (!restaurant) {
    return res.status(404).json({ success: false, message: "Restaurant non trouvé" });
  }

  // Calculer la distance
  let distance = 2.5; // Distance par défaut en km
  if (lat && lng) {
    distance = calculateDistance(
      parseFloat(lat), 
      parseFloat(lng), 
      restaurant.latitude, 
      restaurant.longitude
    );
  }

  // Estimation du temps basé sur la distance
  const baseTime = restaurant.deliveryTime.min;
  const additionalTimePerKm = 3; // 3 min par km
  const estimatedMinTime = Math.round(baseTime + (distance * additionalTimePerKm));
  const estimatedMaxTime = Math.round(estimatedMinTime + 10);

  // Frais de livraison dynamiques
  let deliveryFee = restaurant.deliveryFee;
  if (distance > 5) {
    deliveryFee += Math.round((distance - 5) * 0.5 * 100) / 100; // +0.50€ par km au-delà de 5km
  }

  // Vérifier si livraison possible
  const maxDeliveryRadius = 10; // km
  const isDeliveryAvailable = distance <= maxDeliveryRadius;

  // Frais de service
  const serviceFee = 0.99;

  res.json({
    success: true,
    data: {
      distance: Math.round(distance * 10) / 10,
      distanceUnit: "km",
      estimatedTime: {
        min: estimatedMinTime,
        max: estimatedMaxTime,
        display: `${estimatedMinTime}-${estimatedMaxTime} min`
      },
      deliveryFee,
      serviceFee,
      minimumOrder: restaurant.minimumOrder || 10,
      freeDeliveryThreshold: restaurant.freeDeliveryThreshold || 25,
      isDeliveryAvailable,
      message: isDeliveryAvailable 
        ? null 
        : `Désolé, ce restaurant ne livre pas au-delà de ${maxDeliveryRadius}km`,
      deliveryZones: [
        { radius: 3, fee: restaurant.deliveryFee, time: `${baseTime}-${baseTime + 10} min` },
        { radius: 5, fee: restaurant.deliveryFee + 1, time: `${baseTime + 5}-${baseTime + 15} min` },
        { radius: 10, fee: restaurant.deliveryFee + 2.5, time: `${baseTime + 10}-${baseTime + 25} min` }
      ]
    }
  });
});

// ===========================================
// Routes - Favorites
// ===========================================
app.get("/favorites", authenticateToken, (req, res) => {
  const userFavs = favorites[req.user.userId] || [];
  const favoriteRestaurants = restaurants.filter(r => userFavs.includes(r.id));
  res.json({ success: true, data: favoriteRestaurants });
});

app.post("/favorites", authenticateToken, (req, res) => {
  const { restaurantId } = req.body;
  
  if (!restaurantId) {
    return res.status(400).json({ success: false, message: "restaurantId requis" });
  }

  if (!favorites[req.user.userId]) {
    favorites[req.user.userId] = [];
  }

  if (!favorites[req.user.userId].includes(restaurantId)) {
    favorites[req.user.userId].push(restaurantId);
    saveJSON("favorites.json", favorites);
  }

  res.json({ success: true, message: "Ajouté aux favoris" });
});

app.delete("/favorites/:restaurantId", authenticateToken, (req, res) => {
  if (favorites[req.user.userId]) {
    favorites[req.user.userId] = favorites[req.user.userId].filter(id => id !== req.params.restaurantId);
    saveJSON("favorites.json", favorites);
  }
  res.json({ success: true, message: "Retiré des favoris" });
});

// ===========================================
// Routes - Cart (B - validation panier)
// ===========================================
app.post("/cart/validate", authenticateToken, (req, res) => {
  const { restaurantId, items } = req.body;

  const restaurant = restaurants.find(r => r.id === restaurantId);
  if (!restaurant) {
    return res.status(404).json({ success: false, message: "Restaurant non trouvé" });
  }

  const menu = menus[restaurantId];
  if (!menu) {
    return res.status(404).json({ success: false, message: "Menu non trouvé" });
  }

  // Valider que tous les items existent et sont disponibles
  const allMenuItems = menu.flatMap(cat => cat.items);
  let subtotal = 0;
  const validatedItems = [];
  const unavailableItems = [];

  for (const item of items) {
    const menuItem = allMenuItems.find(m => m.id === item.menuItemId);
    if (!menuItem) {
      return res.status(400).json({ success: false, message: `Article ${item.menuItemId} non trouvé` });
    }
    if (!menuItem.isAvailable) {
      unavailableItems.push(menuItem.name);
      continue;
    }
    const itemTotal = menuItem.price * item.quantity;
    subtotal += itemTotal;
    validatedItems.push({
      ...item,
      name: menuItem.name,
      price: menuItem.price,
      totalPrice: itemTotal
    });
  }

  if (unavailableItems.length > 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Articles non disponibles: ${unavailableItems.join(", ")}`,
      unavailableItems
    });
  }

  if (subtotal < (restaurant.minimumOrder || 0)) {
    return res.status(400).json({ 
      success: false, 
      message: `Commande minimum: ${restaurant.minimumOrder}€`,
      minimumOrder: restaurant.minimumOrder,
      currentTotal: subtotal
    });
  }

  const deliveryFee = subtotal >= (restaurant.freeDeliveryThreshold || 25) ? 0 : restaurant.deliveryFee;
  const serviceFee = 0.99;

  res.json({
    success: true,
    data: {
      items: validatedItems,
      subtotal,
      deliveryFee,
      serviceFee,
      total: subtotal + deliveryFee + serviceFee,
      freeDeliveryThreshold: restaurant.freeDeliveryThreshold || 25,
      amountForFreeDelivery: Math.max(0, (restaurant.freeDeliveryThreshold || 25) - subtotal)
    }
  });
});

// ===========================================
// Routes - Orders
// ===========================================
app.get("/orders", authenticateToken, (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  
  let userOrders = orders.filter(o => o.userId === req.user.userId);
  
  if (status) {
    userOrders = userOrders.filter(o => o.status === status);
  }
  
  userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Pagination
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const paginatedOrders = userOrders.slice(startIndex, startIndex + parseInt(limit));

  res.json({ 
    success: true, 
    data: paginatedOrders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: userOrders.length,
      totalPages: Math.ceil(userOrders.length / parseInt(limit))
    }
  });
});

app.get("/orders/:id", authenticateToken, (req, res) => {
  const order = orders.find(o => o.id === req.params.id && o.userId === req.user.userId);
  
  if (!order) {
    return res.status(404).json({ success: false, message: "Commande non trouvée" });
  }

  res.json({ success: true, data: order });
});

app.post("/orders", authenticateToken, (req, res) => {
  const { restaurantId, items, deliveryAddress, paymentMethod, tip = 0, deliveryInstructions, promoCode } = req.body;

  const restaurant = restaurants.find(r => r.id === restaurantId);
  if (!restaurant) {
    return res.status(404).json({ success: false, message: "Restaurant non trouvé" });
  }

  // Calculer les totaux
  const menu = menus[restaurantId];
  const allMenuItems = menu ? menu.flatMap(cat => cat.items) : [];
  
  let subtotal = 0;
  const orderItems = items.map(item => {
    const menuItem = allMenuItems.find(m => m.id === item.menuItemId);
    const itemTotal = menuItem ? menuItem.price * item.quantity : 0;
    subtotal += itemTotal;
    return {
      ...item,
      menuItem,
      totalPrice: itemTotal
    };
  });

  let deliveryFee = subtotal >= (restaurant.freeDeliveryThreshold || 25) ? 0 : restaurant.deliveryFee;
  const serviceFee = 0.99;
  
  // Appliquer le code promo si présent
  let discount = 0;
  let promoApplied = null;
  if (promoCode) {
    const promoCodes = {
      "BIENVENUE30": { discount: 30, type: "percent", minOrder: 20, maxDiscount: 15 },
      "FOODIE10": { discount: 10, type: "percent", minOrder: 15, maxDiscount: 10 },
      "LIVRAISON": { discount: 100, type: "delivery", minOrder: 25 }
    };
    const promo = promoCodes[promoCode.toUpperCase()];
    if (promo && subtotal >= promo.minOrder) {
      if (promo.type === "percent") {
        discount = Math.min((subtotal * promo.discount) / 100, promo.maxDiscount || Infinity);
        promoApplied = { code: promoCode, type: "percent", discount, message: `-${discount.toFixed(2)}€` };
      } else if (promo.type === "delivery") {
        deliveryFee = 0;
        promoApplied = { code: promoCode, type: "delivery", message: "Livraison gratuite" };
      }
    }
  }

  const total = subtotal + deliveryFee + serviceFee + tip - discount;

  const newOrder = {
    id: uuidv4(),
    orderNumber: `FS-${Date.now().toString().slice(-8)}`,
    userId: req.user.userId,
    restaurantId,
    restaurantName: restaurant.name,
    restaurantImage: restaurant.image,
    restaurantPhone: restaurant.phone || "+33 1 23 45 67 89",
    items: orderItems,
    status: "pending",
    subtotal,
    deliveryFee,
    serviceFee,
    tip,
    discount,
    promoApplied,
    total,
    paymentMethod: paymentMethod || "card",
    deliveryAddress,
    deliveryInstructions,
    estimatedDelivery: new Date(Date.now() + (restaurant.deliveryTime.max * 60 * 1000)).toISOString(),
    driver: null,
    timeline: [
      { status: "pending", timestamp: new Date().toISOString(), message: "Commande reçue" }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  orders.push(newOrder);
  saveJSON("orders.json", orders);

  // Simuler progression de la commande
  simulateOrderProgress(newOrder.id);

  res.status(201).json({ success: true, data: newOrder });
});

app.post("/orders/:id/cancel", authenticateToken, (req, res) => {
  const { reason } = req.body;
  const orderIndex = orders.findIndex(o => o.id === req.params.id && o.userId === req.user.userId);
  
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, message: "Commande non trouvée" });
  }

  if (!["pending", "confirmed"].includes(orders[orderIndex].status)) {
    return res.status(400).json({ success: false, message: "Cette commande ne peut plus être annulée" });
  }

  orders[orderIndex].status = "cancelled";
  orders[orderIndex].cancellationReason = reason || "Annulé par le client";
  orders[orderIndex].updatedAt = new Date().toISOString();
  orders[orderIndex].timeline.push({
    status: "cancelled",
    timestamp: new Date().toISOString(),
    message: "Commande annulée par le client"
  });

  saveJSON("orders.json", orders);
  res.json({ success: true, data: orders[orderIndex] });
});

// ===========================================
// Routes - Order Tracking (C - Suivi temps réel)
// ===========================================
app.get("/orders/:id/track", authenticateToken, (req, res) => {
  const order = orders.find(o => o.id === req.params.id && o.userId === req.user.userId);
  
  if (!order) {
    return res.status(404).json({ success: false, message: "Commande non trouvée" });
  }

  const restaurant = restaurants.find(r => r.id === order.restaurantId);

  // Construire les données de tracking
  let trackingData = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    timeline: order.timeline,
    estimatedDelivery: order.estimatedDelivery,
    restaurant: restaurant ? {
      id: restaurant.id,
      name: restaurant.name,
      image: restaurant.image,
      phone: restaurant.phone || "+33 1 23 45 67 89",
      location: {
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        address: restaurant.address
      }
    } : null,
    deliveryAddress: order.deliveryAddress
  };

  // Simuler la position du livreur si en livraison
  if (order.status === "delivering" || order.status === "picked_up") {
    // Simuler un mouvement entre le restaurant et l'adresse de livraison
    const progress = Math.random(); // 0 à 1
    const restaurantLat = restaurant?.latitude || 48.8566;
    const restaurantLng = restaurant?.longitude || 2.3522;
    const deliveryLat = order.deliveryAddress?.latitude || 48.8600;
    const deliveryLng = order.deliveryAddress?.longitude || 2.3500;

    const currentLat = restaurantLat + (deliveryLat - restaurantLat) * progress;
    const currentLng = restaurantLng + (deliveryLng - restaurantLng) * progress;

    trackingData.driver = {
      id: "driver-001",
      name: "Thomas D.",
      phone: "+33 6 12 34 56 78",
      photo: "https://randomuser.me/api/portraits/men/32.jpg",
      vehicle: "Vélo électrique",
      rating: 4.8,
      totalDeliveries: 1247
    };

    trackingData.driverLocation = {
      latitude: currentLat,
      longitude: currentLng,
      heading: Math.random() * 360,
      speed: 15 + Math.random() * 10, // km/h
      updatedAt: new Date().toISOString()
    };

    // Estimation temps restant
    const remainingDistance = calculateDistance(currentLat, currentLng, deliveryLat, deliveryLng);
    const estimatedMinutes = Math.round(remainingDistance * 3); // ~3 min par km
    
    trackingData.estimatedArrival = new Date(Date.now() + estimatedMinutes * 60 * 1000).toISOString();
    trackingData.estimatedMinutes = estimatedMinutes;
  }

  // Ajouter les étapes de suivi
  trackingData.steps = [
    { 
      key: "pending", 
      label: "Commande reçue", 
      completed: true,
      time: order.timeline.find(t => t.status === "pending")?.timestamp 
    },
    { 
      key: "confirmed", 
      label: "Confirmée par le restaurant", 
      completed: ["confirmed", "preparing", "ready", "picked_up", "delivering", "delivered"].includes(order.status),
      time: order.timeline.find(t => t.status === "confirmed")?.timestamp 
    },
    { 
      key: "preparing", 
      label: "En préparation", 
      completed: ["preparing", "ready", "picked_up", "delivering", "delivered"].includes(order.status),
      time: order.timeline.find(t => t.status === "preparing")?.timestamp 
    },
    { 
      key: "ready", 
      label: "Prête", 
      completed: ["ready", "picked_up", "delivering", "delivered"].includes(order.status),
      time: order.timeline.find(t => t.status === "ready")?.timestamp 
    },
    { 
      key: "picked_up", 
      label: "Récupérée par le livreur", 
      completed: ["picked_up", "delivering", "delivered"].includes(order.status),
      time: order.timeline.find(t => t.status === "picked_up")?.timestamp 
    },
    { 
      key: "delivering", 
      label: "En livraison", 
      completed: ["delivering", "delivered"].includes(order.status),
      time: order.timeline.find(t => t.status === "delivering")?.timestamp 
    },
    { 
      key: "delivered", 
      label: "Livrée", 
      completed: order.status === "delivered",
      time: order.timeline.find(t => t.status === "delivered")?.timestamp 
    }
  ];

  res.json({ success: true, data: trackingData });
});

// Simuler la progression d'une commande
function simulateOrderProgress(orderId) {
  const statuses = [
    { status: "confirmed", delay: 10000, message: "Commande confirmée par le restaurant" },
    { status: "preparing", delay: 20000, message: "Préparation en cours" },
    { status: "ready", delay: 40000, message: "Commande prête" },
    { status: "picked_up", delay: 50000, message: "Récupérée par le livreur" },
    { status: "delivering", delay: 60000, message: "En cours de livraison" },
    { status: "delivered", delay: 90000, message: "Livrée" }
  ];

  statuses.forEach(({ status, delay, message }) => {
    setTimeout(() => {
      const orderIndex = orders.findIndex(o => o.id === orderId);
      if (orderIndex !== -1 && orders[orderIndex].status !== "cancelled") {
        orders[orderIndex].status = status;
        orders[orderIndex].updatedAt = new Date().toISOString();
        orders[orderIndex].timeline.push({
          status,
          timestamp: new Date().toISOString(),
          message
        });

        // Ajouter les infos du livreur quand il récupère la commande
        if (status === "picked_up") {
          orders[orderIndex].driver = {
            id: "driver-001",
            name: "Thomas D.",
            phone: "+33 6 12 34 56 78",
            photo: "https://randomuser.me/api/portraits/men/32.jpg",
            vehicle: "Vélo électrique",
            rating: 4.8
          };
        }

        if (status === "delivered") {
          orders[orderIndex].actualDelivery = new Date().toISOString();
        }
        
        saveJSON("orders.json", orders);
      }
    }, delay);
  });
}

// ===========================================
// Routes - Reviews (D - avec sous-notes et photos)
// ===========================================
app.post("/reviews", authenticateToken, upload.array("images", 5), (req, res) => {
  const { 
    restaurantId, 
    orderId, 
    rating, 
    comment,
    qualityRating,
    speedRating,
    presentationRating 
  } = req.body;

  if (!restaurantId || !rating) {
    return res.status(400).json({ success: false, message: "restaurantId et rating requis" });
  }

  // Vérifier que l'utilisateur a bien commandé dans ce restaurant
  if (orderId) {
    const order = orders.find(o => o.id === orderId && o.userId === req.user.userId);
    if (!order) {
      return res.status(400).json({ success: false, message: "Commande non trouvée" });
    }
    if (order.status !== "delivered") {
      return res.status(400).json({ success: false, message: "Vous ne pouvez noter qu'une commande livrée" });
    }
  }

  const user = users.find(u => u.id === req.user.userId);
  const images = req.files ? req.files.map(f => `${req.protocol}://${req.get("host")}/uploads/${f.filename}`) : [];

  const newReview = {
    id: uuidv4(),
    userId: req.user.userId,
    userName: user ? `${user.firstName} ${user.lastName}` : "Utilisateur",
    userAvatar: user?.avatar,
    restaurantId,
    orderId,
    rating: parseInt(rating),
    // Sous-notes par critère
    qualityRating: qualityRating ? parseInt(qualityRating) : null,
    speedRating: speedRating ? parseInt(speedRating) : null,
    presentationRating: presentationRating ? parseInt(presentationRating) : null,
    comment: comment || "",
    images,
    likes: 0,
    isVerifiedPurchase: !!orderId,
    createdAt: new Date().toISOString()
  };

  reviews.push(newReview);
  saveJSON("reviews.json", reviews);

  // Mettre à jour la note du restaurant
  const restaurantReviews = reviews.filter(r => r.restaurantId === restaurantId);
  const avgRating = restaurantReviews.reduce((sum, r) => sum + r.rating, 0) / restaurantReviews.length;
  const restaurantIndex = restaurants.findIndex(r => r.id === restaurantId);
  if (restaurantIndex !== -1) {
    restaurants[restaurantIndex].rating = Math.round(avgRating * 10) / 10;
    restaurants[restaurantIndex].reviewCount = restaurantReviews.length;
    saveJSON("restaurants.json", restaurants);
  }

  res.status(201).json({ success: true, data: newReview });
});

app.post("/reviews/:id/like", authenticateToken, (req, res) => {
  const reviewIndex = reviews.findIndex(r => r.id === req.params.id);
  
  if (reviewIndex === -1) {
    return res.status(404).json({ success: false, message: "Avis non trouvé" });
  }

  reviews[reviewIndex].likes = (reviews[reviewIndex].likes || 0) + 1;
  saveJSON("reviews.json", reviews);

  res.json({ success: true, data: { likes: reviews[reviewIndex].likes } });
});

app.post("/reviews/:id/report", authenticateToken, (req, res) => {
  const { reason } = req.body;
  const reviewIndex = reviews.findIndex(r => r.id === req.params.id);
  
  if (reviewIndex === -1) {
    return res.status(404).json({ success: false, message: "Avis non trouvé" });
  }

  // En prod: enregistrer le signalement dans une table dédiée
  console.log(`Review ${req.params.id} reported by ${req.user.userId}: ${reason}`);

  res.json({ success: true, message: "Signalement enregistré" });
});

// ===========================================
// Routes - Upload (Module 05)
// ===========================================
app.post("/uploads", authenticateToken, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Aucun fichier uploadé" });
  }
  
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.status(201).json({ success: true, data: { url: fileUrl, id: req.file.filename } });
});

app.post("/uploads/multiple", authenticateToken, upload.array("files", 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: "Aucun fichier uploadé" });
  }
  
  const files = req.files.map(f => ({
    url: `${req.protocol}://${req.get("host")}/uploads/${f.filename}`,
    id: f.filename,
    originalName: f.originalname,
    size: f.size
  }));

  res.status(201).json({ success: true, data: files });
});

// ===========================================
// Routes - Push Notifications (Module 09)
// ===========================================
app.post("/notifications/register-token", authenticateToken, (req, res) => {
  const { token, platform, deviceName } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: "Token requis" });
  }

  pushTokens[req.user.userId] = {
    token,
    platform: platform || "unknown",
    deviceName: deviceName || "Unknown Device",
    registeredAt: new Date().toISOString()
  };

  saveJSON("push-tokens.json", pushTokens);
  res.json({ success: true, message: "Token enregistré" });
});

app.delete("/notifications/unregister-token", authenticateToken, (req, res) => {
  delete pushTokens[req.user.userId];
  saveJSON("push-tokens.json", pushTokens);
  res.json({ success: true, message: "Token supprimé" });
});

app.get("/notifications", authenticateToken, (req, res) => {
  // Mock notifications
  const notifications = [
    {
      id: uuidv4(),
      type: "order_update",
      title: "🚴 Votre commande est en route !",
      body: "Thomas arrive dans environ 10 minutes",
      data: { orderId: orders[orders.length - 1]?.id },
      isRead: false,
      createdAt: new Date(Date.now() - 300000).toISOString()
    },
    {
      id: uuidv4(),
      type: "promotion",
      title: "🎉 -20% chez Pizza Napoli !",
      body: "Profitez de 20% de réduction sur votre prochaine commande",
      data: { restaurantId: "rest-002", promoCode: "PIZZA20" },
      isRead: false,
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: uuidv4(),
      type: "new_restaurant",
      title: "🆕 Nouveau restaurant près de chez vous !",
      body: "Découvrez Green Bowl, votre nouvelle adresse healthy",
      data: { restaurantId: "rest-005" },
      isRead: true,
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: uuidv4(),
      type: "review_reminder",
      title: "⭐ Comment était votre repas ?",
      body: "Partagez votre avis sur votre dernière commande",
      data: { orderId: orders[orders.length - 2]?.id },
      isRead: true,
      createdAt: new Date(Date.now() - 172800000).toISOString()
    }
  ];
  
  res.json({ success: true, data: notifications });
});

app.patch("/notifications/:id/read", authenticateToken, (req, res) => {
  // Mock - en prod, mettre à jour en base
  res.json({ success: true, message: "Notification marquée comme lue" });
});

app.post("/notifications/read-all", authenticateToken, (req, res) => {
  res.json({ success: true, message: "Toutes les notifications marquées comme lues" });
});

// ===========================================
// Routes - Promos (G - Code promo interactif)
// ===========================================
app.post("/promos/validate", authenticateToken, (req, res) => {
  const { code, subtotal, restaurantId } = req.body;

  const promoCodes = {
    "BIENVENUE30": { 
      discount: 30, 
      type: "percent", 
      minOrder: 20, 
      maxDiscount: 15,
      description: "30% de réduction (max 15€)",
      validUntil: "2026-12-31"
    },
    "FOODIE10": { 
      discount: 10, 
      type: "percent", 
      minOrder: 15, 
      maxDiscount: 10,
      description: "10% de réduction (max 10€)",
      validUntil: "2026-12-31"
    },
    "LIVRAISON": { 
      discount: 100, 
      type: "delivery", 
      minOrder: 25,
      description: "Livraison gratuite",
      validUntil: "2026-12-31"
    },
    "NOUVEAU": { 
      discount: 5, 
      type: "fixed", 
      minOrder: 20,
      description: "5€ de réduction",
      validUntil: "2026-06-30"
    },
    "WEEKEND": { 
      discount: 15, 
      type: "percent", 
      minOrder: 30, 
      maxDiscount: 12,
      description: "15% de réduction le weekend",
      validUntil: "2026-12-31",
      daysValid: [0, 6] // dimanche, samedi
    }
  };

  if (!code) {
    return res.status(400).json({ success: false, message: "Code promo requis" });
  }

  const promo = promoCodes[code.toUpperCase()];

  if (!promo) {
    return res.status(400).json({ 
      success: false, 
      message: "Code promo invalide",
      code: code.toUpperCase()
    });
  }

  // Vérifier la date de validité
  if (promo.validUntil && new Date(promo.validUntil) < new Date()) {
    return res.status(400).json({ 
      success: false, 
      message: "Ce code promo a expiré",
      code: code.toUpperCase()
    });
  }

  // Vérifier les jours valides
  if (promo.daysValid) {
    const today = new Date().getDay();
    if (!promo.daysValid.includes(today)) {
      return res.status(400).json({ 
        success: false, 
        message: "Ce code n'est valable que le weekend",
        code: code.toUpperCase()
      });
    }
  }

  // Vérifier le montant minimum
  if (subtotal && subtotal < promo.minOrder) {
    return res.status(400).json({ 
      success: false, 
      message: `Commande minimum de ${promo.minOrder}€ requise`,
      code: code.toUpperCase(),
      minOrder: promo.minOrder,
      currentSubtotal: subtotal
    });
  }

  let discountAmount = 0;
  let discountDisplay = "";

  if (promo.type === "percent") {
    discountAmount = subtotal ? Math.min((subtotal * promo.discount) / 100, promo.maxDiscount || Infinity) : promo.maxDiscount;
    discountDisplay = `-${discountAmount.toFixed(2)}€`;
  } else if (promo.type === "fixed") {
    discountAmount = promo.discount;
    discountDisplay = `-${promo.discount}€`;
  } else if (promo.type === "delivery") {
    discountAmount = "free_delivery";
    discountDisplay = "Livraison gratuite";
  }

  res.json({
    success: true,
    data: {
      code: code.toUpperCase(),
      discount: discountAmount,
      type: promo.type,
      description: promo.description,
      minOrder: promo.minOrder,
      maxDiscount: promo.maxDiscount,
      message: discountDisplay,
      validUntil: promo.validUntil
    }
  });
});

app.get("/promos/available", authenticateToken, (req, res) => {
  // Liste des promos disponibles pour l'utilisateur
  const availablePromos = [
    {
      code: "BIENVENUE30",
      discount: 30,
      type: "percent",
      description: "30% de réduction sur votre commande",
      minOrder: 20,
      maxDiscount: 15,
      validUntil: "2026-12-31"
    },
    {
      code: "LIVRAISON",
      discount: 100,
      type: "delivery",
      description: "Livraison gratuite",
      minOrder: 25,
      validUntil: "2026-12-31"
    }
  ];

  res.json({ success: true, data: availablePromos });
});

// ===========================================
// Routes - Onboarding status (H)
// ===========================================
app.get("/users/onboarding-status", authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
  }

  res.json({
    success: true,
    data: {
      hasCompletedOnboarding: user.hasCompletedOnboarding || false,
      hasAddedAddress: (user.addresses?.length || 0) > 0,
      hasPlacedOrder: orders.some(o => o.userId === req.user.userId),
      hasAddedPaymentMethod: user.hasAddedPaymentMethod || false
    }
  });
});

app.post("/users/complete-onboarding", authenticateToken, (req, res) => {
  const userIndex = users.findIndex(u => u.id === req.user.userId);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
  }

  users[userIndex].hasCompletedOnboarding = true;
  saveJSON("users.json", users);

  res.json({ success: true, message: "Onboarding complété" });
});

// ===========================================
// Routes - Offline sync (Module 06)
// ===========================================
app.post("/sync/orders", authenticateToken, (req, res) => {
  const { offlineOrders } = req.body;

  if (!offlineOrders || !Array.isArray(offlineOrders)) {
    return res.status(400).json({ success: false, message: "offlineOrders requis" });
  }

  const syncedOrders = [];
  const failedOrders = [];

  for (const offlineOrder of offlineOrders) {
    try {
      const restaurant = restaurants.find(r => r.id === offlineOrder.restaurantId);
      if (!restaurant) {
        failedOrders.push({ ...offlineOrder, error: "Restaurant non trouvé" });
        continue;
      }

      const newOrder = {
        id: uuidv4(),
        orderNumber: `FS-${Date.now().toString().slice(-8)}`,
        userId: req.user.userId,
        ...offlineOrder,
        status: "pending",
        syncedAt: new Date().toISOString(),
        createdAt: offlineOrder.createdAt || new Date().toISOString()
      };

      orders.push(newOrder);
      syncedOrders.push(newOrder);
    } catch (error) {
      failedOrders.push({ ...offlineOrder, error: error.message });
    }
  }

  saveJSON("orders.json", orders);

  res.json({
    success: true,
    data: {
      synced: syncedOrders.length,
      failed: failedOrders.length,
      syncedOrders,
      failedOrders
    }
  });
});

// ===========================================
// 404 Handler
// ===========================================
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: "Route non trouvée",
    path: req.path,
    method: req.method
  });
});

// ===========================================
// Error Handler
// ===========================================
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    message: "Erreur serveur",
    error: NODE_ENV === "development" ? err.message : undefined
  });
});

// ===========================================
// Start Server
// ===========================================
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🍔 FoodieSpot Mock API Server v2.0                       ║
║                                                            ║
║   Running on: http://${displayHost}:${PORT}                        ║
║   Environment: ${NODE_ENV}                                  ║
║                                                            ║
║   ─────────────────────────────────────────────────────    ║
║   📦 Core Endpoints:                                       ║
║   ─────────────────────────────────────────────────────    ║
║   GET  /health                 Health check                ║
║   POST /auth/register          Register new user           ║
║   POST /auth/login             Login                       ║
║   POST /auth/refresh           Refresh token               ║
║                                                            ║
║   ─────────────────────────────────────────────────────    ║
║   🍽️  Restaurant Endpoints:                                ║
║   ─────────────────────────────────────────────────────    ║
║   GET  /restaurants            List restaurants            ║
║   GET  /restaurants/:id        Restaurant details          ║
║   GET  /restaurants/:id/menu   Restaurant menu             ║
║   GET  /restaurants/:id/reviews Restaurant reviews         ║
║   GET  /restaurants/:id/delivery-estimate  Delivery info   ║
║   GET  /restaurants/nearby     Nearby restaurants          ║
║   GET  /categories             List categories             ║
║                                                            ║
║   ─────────────────────────────────────────────────────    ║
║   🔍 Search Endpoints (F):                                 ║
║   ─────────────────────────────────────────────────────    ║
║   GET  /search/suggestions     Auto-complete               ║
║   GET  /search/popular         Popular searches            ║
║   GET  /search/trending        Trending restaurants        ║
║   GET  /restaurants/search     Search restaurants          ║
║                                                            ║
║   ─────────────────────────────────────────────────────    ║
║   👤 User Endpoints:                                       ║
║   ─────────────────────────────────────────────────────    ║
║   GET  /users/profile          Get profile                 ║
║   PUT  /users/profile          Update profile              ║
║   GET  /users/preferences      Get preferences (A)         ║
║   PATCH /users/preferences     Update preferences (A)      ║
║   GET  /users/addresses        List addresses              ║
║   POST /users/addresses        Add address (I)             ║
║   PUT  /users/addresses/:id    Update address (I)          ║
║   DEL  /users/addresses/:id    Delete address              ║
║                                                            ║
║   ─────────────────────────────────────────────────────    ║
║   📍 Geocoding Endpoints (I):                              ║
║   ─────────────────────────────────────────────────────    ║
║   GET  /geocode/reverse        Reverse geocoding           ║
║   GET  /geocode/search         Address search              ║
║                                                            ║
║   ─────────────────────────────────────────────────────    ║
║   🛒 Cart & Orders:                                        ║
║   ─────────────────────────────────────────────────────    ║
║   POST /cart/validate          Validate cart (B)           ║
║   GET  /orders                 List orders                 ║
║   POST /orders                 Create order                ║
║   GET  /orders/:id             Order details               ║
║   GET  /orders/:id/track       Track order (C)             ║
║   POST /orders/:id/cancel      Cancel order                ║
║                                                            ║
║   ─────────────────────────────────────────────────────    ║
║   ⭐ Reviews Endpoints (D):                                ║
║   ─────────────────────────────────────────────────────    ║
║   POST /reviews                Create review with photos   ║
║   POST /reviews/:id/like       Like a review               ║
║   POST /reviews/:id/report     Report a review             ║
║                                                            ║
║   ─────────────────────────────────────────────────────    ║
║   🎁 Promos Endpoints (G):                                 ║
║   ─────────────────────────────────────────────────────    ║
║   POST /promos/validate        Validate promo code         ║
║   GET  /promos/available       List available promos       ║
║                                                            ║
║   ─────────────────────────────────────────────────────    ║
║   📤 Other:                                                ║
║   ─────────────────────────────────────────────────────    ║
║   POST /uploads                Upload file                 ║
║   GET  /favorites              List favorites              ║
║   POST /favorites              Add favorite                ║
║   GET  /notifications          List notifications          ║
║   POST /sync/orders            Sync offline orders         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});