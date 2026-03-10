import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { restaurantAPI } from '@/services/api';

export const CategoryList: React.FC = () => {
    const { t } = useTranslation();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadCategories = async () => {
            const data = await restaurantAPI.getCategories();
            if (data && data.length > 0) {
                setCategories(data);
            }
            setLoading(false);
        };
        loadCategories();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t('home.categories')}</Text>
            {loading ? (
                <ActivityIndicator size="small" color="#FF6B35" style={{ alignSelf: 'flex-start' }} />
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {categories.map((category) => (
                        <TouchableOpacity key={category.id || category._id || category.name} style={styles.chip}>
                            {category.icon && <Text style={styles.emojiIcon}>{category.icon}</Text>}
                            <Text style={styles.chipText}>{category.name || category.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFF4EF',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
        marginRight: 12,
    },
    emojiIcon: {
        fontSize: 16,
    },
    chipText: {
        color: '#FF6B35',
        fontWeight: '600',
    }
});