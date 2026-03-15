import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { restaurantAPI } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export const CategoryList: React.FC = () => {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
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
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.text }]}>{t('home.categories')}</Text>
            {loading ? (
                <ActivityIndicator size="small" color={colors.tint} style={{ alignSelf: 'flex-start' }} />
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {categories.map((category) => (
                        <TouchableOpacity
                            key={category.id || category._id || category.name}
                            style={[styles.chip, { backgroundColor: colorScheme === 'dark' ? '#2a2e32' : '#FFF4EF' }]}
                        >
                            {category.icon && <Text style={styles.emojiIcon}>{category.icon}</Text>}
                            <Text style={[styles.chipText, { color: colorScheme === 'dark' ? '#fefefe' : '#FF6B35' }]}>{category.name || category.label}</Text>
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