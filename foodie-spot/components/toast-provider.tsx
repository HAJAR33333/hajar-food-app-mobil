
import React, {useState, useRef, useEffect} from 'react';
import { ToastMessage, ToastType, ToastContextType, ToastItemProps, ToastStackProps} from '@/types';
import { Animated, StyleSheet, Text, View } from 'react-native';
import  {Ionicons} from '@expo/vector-icons';

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const show = (message: string, type: ToastType = 'info', duration: number = 5000) => {
        console.log('🔔 Toast appelé :', { message, type, duration }); 
        const id =  `${Date.now()}-${Math.random()}`;

        setToasts((prev) => {
            const newToasts = [...prev, { id, message, type, duration }];
            console.log('📋 Toasts après ajout :', newToasts);
            return newToasts;
        });
        // setToasts((prev) => [...prev, { id, message, type, duration }]);
        // console.log('📋 Toasts avant ajout :', prev);
        const timer = setTimeout(() => {
                console.log('⏰ Timer fired, suppression du toast:', id);
            setToasts((prev) => prev.filter(t => t.id !== id));
        }, duration);

        return () => clearTimeout(timer);
    };

    const contextValue: ToastContextType = {
        show,
        success: (message: string, duration?: number) => show(message, 'success', duration),
        error: (message: string, duration?: number) => show(message, 'error', duration),
        info: (message: string, duration?: number) => show(message, 'info', duration),
        warning: (message: string, duration?: number) => show(message, 'warning', duration),
    };

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <ToastStack toasts={toasts} />
        </ToastContext.Provider>);

}


export function useToast(): ToastContextType {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}


function ToastStack({ toasts }: ToastStackProps) {
    return (<View pointerEvents="box-none" style={styles.container}>
        {toasts.map((toast, index) => (
            <ToastItem key={toast.id} toast={toast} index={index} />
        ))}
    </View>);
}


function ToastItem({ toast, index }: ToastItemProps) {
    const slideAnim = useRef(new Animated.Value(500)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [slideAnim]);


const typeStyles = {
    success: { bg: '#4CAF50', icon: 'checkmark-circle' as const },
    error: { bg: '#F44336', icon: 'close-circle' as const},
    info: { bg: '#2196F3', icon: 'information-circle' as const },
    warning: { bg: '#FF9800', icon: 'warning' as const },
}

const style = typeStyles[toast.type];

    return (
        <Animated.View style={[styles.toast, {transform: [{ translateY: slideAnim }], top: 60 + index * 90}]}>
           <View style= {[styles.toastContent, { backgroundColor: style.bg }]}>
                <Ionicons name={style.icon} size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.toastText}>{toast.message}</Text>
            </View>
        </Animated.View>
    );

}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,  
    },
    toast: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
},
 toastText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
}

);