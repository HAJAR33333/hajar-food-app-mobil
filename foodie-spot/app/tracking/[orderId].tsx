import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, View, RefreshControl } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from "react-native-maps";
import { orderAPI } from "@/services/api";

export default function TrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [tracking, setTracking] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [driverCoordinate, setDriverCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const driverMarkerRef = useRef<any>(null);

  const trackOrder = useCallback(async () => {
    if (!orderId) {
      setErrorMessage('Aucun numéro de commande fourni.');
      return;
    }
    try {
      const data = await orderAPI.getOrderTracking(orderId);
      setTracking(data);
      setErrorMessage(null);

      const restaurantLocation = data?.restaurant?.location;
      const userLocation = data?.deliveryAddress;
      const driverLocation = data?.driverLocation;

      if (restaurantLocation && !initialRegion) {
        setInitialRegion({
          latitude: restaurantLocation.latitude,
          longitude: restaurantLocation.longitude,
          latitudeDelta: 0.07,
          longitudeDelta: 0.07,
        });
      }

      if (driverLocation) {
        const next = {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
        };
        if (driverMarkerRef.current && typeof driverMarkerRef.current.animateMarkerToCoordinate === 'function') {
          driverMarkerRef.current.animateMarkerToCoordinate(next, 1000);
        }
        setDriverCoordinate(next);
      }

      if (restaurantLocation && userLocation && mapRef.current) {
        mapRef.current.fitToCoordinates(
          [
            {
              latitude: restaurantLocation.latitude,
              longitude: restaurantLocation.longitude,
            },
            {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            },
            ...(driverLocation ? [{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }] : []),
          ],
          {
            edgePadding: { top: 80, right: 50, bottom: 160, left: 50 },
            animated: true,
          }
        );
      }
    } catch (error) {
      console.error('Failed to load tracking', error);
      setErrorMessage('Impossible de charger le suivi. Veuillez réessayer.');
    }
  }, [orderId, initialRegion]);

  useEffect(() => {
    trackOrder();
    const timer = setInterval(() => {
      trackOrder();
    }, 12000);
    return () => clearInterval(timer);
  }, [trackOrder]);

  const onRefresh = async () => {
    setRefreshing(true);
    await trackOrder();
    setRefreshing(false);
  };

  const order = tracking;
  const driver = order?.driver;
  const restaurant = order?.restaurant;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Suivi de la commande</Text>
        <Text style={styles.subtitle}>Commande #{order?.orderNumber ?? order?.orderId ?? 'N/A'}</Text>
        {errorMessage ? (
          <View style={[styles.card, { borderColor: '#ffc7c7', backgroundColor: '#fff1f1' }]}>
            <Text style={{ color: '#cc0000', fontWeight: '700' }}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Statut</Text>
          <Text style={styles.status}>{order?.status ?? 'En attente'}</Text>
          <Text style={styles.cardLabel}>Adresse de livraison</Text>
          <Text style={styles.value}>{
            order?.deliveryAddress
              ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city}`
              : 'N/A'
          }</Text>
        </View>

        {restaurant ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Restaurant</Text>
            <Text style={styles.value}>{restaurant.name}</Text>
            <Text style={styles.smallText}>{restaurant.location?.address}</Text>
          </View>
        ) : null}

        {order?.estimatedArrival ? (
          <View style={styles.badge}><Text style={styles.badgeText}>Livraison estimée: {new Date(order.estimatedArrival).toLocaleTimeString()}</Text></View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Timeline</Text>
          {order?.timeline?.map((step: any) => (
            <View key={step.status} style={styles.stepRow}>
              <View style={[styles.dot, step.status === order.status ? styles.dotActive : {}]} />
              <View style={styles.stepTextBlock}>
                <Text style={styles.stepLabel}>{step.message || step.status}</Text>
                <Text style={styles.stepTime}>{step.timestamp ? new Date(step.timestamp).toLocaleString() : '-'}</Text>
              </View>
            </View>
          ))}
        </View>

        {driver ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Livreur</Text>
            <Text style={styles.value}>{driver.name}</Text>
            <Text style={styles.smallText}>📞 {driver.phone}</Text>
            <Text style={styles.smallText}>🚲 {driver.vehicle}</Text>
            <Text style={styles.smallText}>⭐ {driver.rating} ({driver.totalDeliveries} livraisons)</Text>
          </View>
        ) : null}

        {order?.restaurant?.location ? (
          <View style={styles.mapCard}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={initialRegion ?? {
                latitude: order.restaurant.location.latitude,
                longitude: order.restaurant.location.longitude,
                latitudeDelta: 0.08,
                longitudeDelta: 0.08,
              }}
              showsUserLocation={false}
              zoomControlEnabled
            >
              <Marker
                coordinate={{
                  latitude: order.restaurant.location.latitude,
                  longitude: order.restaurant.location.longitude,
                }}
                title={order.restaurant.name}
                description="Restaurant"
              />

              {order?.deliveryAddress?.latitude && order?.deliveryAddress?.longitude ? (
                <Marker
                  coordinate={{
                    latitude: order.deliveryAddress.latitude,
                    longitude: order.deliveryAddress.longitude,
                  }}
                  title="Adresse de livraison"
                  pinColor="green"
                />
              ) : null}

              {driverCoordinate ? (
                <Marker.Animated
                  ref={driverMarkerRef}
                  coordinate={driverCoordinate}
                  title="Livreur"
                  description="En route"
                  pinColor="blue"
                />
              ) : order.driverLocation ? (
                <Marker
                  coordinate={{
                    latitude: order.driverLocation.latitude,
                    longitude: order.driverLocation.longitude,
                  }}
                  title="Livreur"
                  pinColor="blue"
                />
              ) : null}
            </MapView>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#666', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0', padding: 12, gap: 6 },
  cardTitle: { fontWeight: '700', marginBottom: 6 },
  status: { fontSize: 18, fontWeight: '700', color: '#FF6B35' },
  cardLabel: { marginTop: 8, fontSize: 12, color: '#888' },
  value: { fontSize: 15, fontWeight: '600' },
  smallText: { color: '#555', fontSize: 13 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#d1d5db', marginRight: 8 },
  dotActive: { backgroundColor: '#10b981' },
  stepTextBlock: { flex: 1 },
  stepLabel: { fontWeight: '500', fontSize: 13 },
  stepTime: { color: '#777', fontSize: 11 },
  mapCard: { height: 220, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0' },
  map: { flex: 1 },
  badge: { marginTop: 6, backgroundColor: '#ecfdf3', borderRadius: 10, padding: 8, alignItems: 'center' },
  badgeText: { color: '#065f46', fontWeight: '700' },
});