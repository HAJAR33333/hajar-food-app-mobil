import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from "react-native";
import { useRouter } from "expo-router";
import Voice from '@react-native-voice/voice';
import { RestaurantCard } from "@/components/restaurant-card";
import { Colors } from "@/constants/theme";
import { restaurantAPI } from "@/services/api";
import { Restaurant, SearchFilters } from "@/types";
import { Filter, Search, Mic, MicOff } from "lucide-react-native";
import { useTranslation } from 'react-i18next';

import { SafeAreaView } from "react-native-safe-area-context";

export default function SearchScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [filters, setFilters] = useState<SearchFilters>({});
    const [showFilters, setShowFilters] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isListening, setIsListening] = useState(false);

    useEffect(() => {
        const loadCategories = async () => {
            const data = await restaurantAPI.getCategories();
            setCategories(data);
        };
        loadCategories();
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 500);
        return () => clearTimeout(handler);
    }, [query]);

    useEffect(() => {
        loadRestaurants();
    }, [debouncedQuery, filters]);

    useEffect(() => {
        Voice.onSpeechResults = (event: any) => {
            const values = event.value || [];
            if (values.length > 0) {
                setQuery(values[0]);
                setIsListening(false);
            }
        };
        Voice.onSpeechError = (error: any) => {
            console.error('Voice error', error);
            setIsListening(false);
            Alert.alert(t('home.error'), t('search.voice_error'));
        };

        return () => {
            try {
                if (Voice && typeof Voice.removeAllListeners === 'function') {
                    Voice.removeAllListeners();
                }
            } catch (error) {
                console.warn('Failed to remove voice listeners', error);
            }
        };
    }, []);

    const loadRestaurants = async () => {
        setLoading(true);
        try {
            if (debouncedQuery) {
                const data = await restaurantAPI.searchRestaurants(debouncedQuery);
                setRestaurants(data);
            } else {
                const data = await restaurantAPI.getRestaurants(filters);
                setRestaurants(data);
            }
        } finally {
            setLoading(false);
        }
    };

    const startVoiceSearch = async () => {
        try {
            // Enhanced safety check for unsupported environments (like Expo Go without custom dev client)
            if (!Voice || !Voice.start) {
                Alert.alert(t('home.error'), t('search.voice_unsupported'));
                return;
            }
            
            // Check speech recognition services directly if available on the platform
            if (typeof Voice.getSpeechRecognitionServices === 'function') {
                try {
                    const services = await Voice.getSpeechRecognitionServices();
                    if (!services || services.length === 0) {
                        Alert.alert(t('home.error'), t('search.voice_unsupported'));
                        return;
                    }
                } catch (e) {
                    console.warn('Failed to check speech services', e);
                    // Continue anyway, maybe it just failed the check
                }
            }

            // Attempt to start
            setIsListening(true);
            try {
                await Voice.start('fr-FR');
            } catch (startError: any) {
                // If the underlying native module throws (e.g., startSpeech of null)
                console.warn('Voice.start threw exception:', startError);
                setIsListening(false);
                Alert.alert(t('home.error'), t('search.voice_unsupported'));
            }
        } catch (error) {
            console.error('Voice start failed', error);
            setIsListening(false);
            Alert.alert(t('home.error'), t('search.voice_error_start'));
        }
    };

    const stopVoiceSearch = async () => {
        try {
            if (Voice && typeof Voice.stop === 'function') {
                await Voice.stop();
            }
            setIsListening(false);
        } catch (error) {
            console.error('Voice stop failed', error);
            // Even if stopping fails, we revert UI state
            setIsListening(false);
        }
    };

    const handleToggleFavorite = async (restaurantId: string) => {
        try {
            const newFavorite = await restaurantAPI.toggleFavorite(restaurantId);
            setRestaurants((prev) => prev.map((r) => r.id === restaurantId ? { ...r, isFavorite: newFavorite } : r));
        } catch (error) {
            console.error('Failed to toggle favorite', error);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View style={styles.searchContainer}>
                    <Search size={24} color={Colors.light.text} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('search.search_placeholder')}
                        value={query}
                        onChangeText={setQuery}
                    />
                    <TouchableOpacity
                        style={styles.voiceButton}
                        onPress={isListening ? stopVoiceSearch : startVoiceSearch}
                        accessibilityLabel={isListening ? t('search.stop_voice') : t('search.start_voice')}
                    >
                        {isListening ? <MicOff size={18} color="#FF6B35" /> : <Mic size={18} color="#FF6B35" />}
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(!showFilters)}>
                    <Filter size={24} color={Colors.light.text} />
                </TouchableOpacity>
            </View>
            <View style={styles.searchActions}>
                <TouchableOpacity style={styles.searchActionBtn} onPress={() => router.push('/cart')}>
                    <Text style={styles.searchActionText}>Commandes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.searchActionBtn} onPress={() => router.push('/notifications')}>
                    <Text style={styles.searchActionText}>🔔</Text>
                </TouchableOpacity>
            </View>

            {showFilters && (
                <View style={styles.filters}>
                    <FlatList
                        data={categories}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item, index) => (item._id || item.id || String(index))}
                        contentContainerStyle={{ paddingHorizontal: 10 }}
                        renderItem={({ item, index }) => {
                            const cuisineValue = typeof item === 'string' ? item : (item.name || item.label || item._id);
                            const isActive = filters.cuisine === cuisineValue;

                            return (
                                <TouchableOpacity
                                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                                    onPress={() => setFilters({
                                        ...filters,
                                        cuisine: isActive ? undefined : cuisineValue
                                    })}
                                >
                                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                                        {cuisineValue}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            )}
            <FlatList
                data={restaurants}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={() => (
                    <Text style={styles.resultsText}>
                        {restaurants.length} {t('search.results_found')}
                    </Text>
                )}
                renderItem={({ item }) => (
                    <RestaurantCard
                      restaurant={item}
                      onPress={() => router.push(`/restaurant/${item.id}`)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                )}
                ListEmptyComponent={() => (
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>{t('home.no_restaurant_found')}</Text>
                        </View>
                    ) : null
                )}
                ListFooterComponent={() => (
                    loading ? <ActivityIndicator size="large" color="#FF6B35" style={{ marginTop: 20 }} /> : null
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 24,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    voiceButton: {
        width: 38,
        height: 38,
        marginLeft: 8,
        borderRadius: 999,
        backgroundColor: '#FFF1E5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterButton: {
        padding: 8,
    },
    searchActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginBottom: 12,
        gap: 8,
    },
    searchActionBtn: {
        flex: 1,
        backgroundColor: '#FFEDE2',
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
    },
    searchActionText: {
        color: '#FF6B35',
        fontWeight: '700',
    },
    filters: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: '#FF6B35',
    },
    filterChipText: {
        fontSize: 14,
        color: '#666',
    },
    filterChipTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
    resultsText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
});