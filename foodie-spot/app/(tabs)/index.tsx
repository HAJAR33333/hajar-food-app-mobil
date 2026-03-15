import { MapPin, Search } from 'lucide-react-native';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { CategoryList } from '@/components/category-list';
import { RestaurantCard } from '@/components/restaurant-card';
import { Colors } from '@/constants/theme';
import { Promo, restaurantAPI } from '@/services/api';
import { locationService } from '@/services/location';
import { Restaurant } from '@/types';
import { router } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function HomeScreen() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const currentLang = i18n.language || 'fr';
    const newLang = currentLang.startsWith('fr') ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
  };
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [location, setLocation] = useState<string>(t('home.locating'));
  const [promo, setPromo] = useState<Promo | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);

      const promoData = await restaurantAPI.getActivePromo();
      setPromo(promoData);

      const coords = await locationService.getCurrentLocation();
      if (coords) {
        const address = await locationService.reverseGeoCode(coords);
        if (address) {
          setLocation(address);
        }
        const data = await restaurantAPI.getRestaurants({ lat: coords.latitude, lng: coords.longitude, radius: 20 });
        setRestaurants(data);
      } else {
        const data = await restaurantAPI.getRestaurants();
        setRestaurants(data);
      }
    } catch (error) {
      Alert.alert(t('home.error'), t('home.error_loading'));
    }
    finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = useCallback(async (restaurantId: string, currentlyFavorite: boolean) => {
    // Optimistic Update
    setRestaurants((prev) => 
      prev.map((r) => r.id === restaurantId ? { ...r, isFavorite: !currentlyFavorite } : r)
    );
    try {
      const newFavorite = await restaurantAPI.toggleFavorite(restaurantId);
      setRestaurants((prev) => 
        prev.map((r) => r.id === restaurantId ? { ...r, isFavorite: newFavorite } : r)
      );
    } catch (error: any) {
      setRestaurants((prev) => 
        prev.map((r) => r.id === restaurantId ? { ...r, isFavorite: currentlyFavorite } : r)
      );
      const errMessage = error?.response?.data?.message || error?.message || t('home.error_loading');
      Alert.alert(t('home.error'), String(errMessage));
    }
  }, [t]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colorScheme === 'dark' ? '#121212' : colors.tint }]}> 
        <View style={styles.locationContainer}>
          <MapPin size={20} color={colorScheme === 'dark' ? '#fff' : '#fff'} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.locationLabel, { color: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.9)' }]}>{t('home.deliver_to')} </Text>
            <Text style={[styles.locationText, { color: '#fff' }]} numberOfLines={1}>{location}</Text>
          </View>
          <TouchableOpacity
            style={styles.langButton}
            onPress={toggleLanguage}
          >
            <Text style={styles.langButtonText}>{i18n.language?.startsWith('fr') ? 'EN' : 'FR'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.searchBar, { backgroundColor: colorScheme === 'dark' ? '#1f1f1f' : '#fff', borderColor: colorScheme === 'dark' ? '#333' : '#ECECEC' }]} onPress={() => router.push('/(tabs)/search')}>
          <Search size={20} color={colorScheme === 'dark' ? '#fff' : '#666'} />
          <Text style={[styles.searchPlaceholder, { color: colorScheme === 'dark' ? '#ddd' : '#666' }]}>{t('home.search_placeholder')}</Text>
        </TouchableOpacity>
      </View>


      <ScrollView showsVerticalScrollIndicator={false} style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {promo && (
          <View style={[styles.promoBanner, { backgroundColor: colorScheme === 'dark' ? '#6d28d9' : '#8b5cf6' }] }>
            <Text style={[styles.promoLabel, { color: '#fff' }]}>{t('home.special_offer')}</Text>
            <Text style={[styles.promoTitle, { color: '#fff' }]}>{promo.title}</Text>
            <Text style={[styles.promoCode, { color: 'rgba(255,255,255,0.9)' }]}>Code: {promo.code}</Text>
          </View>
        )}

        <CategoryList />

        <View style={[styles.section, { backgroundColor: colors.background }] }>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.nearby')}</Text>

          {loading ? (
            <ActivityIndicator size="large" color={colors.tint} style={{ margin: 20 }} />
          ) : (
            <>
              {restaurants.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  onPress={() => router.push(`/restaurant/${restaurant.id}`)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
              {restaurants.length === 0 && <Text style={[styles.emptyText, { color: colors.icon }]}>{t('home.no_restaurant_found')}</Text>}
            </>
          )}
        </View>

      </ScrollView>

    </SafeAreaView>
  );

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 12,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
  },
  langButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  langButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  promoBanner: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  promoLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  promoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  promoCode: {
    fontSize: 14,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
  }

});
