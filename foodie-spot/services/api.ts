import { cache } from '@/services/cache';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';

import { storage, STORAGE_KEYS } from '@/services/storage';
import { auth } from './auth'; // used to fetch token from SecureStore
import { Dish, Order, Restaurant, SearchFilters, User } from '@/types';
import log from './logger';
import config from '@/constants/config';


const api = axios.create({
    baseURL: config.API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    }
});

api.interceptors.request.use(
    async requestConfig => {
        // try getting the access token from SecureStore via auth service
        let token: string | null = null;
        try {
            token = await auth.getAccessToken();
        } catch (e) {
            // in case auth helper fails, fallback to AsyncStorage (older key)
            token = await storage.getItem<string>(STORAGE_KEYS.AUTH_TOKEN);
        }
        if (token) {
            requestConfig.headers.Authorization = `Bearer ${token}`;
        }

        return requestConfig;
    },
    error => Promise.reject(error)
);

api.interceptors.response.use(
    response => response,
    async error => {
        if (error.response && error.response.status === 401) {
            // clear both storage locations on unauthorized
            await storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            try {
                await auth.clearTokens();
            } catch {} // ignore
        }
        return Promise.reject(error);
    }
);

const checkConnection = async () => {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
}

// const mockOrders: Order[] = [
//     {
//         id: 'o1',
//         restaurantId: 'r1',
//         restaurantName: 'Bistro Parisien',
//         items: [
//             {
//                 dish: mockMenus['r1'][0],
//                 quantity: 2,
//             },
//             { dish: mockMenus['r1'][3], quantity: 1 },
//         ],
//         total: 35.00,
//         deliveryFee: 3.50,
//         status: 'delivered',
//         createdAt: new Date(Date.now() - 86400 * 1000),
//         estimatedDeliveryTime: new Date(Date.now() - 3600 * 1000),
//         deliveryAddress: '15 avenue des Champs-Élysées, Paris, France',
//         driverInfo: {
//             name: 'Jean Dupont',
//             phone: '+33 6 12 34 56 78',
//             photo: 'https://randomuser.me/api/portraits/men/32.jpg',
//         },
//     },
//     {
//         id: 'o2',
//         restaurantId: 'r2',
//         restaurantName: 'Tokyo Roll',
//         items: [
//             {
//                 dish: mockMenus['r2'][0],
//                 quantity: 1,
//             },
//             { dish: mockMenus['r2'][4], quantity: 1 },
//         ],
//         total: 26.00,
//         deliveryFee: 3.50,
//         status: 'on-the-way',
//         createdAt: new Date(Date.now() - 7200 * 1000),
//         estimatedDeliveryTime: new Date(Date.now() + 1800 * 1000),
//         deliveryAddress: '15 avenue des Champs-Élysées, Paris, France',
//         driverInfo: {
//             name: 'Sophie Martin',
//             phone: '+33 6 87 65 43 21',
//             photo: 'https://randomuser.me/api/portraits/women/44.jpg',
//         },
//     }
// ];

// APIs
export const restaurantAPI = {

    async getRestaurants(filters?: SearchFilters): Promise<Restaurant[]> {
        const isConnected = await checkConnection();

        if (!isConnected) {
            log.warn('Offline: Loading cached restaurants');
            const cached = await cache.get<Restaurant[]>('restaurants');
            return cached && cached.length > 0 ? cached : [];
        }

        try {
            const response = await api.get('/restaurants', { params: filters});
            // API returns { success, data: [...], pagination: {...} }
            const restaurants = response.data?.data || [];
            await cache.set('restaurants', restaurants);
            return restaurants;
        } catch (error) {
            log.error('Failed to fetch restaurants', error);
            const cached = await cache.get<Restaurant[]>('restaurants');
            return cached && cached.length > 0 ? cached : [];
        }
    },
    async searchRestaurants(query: string): Promise<Restaurant[]> {
        try {
            const response = await api.get('/restaurants/search', { params: { q: query } });
            return response.data?.data || [];
        } catch (error) {
            log.error('Failed to search restaurants', error);
            return [];
        }
    },
    async getRestaurantById(id: string): Promise<Restaurant | null> {
        const isConnected = await checkConnection();

        if (!isConnected) {
            const cached = await cache.get<Restaurant>(`restaurant_${id}`);
            return cached || null;
        }

        try {
            const response = await api.get(`/restaurants/${id}`);
            const restaurant = response.data?.data || null;
            if (restaurant) {
                await cache.set(`restaurant_${id}`, restaurant);
            }
            return restaurant;
        } catch (error) {
            log.error(`Failed to fetch restaurant ${id}`, error);
            const cached = await cache.get<Restaurant>(`restaurant_${id}`);
            return cached || null;
        }
    },
    async getMenu(restaurantId: string): Promise<Dish[]> {
        const isConnected = await checkConnection();

        if (!isConnected) {
            const cached = await cache.get<Dish[]>(`menu_${restaurantId}`);
            return cached || [];
        }

        try {
            const response = await api.get(`/restaurants/${restaurantId}/menu`);
            const menuData = response.data?.data.length ? response.data?.data : [];
            const dishes = menuData.reduce((acc: Dish[], category: any) => {
                if (category.items && Array.isArray(category.items)) {
                    acc.push(...category.items);
                }
                return acc;
            }, []);
            await cache.set(`menu_${restaurantId}`, dishes);
            return dishes;
        } catch (error) {
            log.error(`Failed to fetch menu for restaurant ${restaurantId}`, error);
            const cached = await cache.get<Dish[]>(`menu_${restaurantId}`);
            return cached || [];
        }
    }
}

export const userAPI = {

    async login(email: string, password: string): Promise<{ user: User; token: string }> {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { user, token } = response.data;
            await storage.setItem(STORAGE_KEYS.USER, user);
            await storage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
            log.info('User logged in successfully');
            return { user, token };
     } catch (error) {
            log.error('Login failed', error);
            throw error;
        }
    },

    async getCurrentUser(): Promise<User | null> {
        return await storage.getItem(STORAGE_KEYS.USER);
    },
    async toggleFavorite(restaurantId: string) {
    },
    async updateProfile(updates: Partial<User>): Promise<User> {
        try {
            const response = await api.patch('/user/profile', updates);
            const user = response.data.data || response.data;
            await storage.setItem(STORAGE_KEYS.USER, user);
            return user;
        } catch (error) {
            log.error('Failed to update profile', error);
            throw error;
        }
    },
    async logout(): Promise<void> {
        await storage.removeItem(STORAGE_KEYS.USER);
        await storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        await cache.clearAll();
        log.info('User logged out, cache cleared');
    }

}


export const orderAPI = {
    async getOrders(): Promise<Order[]> {
        const isConnected = await checkConnection();

        if (!isConnected) {
            const cached = await cache.get<Order[]>('orders');
            return cached && cached.length > 0 ? cached : [];
        }

        try {
            const response = await api.get('/orders');
            const orders = response.data?.data || response.data || [];
            await cache.set('orders', orders);
            return orders;
        } catch (error) {
            // log.error('Failed to fetch orders', error);
            const cached = await cache.get<Order[]>('orders');
            return cached && cached.length > 0 ? cached : [];
        }
    },
    async getOrderById(id: string): Promise<Order | null> {
        const isConnected = await checkConnection();

        if (!isConnected) {
            const cached = await cache.get<Order>(`order_${id}`);
            return cached || null;
        }

        try {
            const response = await api.get(`/orders/${id}`);
            const order = response.data?.data || response.data || null;
            if (order) {
                await cache.set(`order_${id}`, order);
            }
            return order;
        } catch (error) {
            // log.error(`Failed to fetch order ${id}`, error);
            return (await cache.get<Order>(`order_${id}`)) || null;
        }
    },
}

export const uploadAPI = {
    async uploadImage(uri: string, type: 'profile' | 'review'): Promise<string> {
        try {
            const formData = new FormData();
            formData.append('image', {
                uri,
                name: `${type}_${Date.now()}.jpg`,
                type: 'image/jpeg',
            } as any);

            const response = await api.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return response.data?.url || response.data?.data?.url;

        } catch (error) {
            log.error('Failed to upload image', error);
            throw error;
        }
    }
}

export default api ;