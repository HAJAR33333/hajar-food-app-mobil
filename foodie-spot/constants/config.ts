import Constants from 'expo-constants';

const ENV = {
    development: {
        // API_URL: 'http://localhost:4000/',
        API_URL: 'http://192.168.1.91:4000/',
    },
    staging: {
        API_URL: 'https://staging-api.foodie-spot.com/api',
    },
    production: {
        API_URL: 'https://api.foodie-spot.com/api',
    },
};

const getEnvVars = () => {
    const releaseChannel = Constants.expoConfig?.extra?.releaseChannel || 'development';
    if (releaseChannel === 'production') {
        return ENV.production;
    } else if (releaseChannel === 'staging') {
        return ENV.staging;
    } else {
        return ENV.development; 
    }
};

export default getEnvVars();

