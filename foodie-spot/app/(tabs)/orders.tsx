import { OrderCard } from "@/components/order-card";
import { orderAPI } from "@/services/api";
import { Order } from "@/types";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OrdersScreen() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const data = await orderAPI.getOrders();
            setOrders(data);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadOrders();
        setRefreshing(false);
    }


    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Mes Commandes</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
                {orders.length === 0 && !loading ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>ICON</Text>
                        <Text style={styles.emptyText}>Aucune commande trouvée.</Text>
                    </View>
                ) : (
                    orders.map((order) => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            onPress={() => {
                                if ((order.status === 'on-the-way' || order.status === 'preparing') && order.id) {
                                    router.push(`/tracking/${order.id}`);
                                }
                            }}
                        />
                    ))
                )}
            </ScrollView>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    header: {
        padding: 16,
        backgroundColor: '#f0f0f0',
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    emptyState: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
    }
});