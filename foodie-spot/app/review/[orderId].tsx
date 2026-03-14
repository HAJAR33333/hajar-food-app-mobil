import { useMemo, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, Camera, Star, X } from "lucide-react-native";
import { reviewAPI } from "@/services/api";

type ReviewImage = {
  uri: string;
  name: string;
  type: string;
};

export default function ReviewScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [restaurantId, setRestaurantId] = useState("r1"); // à remplacer plus tard par la vraie valeur
  const [images, setImages] = useState<ReviewImage[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return !!orderId && !!restaurantId && rating > 0 && !submitting;
  }, [orderId, restaurantId, rating, submitting]);

  const handlePickImages = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission refusée", "L'accès à la galerie est nécessaire.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });

      if (result.canceled) return;

      const selected = result.assets.map((asset, index) => {
        const uri = asset.uri;
        const ext = uri.split(".").pop() || "jpg";

        return {
          uri,
          name: `review_${Date.now()}_${index}.${ext}`,
          type: ext === "jpg" ? "image/jpeg" : `image/${ext}`,
        };
      });

      setImages((prev) => [...prev, ...selected].slice(0, 5));
    } catch (error) {
      console.error(error);
      Alert.alert("Erreur", "Impossible de sélectionner les images.");
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

const handleSubmitReview = async () => {
  if (rating === 0) {
    Alert.alert("Erreur", "Veuillez choisir une note.");
    return;
  }

  setSubmitting(true);

  await submit();

  setSubmitting(false);

  Alert.alert("Merci ⭐", "Review submitted successfully!", [
    {
      text: "OK",
      onPress: () => router.replace("/(tabs)"),
    },
  ]);
};

const submit = () =>
  new Promise((resolve) => setTimeout(resolve, 1200));

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#111" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Votre avis</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Comment s’est passée votre commande ?</Text>
          <Text style={styles.heroSubtitle}>
            Donnez une note et partagez votre expérience.
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((value) => {
              const active = value <= rating;

              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.starWrapper, active && styles.starWrapperActive]}
                  onPress={() => setRating(value)}
                >
                  <Star
                    size={30}
                    color={active ? "#FFC107" : "#CFCFCF"}
                    fill={active ? "#FFC107" : "transparent"}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.ratingText}>
            {rating === 0
              ? "Touchez une étoile pour noter"
              : rating === 1
              ? "Très déçu"
              : rating === 2
              ? "Décevant"
              : rating === 3
              ? "Correct"
              : rating === 4
              ? "Très bien"
              : "Excellent"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Commentaire</Text>
          <Text style={styles.sectionSubtitle}>
            Décrivez ce que vous avez aimé ou moins aimé.
          </Text>

          <TextInput
            style={styles.textArea}
            placeholder="Ex: livraison rapide, plat chaud, très bon goût..."
            multiline
            textAlignVertical="top"
            value={comment}
            onChangeText={setComment}
            maxLength={500}
            placeholderTextColor="#999"
          />

          <Text style={styles.counter}>{comment.length}/500</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ajouter des photos</Text>
          <Text style={styles.sectionSubtitle}>
            Montrez votre plat ou votre expérience de livraison.
          </Text>

          <TouchableOpacity style={styles.uploadButton} onPress={handlePickImages}>
            <Camera size={18} color="#FF6B35" />
            <Text style={styles.uploadButtonText}>Choisir des photos</Text>
          </TouchableOpacity>

          {images.length > 0 && (
            <View style={styles.imagesGrid}>
              {images.map((image, index) => (
                <View key={`${image.uri}-${index}`} style={styles.imageWrapper}>
                  <Image source={{ uri: image.uri }} style={styles.imagePreview} contentFit="cover" />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <X size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmitReview}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Envoyer mon avis</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F4F4F4",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111",
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    gap: 10,
    flexWrap: "wrap",
  },
  starWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  starWrapperActive: {
    backgroundColor: "#FFF8E1",
    borderColor: "#FFD54F",
  },
  ratingText: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    color: "#444",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  sectionSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#777",
    lineHeight: 20,
  },
  textArea: {
    minHeight: 130,
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111",
  },
  counter: {
    marginTop: 8,
    textAlign: "right",
    color: "#888",
    fontSize: 12,
  },
  uploadButton: {
    marginTop: 16,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#FF6B35",
    backgroundColor: "#FFF6F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadButtonText: {
    color: "#FF6B35",
    fontWeight: "700",
    fontSize: 15,
  },
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  imageWrapper: {
    position: "relative",
  },
  imagePreview: {
    width: 92,
    height: 92,
    borderRadius: 14,
    backgroundColor: "#EEE",
  },
  removeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E53935",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButton: {
    marginTop: 4,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6B35",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});