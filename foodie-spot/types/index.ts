export interface Restaurant {
    id: string;
    name: string;
    cuisine: string;
    description: string;
    image: string;
    rating: number;
    reviewsCount: number;
    deliveryTime: number;
    distance: number;
    priceRange: string;
    address: string;
    phone: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    isOpen: boolean;
    isFavorite: boolean;
}

export interface SearchFilters {
    cuisine?: string;
    priceRange?: string;
    rating?: number;
    deliveryTime?: number;
    isOpen?: boolean;
}
export interface Dish {
    id: string;
    resurantId: string;
    name: string;
    description: string;
    price: number;
    image: string;
    category: string;
    allergens?: string[];
    isAvailable: boolean;
}


export interface CartItem {
    dish: Dish;
    quantity: number;
    options?: string[];
    specialInstructions?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    photo?: string;
    addresses: Address[];
    favoriteRestaurants: string[];
}

export interface Address {
    id: string;
    label: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
}
export interface Order {
    id: string;
    restaurantId: string;
    restaurantName: string;
    items: CartItem[];
    total: number;
    deliveryFee: number;
    status: 'pending' | 'confirmed' | 'preparing' | 'on-the-way' | 'delivered' | 'cancelled';
    createdAt: Date;
    estimatedDeliveryTime?: Date;
    deliveryAddress: string;
    driverInfo?:{
        name: string;
        phone: string;
        photo?: string;
        location?: {
            latitude: number;
            longitude: number;
        };
    };
}

export interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

export interface ToastOptions {
    type?: ToastType;
    duration?: number;
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastContextType { 
    show: (message: string,  type?: ToastType, duration?: number) => void;
    success: (message: string,  duration?: number) => void;
    error: (message: string,  duration?: number) => void;
    info: (message: string, duration?: number) => void;
    warning: (message: string,  duration?: number) =>  void;
}


export interface ToastStackProps {
    toasts: ToastMessage[];
}

export interface ToastItemProps {
    toast: ToastMessage;
    index: number;
}
