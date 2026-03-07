import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Dish, Restaurant } from "@/types";
import { router, useLocalSearchParams } from "expo-router";
import { restaurantAPI, userAPI } from "@/services/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { ArrowLeft, Clock, Heart, MapPin, Navigation, Phone, Share2, Star } from "lucide-react-native";
import { DishCard } from "@/components/dish-card";

export default function RestaurantScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [menu, setMenu] = useState<Dish[]>([]);
    const [isFavorite, setIsFavorite] = useState(false);

    useEffect(() => {
        loadRestaurant();
    }, [id]);

    const loadRestaurant = async () => {
        const restaurantData = await restaurantAPI.getRestaurantById(id);
        const menuData = await restaurantAPI.getMenu(id);
        setRestaurant(restaurantData);
        setMenu(menuData);
        setIsFavorite(restaurantData?.isFavorite || false);
    };
    const handleToggleFavorite = async () => {
        try {
            await userAPI.toggleFavorite(id);
            setIsFavorite(!isFavorite);
        } catch (error) {
            Alert.alert("Error", "Failed to update favorite status");
        }
    };

    if (!restaurant) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <Text>Loading...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.imageContainer}>
                    <Image source={{ uri: restaurant?.image }} style={styles.image} />
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <ArrowLeft size={24} color="rgba(0,0,0)" />
                    </TouchableOpacity>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.actionButton} onPress={handleToggleFavorite}>
                            <Heart size={24} color={isFavorite ? '#FF6B35' : '#000'} fill={isFavorite ? '#FF6B35' : 'transparent'} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={handleToggleFavorite}>
                            <Share2 size={18} color="#000" />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{restaurant?.name}</Text>
                    <Text style={styles.cuisine}>{restaurant?.cuisine}</Text>
                    <View style={styles.meta}>
                        <View style={styles.metaItem}>
                            <Star size={16} color="#FFC107" fill="#FFC107" />
                            <Text style={styles.metaText}>
                                {restaurant?.rating.toFixed(1)} ({restaurant?.reviewsCount})
                            </Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Clock size={16} color="#666"/>
                            <Text style={styles.metaText}>
                                {typeof restaurant?.deliveryTime === 'object' && restaurant?.deliveryTime !== null
                                    ? `${(restaurant.deliveryTime as { min: number; max: number }).min}-${(restaurant.deliveryTime as { min: number; max: number }).max}` 
                                    : restaurant?.deliveryTime} min
                            </Text>
                        </View>
                         <View style={styles.metaItem}>
                            <MapPin size={16} color="#666"/>
                            <Text style={styles.metaText}>
                                {restaurant?.distance} km
                            </Text>
                        </View>
                    </View>
                    <View style={styles.actions}>
                         <TouchableOpacity style={styles.primaryButton}>
                            <Navigation size={18} color="#fff" />
                            <Text style={styles.primaryButtonText}>Itinéraire</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryButton}>
                            <Phone size={18} color="#666" />
                            <Text style={styles.secondaryButtonText}>Appeler</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.menu}>
                    <Text style={styles.menuTitle}>Menu</Text>
                    {menu.map((dish) => (
                        <DishCard key={dish.id} dish={dish} onPress={() => router.push(`/dish/${dish.id}`)} />  
                        ))}  
                </View>


            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: -50,
    },
    imageContainer: {
        position: 'relative',
        height: 200,
    },
    image: {
        width: '100%',
        height: '100%'
    },
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
    headerActions: {
        position: 'absolute',
        top: 16,
        right: 16,
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        marginTop: 34,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    info: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cuisine: {
        fontSize: 16,
        color: '#666',
        marginBottom: 12,
    },
    meta: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 14,
        color: '#666',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    primaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FF6B35',
        borderRadius: 12,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
         flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 12,
    },
    secondaryButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    menu: {
        padding: 16,
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    }
});