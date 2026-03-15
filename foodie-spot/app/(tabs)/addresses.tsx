import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Switch, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/toast-provider';
import { userAPI } from '@/services/api';
import { locationService } from '@/services/location';
import { Address } from '@/types';
import { Plus, Pencil, Trash2, ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const defaultLocation = {
  latitude: 48.8566,
  longitude: 2.3522,
};

const emptyForm = {
  label: '',
  street: '',
  city: '',
  postalCode: '',
  country: 'France',
  latitude: defaultLocation.latitude,
  longitude: defaultLocation.longitude,
  isDefault: false,
  instructions: '',
};

export default function AddressesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [region, setRegion] = useState<Region>({
    latitude: defaultLocation.latitude,
    longitude: defaultLocation.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const data = await userAPI.getAddresses();
      setAddresses(data || []);
    } catch (error) {
      console.error('Failed to load addresses', error);
      Alert.alert(t('addresses.failed_load', 'Échec du chargement des adresses'));
    } finally {
      setLoading(false);
    }
  };

  const openAdd = async () => {
    const location = await locationService.getCurrentLocation();
    const lat = location?.latitude ?? defaultLocation.latitude;
    const lng = location?.longitude ?? defaultLocation.longitude;
    setForm({ ...emptyForm, latitude: lat, longitude: lng });
    setRegion({ ...region, latitude: lat, longitude: lng });
    setEditingAddress(null);
    setModalOpen(true);
  };

  const openEdit = (address: Address) => {
    setEditingAddress(address);
    setForm({
      label: address.label || '',
      street: address.street || '',
      city: address.city || '',
      postalCode: address.postalCode || '',
      country: address.country || 'France',
      latitude: address.coordinates?.latitude ?? defaultLocation.latitude,
      longitude: address.coordinates?.longitude ?? defaultLocation.longitude,
      isDefault: (address as any).isDefault ?? false,
      instructions: (address as any).instructions ?? '',
    });
    setRegion({
      ...region,
      latitude: address.coordinates?.latitude ?? defaultLocation.latitude,
      longitude: address.coordinates?.longitude ?? defaultLocation.longitude,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const { label, street, city, postalCode, country, latitude, longitude, isDefault, instructions } = form;
    if (!label || !street || !city || !postalCode || !country) {
      Alert.alert(t('addresses.validation_error', 'Veuillez remplir tous les champs requis'));
      return;
    }

    try {
      if (editingAddress?.id) {
        await userAPI.updateAddress(editingAddress.id, {
          label,
          street,
          city,
          postalCode,
          country,
          latitude,
          longitude,
          isDefault,
          instructions,
        });
        toast.success(t('addresses.updated', 'Adresse mise à jour'));
      } else {
        await userAPI.addAddress({
          label,
          street,
          city,
          postalCode,
          country,
          latitude,
          longitude,
          isDefault,
          instructions,
        });
        toast.success(t('addresses.added', 'Adresse ajoutée'));
      }
      setModalOpen(false);
      await loadAddresses();
    } catch (error) {
      console.error('Failed to save address', error);
      Alert.alert(t('addresses.failed_save', 'Impossible d’enregistrer l’adresse'));
    }
  };

  const handleDelete = (addressId: string) => {
    Alert.alert(
      t('addresses.confirm_delete', 'Supprimer l’adresse ?'),
      t('addresses.confirm_delete_sub', 'Voulez-vous vraiment supprimer cette adresse ?'),
      [
        { text: t('common.cancel', 'Annuler'), style: 'cancel' },
        {
          text: t('common.delete', 'Supprimer'),
          style: 'destructive',
          onPress: async () => {
            try {
              await userAPI.removeAddress(addressId);
              toast.success(t('addresses.deleted', 'Adresse supprimée'));
              await loadAddresses();
            } catch (error) {
              console.error('Failed to delete address', error);
              Alert.alert(t('addresses.failed_delete', 'Impossible de supprimer l’adresse'));
            }
          },
        },
      ],
    );
  };

  const onMarkerDragEnd = async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setForm((prev) => ({ ...prev, latitude, longitude }));
    setRegion((r) => ({ ...r, latitude, longitude }));
    const reverse = await locationService.reverseGeoCode({ latitude, longitude });
    if (reverse) {
      const [street, city, country] = reverse.split(',').map((s) => s.trim());
      setForm((prev) => ({
        ...prev,
        street: street || prev.street,
        city: city || prev.city,
        country: country || prev.country,
      }));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('addresses.title', 'Mes adresses')}</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.subtitle}>{t('addresses.subtitle', 'Gérez vos adresses de livraison')}</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAdd}>
          <Plus size={16} color="#fff" />
          <Text style={styles.addButtonText}>{t('addresses.add', 'Ajouter')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color="#FF6B35" />
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('addresses.empty', 'Aucune adresse enregistrée')}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressLabel}>{item.label}</Text>
                  <Text style={styles.addressText}>{item.street}, {item.city}</Text>
                </View>
                { (item as any).isDefault ? <View style={styles.defaultPill}><Text style={styles.defaultPillText}>{t('addresses.default', 'Par défaut')}</Text></View> : null }
              </View>
              <Text style={styles.addressText}>{item.postalCode} · {item.country}</Text>
              <View style={styles.addressActions}>
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionButton}>
                  <Pencil size={16} color="#fff" />
                  <Text style={styles.actionText}>{t('addresses.edit', 'Modifier')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.actionButton, styles.deleteButton]}>
                  <Trash2 size={16} color="#fff" />
                  <Text style={styles.actionText}>{t('addresses.delete', 'Supprimer')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalOpen(false)} style={styles.backButton}>
              <ChevronLeft size={24} color="#111" />
            </TouchableOpacity>
            <Text style={styles.title}>{editingAddress ? t('addresses.edit_address', 'Modifier l’adresse') : t('addresses.new_address', 'Nouvelle adresse')}</Text>
          </View>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={region}
            onRegionChangeComplete={(r) => setRegion(r)}
          >
            <Marker
              coordinate={{ latitude: form.latitude, longitude: form.longitude }}
              draggable
              onDragEnd={onMarkerDragEnd}
            />
          </MapView>
          <View style={styles.form}>
            <TextInput style={styles.input} placeholder={t('addresses.label', 'Label')} value={form.label} onChangeText={(text) => setForm((prev) => ({ ...prev, label: text }))} />
            <TextInput style={styles.input} placeholder={t('addresses.street', 'Rue')} value={form.street} onChangeText={(text) => setForm((prev) => ({ ...prev, street: text }))} />
            <TextInput style={styles.input} placeholder={t('addresses.city', 'Ville')} value={form.city} onChangeText={(text) => setForm((prev) => ({ ...prev, city: text }))} />
            <TextInput style={styles.input} placeholder={t('addresses.postal_code', 'Code postal')} value={form.postalCode} onChangeText={(text) => setForm((prev) => ({ ...prev, postalCode: text }))} />
            <TextInput style={styles.input} placeholder={t('addresses.country', 'Pays')} value={form.country} onChangeText={(text) => setForm((prev) => ({ ...prev, country: text }))} />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('addresses.default_address', 'Adresse par défaut')}</Text>
              <Switch value={form.isDefault} onValueChange={(value) => setForm((prev) => ({ ...prev, isDefault: value }))} />
            </View>

            <TextInput style={[styles.input, { minHeight: 80 }]} placeholder={t('addresses.instructions', 'Instructions (facultatif)')} multiline value={form.instructions} onChangeText={(text) => setForm((prev) => ({ ...prev, instructions: text }))} />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>{t('common.save', 'Enregistrer')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  backButton: { padding: 4, borderRadius: 8, backgroundColor: '#f0f0f0' },
  title: { fontSize: 20, fontWeight: 'bold', flex: 1 },
  sectionHeader: { marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subtitle: { fontSize: 14, color: '#666' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF6B35', padding: 10, borderRadius: 10 },
  addButtonText: { color: '#fff', fontWeight: '600' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  emptyText: { color: '#666' },
  addressCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0' },
  addressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  addressLabel: { fontWeight: '700', fontSize: 16 },
  addressText: { color: '#444', fontSize: 13 },
  defaultPill: { backgroundColor: '#ecfdf3', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  defaultPillText: { fontSize: 11, color: '#16a34a' },
  addressActions: { flexDirection: 'row', marginTop: 10, gap: 10 },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF6B35', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  deleteButton: { backgroundColor: '#ef4444' },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  map: { height: 220, backgroundColor: '#eee' },
  form: { padding: 12, gap: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, marginBottom: 6, fontSize: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  switchLabel: { color: '#333', fontWeight: '600' },
  saveButton: { marginTop: 8, backgroundColor: '#FF6B35', borderRadius: 12, padding: 14, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '700' },
});
