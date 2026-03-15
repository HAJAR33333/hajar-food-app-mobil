import { Restaurant } from '@/types';
import { Image } from 'expo-image';
import { Clock, MapPin, Star, Heart } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';


interface Props {
    restaurant: Restaurant;
    onPress?: () => void;
    onToggleFavorite?: (restaurantId: string, isFavorite: boolean) => void;
    compact?: boolean;
}

export const RestaurantCard: React.FC<Props> = ({ restaurant, onPress, onToggleFavorite, compact }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const deliveryTimeText = typeof restaurant.deliveryTime === 'object'
        ? `${restaurant.deliveryTime.min}-${restaurant.deliveryTime.max} min`
        : `${restaurant.deliveryTime} min`;

    const priceRangeText = typeof restaurant.priceRange === 'number'
        ? '€'.repeat(Math.max(1, restaurant.priceRange))
        : String(restaurant.priceRange);

    return (
        <TouchableOpacity style={[styles.card, { backgroundColor: colors.background, borderColor: colorScheme === 'dark' ? '#30363d' : '#f0f0f0' }, compact && styles.compact]} onPress={onPress}>
            <Image source={{ uri: restaurant.image }} style={[styles.image, compact && styles.compactImage]} />

            <View style={styles.content}>
                <View style={styles.headerWithFavorite}>
                    <View style={styles.headerLeft}>
                        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{restaurant.name}</Text>
                        <View style={[styles.badge, { backgroundColor: colorScheme === 'dark' ? '#2f2f2f' : '#FFE5DB' }]}>
                            <Text style={[styles.badgeText, { color: colorScheme === 'dark' ? '#fff' : '#FF6B35' }]}>{priceRangeText}</Text>
                        </View>
                    </View>
                    {onToggleFavorite && (
                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); onToggleFavorite(restaurant.id, !!restaurant.isFavorite); }}>
                            <Heart size={20} color={restaurant.isFavorite ? '#FF6B35' : '#999'} fill={restaurant.isFavorite ? '#FF6B35' : 'transparent'} />
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={[styles.cuisine, { color: colors.icon }]}>{restaurant.cuisine}</Text>
                <View style={styles.meta}>
                    <View style={styles.metaItem}>
                        <Star size={16} color={colors.tint} />
                        <Text style={[styles.metaText, { color: colors.text }]}>{restaurant.rating} ({restaurant.reviewsCount}) avis</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Clock size={16} color={colors.tint} />
                        <Text style={[styles.metaText, { color: colors.text }]}>
                            {deliveryTimeText}
                        </Text>
                    </View>

                    <View style={styles.metaItem}>
                        <MapPin size={16} color={colors.tint} />
                        <Text style={[styles.metaText, { color: colors.text }]}>{restaurant.distance ?? 15} km</Text>
                    </View>
                    {!compact && <Text style={[styles.description, { color: colors.text }]} numberOfLines={2}>{restaurant.description}</Text>}

                </View>
            </View>



        </TouchableOpacity>
    );
}


const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        marginBottom: 16,
        backgroundColor: '#FFF',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    compact: {
        marginBottom: 12,
    },
    image: {
        width: 120,
        height: 120,
    },
    compactImage: {
        width: 100,
        height: 100,
    },
    content: {
        flex: 1,
        padding: 12,
        gap: 6
    },
    headerWithFavorite: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8
    },
    headerLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    name: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
    },
    badge: {
        backgroundColor: '#FFE5DB',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        color: '#FF6B35',
        fontSize: 12,
        fontWeight: '600',
    },
    cuisine: {
        fontSize: 13
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    metaText: {
        fontSize: 12,
    },

    description: {
        fontSize: 12,
    }
});