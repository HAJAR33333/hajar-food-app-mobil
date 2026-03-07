import { MapPin, Search } from 'lucide-react-native';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CategoryList } from '@/components/category-list';
import { RestaurantCard } from '@/components/restaurant-card';
import { restaurantAPI } from '@/services/api';
import { locationService } from '@/services/location';
import { Restaurant } from '@/types';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<string>('Locating...');

  useEffect(() => {
    // Fetch restaurants data
    loadData();
    getCurrentLocation();
  }, []);

  const loadData = async () => {
    try {
      const data = await restaurantAPI.getRestaurants();
      setRestaurants(data);
    } catch (error) {
      // log.error("Failed to load restaurants", error);
      Alert.alert("Error", "Failed to load restaurants");
    }
    finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    const coords = await locationService.getCurrentLocation();
    if (coords) {
      const address = await locationService.reverseGeoCode(coords);
      if (address) {
        setLocation(address);
      }
    }

  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.locationContainer}>
          <MapPin size={20} color="#fff" />
          <View style= {{ flex: 1}}>
            <Text style={styles.locationLabel}>Livraison à </Text>
            <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/(tabs)/search')}>
        <Search size={20} color="#666" />
        <Text style={styles.searchPlaceholder}>Rechercher un restaurant...</Text>
        </TouchableOpacity>
      </View>


      <ScrollView showsVerticalScrollIndicator={false} style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
         <View style={styles.promoBanner}>
          <Text style={styles.promoLabel}>Offre spéciale</Text>
          <Text style={styles.promoTitle}>-30% sur votre première commande</Text>
          <Text style={styles.promoCode}>Code: FOODIE30</Text>
         </View>

          <CategoryList />

          <View style={styles.section}>
              <Text style={styles.sectionTitle}> A proximité</Text>
              {restaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} onPress={() => router.push(`/restaurant/${restaurant.id}`)} />
              ))}
              {!loading && restaurants.length === 0 && <Text style={styles.emptyText}>Aucun restaurant trouvé</Text>}
              {/* {loading && <Text>Chargement des restaurants...</Text>} */}
          </View>
         
      </ScrollView>
    
    </SafeAreaView>
  );

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#FF6B35',
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
    color: 'rgba(255, 255, 255, 0.8)',
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.5)',
  },
  content : {
    flex: 1,
  },
  promoBanner: {
    margin: 16,
    padding: 16,
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
  },
  promoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  promoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  promoCode: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
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
    color: '#666',
    textAlign: 'center',
  }

});
