import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { RestaurantCard } from '@/components/restaurant-card';
import { restaurantAPI } from '@/services/api';
import { Restaurant } from '@/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useTranslation } from 'react-i18next';

export default function FavoritesScreen() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const data = await restaurantAPI.getFavorites();
      setFavorites(data);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  const handleToggleFavorite = async (restaurantId: string) => {
    // Keep a snapshot for revert
    const previousFavorites = [...favorites];
    
    // Optimistic Update: Remove immediately
    setFavorites(prev => prev.filter(r => r.id !== restaurantId));
    
    try {
      await restaurantAPI.toggleFavorite(restaurantId);
      // We don't necessarily need to reload everything if optimistic update holds, 
      // but to ensure sync with backend, we can optionally fetch quietly in background
      // await loadFavorites(); 
    } catch (error) {
      // Revert on error
      setFavorites(previousFavorites);
      console.error('Failed to toggle favorite', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme].background }]} edges={['top']}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: Colors[colorScheme].text }]}>Mes favoris</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#FF6B35" />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={() => <Text style={styles.emptyText}>Vous n&apos;avez pas encore de favoris.</Text>}
          renderItem={({ item }) => (
            <RestaurantCard
              restaurant={{ ...item, isFavorite: true }}
              onPress={() => {}}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  content: {
    padding: 16,
  },
});
