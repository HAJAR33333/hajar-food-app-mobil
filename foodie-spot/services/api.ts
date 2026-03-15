import { cache } from '@/services/cache';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';

import { storage, STORAGE_KEYS } from '@/services/storage';
import { auth } from './auth'; // used to fetch token from SecureStore
import { Dish, Order, Restaurant, SearchFilters, User } from '@/types';
import log from './logger';
import config from '@/constants/config';

// Interface pour la promo dynamique
export interface Promo {
    title: string;
    code: string;
    discount?: string;
}
    console.log('CONFIG API_URL =', config.API_URL);
    log.info('CONFIG API_URL = ' + config.API_URL);
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
            } catch { } // ignore
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
            const response = await api.get('/restaurants', { params: filters });
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
    async getCategories(): Promise<any[]> {
        const isConnected = await checkConnection();
        if (!isConnected) {
            const cached = await cache.get<any[]>('categories');
            return cached || [];
        }
        try {
            const response = await api.get('/categories');
            const categories = response.data?.data || response.data || [];
            await cache.set('categories', categories);
            return categories;
        } catch (error) {
            const cached = await cache.get<any[]>('categories');
            return cached || [];
        }
    },
    async getActivePromo(): Promise<Promo> {
        try {
            const response = await api.get('/promos/active');
            return response.data?.data || response.data;
        } catch (error) {
            log.warn('Failed to fetch dynamic promo, using fallback');
            return {
                title: "-40% sur votre commande",
                code: "FOODIE40"
            };
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
    },

     async getFavorites(): Promise<Restaurant[]> {
        try {
            const response = await api.get('/user/favorites');
            return response.data?.data || [];
        } catch (error) {
            log.error('Failed to fetch favorites', error);
            return [];
        }
    },
    async toggleFavorite(restaurantId: string): Promise<boolean> {
        try {
            const response = await api.post(`/user/favorites/${restaurantId}`);
            // support both response.data.isFavorite and response.data.data.isFavorite
            return response.data?.isFavorite ?? response.data?.data?.isFavorite ?? true;
        } catch (error: any) {
            log.error('Failed to toggle favorite', error?.response?.data || error?.message || error);
            throw error;
        }
    },
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
        try {
            const response = await api.get('/users/profile');
            const user = response.data?.data || null;
            if (user) {
                await storage.setItem(STORAGE_KEYS.USER, user);
            }
            return user;
        } catch (error) {
            log.warn('Failed to fetch user profile from API, falling back to cache.', error);
            return await storage.getItem(STORAGE_KEYS.USER);
        }
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
    async toggleFavorite(restaurantId: string): Promise<boolean> {
        try {
            return await restaurantAPI.toggleFavorite(restaurantId);
        } catch (error) {
            log.error('Failed to toggle favorite via userAPI', error);
            throw error;
        }
    },
    async logout(): Promise<void> {
        await storage.removeItem(STORAGE_KEYS.USER);
        await storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        await cache.clearAll();
        log.info('User logged out, cache cleared');
    },

    async getAddresses(): Promise<any[]> {
        try {
            const response = await api.get('/users/addresses');
            return response.data?.data || [];
        } catch (error) {
            log.error('Failed to load user addresses', error);
            return [];
        }
    },

    async addAddress(address: {
        label: string;
        street: string;
        city: string;
        postalCode: string;
        country: string;
        latitude: number;
        longitude: number;
        isDefault?: boolean;
        instructions?: string;
    }): Promise<any> {
        const response = await api.post('/users/addresses', address);
        return response.data?.data;
    },

    async updateAddress(addressId: string, updates: Partial<{
        label: string;
        street: string;
        city: string;
        postalCode: string;
        country: string;
        latitude: number;
        longitude: number;
        isDefault: boolean;
        instructions: string;
    }>): Promise<any> {
        const response = await api.put(`/users/addresses/${addressId}`, updates);
        return response.data?.data;
    },

    async removeAddress(addressId: string): Promise<void> {
        await api.delete(`/users/addresses/${addressId}`);
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
            return (await cache.get<Order>(`order_${id}`)) || null;
        }
    },

    async createOrder(payload: {
        restaurantId: string;
        items: Array<{ menuItemId: string; quantity: number }>;
        deliveryAddress: any;
        paymentMethod: string;
        tip?: number;
        deliveryInstructions?: string;
        promoCode?: string;
    }): Promise<Order> {
        const response = await api.post('/orders', payload);
        return response.data?.data;
    },

    async getOrderTracking(id: string): Promise<any> {
        const response = await api.get(`/orders/${id}/track`);
        return response.data?.data || null;
    },

    async syncOfflineOrders(): Promise<void> {
        log.info('syncOfflineOrders called');
    }
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

export interface CreateReviewPayload {
    orderId: string;
    rating: number;
    comment?: string;
    photos?: string[];
}

export const reviewAPI = {
    async createReview(payload: CreateReviewPayload): Promise<any> {
        try {
            const response = await api.post('/reviews', payload);
            return response.data?.data || response.data;
        } catch (error) {
            log.error('Failed to create review', error);
            throw error;
        }
    }
};

export default api;
