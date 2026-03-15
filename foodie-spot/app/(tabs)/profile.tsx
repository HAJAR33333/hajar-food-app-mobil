import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MapPin, Heart, ShoppingBag, Phone, Share2, Camera, ChevronRight, LogOut } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { userAPI, uploadAPI, orderAPI } from '@/services/api';
import type { User } from '@/types';
import log from '@/services/logger';
import { useToast } from '@/components/toast-provider';
import { useAuth } from '@/contexts/auth-context';
import { useTranslation } from 'react-i18next';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [orderCount, setOrderCount] = useState<number>(0);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [averageRating, setAverageRating] = useState<number>(4.8);
  const { logout } = useAuth();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setIsLoading(true);
    try {
      const [userData, orders] = await Promise.all([
        userAPI.getCurrentUser(),
        orderAPI.getOrders(),
      ]);

      const fallbackUser: User = {
        id: 'demo-user',
        name: 'Demo User',
        email: 'demo@demo.com',
        phone: '',
        photo: '',
        addresses: [{
          id: 'addr-demo',
          label: 'Maison',
          street: '123 Rue de Commerce',
          city: 'Paris',
          postalCode: '75001',
          country: 'France',
          coordinates: { latitude: 48.8566, longitude: 2.3522 },
        }],
        favoriteRestaurants: [],
      };

      const currentUser = userData ? {
        ...userData,
        favoriteRestaurants: userData.favoriteRestaurants || [],
        addresses: userData.addresses?.length ? userData.addresses : fallbackUser.addresses,
      } : fallbackUser;

      setUser(currentUser);
      setOrderCount(orders.length);
      setLastOrderId(orders?.[0]?.id ?? null);
      const userRating = (userData as any)?.rating ?? 4.8;
      setAverageRating(Number(userRating) || 4.8);
    } catch (e) {
      log.error('Failed to load profile data:', e);
      setUser({
        id: 'demo-user',
        name: 'Demo User',
        email: 'demo@demo.com',
        phone: '',
        photo: '',
        addresses: [{
          id: 'addr-demo', label: 'Maison', street: '123 Rue de Commerce', city: 'Paris', postalCode: '75001', country: 'France', coordinates: { latitude: 48.8566, longitude: 2.3522 },
        }],
        favoriteRestaurants: [],
      });
      setOrderCount(0);
      setAverageRating(4.8);
    } finally {
      setIsLoading(false);
    }
  };


  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Nous avons besoin d'accéder à vos photos");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos', 'livePhotos'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      try {
        const imageUrl = await uploadAPI.uploadImage(result.assets[0].uri, 'profile');
        await userAPI.updateProfile({ photo: imageUrl });
        await loadUser();
        toast.success('Photo de profil mise à jour !');
      } catch (error) {
        log.error('Failed to upload profile photo:', error);
        Alert.alert('Erreur', 'Impossible de télécharger la photo');
      }
    }
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.loading, { padding: 20 }] }>
          <View style={[styles.avatarPlaceholder, { width: 80, height: 80 }]} />
          <View style={{ width: '60%', height: 20, borderRadius: 8, backgroundColor: '#f0f0f0', marginTop: 16 }} />
          <View style={{ width: '45%', height: 16, borderRadius: 8, backgroundColor: '#f0f0f0', marginTop: 8 }} />
          <View style={{ width: '35%', height: 16, borderRadius: 8, backgroundColor: '#f0f0f0', marginTop: 8 }} />
          <View style={{ width: '100%', height: 120, borderRadius: 12, backgroundColor: '#f0f0f0', marginTop: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={{ color: '#666' }}>{t('profile.no_user_message', 'Aucun utilisateur connecté. Veuillez vous reconnecter.')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.profileContainer}>
            <View style={styles.avatarContainer}>
              {user.photo ? (
                <Image source={{ uri: user.photo }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{user?.name ? user.name.charAt(0).toUpperCase() : '?'}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.cameraButton} onPress={handlePickImage}>
                <Camera size={14} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <Text style={styles.phone}>{user.phone}</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{orderCount}</Text>
            <Text style={styles.statLabel}>Commandes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.favoriteRestaurants?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Favoris</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{averageRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avis</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/cart')}>
            <Text style={styles.quickActionText}>Commandes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
              if (!lastOrderId) {
                Alert.alert('Aucune commande de suivi', 'Votre historique de commandes est vide pour le moment.');
                return;
              }
              router.push({ pathname: '/tracking/[orderId]', params: { orderId: lastOrderId } });
            }}
          >
            <Text style={styles.quickActionText}>Voir le suivi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/notifications')}>
            <Text style={styles.quickActionText}>🔔 Notifications</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/addresses')}>
            <MapPin size={20} color="#666" />
            <Text style={styles.menuText}>Mes adresses</Text>
            <View style={styles.menuRight}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{user.addresses?.length ?? 0}</Text>
              </View>
              <ChevronRight size={18} color="#ccc" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/favorites')}>
            <Heart size={20} color="#666" />
            <Text style={styles.menuText}>Mes favoris</Text>
            <View style={styles.menuRight}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{user.favoriteRestaurants.length}</Text>
              </View>
              <ChevronRight size={18} color="#ccc" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/cart')}>
            <ShoppingBag size={20} color="#666" />
            <Text style={styles.menuText}>Historique</Text>
            <ChevronRight size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Phone size={20} color="#666" />
            <Text style={styles.menuText}>Support</Text>
            <ChevronRight size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Share2 size={20} color="#666" />
            <Text style={styles.menuText}>Partager l&apos;app</Text>
            <ChevronRight size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
            <LogOut size={20} color="#FF6B35" />
            <Text style={[styles.menuText, styles.logoutText]}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  profileContainer: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  phone: {
    fontSize: 12,
    color: '#999',
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: '#FFE5DB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFEDE2',
  },
  quickActionText: {
    color: '#FF6B35',
    fontWeight: '700',
  },
});


