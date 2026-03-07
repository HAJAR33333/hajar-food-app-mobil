import { Coffee, IceCream2, Pizza, Sandwich, UtensilsCrossed } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const categories = [
    { label: 'Burger', icon: <Sandwich size={18} color="#FF6B35" /> },
    { label: 'Pizza', icon: <Pizza size={18} color="#FF6B35" /> },
    { label: 'Sushi', icon: <UtensilsCrossed size={18} color="#FF6B35" /> },
    { label: 'Healthy', icon: <Coffee size={18} color="#FF6B35" /> },
    { label: 'Desserts', icon: <IceCream2 size={18} color="#FF6B35" /> },
];

export const CategoryList: React.FC = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Catégories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((category) => (
                    <TouchableOpacity key={category.label} style={styles.chip}>
                        {category.icon}
                        <Text style={styles.chipText}>{category.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
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
    chipText: {
        color: '#FF6B35',
        fontWeight: '600',
    }
});