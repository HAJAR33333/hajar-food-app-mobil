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
import { Dish, Restaurant, Address } from "@/types";
import { router, useLocalSearchParams } from "expo-router";
import { restaurantAPI, userAPI } from "@/services/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { ArrowLeft, Clock, Heart, MapPin, Navigation, Phone, Share2, Star } from "lucide-react-native";
import { DishCard } from "@/components/dish-card";
import { useTranslation } from "react-i18next";
import { locationService } from "@/services/location";

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<Dish[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [deliveryCost, setDeliveryCost] = useState<number | null>(null);

  useEffect(() => {
    loadRestaurant();
  }, [id]);

  const getDistanceKm = (coord1: { latitude: number; longitude: number }, coord2: { latitude: number; longitude: number }) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(coord2.latitude - coord1.latitude);
    const dLon = toRad(coord2.longitude - coord1.longitude);
    const lat1 = toRad(coord1.latitude);
    const lat2 = toRad(coord2.latitude);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateDelivery = (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) => {
    const distanceKm = getDistanceKm(from, to);
    const time = Math.max(15, Math.round(15 + distanceKm * 7));
    const fee = Number((2.5 + distanceKm * 0.9).toFixed(2));
    return { distanceKm, time, fee };
  };

  const updateDeliveryEstimation = (restaurantCoord: { latitude: number; longitude: number } | undefined) => {
    if (!restaurantCoord) {
      setEstimatedTime(null);
      setDeliveryCost(null);
      return;
    }
    const target = selectedAddress?.coordinates || userLocation;
    if (!target) {
      setEstimatedTime(null);
      setDeliveryCost(null);
      return;
    }
    const result = calculateDelivery(restaurantCoord, target);
    setEstimatedTime(result.time);
    setDeliveryCost(result.fee);
  };

  const loadRestaurant = async () => {
    try {
      setLoading(true);
      const restaurantData = await restaurantAPI.getRestaurantById(id);
      const menuData = await restaurantAPI.getMenu(id);
      setRestaurant(restaurantData);
      setMenu(menuData);
      setIsFavorite(restaurantData?.isFavorite || false);

      const user = await userAPI.getCurrentUser();
      const availableAddresses = user?.addresses || [];
      setAddresses(availableAddresses);
      if (availableAddresses.length > 0) {
        setSelectedAddress(availableAddresses[0]);
      }

      const current = await locationService.getCurrentLocation();
      if (current) {
        setUserLocation(current);
        if (!availableAddresses.length) {
          setSelectedAddress({
            id: 'current-location',
            label: t('restaurant.current_location'),
            street: t('restaurant.current_location'),
            city: '',
            postalCode: '',
            country: '',
            coordinates: current,
          } as Address);
        }
      }
    } catch (err) {
      Alert.alert(t('home.error'), t('restaurant.error_load'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurant) {
      updateDeliveryEstimation(restaurant.coordinates);
    }
  }, [restaurant, selectedAddress, userLocation]);

  const handleToggleFavorite = async () => {
    if (!id) {
      Alert.alert(t('home.error'), t('restaurant.error_favorite')); 
      return;
    }

    const previousState = isFavorite;
    setIsFavorite(!isFavorite);

    try {
      const newFavorite = await restaurantAPI.toggleFavorite(id);
      setIsFavorite(newFavorite);
    } catch (error: any) {
      console.error('Toggle favorite failed', error?.response?.data || error?.message || error);
      setIsFavorite(previousState);
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
                  ? typeof restaurant.deliveryTime === 'object'
                    ? `${restaurant.deliveryTime.min}-${restaurant.deliveryTime.max} min`
                    : `${restaurant.deliveryTime} min`
                  : t('restaurant.unknown')}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MapPin size={16} color="#666" />
              <Text style={styles.metaText}>{restaurant.distance} km</Text>
            </View>
          </View>

          <View style={styles.estimateCard}>
            <Text style={styles.estimateTitle}>{t('restaurant.delivery_estimate')}</Text>
            <Text style={styles.estimateSubtitle}>{t('restaurant.choose_delivery_address')}</Text>
            <View style={styles.addressList}>
              {addresses.length > 0 ? (
                addresses.map((address) => (
                  <TouchableOpacity
                    key={address.id}
                    style={[
                      styles.addressItem,
                      selectedAddress?.id === address.id ? styles.addressSelected : null,
                    ]}
                    onPress={() => setSelectedAddress(address)}
                  >
                    <Text style={[styles.addressLabel, selectedAddress?.id === address.id ? styles.addressLabelSelected : null]}>{address.label || address.street || `${address.city}`}</Text>
                    <Text style={styles.addressSmall}>{`${address.street}, ${address.city}`}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.addressItem}>
                  <Text style={styles.addressLabel}>{t('restaurant.current_location')}</Text>
                  <Text style={styles.addressSmall}>{t('restaurant.current_location_subtitle')}</Text>
                </View>
              )}
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>{t('restaurant.estimated_time')}</Text>
              <Text style={styles.estimateValue}>{estimatedTime ? `${estimatedTime} min` : t('restaurant.unknown')}</Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>{t('restaurant.delivery_cost')}</Text>
              <Text style={styles.estimateValue}>{deliveryCost !== null ? `€${deliveryCost.toFixed(2)}` : t('restaurant.unknown')}</Text>
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
        id: String(dish.id),
        restaurantId: String(restaurant.id),
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
  estimateCard: { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 12, marginTop: 12, borderColor: '#FCD34D', borderWidth: 1 },
  estimateTitle: { fontWeight: '700', fontSize: 15, marginBottom: 4, color: '#C2410C' },
  estimateSubtitle: { color: '#6B7280', fontSize: 12, marginBottom: 8 },
  addressList: { marginTop: 8 },
  addressItem: { backgroundColor: '#fff', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 6 },
  addressSelected: { borderColor: '#FF6B35', backgroundColor: '#FFFAF0' },
  addressLabel: { color: '#111827', fontWeight: '600', fontSize: 14 },
  addressLabelSelected: { color: '#C2410C' },
  addressSmall: { color: '#6B7280', fontSize: 12 },
  estimateRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  estimateLabel: { color: '#374151', fontWeight: '600' },
  estimateValue: { color: '#111827', fontWeight: '700' },
  menuTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 }
});