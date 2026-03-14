import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { Image } from "expo-image";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag } from "lucide-react-native";
import { Dish } from "@/types";

const CART_STORAGE_KEY = "cart_items";

type CartItem = Dish & {
  quantity: number;
  restaurantId: string;
};

export default function CartScreen() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCart = async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
      const items: CartItem[] = raw ? JSON.parse(raw) : [];
      setCartItems(items);
    } catch (error) {
      console.error("Failed to load cart:", error);
      Alert.alert("Erreur", "Impossible de charger le panier.");
    } finally {
      setLoading(false);
    }
  };

  const saveCart = async (items: CartItem[]) => {
    try {
      setCartItems(items);
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save cart:", error);
      Alert.alert("Erreur", "Impossible de mettre à jour le panier.");
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [])
  );

  const increaseQuantity = async (itemId: string, restaurantId: string) => {
    const updated = cartItems.map((item) =>
      item.id === itemId && item.restaurantId === restaurantId
        ? { ...item, quantity: item.quantity + 1 }
        : item
    );

    await saveCart(updated);
  };

  const decreaseQuantity = async (itemId: string, restaurantId: string) => {
    const updated = cartItems
      .map((item) =>
        item.id === itemId && item.restaurantId === restaurantId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
      .filter((item) => item.quantity > 0);

    await saveCart(updated);
  };

  const removeItem = async (itemId: string, restaurantId: string) => {
    const updated = cartItems.filter(
      (item) => !(item.id === itemId && item.restaurantId === restaurantId)
    );

    await saveCart(updated);
  };

  const clearCart = () => {
    Alert.alert("Vider le panier", "Voulez-vous vraiment supprimer tous les articles ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Vider",
        style: "destructive",
        onPress: async () => {
          await saveCart([]);
        },
      },
    ]);
  };

  const handleCheckout = () => {
  if (cartItems.length === 0) {
    Alert.alert("Panier vide", "Ajoutez des articles avant de passer commande.");
    return;
  }

  router.push("/out/checkout");
};


  const total = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cartItems]);

  const totalItems = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.itemImage} contentFit="cover" />

      <View style={styles.itemContent}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>

        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <Text style={styles.itemPrice}>{item.price.toFixed(2)} €</Text>

        <View style={styles.itemFooter}>
          <View style={styles.qtyControls}>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() => decreaseQuantity(item.id, item.restaurantId)}
            >
              <Minus size={16} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.qtyValue}>{item.quantity}</Text>

            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() => increaseQuantity(item.id, item.restaurantId)}
            >
              <Plus size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => removeItem(item.id, item.restaurantId)}
          >
            <Trash2 size={18} color="#D32F2F" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Chargement du panier...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#000" />
        </TouchableOpacity>

        <Text style={styles.title}>Panier</Text>

        {cartItems.length > 0 ? (
          <TouchableOpacity onPress={clearCart}>
            <Text style={styles.clearText}>Vider</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyState}>
          <ShoppingBag size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>Votre panier est vide</Text>
          <Text style={styles.emptyText}>
            Ajoutez quelques plats pour les voir apparaître ici.
          </Text>

          <TouchableOpacity style={styles.shopButton} onPress={() => router.back()}>
            <Text style={styles.shopButtonText}>Continuer mes achats</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            keyExtractor={(item) => `${item.restaurantId}-${item.id}`}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Articles</Text>
              <Text style={styles.summaryValue}>{totalItems}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotal}>Total</Text>
              <Text style={styles.summaryTotal}>{total.toFixed(2)} €</Text>
            </View>

            <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
              <Text style={styles.checkoutButtonText}>Passer commande</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  clearText: {
    color: "#D32F2F",
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingBottom: 140,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    overflow: "hidden",
  },
  itemImage: {
    width: 110,
    height: 110,
  },
  itemContent: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  itemName: {
    fontSize: 16,
    fontWeight: "700",
  },
  itemDescription: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  itemPrice: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#FF6B35",
  },
  itemFooter: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValue: {
    minWidth: 20,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
  },
  deleteButton: {
    padding: 6,
  },
  summary: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: "#666",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  checkoutButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  checkoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "700",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  shopButton: {
    marginTop: 20,
    backgroundColor: "#FF6B35",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
  },
  shopButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});