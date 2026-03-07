
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { Colors } from '@/constants/theme';

export default function RegisterScreen() {
  const { register, isLoading, error } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleRegister = async () => {
    if (!firstName.trim()) { setLocalError('Veuillez entrer votre prénom'); return; }
    if (!lastName.trim()) { setLocalError('Veuillez entrer votre nom'); return; }
    if (!email.includes('@')) { setLocalError('Email invalide'); return; }
    if (password.length < 6) { setLocalError('Mot de passe trop court (min 6)'); return; }
    if (password !== confirmPassword) { setLocalError('Mots de passe différents'); return; }

    setLocalError('');
    try {
      await register({ email: email.trim(), password, firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() });
    } catch (err) {
      console.log('Register error handled');
    }
  };

  const displayError = localError || error;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>🍔</Text>
            <Text style={styles.title}>Créer un compte</Text>
          </View>

          {displayError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.nameRow}>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <User size={20} color="#999" />
                <TextInput style={styles.input} placeholder="Prénom" value={firstName} onChangeText={t => { setFirstName(t); setLocalError(''); }} editable={!isLoading} />
              </View>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <TextInput style={styles.input} placeholder="Nom" value={lastName} onChangeText={t => { setLastName(t); setLocalError(''); }} editable={!isLoading} />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Mail size={20} color="#999" />
              <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={t => { setEmail(t); setLocalError(''); }} keyboardType="email-address" autoCapitalize="none" editable={!isLoading} />
            </View>

            <View style={styles.inputContainer}>
              <Phone size={20} color="#999" />
              <TextInput style={styles.input} placeholder="Téléphone (optionnel)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!isLoading} />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#999" />
              <TextInput style={styles.input} placeholder="Mot de passe" value={password} onChangeText={t => { setPassword(t); setLocalError(''); }} secureTextEntry={!showPassword} editable={!isLoading} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} color="#999" /> : <Eye size={20} color="#999" />}
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#999" />
              <TextInput style={styles.input} placeholder="Confirmer mot de passe" value={confirmPassword} onChangeText={t => { setConfirmPassword(t); setLocalError(''); }} secureTextEntry={!showPassword} editable={!isLoading} />
            </View>

            <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleRegister} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Créer mon compte</Text>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={() => router.back()} disabled={isLoading}>
            <Text style={styles.loginText}>Déjà un compte ? <Text style={styles.loginTextBold}>Se connecter</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 24 },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.light.tint },
  errorContainer: { backgroundColor: '#FFEBEE', padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { color: '#D32F2F', fontSize: 14, textAlign: 'center' },
  form: { width: '100%' },
  nameRow: { flexDirection: 'row', gap: 12 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, marginBottom: 12, paddingHorizontal: 16, gap: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: '#000' },
  button: { backgroundColor: Colors.light.tint, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loginButton: { alignItems: 'center', padding: 16, marginTop: 16 },
  loginText: { color: '#666', fontSize: 14 },
  loginTextBold: { color: Colors.light.tint, fontWeight: '600' },
});