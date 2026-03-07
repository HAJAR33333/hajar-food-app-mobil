import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Order } from "@/types";
import { orderAPI } from "@/services/api";

export default function TrackingScreen() {
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const [order, setOrder] = useState<Order | null>(null);

    useEffect(() => {
        loadOrder();
    }, [orderId]);

    const loadOrder = async () => {
        const orderData = await orderAPI.getOrderById(orderId);
        setOrder(orderData);
    };

    if (!order) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <Text>Loading...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Suivi commande</Text>
                <Text style={styles.subtitle}>Commande #{order.id}</Text>
                <View style={styles.card}>
                    <Text style={styles.label}>Restaurant</Text>
                    <Text style={styles.value}>{order.restaurantName}</Text>
                    <Text style={styles.label}>Statut</Text>
                    <Text style={styles.status}>{order.status}</Text>
                    <Text style={styles.label}>Adresse de livraison</Text>
                    <Text style={styles.value}>{order.deliveryAddress}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const  styles = StyleSheet.create({
    container: {
        flex: 1,
       backgroundColor: '#fff',
    },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        padding: 16,
        gap: 12,
    },
    title: {    
        fontSize: 22,
        fontWeight: '700',
    },
    subtitle: {
        color: '#666',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#f0f0f0',},
    label: {
        fontSize: 12,
        color: '#999', 
        marginTop: 10
        },  value: {
        fontSize: 16,
        fontWeight: '600',
    },
    status: {
        fontSize: 16,
        fontWeight: '700',
    },
});