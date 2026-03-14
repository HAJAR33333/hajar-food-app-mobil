import { useEffect, useState } from "react";
import { 
  Alert, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  ActivityIndicator, 
  Linking, 
  Platform,
  Share 
} from "react-native";
import { Dish, Restaurant } from "@/types";
import { router, useLocalSearchParams } from "expo-router";
import { restaurantAPI, userAPI } from "@/services/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { ArrowLeft, Clock, Heart, MapPin, Navigation, Phone, Share2, Star } from "lucide-react-native";
import { DishCard } from "@/components/dish-card";
import { useTranslation } from "react-i18next";

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<Dish[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRestaurant();
  }, [id]);

  const loadRestaurant = async () => {
    try {
      setLoading(true);
      const restaurantData = await restaurantAPI.getRestaurantById(id);
      const menuData = await restaurantAPI.getMenu(id);
      setRestaurant(restaurantData);
      setMenu(menuData);
      setIsFavorite(restaurantData?.isFavorite || false);
    } catch (err) {
      Alert.alert(t('home.error'), t('restaurant.error_load'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await userAPI.toggleFavorite(id);
      setIsFavorite(!isFavorite);
    } catch (error) {
      Alert.alert(t('home.error'), t('restaurant.error_favorite'));
    }
  };

  const handleCall = () => {
    if (restaurant?.phone) {
      Linking.openURL(`tel:${restaurant.phone}`);
    } else {
      Alert.alert(t('home.error'), t('restaurant.no_phone'));
    }
  };

  const handleDirections = async () => {
  if (!restaurant?.location) {
    Alert.alert(t('home.error'), t('restaurant.no_location'));
    return;
  }

  const { latitude, longitude } = restaurant.location;

  if (latitude == null || longitude == null) {
    Alert.alert(t('home.error'), t('restaurant.no_location'));
    return;
  }

  const label = encodeURIComponent(restaurant.name || "Restaurant");

  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?ll=${latitude},${longitude}&q=${label}`
      : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;

  try {
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      await Linking.openURL(fallbackUrl);
    }
  } catch (error) {
    Alert.alert(t('home.error'), t('restaurant.error_load'));
  }
};

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${restaurant?.name}\n${restaurant?.cuisine}\n${restaurant?.image}`,
      });
    } catch (error) {
      Alert.alert(t('home.error'), t('restaurant.error_share'));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text>{t('restaurant.not_found')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* IMAGE HEADER */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: restaurant.image }} style={styles.image} />
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="rgba(0,0,0,0.8)" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleToggleFavorite}>
              <Heart size={24} color={isFavorite ? '#FF6B35' : '#000'} fill={isFavorite ? '#FF6B35' : 'transparent'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Share2 size={18} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* INFO */}
        <View style={styles.info}>
          <Text style={styles.name}>{restaurant.name}</Text>
          <Text style={styles.cuisine}>{restaurant.cuisine}</Text>
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Star size={16} color="#FFC107" fill="#FFC107" />
              <Text style={styles.metaText}>{restaurant.rating.toFixed(1)} ({restaurant.reviewsCount})</Text>
            </View>
            <View style={styles.metaItem}>
              <Clock size={16} color="#666" />
              <Text style={styles.metaText}>
                {restaurant.deliveryTime
                  ? `${restaurant.deliveryTime.min}-${restaurant.deliveryTime.max} min`
                  : t('restaurant.unknown')}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MapPin size={16} color="#666" />
              <Text style={styles.metaText}>{restaurant.distance} km</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleDirections}>
              <Navigation size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>{t('restaurant.directions')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleCall}>
              <Phone size={18} color="#666" />
              <Text style={styles.secondaryButtonText}>{t('restaurant.call')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* MENU */}
        <View style={styles.menu}>
          <Text style={styles.menuTitle}>{t('restaurant.menu')}</Text>
          {menu.map((dish) => (
            <DishCard
  key={dish.id}
  dish={dish}
  onPress={() =>
    router.push({
      pathname: "/dish/[id]",
      params: {
        id: dish.id,
        restaurantId: restaurant.id,
      },
    })
  }
/>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageContainer: { position: 'relative', height: 200 },
  image: { width: '100%', height: '100%' },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  headerActions: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', gap: 8 },
  actionButton: { marginTop: 34, width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  info: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  cuisine: { fontSize: 16, color: '#666', marginBottom: 12 },
  meta: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 14, color: '#666' },
  actions: { flexDirection: 'row', gap: 12 },
  primaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF6B35', borderRadius: 12, padding: 12 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F5F5F5', borderRadius: 12, padding: 12 },
  secondaryButtonText: { color: '#666', fontSize: 16, fontWeight: '600' },
  menu: { padding: 16 },
  menuTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 }
});