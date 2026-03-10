import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { RestaurantCard } from "@/components/restaurant-card";
import { Colors } from "@/constants/theme";
import { restaurantAPI } from "@/services/api";
import { Restaurant, SearchFilters } from "@/types";
import { Filter, Search } from "lucide-react-native";
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
                </View>
                <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(!showFilters)}>
                    <Filter size={24} color={Colors.light.text} />
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
                    <RestaurantCard restaurant={item} onPress={() => router.push(`/restaurant/${item.id}`)} />
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
    filterButton: {
        padding: 8,
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