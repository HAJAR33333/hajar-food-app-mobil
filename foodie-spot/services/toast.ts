const toast = {
    success: (message: string, options?: ToastOptions) => {
        Alert.alert("✅ Succès", message);
    },
    error: (message: string, options?: ToastOptions) => {
        Alert.alert("❌ Erreur", message);
    },
    info: (message: string, options?: ToastOptions) => {
        Alert.alert("ℹ️ Info", message);
    },
    warning: (message: string, options?: ToastOptions) => {
        Alert.alert("⚠️ Attention", message);
    },
    show: (message: string,  type: ToastType = 'info', options?: ToastOptions) => {
        const titles : Record<ToastType, string> = {
            success: "✅ Succès",
            error: "❌ Erreur",
            info: "ℹ️ Info",
            warning: "⚠️ Attention"
        };
        Alert.alert(titles[type], message);
    }
}

export default toast;