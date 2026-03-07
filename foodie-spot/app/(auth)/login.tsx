// app/(auth)/login.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { Colors } from '@/constants/theme';

export default function LoginScreen() {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) { setLocalError('Veuillez entrer votre email'); return; }
    if (!email.includes('@')) { setLocalError('Email invalide'); return; }
    if (!password) { setLocalError('Veuillez entrer votre mot de passe'); return; }

    setLocalError('');
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      console.log('Login error handled');
    }
  };

  const displayError = localError || error;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>🍔</Text>
            <Text style={styles.title}>FoodieSpot</Text>
            <Text style={styles.subtitle}>Connectez-vous pour commander</Text>
          </View>

          {displayError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Mail size={20} color="#999" />
              <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={email} onChangeText={t => { setEmail(t); setLocalError(''); }} keyboardType="email-address" autoCapitalize="none" editable={!isLoading} />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#999" />
              <TextInput style={styles.input} placeholder="Mot de passe" placeholderTextColor="#999" value={password} onChangeText={t => { setPassword(t); setLocalError(''); }} secureTextEntry={!showPassword} editable={!isLoading} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} color="#999" /> : <Eye size={20} color="#999" />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotButton}>
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleLogin} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Se connecter</Text>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.registerButton} onPress={() => router.push('/(auth)/register')} disabled={isLoading}>
            <Text style={styles.registerText}>Pas encore de compte ? <Text style={styles.registerTextBold}>S'inscrire</Text></Text>
          </TouchableOpacity>

          <View style={styles.demoHint}>
            <Text style={styles.demoHintText}>💡 Pour tester, utilisez n'importe quel email/mot de passe</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 64, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: 'bold', color: Colors.light.tint, marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666' },
  errorContainer: { backgroundColor: '#FFEBEE', padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { color: '#D32F2F', fontSize: 14, textAlign: 'center' },
  form: { width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, marginBottom: 12, paddingHorizontal: 16, gap: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: '#000' },
  forgotButton: { alignSelf: 'flex-end', marginBottom: 16 },
  forgotText: { color: Colors.light.tint, fontSize: 14 },
  button: { backgroundColor: Colors.light.tint, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  registerButton: { alignItems: 'center', padding: 16, marginTop: 24 },
  registerText: { color: '#666', fontSize: 14 },
  registerTextBold: { color: Colors.light.tint, fontWeight: '600' },
  demoHint: { marginTop: 16, padding: 12, backgroundColor: '#FFF8E1', borderRadius: 8 },
  demoHintText: { fontSize: 12, color: '#F57C00', textAlign: 'center' },
});