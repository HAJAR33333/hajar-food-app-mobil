import * as Location from 'expo-location';

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export const locationService = {

    async requestPermissions(): Promise<boolean> {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            return status === 'granted';
        } catch (error) {
            // log.warn('Failed to request location permissions', error);
            return false;
        }
    },

    async getCurrentLocation(): Promise<Coordinates | null> {
        try {
            const hasPermission = await this.requestPermissions();
            if (!hasPermission) {
                return null;
            }

            const { coords } = await Location.getCurrentPositionAsync();
            return {
                latitude: coords.latitude,
                longitude: coords.longitude,
            };
        } catch (error) {
            // log.warn('Failed to get current location', error);
            return null;
        }
    },

    async reverseGeoCode(coordinates: Coordinates): Promise<string | null> {
        try {
            const addresses = await Location.reverseGeocodeAsync(coordinates);
            if (addresses.length >0) {
                const address = addresses[0];
                return `${address.street}, ${address.city}, ${address.country}`;
            }
            return null;
        } catch (error) {
            // log.warn('Failed to reverse geocode', error);
            return null;
        }
    }
}
    