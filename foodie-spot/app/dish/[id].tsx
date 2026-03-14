import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { restaurantAPI } from "@/services/api";
import { Dish } from "@/types";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { ArrowLeft, Minus, Plus } from "lucide-react-native";

const CART_STORAGE_KEY = "cart_items";

type CartItem = Dish & {
  quantity: number;
  restaurantId: string;
};

export default function DishScreen() {
  const { id, restaurantId } = useLocalSearchParams<{
    id: string;
    restaurantId: string;
  }>();

  const [dish, setDish] = useState<Dish | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !restaurantId) {
      setError("Plat introuvable.");
      setLoading(false);
      return;
    }

    loadDish();
  }, [id, restaurantId]);

  const loadDish = async () => {
    try {
      setLoading(true);
      setError(null);

      const menu = await restaurantAPI.getMenu(restaurantId);
      const foundDish = menu.find((item) => item.id === id) || null;

      if (!foundDish) {
        setError("Plat introuvable.");
        setDish(null);
        return;
      }

      setDish(foundDish);
    } catch (err) {
      setError("Impossible de charger le plat.");
      setDish(null);
    } finally {
      setLoading(false);
    }
  };

const [successMessage, setSuccessMessage] = useState("");

 const handleAddToCart = async () => {
  if (!dish || !restaurantId) {
    Alert.alert("Erreur", "Plat ou restaurant introuvable.");
    return;
  }

  try {
    setAddingToCart(true);

    const existingCartRaw = await AsyncStorage.getItem(CART_STORAGE_KEY);
    const existingCart: CartItem[] = existingCartRaw ? JSON.parse(existingCartRaw) : [];

    const existingItemIndex = existingCart.findIndex(
      (item) => item.id === dish.id && item.restaurantId === restaurantId
    );

    if (existingItemIndex !== -1) {
      existingCart[existingItemIndex].quantity += quantity;
    } else {
      existingCart.push({
        ...dish,
        quantity,
        restaurantId,
      });
    }

    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(existingCart));

    setSuccessMessage("Plat ajouté au panier !");
    setTimeout(() => {
      setSuccessMessage("");
    }, 2000);
  } catch (err) {
    console.error("handleAddToCart error =", err);
    Alert.alert("Erreur", "Impossible d’ajouter le plat au panier.");
  } finally {
    setAddingToCart(false);
  }
};

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.infoText}>Chargement du plat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !dish) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || "Plat introuvable."}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDish}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageWrapper}>
          <Image source={{ uri: dish.image }} style={styles.image} />
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.name}>{dish.name}</Text>
          <Text style={styles.description}>{dish.description}</Text>

          <View style={styles.quantityRow}>
            <Text style={styles.price}>{dish.price} €</Text>

            <View style={styles.qtyControls}>
              <TouchableOpacity
                style={[styles.qtyButton, quantity === 1 && styles.qtyButtonDisabled]}
                onPress={() => setQuantity((prev) => Math.max(1, prev - 1))}
                disabled={quantity === 1}
              >
                <Minus size={18} color={quantity === 1 ? "#666" : "#fff"} />
              </TouchableOpacity>

              <Text style={styles.qtyValue}>{quantity}</Text>

              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => setQuantity((prev) => prev + 1)}
              >
                <Plus size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addButton, addingToCart && styles.addButtonDisabled]}
            onPress={handleAddToCart}
            disabled={addingToCart}
          >
            <Text style={styles.addButtonText}>
              {addingToCart ? "Ajout en cours..." : "Ajouter au panier"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  infoText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#D32F2F",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  imageWrapper: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 280,
  },
  backButton: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 16,
    gap: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
  },
  description: {
    color: "#666",
    lineHeight: 20,
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF6B35",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  qtyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B35",
  },
  qtyButtonDisabled: {
    borderColor: "#f0f0f0",
    backgroundColor: "#ccc",
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center",
  },
  addButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});