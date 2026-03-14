import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, CheckCircle2, CreditCard, MapPin, Ticket } from "lucide-react-native";
import { Dish } from "@/types";

const CART_STORAGE_KEY = "cart_items";

type CartItem = Dish & {
  quantity: number;
  restaurantId: string;
};

type PaymentMethod = "card" | "cash" | "paypal";

export default function CheckoutScreen() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [address, setAddress] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
      const items: CartItem[] = raw ? JSON.parse(raw) : [];
      setCartItems(items);
    } catch (error) {
      console.error("Failed to load cart:", error);
      Alert.alert("Erreur", "Impossible de charger la commande.");
    } finally {
      setLoading(false);
    }
  };

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cartItems]);

  const deliveryFee = useMemo(() => {
    return cartItems.length > 0 ? 2.99 : 0;
  }, [cartItems]);

  const discount = useMemo(() => {
    if (!promoApplied) return 0;
    return subtotal * 0.1;
  }, [promoApplied, subtotal]);

  const total = useMemo(() => {
    return subtotal + deliveryFee - discount;
  }, [subtotal, deliveryFee, discount]);

  const totalItems = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const handleApplyPromo = () => {
    const normalized = promoCode.trim().toUpperCase();

    if (!normalized) {
      Alert.alert("Code promo", "Veuillez saisir un code promo.");
      return;
    }

    if (normalized === "PROMO10") {
      setPromoApplied(true);
      Alert.alert("Succès", "Code promo appliqué : -10%");
      return;
    }

    setPromoApplied(false);
    Alert.alert("Code invalide", "Ce code promo n'est pas valide.");
  };

  const handleConfirmOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert("Panier vide", "Ajoutez des articles avant de confirmer.");
      return;
    }

    if (!address.trim()) {
      Alert.alert("Adresse requise", "Veuillez renseigner votre adresse de livraison.");
      return;
    }

    try {
      setSubmitting(true);

      // Ici tu pourras remplacer par un vrai appel API :
      // await orderAPI.createOrder({...})

      await AsyncStorage.removeItem(CART_STORAGE_KEY);

      Alert.alert(
        "Commande confirmée",
        "Votre commande a bien été enregistrée.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/cart"),
          },
        ]
      );
    } catch (error) {
      console.error("Checkout error:", error);
      Alert.alert("Erreur", "Impossible de confirmer la commande.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Chargement du paiement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Paiement</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Votre panier est vide</Text>
          <Text style={styles.emptyText}>
            Ajoutez des articles avant de passer au paiement.
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace("/cart")}>
            <Text style={styles.primaryButtonText}>Retour au panier</Text>
          </TouchableOpacity>
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
        <Text style={styles.title}>Paiement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <MapPin size={18} color="#FF6B35" />
            <Text style={styles.sectionTitle}>Adresse de livraison</Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Entrez votre adresse complète"
            value={address}
            onChangeText={setAddress}
            multiline
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <CreditCard size={18} color="#FF6B35" />
            <Text style={styles.sectionTitle}>Mode de paiement</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.optionCard,
              paymentMethod === "card" && styles.optionCardSelected,
            ]}
            onPress={() => setPaymentMethod("card")}
          >
            <Text style={styles.optionTitle}>Carte bancaire</Text>
            <Text style={styles.optionSubtitle}>Paiement sécurisé par carte</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              paymentMethod === "cash" && styles.optionCardSelected,
            ]}
            onPress={() => setPaymentMethod("cash")}
          >
            <Text style={styles.optionTitle}>Paiement à la livraison</Text>
            <Text style={styles.optionSubtitle}>Régler en espèces à la réception</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              paymentMethod === "paypal" && styles.optionCardSelected,
            ]}
            onPress={() => setPaymentMethod("paypal")}
          >
            <Text style={styles.optionTitle}>PayPal</Text>
            <Text style={styles.optionSubtitle}>Payer avec votre compte PayPal</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ticket size={18} color="#FF6B35" />
            <Text style={styles.sectionTitle}>Code promo</Text>
          </View>

          <View style={styles.promoRow}>
            <TextInput
              style={[styles.input, styles.promoInput]}
              placeholder="Ex: PROMO10"
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
            />

            <TouchableOpacity style={styles.applyButton} onPress={handleApplyPromo}>
              <Text style={styles.applyButtonText}>Appliquer</Text>
            </TouchableOpacity>
          </View>

          {promoApplied ? (
            <View style={styles.successBox}>
              <CheckCircle2 size={16} color="#2E7D32" />
              <Text style={styles.successText}>Code promo appliqué avec succès.</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Récapitulatif</Text>

          {cartItems.map((item) => (
            <View key={`${item.restaurantId}-${item.id}`} style={styles.summaryItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryItemName}>
                  {item.name} x{item.quantity}
                </Text>
                <Text style={styles.summaryItemMeta}>
                  {item.price.toFixed(2)} € / unité
                </Text>
              </View>

              <Text style={styles.summaryItemPrice}>
                {(item.price * item.quantity).toFixed(2)} €
              </Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Articles ({totalItems})</Text>
            <Text style={styles.totalValue}>{subtotal.toFixed(2)} €</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Livraison</Text>
            <Text style={styles.totalValue}>{deliveryFee.toFixed(2)} €</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Réduction</Text>
            <Text style={styles.discountValue}>- {discount.toFixed(2)} €</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{total.toFixed(2)} €</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
          onPress={handleConfirmOrder}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? "Confirmation..." : "Confirmer la commande"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 24,
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  section: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    borderRadius: 14,
    padding: 14,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#fafafa",
  },
  optionCard: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  optionCardSelected: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF4EF",
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  optionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#666",
  },
  promoRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  promoInput: {
    flex: 1,
  },
  applyButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 10,
  },
  applyButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  successBox: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#4CAF50",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  successText: {
    color: "#2E7D32",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  summaryItemName: {
    fontSize: 15,
    fontWeight: "600",
  },
  summaryItemMeta: {
    marginTop: 2,
    fontSize: 13,
    color: "#666",
  },
  summaryItemPrice: {
    fontSize: 15,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 15,
    color: "#666",
  },
  totalValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  discountValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2E7D32",
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: "700",
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF6B35",
  },
  emptyTitle: {
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
  primaryButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});