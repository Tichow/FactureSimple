import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Download, LogOut, Mail, Lock, Eye, EyeOff, Edit, Plus, Trash2, Save, X, History, FileText, AlertTriangle, Check } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Types TypeScript
interface AppUser {
  id: string;
  email: string;
}

interface Invoice {
  invoiceNumber: string;
  invoiceDate: string;
  deliveryDate: string;
  paymentTerms: '10 jours à réception' | '20 jours à réception' | '30 jours à réception';
  paymentDue: string;
}

interface CompanyInfo {
  firstName: string;
  lastName: string;
  companyName: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  siret: string;
  accountName: string; // Nom associé au compte
  bic: string;
  iban: string;
  bankName: string;
  logoUrl?: string; // URL du logo uploadé sur Supabase Storage
}

interface ClientInfo {
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  city: string;
  siret: string;
  phone: string;
  email: string;
}

interface Article {
  id: string;
  name: string;
  description: string[];
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface SavedInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  deliveryDate: string;
  paymentTerms: '10 jours à réception' | '20 jours à réception' | '30 jours à réception';
  paymentDue: string;
  companyInfo: CompanyInfo;
  clientInfo: ClientInfo;
  articles: Article[];
  totalAmount: number;
  status: 'draft' | 'finalized';
  createdAt: string;
  finalizedAt?: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  default_company_info: CompanyInfo;
  default_client_info: ClientInfo;
  default_articles: Article[];
  created_at: string;
  updated_at: string;
}

// Fonction de chiffrement simple pour les données sensibles
const encryptData = (data: string | undefined | null): string => {
  // Sécurité : s'assurer qu'on a une string non vide
  if (!data || typeof data !== 'string') {
    return ''; // Retourner string vide si données invalides
  }
  
  const key = process.env.REACT_APP_ENCRYPTION_KEY || 'default_key';
  try {
    // Chiffrement simple XOR + Base64 (pour plus de sécurité, utilisez crypto-js en production)
    const encrypted = btoa(data.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join(''));
    return encrypted;
  } catch (error) {
    console.error('Erreur lors du chiffrement:', error);
    return ''; // Fallback sécurisé
  }
};

const decryptData = (encryptedData: string | undefined | null): string => {
  // Sécurité : s'assurer qu'on a une string non vide
  if (!encryptedData || typeof encryptedData !== 'string') {
    return '';
  }
  
  const key = process.env.REACT_APP_ENCRYPTION_KEY || 'default_key';
  try {
    const decrypted = atob(encryptedData).split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join('');
    return decrypted || ''; // Garantir qu'on retourne toujours une string
  } catch {
    return encryptedData; // Fallback si pas chiffré
  }
};

// Fonction utilitaire pour déchiffrer et séparer les noms de façon sécurisée
const decryptAndSplitName = (encryptedData: string | undefined | null, isFirstName: boolean = true): string => {
  const decrypted = decryptData(encryptedData);
  if (!decrypted || typeof decrypted !== 'string') {
    return '';
  }
  
  try {
    const parts = decrypted.split(' ');
    if (isFirstName) {
      return parts[0] || '';
    } else {
      return parts.slice(1).join(' ') || '';
    }
  } catch (error) {
    console.error('Erreur dans decryptAndSplitName:', error);
    return '';
  }
};

// Interface pour les adresses de l'API gouvernementale
interface AddressSuggestion {
  label: string;
  value: string;
  context: string;
  coordinates: [number, number];
  housenumber?: string;
  street?: string;
  postcode?: string;
  city?: string;
}

// Fonction utilitaire debounce
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Composant d'autocomplétion d'adresse
const AddressAutocomplete: React.FC<{
  value: string;
  onChange: (address: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, onSelect, placeholder, className }) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  const searchAddresses = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      
      if (data.features) {
        const formattedSuggestions: AddressSuggestion[] = data.features.map((feature: any) => ({
          label: feature.properties.label,
          value: feature.properties.label,
          context: feature.properties.context,
          coordinates: feature.geometry.coordinates,
          housenumber: feature.properties.housenumber,
          street: feature.properties.street,
          postcode: feature.properties.postcode,
          city: feature.properties.city
        }));
        setSuggestions(formattedSuggestions);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche d\'adresse:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback(
    debounce((query: string) => searchAddresses(query), 300),
    [searchAddresses]
  );

  useEffect(() => {
    if (value) {
      debouncedSearch(value);
    }
  }, [value, debouncedSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    onChange(suggestion.label);
    onSelect(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={placeholder}
        className={className}
      />
      
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">{suggestion.label}</div>
              <div className="text-sm text-gray-500">{suggestion.context}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Configuration Supabase (à remplacer par vos vraies clés)
const SUPABASE_CONFIG = {
  url: process.env.REACT_APP_SUPABASE_URL || 'https://placeholder.supabase.co',
  anonKey: process.env.REACT_APP_SUPABASE_ANON_KEY || 'placeholder_key'
};

// Vérifier si Supabase est configuré correctement
const isSupabaseConfigured = 
  SUPABASE_CONFIG.url !== 'https://placeholder.supabase.co' && 
  SUPABASE_CONFIG.anonKey !== 'placeholder_key';

// Initialiser Supabase seulement si configuré
const supabase = isSupabaseConfigured 
  ? createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
  : null;

// Fonction utilitaire pour convertir Supabase User vers AppUser
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const convertSupabaseUser = (supabaseUser: any): AppUser => {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '' // Gérer le cas où email pourrait être undefined
  };
};

// Types TypeScript
interface AppUser {
  id: string;
  email: string;
}

interface Invoice {
  invoiceNumber: string;
  invoiceDate: string;
  deliveryDate: string;
  paymentTerms: '10 jours à réception' | '20 jours à réception' | '30 jours à réception';
  paymentDue: string;
}

interface Article {
  id: string;
  name: string;
  description: string[];
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface ClientInfo {
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  city: string;
  siret: string;
  phone: string;
  email: string;
}

interface SavedInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  deliveryDate: string;
  paymentTerms: '10 jours à réception' | '20 jours à réception' | '30 jours à réception';
  paymentDue: string;
  companyInfo: CompanyInfo;
  clientInfo: ClientInfo;
  articles: Article[];
  totalAmount: number;
  status: 'draft' | 'finalized';
  createdAt: string;
  finalizedAt?: string;
}

// Composant principal de l'application
const InvoiceApp: React.FC = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'dashboard'>('landing');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);

  // Injection des styles CSS personnalisés
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .custom-select {
        -webkit-appearance: none !important;
        -moz-appearance: none !important;
        appearance: none !important;
        background-color: white !important;
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e") !important;
        background-position: right 12px center !important;
        background-repeat: no-repeat !important;
        background-size: 16px 16px !important;
        padding-right: 48px !important;
        border-radius: 8px !important;
        transition: all 0.2s ease-in-out !important;
        border: 1px solid #d1d5db !important;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
        cursor: pointer !important;
        position: relative !important;
        z-index: 1 !important;
      }
      
      .custom-select:focus {
        outline: none !important;
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
        z-index: 2 !important;
      }
      
      .custom-select:hover {
        border-color: #9ca3af !important;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
      }
      
      .custom-select:disabled {
        background-color: #f9fafb !important;
        color: #6b7280 !important;
        cursor: not-allowed !important;
        opacity: 0.5 !important;
      }

      /* Suppression complète du style natif sur tous les navigateurs */
      .custom-select::-ms-expand {
        display: none !important;
      }

      /* Force le style des options - compatible avec plus de navigateurs */
      .custom-select option {
        background-color: white !important;
        color: #374151 !important;
        padding: 8px 12px !important;
        font-size: inherit !important;
        border: none !important;
        border-radius: 0 !important;
      }

      .custom-select option:hover {
        background-color: #f3f4f6 !important;
        color: #374151 !important;
      }

      .custom-select option:checked,
      .custom-select option:focus,
      .custom-select option[selected] {
        background-color: #3b82f6 !important;
        color: white !important;
        font-weight: 500 !important;
      }

      /* Styles spécifiques par navigateur */
      @-webkit-keyframes none {
        0% { opacity: 1; }
        100% { opacity: 1; }
      }

      @-moz-document url-prefix() {
        .custom-select {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e") !important;
          padding-right: 48px !important;
          text-indent: 0.01px !important;
          text-overflow: '' !important;
        }
      }

      /* Force l'apparence sur Edge/IE */
      @supports (-ms-ime-align: auto) {
        .custom-select {
          padding-right: 48px !important;
          background-position: right 12px center !important;
        }
      }
    `;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Vérification de l'état d'authentification avec Supabase
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Mode local : vérifier localStorage pour la démo
      const savedUser = localStorage.getItem('demo-user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
        setCurrentView('dashboard');
      }
      return;
    }

    // Mode Supabase : vérifier l'authentification réelle
    const checkAuth = async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const appUser = convertSupabaseUser(session.user);
        setUser(appUser);
        setCurrentView('dashboard');
      }
    };

    checkAuth();

    // Écouter les changements d'authentification
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            const appUser = convertSupabaseUser(session.user);
            setUser(appUser);
            setCurrentView('dashboard');
          } else {
            setUser(null);
            setCurrentView('landing');
          }
        }
      );

      return () => subscription.unsubscribe();
    }
  }, []);

  const handleAuth = async (email: string, password: string, setMessage: (msg: { type: 'success' | 'error' | 'info'; text: string } | null) => void) => {
    setLoading(true);
    setMessage(null);
    
    // Validation des entrées
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage({ type: 'error', text: 'Veuillez saisir une adresse email valide.' });
      setLoading(false);
      return;
    }
    
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères.' });
      setLoading(false);
      return;
    }
    
    // Vérifier si l'email est autorisé
    const allowedEmails = ['salome.marla@yahoo.com', 'matteo.quintaneiro@gmail.com', 'aquaisdead@gmail.com'];
    if (!allowedEmails.includes(email.toLowerCase())) {
      setMessage({ type: 'error', text: 'Accès restreint. Seules les adresses autorisées peuvent créer un compte.' });
      setLoading(false);
      return;
    }
    
    try {
      if (!isSupabaseConfigured) {
        // Mode démo avec localStorage
        if (authMode === 'signup') {
          setMessage({ type: 'success', text: 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.' });
          setTimeout(() => {
            setAuthMode('signin');
            setMessage(null);
          }, 2000);
        } else {
          const mockUser: AppUser = { id: email, email };
          setUser(mockUser);
          localStorage.setItem('demo-user', JSON.stringify(mockUser));
          setCurrentView('dashboard');
        }
      } else {
        // Mode Supabase
        if (!supabase) throw new Error('Supabase non configuré');
        
        if (authMode === 'signup') {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });
          
          if (error) {
            console.error('Erreur inscription:', error);
            if (error.message.includes('User already registered') || error.message.includes('already been registered')) {
              setMessage({ 
                type: 'error', 
                text: `Un compte existe déjà pour ${email}. Utilisez "Se connecter" ci-dessous pour accéder à votre compte.` 
              });
              // Suggérer automatiquement de passer en mode connexion après 3 secondes
              setTimeout(() => {
                if (authMode === 'signup') {
                  setMessage({ 
                    type: 'info', 
                    text: 'Vous pouvez vous connecter en cliquant sur le lien ci-dessous.'
                  });
                }
              }, 3000);
            } else if (error.message.includes('Password should be at least')) {
              setMessage({ 
                type: 'error', 
                text: 'Le mot de passe doit contenir au moins 6 caractères.' 
              });
            } else if (error.message.includes('Invalid email')) {
              setMessage({ 
                type: 'error', 
                text: 'Format d\'email invalide. Veuillez vérifier votre adresse.' 
              });
            } else if (error.message.includes('rate limit') || error.message.includes('Too many')) {
              setMessage({ 
                type: 'error', 
                text: 'Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.' 
              });
            } else if (error.message.includes('weak password')) {
              setMessage({ 
                type: 'error', 
                text: 'Mot de passe trop faible. Utilisez au moins 6 caractères avec lettres et chiffres.' 
              });
            } else {
              setMessage({ 
                type: 'error', 
                text: `Erreur d'inscription: ${error.message}` 
              });
            }
            return;
          }
          
          if (data.user && data.user.email) {
            setMessage({ 
              type: 'info', 
              text: `Un lien de confirmation a été envoyé à ${email}. Veuillez cliquer sur le lien pour activer votre compte. N'oubliez pas de vérifier vos spams !` 
            });
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (error) {
            console.error('Erreur connexion:', error);
            if (error.message.includes('Invalid login credentials')) {
              setMessage({ 
                type: 'error', 
                text: `Email ou mot de passe incorrect pour ${email}. Vérifiez vos identifiants ou créez un nouveau compte.` 
              });
            } else if (error.message.includes('Email not confirmed')) {
              setMessage({ 
                type: 'error', 
                text: 'Votre email n\'est pas encore confirmé. Vérifiez votre boîte mail et vos spams, puis cliquez sur le lien de confirmation.' 
              });
            } else if (error.message.includes('Too many requests')) {
              setMessage({ 
                type: 'error', 
                text: 'Trop de tentatives de connexion. Veuillez patienter quelques minutes avant de réessayer.' 
              });
            } else if (error.message.includes('User not found')) {
              setMessage({ 
                type: 'error', 
                text: `Aucun compte trouvé pour ${email}. Vérifiez votre adresse email ou créez un nouveau compte.` 
              });
            } else if (error.message.includes('network')) {
              setMessage({ 
                type: 'error', 
                text: 'Problème de connexion réseau. Vérifiez votre connexion internet et réessayez.' 
              });
            } else {
              setMessage({ 
                type: 'error', 
                text: `Erreur de connexion: ${error.message}` 
              });
            }
            return;
          }
          
          if (data.user && data.user.email) {
            const appUser = convertSupabaseUser(data.user);
            setUser(appUser);
            setCurrentView('dashboard');
          }
        }
      }
      
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erreur d\'authentification' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('demo-user');
    }
    setUser(null);
    setCurrentView('landing');
  };

  const handleResendEmail = async (email: string) => {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Service d\'email non configuré');
    }
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    
    if (error) {
      throw error;
    }
  };



  if (currentView === 'landing') {
    return <LandingPage onGetStarted={() => setCurrentView('auth')} />;
  }

  if (currentView === 'auth') {
    return (
      <AuthPage 
        mode={authMode}
        onToggleMode={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
        onAuth={handleAuth}
        loading={loading}
        onBack={() => setCurrentView('landing')}
        onResendEmail={handleResendEmail}
      />
    );
  }

  return <Dashboard user={user!} onLogout={handleLogout} />;
};

// Composant Landing Page
const LandingPage: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img 
              src="/logo512.png" 
              alt="FactureSimple" 
              className="w-8 h-8 rounded-lg"
            />
            <span className="font-semibold text-gray-900">FactureSimple</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-6 py-8 sm:py-12 md:py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6 sm:mb-8">
            Facturation simplifiée ✨
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-4 sm:mb-6">
            Créez vos factures
            <span className="block text-blue-600">en quelques clics</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-10 md:mb-12 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
            Une solution de facturation ultra-simple et épurée. 
            Générez vos factures professionnelles en 30 secondes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 sm:mb-16 md:mb-20">
            <button 
              onClick={onGetStarted}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
            >
              Commencer
            </button>

          </div>
        </div>

        {/* Features */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 sm:gap-8">
          {[
            {
              title: "Simple & Rapide",
              description: "Interface épurée pour créer vos factures en quelques clics"
            },
            {
              title: "Sécurisé",
              description: "Vos données sont protégées avec un système d'authentification robuste"
            },
            {
              title: "PDF Automatique",
              description: "Téléchargez vos factures au format PDF professionnel"
            }
          ].map((feature, index) => (
            <div key={index} className="text-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

// Composant d'authentification
const AuthPage: React.FC<{
  mode: 'signin' | 'signup';
  onToggleMode: () => void;
  onAuth: (email: string, password: string, setMessage: (msg: { type: 'success' | 'error' | 'info'; text: string } | null) => void) => void;
  loading: boolean;
  onBack: () => void;
  onResendEmail?: (email: string) => Promise<void>;
}> = ({ mode, onToggleMode, onAuth, loading, onBack, onResendEmail }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showResendButton, setShowResendButton] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  // Détecter si l'utilisateur a besoin de confirmer son email
  useEffect(() => {
    if (message?.text.includes('lien de confirmation') || 
        message?.text.includes('confirmer votre') ||
        message?.text.includes('n\'est pas encore confirmé')) {
      const timer = setTimeout(() => {
        setShowResendButton(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowResendButton(false);
    }
  }, [message]);

  // Fonction pour renvoyer l'email de confirmation
  const handleResendEmail = async () => {
    if (!email || !onResendEmail) return;
    
    try {
      await onResendEmail(email);
      setMessage({ 
        type: 'success', 
        text: `Nouveau lien envoyé à ${email} !` 
      });
      setShowResendButton(false);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Erreur lors du renvoi. Réessayez dans quelques minutes.' 
      });
    }
  };

  // Fonction pour réinitialiser le mot de passe
  const handleForgotPassword = async () => {
    if (!email) {
      setMessage({ 
        type: 'error', 
        text: 'Veuillez saisir votre adresse email d\'abord.' 
      });
      return;
    }

    if (!supabase || !isSupabaseConfigured) {
      setMessage({ 
        type: 'error', 
        text: 'Service de réinitialisation non configuré.' 
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw error;
      }

      setMessage({ 
        type: 'success', 
        text: `Un lien de réinitialisation a été envoyé à ${email}. Vérifiez votre boîte email et vos spams.` 
      });
      setResetEmailSent(true);
      setShowForgotPassword(false);
    } catch (error: any) {
      console.error('Erreur reset password:', error);
      setMessage({ 
        type: 'error', 
        text: 'Erreur lors de l\'envoi du lien. Réessayez dans quelques minutes.' 
      });
    }
  };

  const handleSubmit = () => {
    setMessage(null); // Clear previous messages
    
    if (!email || !password) {
      setMessage({ type: 'error', text: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }
    
    if (mode === 'signup' && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    
    onAuth(email, password, setMessage);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <button 
          onClick={onBack}
          className="mb-8 text-gray-600 hover:text-gray-900 font-medium"
        >
          ← Retour
        </button>
        
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {mode === 'signin' ? 'Connexion' : 'Créer un compte'}
            </h2>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">
              {mode === 'signin' 
                ? 'Connectez-vous à votre compte' 
                : 'Créez votre compte gratuitement'
              }
            </p>
          </div>

          {/* Message d'information/erreur */}
          {message && (
            <div className={`p-4 mb-6 rounded-xl border ${
              message.type === 'error' 
                ? 'bg-red-50 border-red-200 text-red-800' 
                : message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <p className="text-sm font-medium">{message.text}</p>
              
              {/* Bouton pour basculer vers connexion si email déjà utilisé */}
              {message.type === 'error' && message.text.includes('déjà associé') && (
                <button
                  onClick={onToggleMode}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                >
                  Se connecter à la place
                </button>
              )}
              
              {/* Lien de renvoi d'email simple */}
              {showResendButton && (
                <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                  <p className="text-sm text-gray-600">
                    Vous n'avez pas reçu l'email ? {' '}
                    <button
                      onClick={handleResendEmail}
                      className="text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      Renvoyer le lien
                    </button>
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Adresse email"
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Mot de passe"
                  className="w-full pl-11 pr-11 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Confirmer le mot de passe"
                    className="w-full pl-11 pr-11 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Lien mot de passe oublié (seulement en mode connexion) */}
            {mode === 'signin' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium underline transition-colors duration-200"
                  disabled={loading}
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-all duration-200"
            >
              {loading ? 'Connexion...' : (mode === 'signin' ? 'Se connecter' : 'Créer le compte')}
            </button>
          </div>

          <div className="text-center mt-6">
            <button
              onClick={onToggleMode}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {mode === 'signin' 
                ? "Pas encore de compte ? S'inscrire" 
                : 'Déjà un compte ? Se connecter'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant Dashboard
const Dashboard: React.FC<{ user: AppUser; onLogout: () => void }> = ({ user, onLogout }) => {
  const [invoice, setInvoice] = useState<Invoice>(() => {
    const today = new Date();
    const invoiceNumber = `${today.getFullYear()}-${today.getMonth() + 1}-${String(13).padStart(4, '0')}`;
    
    return {
      invoiceNumber,
      invoiceDate: today.toLocaleDateString('fr-FR'),
      deliveryDate: today.toLocaleDateString('fr-FR'),
      paymentTerms: '30 jours à réception',
      paymentDue: calculatePaymentDue(today, '30 jours à réception')
    };
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [editingClient, setEditingClient] = useState(false);
  const [editingArticles, setEditingArticles] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showDeleteArticleConfirmation, setShowDeleteArticleConfirmation] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<string | null>(null);
  const [showDeleteClientFromSettingsConfirmation, setShowDeleteClientFromSettingsConfirmation] = useState(false);
  const [clientToDeleteIndex, setClientToDeleteIndex] = useState<number | null>(null);
  const [showDuplicateConfirmation, setShowDuplicateConfirmation] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');
  const [duplicateAction, setDuplicateAction] = useState<() => void>(() => {});
  const [showFinalizeConfirmation, setShowFinalizeConfirmation] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Fonctions utilitaires
  const formatPhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  };

  const formatSiret = (siret: string) => {
    const digits = siret.replace(/\D/g, '');
    if (digits.length === 14) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4');
    }
    return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  };

  const formatIban = (iban: string) => {
    const chars = iban.replace(/\s/g, '').toUpperCase();
    return chars.replace(/(.{4})/g, '$1 ').trim();
  };

  const validateSiret = (siret: string) => {
    const digits = siret.replace(/\D/g, '');
    return digits.length === 14;
  };

  const checkDuplicateClientName = (firstName: string, lastName: string, excludeIndex?: number) => {
    return clients.some((client, index) => 
      client.firstName.toLowerCase().trim() === firstName.toLowerCase().trim() && 
      client.lastName.toLowerCase().trim() === lastName.toLowerCase().trim() && 
      index !== excludeIndex
    );
  };

  const checkDuplicateArticleName = (name: string, excludeId?: string) => {
    return articles.some((article) => 
      article.name.toLowerCase().trim() === name.toLowerCase().trim() && 
      article.id !== excludeId
    );
  };

  const createClientWithCheck = (clientData: ClientInfo, onConfirm: () => void) => {
    if (checkDuplicateClientName(clientData.firstName, clientData.lastName)) {
      setDuplicateMessage(`Un client nommé "${clientData.firstName} ${clientData.lastName}" existe déjà. Créer quand même ? Cela peut causer de la confusion.`);
      setDuplicateAction(() => onConfirm);
      setShowDuplicateConfirmation(true);
    } else {
      onConfirm();
    }
  };
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<'draft' | 'finalized'>('draft');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);



  // Fonction de nettoyage pour réinitialiser complètement l'application
  const cleanAllData = () => {
    // Nettoyer localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes('invoice') || key.includes('demo-user') || key.includes('user')) {
        localStorage.removeItem(key);
      }
    });
    
    setMessage({ type: 'success', text: 'Toutes les données locales ont été nettoyées. L\'application est prête pour la production !' });
    
    // Recharger la page après 2 secondes pour réinitialiser complètement l'état
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };



  // Données par défaut pour les emails spécifiques
  const getDefaultDataForEmail = (email: string) => {
    // DÉSACTIVÉ TEMPORAIREMENT pour éviter les conflits
    // if (email === 'aquaisdead@gmail.com' || email === 'salome.marla@yahoo.com') {
    //   return { ... }
    // }
    return null; // Ne plus créer automatiquement de données par défaut
  };

  // Fonctions pour gérer le profil utilisateur
  const loadUserProfile = async () => {
    if (!user || !isSupabaseConfigured || !supabase) return;
  
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
  
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
  
      if (data) {
        console.log('📄 Profil trouvé, chargement...', data);
        
        const safeCompanyInfo = data.default_company_info || {};
        const safeClientInfo = data.default_client_info || {};
        
        const profile: UserProfile = {
          id: data.id,
          user_id: data.user_id,
          default_company_info: {
            firstName: decryptData(safeCompanyInfo.firstName) || '',
            lastName: decryptData(safeCompanyInfo.lastName) || '',
            companyName: decryptData(safeCompanyInfo.companyName) || '',
            address: decryptData(safeCompanyInfo.address) || '',
            postalCode: decryptData(safeCompanyInfo.postalCode) || '',
            city: decryptData(safeCompanyInfo.city) || '',
            phone: decryptData(safeCompanyInfo.phone) || '',
            email: decryptData(safeCompanyInfo.email) || user.email, // Fallback sur l'email utilisateur
            siret: decryptData(safeCompanyInfo.siret) || '',
            accountName: decryptData(safeCompanyInfo.accountName) || '',
            bic: decryptData(safeCompanyInfo.bic) || '',
            iban: decryptData(safeCompanyInfo.iban) || '',
            bankName: decryptData(safeCompanyInfo.bankName) || '',
            logoUrl: safeCompanyInfo.logoUrl || undefined
          },
          default_client_info: {
            firstName: decryptData(safeClientInfo.firstName) || '',
            lastName: decryptData(safeClientInfo.lastName) || '',
            address: decryptData(safeClientInfo.address) || '',
            postalCode: decryptData(safeClientInfo.postalCode) || '',
            city: decryptData(safeClientInfo.city) || '',
            siret: decryptData(safeClientInfo.siret) || '',
            phone: decryptData(safeClientInfo.phone) || '',
            email: decryptData(safeClientInfo.email) || ''
          },
          default_articles: data.default_articles || [],
          created_at: data.created_at,
          updated_at: data.updated_at
        };
  
        setUserProfile(profile);
        setCompanyInfo(profile.default_company_info);
        setClientInfo(profile.default_client_info);
        setArticles(profile.default_articles.length > 0 ? profile.default_articles : [{
          id: '1',
          name: 'Service',
          description: ['Description du service'],
          quantity: 1,
          unit: 'Heure(s)',
          unitPrice: 0,
          total: 0
        }]);
  
        // Charger les clients depuis clients_list uniquement
        const storedClients = (data.clients_list || []).map((c: any) => ({
          firstName: decryptData(c.firstName) || '',
          lastName: decryptData(c.lastName) || '',
          address: decryptData(c.address) || '',
          postalCode: decryptData(c.postalCode) || '',
          city: decryptData(c.city) || '',
          siret: decryptData(c.siret) || '',
          phone: decryptData(c.phone) || '',
          email: decryptData(c.email) || ''
        }));
        
        if (storedClients.length > 0) {
          setClients(storedClients);
          setSelectedClientIndex(0);
          setClientInfo(storedClients[0]);
        } else {
          // Créer un client vide par défaut
          const emptyClient = {
            firstName: '',
            lastName: '',
            address: '',
            postalCode: '',
            city: '',
            siret: '',
            phone: '',
            email: ''
          };
          setClients([emptyClient]);
          setSelectedClientIndex(0);
          setClientInfo(emptyClient);
        }
        
      } else {
        console.log('📄 Aucun profil trouvé, création d\'un profil vide');
        
        // Créer un profil complètement vide (plus de données automatiques)
        const defaultCompanyInfo = {
          firstName: '',
          lastName: '',
          companyName: '',
          address: '',
          postalCode: '',
          city: '',
          phone: '',
          email: user.email, // Seulement l'email utilisateur
          siret: '',
          accountName: '',
          bic: '',
          iban: '',
          bankName: '',
          logoUrl: undefined
        };
        
        const defaultClientInfo = {
          firstName: '',
          lastName: '',
          address: '',
          postalCode: '',
          city: '',
          siret: '',
          phone: '',
          email: ''
        };
        
        setCompanyInfo(defaultCompanyInfo);
        setClientInfo(defaultClientInfo);
        setClients([defaultClientInfo]);
        setSelectedClientIndex(0);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement du profil:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement. Rechargez la page.' });
    }
  };

  // Fonction pour créer automatiquement un profil par défaut
  const createDefaultProfile = async (defaultData: any) => {
    // DÉSACTIVÉ - Plus de création automatique
    console.log('⚠️ createDefaultProfile désactivé');
    return;
  };

  const saveUserProfile = async (showSuccessMessage: boolean = true) => {
    if (!user || !isSupabaseConfigured || !supabase) {
      if (showSuccessMessage) {
        setMessage({ type: 'error', text: 'Impossible de sauvegarder : Supabase non configuré.' });
      }
      return false;
    }

    try {
      console.log('🔄 DÉBUT SAUVEGARDE PROFIL');
      console.log('👤 User ID:', user.id);
      console.log('🏢 Données entreprise à sauver:', {
        firstName: companyInfo.firstName,
        lastName: companyInfo.lastName,
        email: companyInfo.email,
        siret: companyInfo.siret
      });
      console.log('👥 Données clients à sauver:', clients.map(c => ({
        firstName: c.firstName,
        lastName: c.lastName,
        siret: c.siret,
        phone: c.phone
      })));
      
      const profileData = {
        user_id: user.id,
        default_company_info: {
          // TOUS LES CHAMPS SONT MAINTENANT CHIFFRÉS
          firstName: encryptData(companyInfo.firstName || ''),
          lastName: encryptData(companyInfo.lastName || ''),
          companyName: encryptData(companyInfo.companyName || ''),
          address: encryptData(companyInfo.address || ''),
          postalCode: encryptData(companyInfo.postalCode || ''),
          city: encryptData(companyInfo.city || ''),
          phone: encryptData(companyInfo.phone || ''), // MAINTENANT CHIFFRÉ
          email: encryptData(companyInfo.email || ''), // MAINTENANT CHIFFRÉ
          siret: encryptData(companyInfo.siret || ''), // MAINTENANT CHIFFRÉ
          accountName: encryptData(companyInfo.accountName || ''),
          bic: encryptData(companyInfo.bic || ''),
          iban: encryptData(companyInfo.iban || ''),
          bankName: encryptData(companyInfo.bankName || ''),
          logoUrl: companyInfo.logoUrl || null // URL publique non chiffrée
        },
        default_client_info: {
          // TOUS LES CHAMPS CLIENTS CHIFFRÉS
          firstName: encryptData(clientInfo.firstName || ''),
          lastName: encryptData(clientInfo.lastName || ''),
          address: encryptData(clientInfo.address || ''),
          postalCode: encryptData(clientInfo.postalCode || ''),
          city: encryptData(clientInfo.city || ''),
          siret: encryptData(clientInfo.siret || ''), // MAINTENANT CHIFFRÉ
          phone: encryptData(clientInfo.phone || ''), // MAINTENANT CHIFFRÉ
          email: encryptData(clientInfo.email || '') // MAINTENANT CHIFFRÉ
        },
        default_articles: articles, // Articles non sensibles
        clients_list: clients.map(client => ({
          // TOUS LES CHAMPS DE TOUS LES CLIENTS CHIFFRÉS
          firstName: encryptData(client.firstName || ''),
          lastName: encryptData(client.lastName || ''),
          address: encryptData(client.address || ''),
          postalCode: encryptData(client.postalCode || ''),
          city: encryptData(client.city || ''),
          siret: encryptData(client.siret || ''), // MAINTENANT CHIFFRÉ
          phone: encryptData(client.phone || ''), // MAINTENANT CHIFFRÉ
          email: encryptData(client.email || '') // MAINTENANT CHIFFRÉ
        })),
        updated_at: new Date().toISOString()
      };
  
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(profileData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        })
        .select();
  
      if (error) throw error;
  
      console.log('✅ SAUVEGARDE RÉUSSIE');
      
      if (showSuccessMessage) {
        setMessage({ type: 'success', text: 'Informations sauvegardées avec succès !' });
        setTimeout(() => setMessage(null), 3000);
      }
      
      setHasUnsavedChanges(false);
      return true;
        
    } catch (error: any) {
      console.error('❌ ERREUR SAUVEGARDE:', error);
      if (showSuccessMessage) {
        setMessage({ type: 'error', text: `Erreur de sauvegarde : ${error.message}` });
      }
      return false;
    }
  };

  // Fonctions pour gérer les clients avec la table dédiée
  const loadClients = async () => {
    // DÉSACTIVÉ - On utilise maintenant seulement clients_list dans user_profiles
    console.log('⚠️ loadClients désactivé - utilisation de clients_list uniquement');
    setClientsLoaded(true);
  };

  const createDefaultClient = async (clientData: ClientInfo) => {
    if (!user || !isSupabaseConfigured || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          id: `client_${user.id}_${Date.now()}`,
          user_id: user.id,
          first_name: clientData.firstName,
          last_name: clientData.lastName,
          address: clientData.address,
          postal_code: clientData.postalCode,
          city: clientData.city,
          siret: clientData.siret,
          phone: clientData.phone,
          email: clientData.email,
          is_default: true
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newClient: ClientInfo = {
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          address: data.address || '',
          postalCode: data.postal_code || '',
          city: data.city || '',
          siret: data.siret || '',
          phone: data.phone || '',
          email: data.email || ''
        };
        
        setClients([newClient]);
        setSelectedClientIndex(0);
        setClientInfo(newClient);
        setClientsLoaded(true);
        
        setMessage({ type: 'success', text: '🎉 Client par défaut créé automatiquement !' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Erreur lors de la création du client par défaut:', error);
    }
  };

  const saveClient = async (clientData: ClientInfo, isNew: boolean = false) => {
    console.log('💾 Sauvegarde client:', clientData, 'isNew:', isNew);
    
    // Toujours sauvegarder dans la liste locale
    // La vraie sauvegarde se fera avec saveUserProfile()
    if (isNew) {
      const newClients = [...clients, clientData];
      setClients(newClients);
      setSelectedClientIndex(newClients.length - 1);
      setClientInfo(clientData);
    } else {
      const updatedClients = [...clients];
      updatedClients[selectedClientIndex] = clientData;
      setClients(updatedClients);
      setClientInfo(clientData);
    }
    
    // Marquer comme ayant des changements non sauvés
    setHasUnsavedChanges(true);
  };

  // Charger le profil utilisateur et les clients au montage du composant
  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadClients();
      
      // Initialiser l'email de l'entreprise avec l'email de l'utilisateur si vide
      if (!companyInfo.email && user.email) {
        setCompanyInfo(prev => ({ ...prev, email: user.email }));
      }
    }
  }, [user]);

  // États pour les informations éditables (chargées depuis le profil utilisateur)
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    firstName: '',
    lastName: '',
    companyName: '',
    address: '',
    postalCode: '',
    city: '',
    phone: '',
    email: '', // Ne pas utiliser user?.email ici car user peut être undefined
    siret: '',
    accountName: '',
    bic: '',
    iban: '',
    bankName: '',
    logoUrl: undefined
  });

  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    firstName: '',
    lastName: '',
    address: '',
    postalCode: '',
    city: '',
    siret: '',
    phone: '',
    email: ''
  });

  // Gestion multi-clients avec table dédiée
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [selectedClientIndex, setSelectedClientIndex] = useState<number>(0);
  const [clientsLoaded, setClientsLoaded] = useState<boolean>(false);

  const [articles, setArticles] = useState<Article[]>([
    {
      id: '1',
      name: 'Produit',
      description: ['Description du produit'],
      quantity: 1,
      unit: 'Unité',
      unitPrice: 0,
      total: 0
    }
  ]);

  // Calcul automatique de l'échéance de paiement
  const updatePaymentDue = (invoiceDate: string, terms: string) => {
    if (!invoiceDate || !terms) return;
    const date = new Date(invoiceDate.split('/').reverse().join('-'));
    const dueDate = calculatePaymentDue(date, terms);
    setInvoice(prev => ({ ...prev, paymentDue: dueDate }));
  };

  const handleDeliveryDateChange = (newDate: string) => {
    setInvoice(prev => ({ ...prev, deliveryDate: newDate }));
    setShowDatePicker(false);
  };

  const handlePaymentTermsChange = (terms: '10 jours à réception' | '20 jours à réception' | '30 jours à réception') => {
    setInvoice(prev => ({ ...prev, paymentTerms: terms }));
    updatePaymentDue(invoice.invoiceDate, terms);
  };

  // Fonctions pour gérer les articles
  const addArticle = () => {
    const newArticle: Article = {
      id: Date.now().toString(),
      name: 'Nouvel article',
      description: ['Description'],
      quantity: 1,
      unit: 'Unité',
      unitPrice: 0,
      total: 0
    };
    
    if (checkDuplicateArticleName(newArticle.name)) {
      setDuplicateMessage(`Un produit nommé "${newArticle.name}" existe déjà. Créer quand même ? Cela peut causer de la confusion.`);
      setDuplicateAction(() => () => setArticles([...articles, newArticle]));
      setShowDuplicateConfirmation(true);
    } else {
      setArticles([...articles, newArticle]);
    }
  };

  const updateArticle = (id: string, updates: Partial<Article>) => {
    setArticles(prevArticles => prevArticles.map(article => {
      if (article.id === id) {
        const updated = { ...article, ...updates };
        
        // Recalculer le total seulement si quantity ou unitPrice ont changé
        if ('quantity' in updates || 'unitPrice' in updates) {
          updated.total = updated.quantity * updated.unitPrice;
        }
        
        return updated;
      }
      return article;
    }));
  };

  const deleteArticle = (id: string) => {
    setArticles(articles.filter(article => article.id !== id));
  };



  const calculateTotal = () => {
    return articles.reduce((sum, article) => sum + article.total, 0);
  };

  // Fonctions pour gérer l'historique des factures avec Supabase ou localStorage
  const getInvoiceHistory = async (): Promise<SavedInvoice[]> => {
    if (!user) return [];
    
    if (!isSupabaseConfigured || !supabase) {
      const saved = localStorage.getItem(`invoice-history-${user.id}`);
      return saved ? JSON.parse(saved) : [];
    }
    
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data?.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoice.invoice_date,
        deliveryDate: invoice.delivery_date,
        paymentTerms: invoice.payment_terms,
        paymentDue: invoice.payment_due,
        companyInfo: {
          firstName: decryptData(invoice.company_info.firstName),
          lastName: decryptData(invoice.company_info.lastName),
          companyName: decryptData(invoice.company_info.companyName),
          address: decryptData(invoice.company_info.address),
          postalCode: decryptData(invoice.company_info.postalCode),
          city: decryptData(invoice.company_info.city),
          phone: decryptData(invoice.company_info.phone), // DÉCHIFFRÉ
          email: decryptData(invoice.company_info.email), // DÉCHIFFRÉ
          siret: decryptData(invoice.company_info.siret), // DÉCHIFFRÉ
          accountName: decryptData(invoice.company_info.accountName),
          bic: decryptData(invoice.company_info.bic),
          iban: decryptData(invoice.company_info.iban),
          bankName: decryptData(invoice.company_info.bankName),
          logoUrl: invoice.company_info.logoUrl
        },
        clientInfo: {
          firstName: decryptData(invoice.client_info.firstName),
          lastName: decryptData(invoice.client_info.lastName),
          address: decryptData(invoice.client_info.address),
          postalCode: decryptData(invoice.client_info.postalCode),
          city: decryptData(invoice.client_info.city),
          siret: decryptData(invoice.client_info.siret), // DÉCHIFFRÉ
          phone: decryptData(invoice.client_info.phone), // DÉCHIFFRÉ
          email: decryptData(invoice.client_info.email) // DÉCHIFFRÉ
        },
        articles: invoice.articles,
        totalAmount: invoice.total_amount,
        status: invoice.status,
        createdAt: invoice.created_at,
        finalizedAt: invoice.finalized_at
      })) || [];
    } catch (error) {
      console.error('Erreur lors du chargement des factures:', error);
      return [];
    }
  };

  const saveInvoiceToHistory = async (invoiceData: SavedInvoice) => {
    if (!user) {
      setMessage({ type: 'error', text: 'Erreur : utilisateur non connecté.' });
      return;
    }
    
    if (!isSupabaseConfigured || !supabase) {
      // Mode localStorage pour la démo (données non chiffrées en local)
      const history = await getInvoiceHistory();
      const existingIndex = history.findIndex(inv => inv.id === invoiceData.id);
      
      if (existingIndex >= 0) {
        history[existingIndex] = invoiceData;
      } else {
        history.push(invoiceData);
      }
      
      localStorage.setItem(`invoice-history-${user.id}`, JSON.stringify(history));
      return;
    }
    
    try {
      // CHIFFREMENT COMPLET DE TOUTES LES DONNÉES SENSIBLES
      const encryptedCompanyInfo = {
        firstName: encryptData(invoiceData.companyInfo.firstName || ''),
        lastName: encryptData(invoiceData.companyInfo.lastName || ''),
        companyName: encryptData(invoiceData.companyInfo.companyName || ''),
        address: encryptData(invoiceData.companyInfo.address || ''),
        postalCode: encryptData(invoiceData.companyInfo.postalCode || ''),
        city: encryptData(invoiceData.companyInfo.city || ''),
        phone: encryptData(invoiceData.companyInfo.phone || ''), // CHIFFRÉ
        email: encryptData(invoiceData.companyInfo.email || ''), // CHIFFRÉ
        siret: encryptData(invoiceData.companyInfo.siret || ''), // CHIFFRÉ
        accountName: encryptData(invoiceData.companyInfo.accountName || ''),
        bic: encryptData(invoiceData.companyInfo.bic || ''),
        iban: encryptData(invoiceData.companyInfo.iban || ''),
        bankName: encryptData(invoiceData.companyInfo.bankName || ''),
        logoUrl: invoiceData.companyInfo.logoUrl // URL publique non chiffrée
      };
      
      const encryptedClientInfo = {
        firstName: encryptData(invoiceData.clientInfo.firstName || ''),
        lastName: encryptData(invoiceData.clientInfo.lastName || ''),
        address: encryptData(invoiceData.clientInfo.address || ''),
        postalCode: encryptData(invoiceData.clientInfo.postalCode || ''),
        city: encryptData(invoiceData.clientInfo.city || ''),
        siret: encryptData(invoiceData.clientInfo.siret || ''), // CHIFFRÉ
        phone: encryptData(invoiceData.clientInfo.phone || ''), // CHIFFRÉ
        email: encryptData(invoiceData.clientInfo.email || '') // CHIFFRÉ
      };
      
      const invoiceToSave = {
        id: invoiceData.id,
        user_id: user.id,
        invoice_number: invoiceData.invoiceNumber,
        invoice_date: invoiceData.invoiceDate,
        delivery_date: invoiceData.deliveryDate,
        payment_terms: invoiceData.paymentTerms,
        payment_due: invoiceData.paymentDue,
        company_info: encryptedCompanyInfo,
        client_info: encryptedClientInfo,
        articles: invoiceData.articles, // Articles non sensibles
        total_amount: invoiceData.totalAmount,
        status: invoiceData.status,
        created_at: invoiceData.createdAt,
        finalized_at: invoiceData.finalizedAt
      };
      
      const { error } = await supabase
        .from('invoices')
        .upsert(invoiceToSave);
      
      if (error) throw error;
      
      if (invoiceData.status === 'draft') {
        setMessage({ type: 'success', text: 'Facture sauvegardée (données chiffrées) !' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      setMessage({ type: 'error', text: `Erreur de sauvegarde : ${error.message}` });
    }
  };

  const generateSmartInvoiceNumber = async (targetDate?: Date): Promise<{ number: string; hasConflict: boolean; conflictInfo?: string }> => {
    const date = targetDate || new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const history = await getInvoiceHistory();
    const monthInvoices = history.filter(inv => 
      inv.invoiceNumber.startsWith(`${year}-${month}`) && inv.status === 'finalized'
    );
    
    // Trouver le prochain numéro disponible pour ce mois (commence à 12)
    let nextNumber = 12;
    const existingNumbers = monthInvoices.map(inv => {
      if (!inv.invoiceNumber || typeof inv.invoiceNumber !== 'string') return 0;
      const parts = inv.invoiceNumber.split('-');
      return parseInt(parts[2]) || 0;
    }).sort((a, b) => a - b);
    
    // Si on a déjà des factures, prendre le max + 1
    if (existingNumbers.length > 0) {
      nextNumber = Math.max(...existingNumbers, 11) + 1;
    } else {
      // Premier mois, on commence à 12
      nextNumber = 12;
    }
    
    const newInvoiceNumber = `${year}-${month}-${String(nextNumber).padStart(4, '0')}`;
    
    // Vérifier s'il y a déjà une facture en cours pour ce mois
    const draftForMonth = history.find(inv => 
      inv.invoiceNumber.startsWith(`${year}-${month}`) && inv.status === 'draft'
    );
    
    return {
      number: newInvoiceNumber,
      hasConflict: !!draftForMonth,
      conflictInfo: draftForMonth ? `Une facture brouillon existe déjà pour ${month}/${year} (${draftForMonth.invoiceNumber})` : undefined
    };
  };

  const confirmAction = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setPendingAction(() => action);
    setShowConfirmDialog(true);
  };

  const executeConfirmedAction = () => {
    if (pendingAction) {
      pendingAction();
    }
    setShowConfirmDialog(false);
    setPendingAction(null);
    setConfirmMessage('');
  };

  const createNewInvoice = async () => {
    const smartNumber = await generateSmartInvoiceNumber();
    
    if (smartNumber.hasConflict) {
      confirmAction(
        `⚠️ ${smartNumber.conflictInfo}\n\nVoulez-vous vraiment créer une nouvelle facture pour ce mois ?`,
        () => {
          initializeNewInvoice(smartNumber.number);
        }
      );
    } else {
      initializeNewInvoice(smartNumber.number);
    }
  };

  const initializeNewInvoice = (invoiceNumber: string) => {
    const today = new Date();
    const newInvoice = {
      invoiceNumber,
      invoiceDate: today.toLocaleDateString('fr-FR'),
      deliveryDate: today.toLocaleDateString('fr-FR'),
      paymentTerms: '30 jours à réception' as const,
      paymentDue: calculatePaymentDue(today, '30 jours à réception')
    };
    
    setInvoice(newInvoice);
    setCurrentInvoiceId(Date.now().toString());
    setInvoiceStatus('draft');
  };

  const finalizeInvoice = async () => {
    if (!currentInvoiceId) {
      setMessage({ type: 'error', text: 'Erreur : aucune facture en cours. Veuillez créer une nouvelle facture.' });
      return;
    }
    
    if (!user) {
      setMessage({ type: 'error', text: 'Erreur : utilisateur non connecté. Veuillez vous reconnecter.' });
      return;
    }
    
    // Sauvegarder automatiquement le profil avant de finaliser la facture
    console.log('🔄 Sauvegarde automatique du profil avant finalisation...');
    const profileSaved = await saveUserProfile(false); // Sans message de succès
    
    if (!profileSaved && isSupabaseConfigured) {
      setMessage({ type: 'error', text: 'Erreur : impossible de sauvegarder les informations. Finalisation annulée.' });
      return;
    }
    
    const invoiceData: SavedInvoice = {
      id: currentInvoiceId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      deliveryDate: invoice.deliveryDate,
      paymentTerms: invoice.paymentTerms,
      paymentDue: invoice.paymentDue,
      companyInfo: { ...companyInfo },
      clientInfo: { ...clientInfo },
      articles: [...articles],
      totalAmount: calculateTotal(),
      status: 'finalized',
      createdAt: new Date().toISOString(),
      finalizedAt: new Date().toISOString()
    };
    
    saveInvoiceToHistory(invoiceData);
    setInvoiceStatus('finalized');
    
    // Afficher un message de succès
    setMessage({ 
      type: 'success', 
      text: 'Facture finalisée avec succès ! 🎉 Vous pouvez maintenant créer une nouvelle facture.' 
    });
    
    // Auto-cacher le message après 5 secondes
    setTimeout(() => {
      setMessage(null);
    }, 5000);
  };

  const loadInvoiceFromHistory = (savedInvoice: SavedInvoice) => {
    setInvoice({
      invoiceNumber: savedInvoice.invoiceNumber,
      invoiceDate: savedInvoice.invoiceDate,
      deliveryDate: savedInvoice.deliveryDate,
      paymentTerms: savedInvoice.paymentTerms as '10 jours à réception' | '20 jours à réception' | '30 jours à réception',
      paymentDue: savedInvoice.paymentDue
    });
    setCompanyInfo(savedInvoice.companyInfo);
    setClientInfo(savedInvoice.clientInfo);
    setArticles(savedInvoice.articles);
    setCurrentInvoiceId(savedInvoice.id);
    setInvoiceStatus(savedInvoice.status);
    setShowHistory(false);
  };

  // Initialiser avec une numérotation intelligente au chargement
  useEffect(() => {
    const initializeInvoice = async () => {
      if (!currentInvoiceId && user) {
        const smartNumber = await generateSmartInvoiceNumber();
        initializeNewInvoice(smartNumber.number);
      }
    };
    
    initializeInvoice();
  }, [user, currentInvoiceId]);

  // Sauvegarde automatique avec debounce
  const debouncedSave = useCallback(
    debounce(async () => {
      if (userProfile && hasUnsavedChanges) {
        console.log('🔄 Sauvegarde automatique déclenchée');
        setIsAutoSaving(true);
        try {
          await saveUserProfile(false); // Sauvegarde silencieuse
        } finally {
          setIsAutoSaving(false);
        }
      }
    }, 2000), // Attend 2 secondes après le dernier changement
    [userProfile, hasUnsavedChanges]
  );

  // Détecter les changements non sauvés et déclencher sauvegarde automatique
  useEffect(() => {
    if (userProfile) {
      console.log('🔍 Changement détecté, marquage comme non sauvé');
      setHasUnsavedChanges(true);
      
      // Déclencher la sauvegarde automatique après 2 secondes
      const timeoutId = setTimeout(async () => {
        if (hasUnsavedChanges) {
          console.log('🔄 Déclenchement sauvegarde automatique après changement');
          setIsAutoSaving(true);
          try {
            await saveUserProfile(false);
          } finally {
            setIsAutoSaving(false);
          }
        }
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [companyInfo, clientInfo, clients, articles, userProfile]); // Ajouter userProfile comme dépendance

  // Fonction utilitaire pour optimiser les images pour PDF
  const optimizeImageForPDF = async (img: HTMLImageElement): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Taille optimisée pour PDF : 256x256px maximum (augmenté pour meilleure qualité)
      const maxSize = 256;
      let { width, height } = img;
      
      // Calculer les nouvelles dimensions en gardant le ratio
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }
      
      // Appliquer les dimensions optimisées
      canvas.width = width;
      canvas.height = height;
      
      // Activer l'antialiasing pour une meilleure qualité
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Fond blanc pour éviter le carré noir
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, width, height);
      }
      
      // Convertir en PNG pour préserver la transparence (qualité optimisée)
      const base64 = canvas.toDataURL('image/png');
      resolve(base64);
    });
  };

  const generatePDF = async () => {
    // Vérifier si jsPDF est disponible
    if (typeof window !== 'undefined' && (window as any).jspdf) {
      const { jsPDF } = (window as any).jspdf;
      // Créer le PDF avec options de compression
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true, // Activer la compression globale
        precision: 2    // Réduire la précision pour une taille plus petite
      });
      
      try {
        // Configuration des couleurs
        const black = [0, 0, 0];
        const darkGray = [64, 64, 64];
        const lightGray = [128, 128, 128];
        const blue = [37, 99, 235];
        
        // Marges et dimensions
        const margin = 20;
        const pageWidth = 210;
        const contentWidth = pageWidth - (margin * 2);
        
        // Logo et informations émetteur (pas d'en-tête en haut)
        let yPos = 25;
        
        // Logo - Chargement et optimisation du logo (d'abord depuis Supabase, puis fallback local)
        let logoAdded = false;
        
        // Essayer d'abord d'utiliser le logo uploadé par l'utilisateur
        if (companyInfo.logoUrl) {
          try {
            const logoImg = new Image();
            logoImg.crossOrigin = 'anonymous';
            logoImg.src = companyInfo.logoUrl;
            
            await new Promise((resolve, reject) => {
              logoImg.onload = resolve;
              logoImg.onerror = reject;
            });
            
            const logoBase64 = await optimizeImageForPDF(logoImg);
            doc.addImage(logoBase64, 'PNG', margin, yPos, 20, 20);
            logoAdded = true;
          } catch (error) {
            console.log('Erreur avec le logo utilisateur, tentative logo par défaut');
          }
        }
        
        // Fallback : logo par défaut si pas de logo utilisateur ou erreur
        if (!logoAdded) {
          try {
            const logoImg = new Image();
            logoImg.src = '/logo.png'; // Pas de crossOrigin pour les ressources locales
            
            await new Promise((resolve, reject) => {
              logoImg.onload = resolve;
              logoImg.onerror = reject;
            });
            
            const logoBase64 = await optimizeImageForPDF(logoImg);
            doc.addImage(logoBase64, 'PNG', margin, yPos, 20, 20); // PNG pour préserver la transparence du logo local
            logoAdded = true;
          } catch (error) {
            console.log('Erreur logo par défaut, utilisation du placeholder');
          }
        }
        
        // Si aucun logo n'a pu être chargé, utiliser le placeholder
        if (!logoAdded) {
          console.log('Aucun logo disponible, utilisation du placeholder');
          // Fallback: Logo placeholder
          doc.setFillColor(...darkGray);
          doc.circle(margin + 8, yPos + 8, 8, 'F');
          doc.setFontSize(12);
          doc.setTextColor(255, 255, 255);
          doc.text('🐻', margin + 8, yPos + 11, { align: 'center' });
        }
        
        // Informations émetteur à côté du logo (ajusté pour logo 20x20)
        doc.setTextColor(...black);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(companyInfo.companyName || `${companyInfo.firstName} ${companyInfo.lastName}`, margin + 25, yPos + 4);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(companyInfo.address, margin + 25, yPos + 10);
        doc.text(`${companyInfo.phone} | ${companyInfo.email}`, margin + 25, yPos + 15);
        doc.text(`SIRET: ${companyInfo.siret}`, margin + 25, yPos + 20);
        
        // Numéro de facture en haut à droite
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`Facture #${invoice.invoiceNumber}`, pageWidth - margin, yPos + 5, { align: 'right' });
        
        yPos += 35;
        
        // Titre "Facture" (police réduite)
        doc.setFontSize(28);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...black);
        doc.text('Facture', margin, yPos);
        
        yPos += 15;
        
        // Section Adresse de facturation (remontée)
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...blue);
        doc.text('Adresse de facturation', margin, yPos);
        
        yPos += 8;
        
        doc.setTextColor(...black);
        doc.setFont(undefined, 'bold');
        doc.text(`${clientInfo.firstName} ${clientInfo.lastName}`, margin, yPos);
        yPos += 6;
        
        doc.setFont(undefined, 'normal');
        doc.text(`À l'attention de ${clientInfo.firstName} ${clientInfo.lastName}` , margin, yPos);
        yPos += 6;
        doc.text(clientInfo.address, margin, yPos);
        yPos += 6;
        doc.text(`${clientInfo.postalCode} ${clientInfo.city}`, margin, yPos);
        yPos += 6;
        doc.text(`Tél: ${formatPhoneNumber(clientInfo.phone)}`, margin, yPos);
        yPos += 6;
        doc.text(`SIRET: ${formatSiret(clientInfo.siret)}`, margin, yPos);
        
        yPos += 15;
        
        // Section dates - espacement optimisé
        const col1 = margin;
        const col2 = margin + 37;
        const col3 = margin + 78; 
        const col4 = margin + 132;
        
        // En-têtes
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...lightGray);
        
        doc.text('Date de facture', col1, yPos);
        doc.text('Date de livraison', col2, yPos);
        doc.text('Conditions de règlement', col3, yPos);
        doc.text('Échéance de paiement', col4, yPos);
        
        yPos += 7;
        
        // Valeurs
        doc.setFontSize(10);
        doc.setTextColor(...black);
        doc.setFont(undefined, 'normal');
        doc.text(invoice.invoiceDate, col1, yPos);
        doc.text(invoice.deliveryDate, col2, yPos);
        doc.text(invoice.paymentTerms, col3, yPos);
        doc.text(invoice.paymentDue, col4, yPos);
        
        yPos += 20;
        
        // Fonction pour dessiner l'en-tête du tableau
        const drawTableHeader = (startY: number) => {
          const headerHeight = 10;
          
          // Background du header
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, startY, contentWidth, headerHeight, 'F');
          
          // Bordures
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.rect(margin, startY, contentWidth, headerHeight);
          
          // En-têtes du tableau
          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(...black);
          
          const tableY = startY + 7;
          doc.text('N°', margin + 5, tableY);
          doc.text('ARTICLE', margin + 20, tableY);
          doc.text('QUANTITÉ', margin + 105, tableY, { align: 'center' });
          doc.text('PRIX UNITÉ', margin + 140, tableY, { align: 'right' });
          doc.text('TOTAL', margin + contentWidth - 5, tableY, { align: 'right' });
          
          // Ligne de séparation
          doc.line(margin, startY + headerHeight, margin + contentWidth, startY + headerHeight);
          
          return startY + headerHeight;
        };
        
        // Fonction pour dessiner un article
        const drawArticle = (article: Article, index: number, contentY: number) => {
          const articleHeight = Math.max(20, article.description.length * 4 + 10);
          
          doc.setFont(undefined, 'normal');
          doc.setFontSize(10);
          doc.setTextColor(...black);
          doc.text((index + 1).toString(), margin + 5, contentY + 8);
          
          // Article et description
          doc.setFont(undefined, 'bold');
          doc.text(article.name, margin + 20, contentY + 8);
          
          doc.setFontSize(8);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(...lightGray);
          
          let descY = contentY + 12;
          article.description.forEach((desc) => {
            doc.text(desc, margin + 20, descY);
            descY += 4;
          });
          
          // Quantité
          doc.setFontSize(10);
          doc.setTextColor(...black);
          doc.setFont(undefined, 'bold');
          doc.text(article.quantity.toString(), margin + 105, contentY + 8, { align: 'center' });
          doc.setFontSize(8);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(...lightGray);
          doc.text(article.quantity > 1 ? `${article.unit}s` : article.unit, margin + 105, contentY + 12, { align: 'center' });
          
          // Prix et total
          doc.setFontSize(10);
          doc.setTextColor(...black);
          doc.text(`${article.unitPrice.toFixed(2)} €`, margin + 137, contentY + 8, { align: 'right' });
          doc.setFont(undefined, 'bold');
          doc.text(`${article.total.toFixed(2)} €`, margin + contentWidth - 5, contentY + 8, { align: 'right' });
          
          return articleHeight;
        };
        
        // Fonction pour dessiner le pied de page
        const drawPageFooter = (pageNum: number, totalPages: number) => {
          doc.setFontSize(8);
          doc.setTextColor(...lightGray);
          doc.text('Enregistré au RM de: Val-d\'Ose', margin, 285);
          doc.text(`Page ${pageNum} / ${totalPages}`, pageWidth - margin, 285, { align: 'right' });
        };
        
        // Calculer le nombre de pages nécessaires en incluant TOUT le contenu
        const pageFooterSpace = 30; // Espace réservé pour le pied de page
        const maxYPerPage = 285 - pageFooterSpace; // Limite de la page
        const bottomPadding = 5; // 2cm approximativement
        
        // Calculer l'espace nécessaire pour différents contenus
        const totalHTSpace = 1; // Espace pour le Total HT seulement
        const paymentAndMentionsSpace = 60; // Espace pour paiement + mentions
        
        // Calculer les articles par page (sans forcer le Total HT sur nouvelle page)
        let currentPageY = yPos;
        let currentPage = 1;
        let pageBreaks: { page: number; articles: Article[]; startIndex: number; hasSpaceForTotal?: boolean }[] = [];
        let currentPageArticles: Article[] = [];
        let articleStartIndex = 0;
        
        articles.forEach((article, index) => {
          const articleHeight = Math.max(20, article.description.length * 4 + 10);
          const isFirstArticleOfPage = currentPageArticles.length === 0;
          const headerSpace = isFirstArticleOfPage ? 10 : 0; // En-tête du tableau
          const spaceNeeded = articleHeight + headerSpace;
          
          // Vérifier si l'article rentre sur la page actuelle
          if (currentPageY + spaceNeeded > maxYPerPage - bottomPadding) {
            // Finaliser la page actuelle (sans cet article)
            if (currentPageArticles.length > 0) {
              // Vérifier s'il y a la place pour le Total HT sur cette page
              const hasSpaceForTotal = (currentPageY + totalHTSpace) <= (maxYPerPage - bottomPadding);
              
              pageBreaks.push({
                page: currentPage,
                articles: [...currentPageArticles],
                startIndex: articleStartIndex,
                hasSpaceForTotal
              });
            }
            
            // Préparer la nouvelle page
            currentPage++;
            currentPageY = 50; // Position du début de page suivante
            currentPageArticles = [article];
            articleStartIndex = index;
            currentPageY += spaceNeeded;
          } else {
            // L'article rentre sur la page actuelle
            currentPageArticles.push(article);
            currentPageY += spaceNeeded;
          }
        });
        
        // Ajouter la dernière page si elle n'a pas déjà été ajoutée
        if (currentPageArticles.length > 0 && !pageBreaks.find(p => p.startIndex === articleStartIndex)) {
          // Vérifier s'il y a la place pour le Total HT sur cette dernière page
          const hasSpaceForTotal = (currentPageY + totalHTSpace) <= (maxYPerPage - bottomPadding);
          
          pageBreaks.push({
            page: currentPage,
            articles: currentPageArticles,
            startIndex: articleStartIndex,
            hasSpaceForTotal
          });
        }
        
        // Calculer le nombre total de pages en avance
        const lastPageForTotal = pageBreaks[pageBreaks.length - 1];
        let totalPages = pageBreaks.length;
        
        // Ajouter une page si le Total HT ne rentre pas sur la dernière page
        if (lastPageForTotal && !lastPageForTotal.hasSpaceForTotal) {
          totalPages++;
        }
        
        // Ajouter encore une page si les infos de paiement ne rentrent pas
        if (lastPageForTotal && lastPageForTotal.hasSpaceForTotal) {
          // Le Total HT va sur la même page, mais vérifier les infos de paiement
          let estimatedYAfterArticles = 0;
          
          // Calculer la position de départ pour la dernière page
          const isFirstPage = pageBreaks.length === 1;
          const startY = isFirstPage ? yPos : 50; // Première page commence à yPos, autres à 50
          
          // Ajouter l'en-tête du tableau
          estimatedYAfterArticles = startY + 10; // En-tête
          
          // Ajouter la hauteur de tous les articles de la dernière page
          pageBreaks[pageBreaks.length - 1].articles.forEach(article => {
            estimatedYAfterArticles += Math.max(20, article.description.length * 4 + 10);
          });
          
          // Ajouter l'espacement après le tableau
          estimatedYAfterArticles += 10;
          
          // Vérifier si les infos de paiement rentrent après le Total HT
          const spaceAfterTotal = estimatedYAfterArticles + totalHTSpace;
          if ((spaceAfterTotal + paymentAndMentionsSpace) > (maxYPerPage - bottomPadding)) {
            totalPages++;
          }
        }
        
        // Dessiner les articles page par page
        let finalYPos = yPos;
        
        pageBreaks.forEach((pageData, pageIndex) => {
          if (pageIndex > 0) {
            doc.addPage();
            finalYPos = 50; // Position de départ pour les nouvelles pages
          }
          
          // Dessiner l'en-tête du tableau
          const headerEndY = drawTableHeader(finalYPos);
          let contentY = headerEndY;
          
          // Dessiner les articles de cette page
          pageData.articles.forEach((article, articleIndex) => {
            const globalIndex = pageData.startIndex + articleIndex;
            const articleHeight = drawArticle(article, globalIndex, contentY);
            contentY += articleHeight;
          });
          
          // Bordure du tableau pour cette page
          const tableHeight = contentY - finalYPos;
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.rect(margin, finalYPos, contentWidth, tableHeight);
          
          finalYPos = contentY + 10;
          
          // Dessiner le pied de page
          drawPageFooter(pageData.page, totalPages);
        });
        
        // Gérer le Total HT et les informations de paiement
        const lastPageData = pageBreaks[pageBreaks.length - 1];
        let totalHTYPos = finalYPos;
        let needsNewPageForPayment = false;
        
        // Vérifier si le Total HT peut aller sur la dernière page avec les tableaux
        if (lastPageData && lastPageData.hasSpaceForTotal) {
          // Le Total HT va sur la même page que les derniers articles
          totalHTYPos = finalYPos;
          
          // Vérifier si les infos de paiement rentrent aussi
          const spaceAfterTotal = totalHTYPos + totalHTSpace;
          needsNewPageForPayment = (spaceAfterTotal + paymentAndMentionsSpace) > (maxYPerPage - bottomPadding);
        } else {
          // Le Total HT va sur une nouvelle page
          doc.addPage();
          totalHTYPos = 50;
          needsNewPageForPayment = false; // Nouvelle page donc place pour tout
          drawPageFooter(totalPages, totalPages);
        }
        
        yPos = totalHTYPos;
        
        // Total HT avec encadrement
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...black);
        
        // Dessiner l'encadrement autour du Total HT
        const boxWidth = 80;
        const boxHeight = 12;
        const boxX = margin + contentWidth - boxWidth - 5;
        const boxY = yPos - 2;
        
        doc.setDrawColor(0, 0, 0); // Couleur noire pour le cadre
        doc.setLineWidth(0.5);
        doc.rect(boxX, boxY, boxWidth, boxHeight);
        
        // Positionner le texte dans l'encadré
        doc.text('Total HT', boxX + 5, yPos + 6);
        const totalAmount = articles.reduce((sum, article) => sum + article.total, 0);
        doc.text(`${totalAmount.toFixed(2)} €`, boxX + boxWidth - 5, yPos + 6, { align: 'right' });
        
        yPos += 20;
        
        // Vérifier si on a besoin d'une nouvelle page pour les infos de paiement
        if (needsNewPageForPayment) {
          doc.addPage();
          yPos = 50;
          drawPageFooter(totalPages, totalPages);
        }
        
        // Section paiement bancaire
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Paiement souhaité par virement bancaire', margin, yPos);
        
        yPos += 12;
        
        // Informations bancaires en deux colonnes
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...darkGray);
        
        const bankCol1 = margin;
        const bankCol2 = margin + (contentWidth / 2);
        
        // Colonne 1
        doc.text('Nom associé au compte', bankCol1, yPos);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...black);
        doc.text(companyInfo.accountName || '', bankCol1, yPos + 5);
        
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...darkGray);
        doc.text('BIC', bankCol1, yPos + 12);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...black);
        doc.text(companyInfo.bic || '', bankCol1, yPos + 17);
        
        // Colonne 2
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...darkGray);
        doc.text('IBAN', bankCol2, yPos);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...black);
        doc.text(formatIban(companyInfo.iban) || '', bankCol2, yPos + 5);
        
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...darkGray);
        doc.text('Nom de la banque', bankCol2, yPos + 12);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...black);
        doc.text(companyInfo.bankName || '', bankCol2, yPos + 17);
        
        yPos += 25;
        
        // Mentions légales
        doc.setFontSize(7);
        doc.setTextColor(...lightGray);
        const legalText1 = 'Pour tout professionnel, en cas de retard de paiement, seront exigibles, conformément à l\'article L 441-6 du code de commerce,';
        const legalText2 = 'une indemnité calculée sur la base de trois fois le taux de l\'intérêt légal en vigueur ainsi qu\'une indemnité forfaitaire pour frais';
        const legalText3 = 'de recouvrement de 40 euros. - TVA non applicable, art. 293B du CGI.';
        
        doc.text(legalText1, margin, yPos);
        doc.text(legalText2, margin, yPos + 4);
        doc.text(legalText3, margin, yPos + 8);
        
        // Sauvegarder le PDF
        doc.save(`facture-${invoice.invoiceNumber}.pdf`);
        
        // Afficher un message de succès
        setMessage({ type: 'success', text: `PDF généré avec succès : facture-${invoice.invoiceNumber}.pdf` });
        setTimeout(() => setMessage(null), 3000);
        
      } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error);
        setMessage({ type: 'error', text: 'Erreur lors de la génération du PDF. Veuillez réessayer.' });
      }
    } else {
      // Fallback si jsPDF n'est pas disponible
      setMessage({ type: 'error', text: 'jsPDF n\'est pas chargé. Vérifiez que le CDN est bien inclus dans index.html.' });
      console.log('Vérifiez que cette ligne est présente dans public/index.html:');
      console.log('<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>');
      console.log('Et que vous accédez à jsPDF via: const { jsPDF } = window.jspdf;');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img 
              src="/logo512.png" 
              alt="FactureSimple" 
              className="w-8 h-8 rounded-lg"
            />
            <span className="font-semibold text-gray-900">FactureSimple</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 hidden md:block">
              Bonjour, {companyInfo.firstName || user.email}
            </span>
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-50 transition-all duration-200"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Mes Factures</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-50 transition-all duration-200"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Mes Infos</span>
            </button>
            
            {/* Indicateur de sauvegarde automatique */}
            {isAutoSaving && (
              <div className="flex items-center space-x-2 text-blue-600 px-3 py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="hidden sm:inline text-sm">Sauvegarde...</span>
              </div>
            )}
            
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 text-red-600 hover:text-red-800 px-3 py-2 rounded-lg hover:bg-red-50 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Avertissement mode démo */}
        {!isSupabaseConfigured && (
          <div className="mb-6 bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-orange-800 font-medium">Mode démo</p>
                  <p className="text-orange-600 text-sm">
                    Supabase n'est pas configuré. Les données sont stockées localement et seront perdues lors du rechargement.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={cleanAllData}
                  className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors"
                >
                  Nettoyer
                </button>

              </div>
            </div>
          </div>
        )}

        {/* Messages d'information/erreur */}
        {message && (
          <div className={`mb-6 p-4 rounded-2xl border ${
            message.type === 'error' 
              ? 'bg-red-50 border-red-200' 
              : message.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center space-x-3">
              {message.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600" />}
              {message.type === 'success' && <Check className="w-5 h-5 text-green-600" />}
              {message.type === 'info' && <FileText className="w-5 h-5 text-blue-600" />}
              <div>
                <p className={`font-medium ${
                  message.type === 'error' 
                    ? 'text-red-800' 
                    : message.type === 'success'
                    ? 'text-green-800'
                    : 'text-blue-800'
                }`}>
                  {message.text}
                </p>
              </div>
              <button
                onClick={() => setMessage(null)}
                className={`ml-auto text-gray-400 hover:text-gray-600 ${
                  message.type === 'error' 
                    ? 'hover:text-red-600' 
                    : message.type === 'success'
                    ? 'hover:text-green-600'
                    : 'hover:text-blue-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {invoiceStatus === 'draft' ? 'Facture en cours' : 'Facture finalisée'}
          </h1>
          <p className="text-gray-600">
            {invoiceStatus === 'draft' 
              ? 'Modifiez les informations et finalisez votre facture' 
              : 'Cette facture a été finalisée et ne peut plus être modifiée'
            }
          </p>
        </div>

        {/* Statut et actions de la facture */}
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${invoiceStatus === 'draft' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Facture {invoice.invoiceNumber}
                </h2>
                <p className="text-sm text-gray-500">
                  {invoiceStatus === 'draft' ? 'Brouillon • Non finalisée' : 'Finalisée • Définitive'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              {invoiceStatus === 'draft' && (
                <button
                  onClick={() => setShowFinalizeConfirmation(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200"
                >
                  <Check className="w-4 h-4" />
                  <span>Finaliser la facture</span>
                </button>
              )}
              <button
                onClick={createNewInvoice}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle facture</span>
              </button>
            </div>
          </div>
        </div>

        {/* Formulaire de facture */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de facture
                </label>
                <input
                  type="text"
                  value={invoice.invoiceNumber}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-500 cursor-not-allowed"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Généré automatiquement</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de facture
                </label>
                <input
                  type="text"
                  value={invoice.invoiceDate}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-500 cursor-not-allowed"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Date actuelle</p>
              </div>
            </div>

            <div className="grid md:grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de livraison
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={invoice.deliveryDate}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl pr-11 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    readOnly
                  />
                  {invoiceStatus === 'draft' && (
                    <button
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <Calendar className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                {showDatePicker && (
                  <DatePicker 
                    onSelectDate={handleDeliveryDateChange}
                    onClose={() => setShowDatePicker(false)}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conditions de règlement
                </label>
                <select
                  value={invoice.paymentTerms}
                  onChange={(e) => handlePaymentTermsChange(e.target.value as any)}
                  disabled={invoiceStatus === 'finalized'}
                  className={`custom-select w-full px-4 py-3 ${
                    invoiceStatus === 'finalized' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="10 jours à réception">10 jours à réception</option>
                  <option value="20 jours à réception">20 jours à réception</option>
                  <option value="30 jours à réception">30 jours à réception</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">Échéance de paiement :</span>
              <span className="font-semibold text-gray-900">{invoice.paymentDue}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <button
              onClick={generatePDF}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">Télécharger la facture PDF</span>
              <span className="sm:hidden">Télécharger PDF</span>
            </button>
            {/* Bouton email temporairement désactivé
            <button 
              onClick={() => setShowEmailModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200"
            >
              <Mail className="w-5 h-5" />
              <span className="hidden sm:inline">Envoyer par mail</span>
              <span className="sm:hidden">Envoyer</span>
            </button>
            */}
            <button 
              onClick={() => setShowPreview(true)}
              className="flex-1 sm:flex-none px-6 py-3 border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-xl transition-all duration-200"
            >
              Aperçu
            </button>
          </div>
        </div>

        {/* Modal Aperçu */}
        {showPreview && <PreviewModal invoice={invoice} articles={articles} companyInfo={companyInfo} clientInfo={clientInfo} onClose={() => setShowPreview(false)} />}

        {/* Modal Email - temporairement désactivé
        {showEmailModal && <EmailModal 
          invoice={invoice} 
          articles={articles} 
          companyInfo={companyInfo} 
          clientInfo={clientInfo} 
          onClose={() => setShowEmailModal(false)}
          onSend={sendInvoiceByEmail}
        />}
        */}

        {/* Modal Historique */}
        {showHistory && <HistoryModal onClose={() => setShowHistory(false)} onLoadInvoice={loadInvoiceFromHistory} getHistory={getInvoiceHistory} />}

        {/* Modal Confirmation */}
        {showConfirmDialog && <ConfirmationModal message={confirmMessage} onConfirm={executeConfirmedAction} onCancel={() => setShowConfirmDialog(false)} />}

        {/* Gestion des articles */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Produits
            </h3>
            {invoiceStatus === 'draft' && (
              <button
                onClick={async () => {
                  if (editingArticles) {
                    // Sauvegarder automatiquement lors de la fin d'édition
                    await saveUserProfile(false);
                  }
                  setEditingArticles(!editingArticles);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 text-blue-600 hover:text-blue-700 rounded-lg transition-all duration-200"
              >
                {editingArticles ? <Check className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                <span>{editingArticles ? 'Mettre à jour' : 'Modifier'}</span>
              </button>
            )}
          </div>

          {editingArticles && (
            <div className="mb-4">
              <button
                onClick={addArticle}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un article</span>
              </button>
            </div>
          )}

          <div className="space-y-4">
            {articles.map((article, index) => (
              <div key={article.id} className="border border-gray-200 rounded-lg p-4">
{editingArticles ? (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
      <input
        type="text"
        value={article.name}
        onChange={(e) => updateArticle(article.id, { name: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
      <input
        type="number"
        defaultValue={article.quantity}
        onBlur={(e) => {
          const value = parseFloat(e.target.value) || 1;
          updateArticle(article.id, { quantity: value });
        }}
        placeholder="Ex: 5"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        step="1"
        min="1"
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Prix unitaire (€)</label>
      <input
        type="number"
        defaultValue={article.unitPrice}
        onBlur={(e) => {
          const value = parseFloat(e.target.value) || 0;
          updateArticle(article.id, { unitPrice: value });
        }}
        placeholder="Ex: 25.50"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        step="0.01"
        min="0"
      />
    </div>
    
    <div className="flex items-end">
      <button
        onClick={() => {
          setArticleToDelete(article.id);
          setShowDeleteArticleConfirmation(true);
        }}
        className="p-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-lg transition-all duration-200"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
) : (
  // Affichage en lecture seule reste identique
  <div className="flex justify-between items-center">
    <div>
      <h4 className="font-medium text-gray-900">{article.name}</h4>
      <p className="text-sm text-gray-600">
        {article.quantity} {article.quantity > 1 ? `${article.unit}s` : article.unit} × {article.unitPrice.toFixed(2)}€
      </p>
    </div>
    <div className="text-right">
      <p className="font-semibold text-gray-900">{article.total.toFixed(2)}€</p>
    </div>
  </div>
)}
              </div>
            ))}
          </div>

          <div className="mt-4 text-right">
            <div className="inline-block border-2 border-gray-800 px-4 py-2 rounded">
              <p className="text-lg font-semibold text-gray-900">
                Total HT: {calculateTotal().toFixed(2)}€
              </p>
            </div>
          </div>
        </div>

        {/* Informations émetteur */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Informations émetteur</h3>
            {invoiceStatus === 'draft' && (
              <button
                onClick={async () => {
                  if (editingCompany) {
                    // Sauvegarder automatiquement lors de la fin d'édition
                    await saveUserProfile(false);
                  }
                  setEditingCompany(!editingCompany);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 text-blue-600 hover:text-blue-700 rounded-lg transition-all duration-200"
              >
                {editingCompany ? <Check className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                <span>{editingCompany ? 'Mettre à jour' : 'Modifier'}</span>
              </button>
            )}
          </div>

          {editingCompany ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input
                  type="text"
                  value={companyInfo.firstName}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Votre prénom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={companyInfo.lastName}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Votre nom de famille"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise</label>
                <input
                  type="text"
                  value={companyInfo.companyName}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Ex: Mon Entreprise SARL"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <AddressAutocomplete
                  value={companyInfo.address}
                  onChange={(address) => setCompanyInfo({ ...companyInfo, address })}
                  onSelect={(suggestion) => {
                    setCompanyInfo({
                      ...companyInfo,
                      address: suggestion.street ? `${suggestion.housenumber || ''} ${suggestion.street}`.trim() : suggestion.label,
                      postalCode: suggestion.postcode || '',
                      city: suggestion.city || ''
                    });
                  }}
                  placeholder="Tapez votre adresse..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                <input
                  type="text"
                  value={companyInfo.postalCode}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, postalCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="75001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <input
                  type="text"
                  value={companyInfo.city}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Paris"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  type="text"
                  value={companyInfo.phone}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, phone: formatPhoneNumber(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="01 23 45 67 89"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={companyInfo.email}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="contact@entreprise.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                <input
                  type="text"
                  value={companyInfo.siret}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, siret: formatSiret(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    companyInfo.siret && !validateSiret(companyInfo.siret) 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="123 456 789 00012"
                />
                {companyInfo.siret && !validateSiret(companyInfo.siret) && (
                  <p className="text-red-600 text-xs mt-1">Le SIRET doit contenir exactement 14 chiffres</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              <p className="font-bold text-gray-900">{companyInfo.companyName || `${companyInfo.firstName} ${companyInfo.lastName}`}</p>
              <p>{companyInfo.address}</p>
              <p>{companyInfo.postalCode} {companyInfo.city}</p>
              <p>Tél: {formatPhoneNumber(companyInfo.phone)}</p>
              <p>SIRET: {formatSiret(companyInfo.siret)}</p>
            </div>
          )}
        </div>

        {/* Informations client */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Informations client</h3>
          {invoiceStatus === 'draft' && (
              <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                {clients.length > 0 ? (
                  <>
                    <select
                      className="custom-select px-3 py-2 min-w-[120px] max-w-[200px] flex-1 md:min-w-[200px]"
                      value={selectedClientIndex === -1 ? 'new-client' : selectedClientIndex}
                      onChange={async (e) => {
                        if (e.target.value === 'new-client') {
                          const newClient: ClientInfo = { firstName: 'Nouveau', lastName: 'Client', address: '', postalCode: '', city: '', siret: '', phone: '', email: '' };
                          createClientWithCheck(newClient, () => {
                            const newClients = [...clients, newClient];
                            const newIndex = newClients.length - 1;
                            setClients(newClients);
                            setSelectedClientIndex(newIndex);
                            setClientInfo(newClient);
                            setEditingClient(true);
                          });
                        } else {
                          const idx = parseInt(e.target.value, 10);
                          setSelectedClientIndex(idx);
                          const c = clients[idx];
                          if (c) {
                            setClientInfo(c);
                          }
                        }
                      }}
                    >
                      {clients.map((c, idx) => (
                        <option key={idx} value={idx}>
                          {c.firstName && c.lastName && (c.firstName.trim() !== '' || c.lastName.trim() !== '') ? `${c.firstName} ${c.lastName}` : `Client ${idx + 1}`}
                        </option>
                      ))}
                      <option value="new-client">+ Nouveau client</option>
                    </select>
                    {clients.length > 1 && (
                      <button
                        onClick={() => setShowDeleteConfirmation(true)}
                        className="p-2 md:px-3 md:py-2 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 rounded-lg transition-all duration-200 flex items-center"
                      >
                        <Trash2 className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">Supprimer</span>
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (editingClient) {
                          // Sauvegarder automatiquement lors de la fin d'édition
                          await saveUserProfile(false);
                        }
                        setEditingClient(!editingClient);
                      }}
                      className="flex items-center p-2 md:px-4 md:py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 text-blue-600 hover:text-blue-700 rounded-lg transition-all duration-200"
                    >
                      {editingClient ? <Check className="w-4 h-4 md:mr-2" /> : <Edit className="w-4 h-4 md:mr-2" />}
                      <span className="hidden md:inline">{editingClient ? 'Mettre à jour' : 'Modifier'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={async () => {
                      const newClient: ClientInfo = { firstName: 'Premier', lastName: 'Client', address: '', postalCode: '', city: '', siret: '', phone: '', email: '' };
                      await saveClient(newClient, true);
                      setEditingClient(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
                  >
                    Ajouter un client
                  </button>
                )}
              </div>
            )}
          </div>

{editingClient ? (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
      <input
        type="text"
        value={clientInfo.firstName}
        onChange={(e) => {
          console.log('📝 Modification prénom client:', e.target.value);
          const newClientInfo = { ...clientInfo, firstName: e.target.value };
          setClientInfo(newClientInfo);
          
          // Mettre à jour immédiatement dans la liste des clients
          const updatedClients = [...clients];
          updatedClients[selectedClientIndex] = newClientInfo;
          setClients(updatedClients);
          
          // Forcer la sauvegarde après un délai
          setTimeout(() => {
            console.log('💾 Sauvegarde forcée après modification prénom');
            saveUserProfile(false);
          }, 1000);
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        placeholder="Prénom du client"
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
      <input
        type="text"
        value={clientInfo.lastName}
        onChange={(e) => {
          console.log('📝 Modification nom client:', e.target.value);
          const newClientInfo = { ...clientInfo, lastName: e.target.value };
          setClientInfo(newClientInfo);
          
          // Mettre à jour immédiatement dans la liste des clients
          const updatedClients = [...clients];
          updatedClients[selectedClientIndex] = newClientInfo;
          setClients(updatedClients);
          
          // Forcer la sauvegarde après un délai
          setTimeout(() => {
            console.log('💾 Sauvegarde forcée après modification nom');
            saveUserProfile(false);
          }, 1000);
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        placeholder="Nom de famille du client"
      />
    </div>

    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
      <AddressAutocomplete
        value={clientInfo.address}
        onChange={(address) => {
          console.log('📝 Modification adresse client:', address);
          const newClientInfo = { ...clientInfo, address };
          setClientInfo(newClientInfo);
          
          // Mettre à jour dans la liste des clients
          const updatedClients = [...clients];
          updatedClients[selectedClientIndex] = newClientInfo;
          setClients(updatedClients);
        }}
        onSelect={(suggestion) => {
          console.log('📍 Sélection adresse auto:', suggestion);
          const newClientInfo = {
            ...clientInfo,
            address: suggestion.street ? `${suggestion.housenumber || ''} ${suggestion.street}`.trim() : suggestion.label,
            postalCode: suggestion.postcode || '',
            city: suggestion.city || ''
          };
          setClientInfo(newClientInfo);
          
          // Mettre à jour immédiatement dans la liste des clients
          const updatedClients = [...clients];
          updatedClients[selectedClientIndex] = newClientInfo;
          setClients(updatedClients);
          
          // Sauvegarde immédiate pour autocomplete
          setTimeout(() => {
            console.log('💾 Sauvegarde forcée après autocomplete adresse');
            saveUserProfile(false);
          }, 500);
        }}
        placeholder="Tapez l'adresse du client..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
      <input
        type="text"
        value={clientInfo.postalCode}
        onChange={(e) => {
          console.log('📝 Modification code postal client:', e.target.value);
          const newClientInfo = { ...clientInfo, postalCode: e.target.value };
          setClientInfo(newClientInfo);
          
          const updatedClients = [...clients];
          updatedClients[selectedClientIndex] = newClientInfo;
          setClients(updatedClients);
        }}
        onBlur={() => {
          console.log('💾 Sauvegarde au blur code postal');
          saveUserProfile(false);
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        placeholder="75001"
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
      <input
        type="text"
        value={clientInfo.city}
        onChange={(e) => {
          console.log('📝 Modification ville client:', e.target.value);
          const newClientInfo = { ...clientInfo, city: e.target.value };
          setClientInfo(newClientInfo);
          
          const updatedClients = [...clients];
          updatedClients[selectedClientIndex] = newClientInfo;
          setClients(updatedClients);
        }}
        onBlur={() => {
          console.log('💾 Sauvegarde au blur ville');
          saveUserProfile(false);
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        placeholder="Paris"
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
      <input
        type="text"
        value={clientInfo.siret}
        onChange={(e) => {
          console.log('📝 Modification SIRET client:', e.target.value);
          const newSiret = formatSiret(e.target.value);
          const newClientInfo = { ...clientInfo, siret: newSiret };
          setClientInfo(newClientInfo);
          
          const updatedClients = [...clients];
          updatedClients[selectedClientIndex] = newClientInfo;
          setClients(updatedClients);
        }}
        onBlur={() => {
          console.log('💾 Sauvegarde au blur SIRET client');
          saveUserProfile(false);
        }}
        className={`w-full px-3 py-2 border rounded-lg ${
          clientInfo.siret && !validateSiret(clientInfo.siret) 
            ? 'border-red-300 bg-red-50' 
            : 'border-gray-300'
        }`}
        placeholder="520 091 992 00039"
      />
      {clientInfo.siret && !validateSiret(clientInfo.siret) && (
        <p className="text-red-600 text-xs mt-1">Le SIRET doit contenir exactement 14 chiffres</p>
      )}

    </div>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
      <input
        type="text"
        value={clientInfo.phone}
        onChange={(e) => {
          console.log('📝 Modification téléphone client:', e.target.value);
          const newPhone = formatPhoneNumber(e.target.value);
          const newClientInfo = { ...clientInfo, phone: newPhone };
          setClientInfo(newClientInfo);
          
          const updatedClients = [...clients];
          updatedClients[selectedClientIndex] = newClientInfo;
          setClients(updatedClients);
        }}
        onBlur={() => {
          console.log('💾 Sauvegarde au blur téléphone');
          saveUserProfile(false);
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        placeholder="06 09 06 26 44"
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
      <input
        type="email"
        value={clientInfo.email}
        onChange={(e) => {
          console.log('📝 Modification email client:', e.target.value);
          const newClientInfo = { ...clientInfo, email: e.target.value };
          setClientInfo(newClientInfo);
          
          const updatedClients = [...clients];
          updatedClients[selectedClientIndex] = newClientInfo;
          setClients(updatedClients);
        }}
        onBlur={() => {
          console.log('💾 Sauvegarde au blur email');
          saveUserProfile(false);
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        placeholder="client@exemple.com"
      />
    </div>
  </div>
) : (
  // Affichage en lecture seule
  <div className="text-sm text-gray-600">
    {clients.length > 0 ? (
      <>
        <p className="font-bold text-gray-900">{clientInfo.firstName} {clientInfo.lastName}</p>
        <p>{clientInfo.address}</p>
        <p>{clientInfo.postalCode} {clientInfo.city}</p>
        <p>Tél: {formatPhoneNumber(clientInfo.phone)}</p>
        <p>SIRET: {formatSiret(clientInfo.siret)}</p>
        

      </>
    ) : (
      <p className="text-gray-500 italic">Aucun client configuré. Cliquez sur "Ajouter un client" pour commencer.</p>
    )}
  </div>
)}
        </div>

        {/* Modal Paramètres */}
        {showSettings && (
          <SettingsModal 
            companyInfo={companyInfo}
            setCompanyInfo={setCompanyInfo}
            clientInfo={clientInfo}
            setClientInfo={setClientInfo}
            clients={clients}
            setClients={setClients}
            selectedClientIndex={selectedClientIndex}
            setSelectedClientIndex={setSelectedClientIndex}
            articles={articles}
            setArticles={setArticles}
            setClientToDeleteIndex={setClientToDeleteIndex}
            setShowDeleteClientFromSettingsConfirmation={setShowDeleteClientFromSettingsConfirmation}
            setArticleToDelete={setArticleToDelete}
            setShowDeleteArticleConfirmation={setShowDeleteArticleConfirmation}
            checkDuplicateArticleName={checkDuplicateArticleName}
            setDuplicateMessage={setDuplicateMessage}
            setDuplicateAction={setDuplicateAction}
            setShowDuplicateConfirmation={setShowDuplicateConfirmation}
            formatPhoneNumber={formatPhoneNumber}
            formatSiret={formatSiret}
            formatIban={formatIban}
            validateSiret={validateSiret}
            createClientWithCheck={createClientWithCheck}
            onSave={saveUserProfile}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Modal de confirmation de suppression */}
        {showDeleteConfirmation && (
          <ConfirmationModal
            message="Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible."
            onConfirm={() => {
              const next = clients.filter((_, idx) => idx !== selectedClientIndex);
              const nextIndex = Math.max(0, selectedClientIndex - 1);
              setClients(next);
              setSelectedClientIndex(nextIndex);
              setClientInfo(next[nextIndex]);
              setShowDeleteConfirmation(false);
            }}
            onCancel={() => setShowDeleteConfirmation(false)}
          />
        )}

        {/* Modal de confirmation de suppression d'article */}
        {showDeleteArticleConfirmation && (
          <ConfirmationModal
            message="Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible."
            onConfirm={() => {
              if (articleToDelete) {
                deleteArticle(articleToDelete);
                setArticleToDelete(null);
              }
              setShowDeleteArticleConfirmation(false);
            }}
            onCancel={() => {
              setArticleToDelete(null);
              setShowDeleteArticleConfirmation(false);
            }}
          />
        )}

        {/* Modal de confirmation de suppression de client depuis les paramètres */}
        {showDeleteClientFromSettingsConfirmation && (
          <ConfirmationModal
            message="Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible."
            onConfirm={() => {
              if (clientToDeleteIndex !== null) {
                const updatedClients = clients.filter((_, idx) => idx !== clientToDeleteIndex);
                setClients(updatedClients);
                if (selectedClientIndex === clientToDeleteIndex) {
                  setSelectedClientIndex(Math.max(0, clientToDeleteIndex - 1));
                  setClientInfo(updatedClients[Math.max(0, clientToDeleteIndex - 1)] || { firstName: '', lastName: '', address: '', postalCode: '', city: '', siret: '', phone: '', email: '' });
                }
                setClientToDeleteIndex(null);
              }
              setShowDeleteClientFromSettingsConfirmation(false);
            }}
            onCancel={() => {
              setClientToDeleteIndex(null);
              setShowDeleteClientFromSettingsConfirmation(false);
            }}
          />
        )}

        {/* Modal de confirmation pour les doublons */}
        {showDuplicateConfirmation && (
          <ConfirmationModal
            message={duplicateMessage}
            onConfirm={() => {
              duplicateAction();
              setShowDuplicateConfirmation(false);
              setDuplicateMessage('');
              setDuplicateAction(() => {});
            }}
            onCancel={() => {
              setShowDuplicateConfirmation(false);
              setDuplicateMessage('');
              setDuplicateAction(() => {});
            }}
          />
        )}

        {/* Modal de confirmation pour la finalisation */}
        {showFinalizeConfirmation && (
          <ConfirmationModal
            message="Êtes-vous sûr de vouloir finaliser cette facture ? Cette action est irréversible et la facture ne pourra plus être modifiée."
            onConfirm={() => {
              finalizeInvoice();
              setShowFinalizeConfirmation(false);
            }}
            onCancel={() => setShowFinalizeConfirmation(false)}
          />
        )}
      </main>
    </div>
  );
};

// Composant DatePicker simple
const DatePicker: React.FC<{
  onSelectDate: (date: string) => void;
  onClose: () => void;
}> = ({ onSelectDate, onClose }) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const selectDate = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    onSelectDate(date.toLocaleDateString('fr-FR'));
  };

  return (
    <div className="absolute z-10 mt-2 bg-white border border-gray-300 rounded-xl shadow-lg p-4 w-80">
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={() => {
            if (currentMonth === 0) {
              setCurrentMonth(11);
              setCurrentYear(prev => prev - 1);
            } else {
              setCurrentMonth(prev => prev - 1);
            }
          }}
          className="p-1 hover:bg-gray-100 rounded"
        >
          ←
        </button>
        <span className="font-medium">
          {monthNames[currentMonth]} {currentYear}
        </span>
        <button 
          onClick={() => {
            if (currentMonth === 11) {
              setCurrentMonth(0);
              setCurrentYear(prev => prev + 1);
            } else {
              setCurrentMonth(prev => prev + 1);
            }
          }}
          className="p-1 hover:bg-gray-100 rounded"
        >
          →
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2 text-xs text-gray-500">
        {['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'].map(day => (
          <div key={day} className="text-center p-2">{day}</div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfMonth }, (_, i) => (
          <div key={i} className="p-2"></div>
        ))}
        {days.map(day => (
          <button
            key={day}
            onClick={() => selectDate(day)}
            className="p-2 text-sm hover:bg-blue-100 rounded text-center"
          >
            {day}
          </button>
        ))}
      </div>
      
      <button 
        onClick={onClose}
        className="w-full mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
      >
        Fermer
      </button>
    </div>
  );
};

// Fonction d'envoi d'email avec template automatique
const sendInvoiceByEmail = async (
  emailData: {
    to: string;
    subject: string;
    message: string;
  },
  invoice: Invoice,
  articles: Article[],
  companyInfo: CompanyInfo,
  clientInfo: ClientInfo
) => {
  try {
    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.to)) {
      return { success: false, message: 'Adresse email invalide.' };
    }

    // Générer le PDF pour l'envoi par email
    const pdfBlob = await generatePDFBlob(invoice, articles, companyInfo, clientInfo);
    const pdfBase64 = await blobToBase64(pdfBlob);
    
    // Préparer les données pour l'envoi
    const senderName = companyInfo.companyName || `${companyInfo.firstName} ${companyInfo.lastName}`;
    
    console.log('🚀 Préparation envoi:', {
      senderName: senderName,
      replyTo: companyInfo.email,
      to: emailData.to
    });
    
    const emailPayload = {
      to: emailData.to,
      from_name: senderName,
      from_email: companyInfo.email, // Utilisé pour Reply-To
      subject: emailData.subject,
      message: emailData.message,
      invoice_number: invoice.invoiceNumber,
      client_name: `${clientInfo.firstName} ${clientInfo.lastName}`,
      total_amount: articles.reduce((sum, article) => sum + article.total, 0).toFixed(2),
      pdf_content: pdfBase64.split(',')[1], // Enlever le préfixe data:
      pdf_filename: `Facture-${invoice.invoiceNumber}.pdf`
    };

    // Option 1: Utiliser Supabase Edge Functions si configuré
    console.log('🔧 Configuration Supabase:', {
      supabaseExists: !!supabase,
      isConfigured: isSupabaseConfigured
    });

    if (supabase && isSupabaseConfigured) {
      try {
        console.log('📤 Envoi via Supabase Edge Function...');
        console.log('📦 Payload envoyé:', emailPayload);
        
        const { data, error } = await supabase.functions.invoke('send-invoice-email', {
          body: emailPayload
        });

        console.log('📥 Réponse Supabase:', { data, error });

        if (error) {
          console.error('❌ Erreur Supabase:', error);
          throw error;
        }
        
        if (data && data.success) {
          console.log('✅ Email envoyé avec succès!');
          return { success: true, message: data.message || 'Email envoyé avec succès via Supabase!' };
        } else {
          console.error('❌ Échec de l\'envoi:', data);
          throw new Error(data?.error || 'Erreur inconnue');
        }
      } catch (supabaseError: any) {
        console.error('💥 Erreur Supabase complète:', supabaseError);
        const errorMessage = supabaseError?.message || supabaseError?.details || String(supabaseError);
        return { success: false, message: `Erreur: ${errorMessage}` };
      }
    }

    // Si on arrive ici, c'est que Supabase n'est pas configuré
    console.log('⚠️ Supabase non configuré, utilisation du mode simulation');
    
    // Mode simulation pour development
    console.log('📧 Email simulé - Données préparées:', {
      to: emailPayload.to,
      from: emailPayload.from_name + ' <' + emailPayload.from_email + '>',
      subject: emailPayload.subject,
      pdfSize: emailPayload.pdf_content.length + ' caractères'
    });
    
    return { 
      success: true, 
      message: 'Email simulé avec succès! Configurez Supabase Edge Functions pour un envoi réel.' 
    };

  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return { success: false, message: 'Erreur lors de la préparation de l\'email.' };
  }
};

// Fonction utilitaire pour convertir blob en base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Fonction utilitaire pour générer le PDF en tant que blob  
const generatePDFBlob = async (
  invoice: Invoice,
  articles: Article[],
  companyInfo: CompanyInfo,
  clientInfo: ClientInfo
): Promise<Blob> => {
  // Fonction utilitaire locale pour optimiser les images
  const optimizeImageForPDF = async (img: HTMLImageElement): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Taille optimisée pour PDF : 256x256px maximum
      const maxSize = 256;
      const ratio = Math.min(maxSize / img.width, maxSize / img.height);
      
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      
      // Compression JPEG pour réduire la taille
      const base64 = canvas.toDataURL('image/jpeg', 0.7);
      resolve(base64);
    });
  };

  // Réutiliser la logique complète de generatePDF mais retourner un blob
  if (typeof window !== 'undefined' && (window as any).jspdf) {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true,
      precision: 2
    });

    try {
      // Réutiliser la logique complète de génération PDF (copie de generatePDF)
      // Configuration des couleurs
      const black = [0, 0, 0];
      const darkGray = [64, 64, 64];
      const lightGray = [128, 128, 128];
      const blue = [37, 99, 235];
      
      // Marges et dimensions
      const margin = 20;
      const pageWidth = 210;
      
      // Logo et informations émetteur
      let yPos = 25;
      
      // Logo - tentative de chargement ou fallback
      let logoAdded = false;
      if (companyInfo.logoUrl) {
        try {
          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          logoImg.src = companyInfo.logoUrl;
          await new Promise((resolve, reject) => {
            logoImg.onload = resolve;
            logoImg.onerror = reject;
          });
          const logoBase64 = await optimizeImageForPDF(logoImg);
          doc.addImage(logoBase64, 'PNG', margin, yPos, 20, 20);
          logoAdded = true;
        } catch (error) {
          console.log('Logo utilisateur non disponible pour l\'email');
        }
      }

      // Logo par défaut ou placeholder
      if (!logoAdded) {
        try {
          const logoImg = new Image();
          logoImg.src = '/logo.png';
          await new Promise((resolve, reject) => {
            logoImg.onload = resolve;
            logoImg.onerror = reject;
          });
          const logoBase64 = await optimizeImageForPDF(logoImg);
          doc.addImage(logoBase64, 'PNG', margin, yPos, 20, 20);
          logoAdded = true;
        } catch (error) {
          // Placeholder si aucun logo disponible
          doc.setFillColor(...darkGray);
          doc.circle(margin + 8, yPos + 8, 8, 'F');
          doc.setFontSize(12);
          doc.setTextColor(255, 255, 255);
          doc.text('🐻', margin + 8, yPos + 11, { align: 'center' });
        }
      }

      // Informations émetteur
      doc.setTextColor(...black);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(companyInfo.companyName || `${companyInfo.firstName} ${companyInfo.lastName}`, margin + 25, yPos + 4);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(companyInfo.address, margin + 25, yPos + 10);
      doc.text(`${companyInfo.phone} | ${companyInfo.email}`, margin + 25, yPos + 15);
      doc.text(`SIRET: ${companyInfo.siret}`, margin + 25, yPos + 20);
      
      // Numéro de facture
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(`Facture #${invoice.invoiceNumber}`, pageWidth - margin, yPos + 5, { align: 'right' });
      
      yPos += 35;

      // Titre Facture
      doc.setFontSize(32);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...black);
      doc.text('Facture', margin, yPos);
      yPos += 25;

      // Informations client
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...blue);
      doc.text('Adresse de facturation', margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...black);
      doc.text(`${clientInfo.firstName} ${clientInfo.lastName}`, margin, yPos);
      yPos += 6;
      doc.text(`À l'attention de ${clientInfo.firstName} ${clientInfo.lastName}`, margin, yPos);
      yPos += 6;
      doc.text(clientInfo.address, margin, yPos);
      yPos += 6;
      doc.text(`${clientInfo.postalCode} ${clientInfo.city}`, margin, yPos);
      yPos += 6;
      doc.text(`Tél: ${clientInfo.phone?.replace(/(\d{2})(?=\d)/g, '$1 ')}`, margin, yPos);
      yPos += 6;
      doc.text(`SIRET: ${clientInfo.siret?.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4')}`, margin, yPos);
      yPos += 12;

      // Tableau des articles (version simplifiée pour l'email)
      const tableHeaders = ['Désignation', 'Qté', 'Prix unit.', 'Total'];
      const colWidths = [80, 25, 30, 35];
      let tableX = margin;
      let tableY = yPos;

      // En-têtes
      doc.setFillColor(240, 240, 240);
      doc.rect(tableX, tableY, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...black);
      
      let currentX = tableX;
      tableHeaders.forEach((header, i) => {
        doc.text(header, currentX + 2, tableY + 5);
        currentX += colWidths[i];
      });
      tableY += 8;

      // Lignes d'articles
      doc.setFont(undefined, 'normal');
      articles.forEach(article => {
        currentX = tableX;
        doc.text(article.name, currentX + 2, tableY + 5);
        currentX += colWidths[0];
        doc.text(article.quantity.toString(), currentX + 2, tableY + 5);
        currentX += colWidths[1];
        doc.text(`${article.unitPrice.toFixed(2)} €`, currentX + 2, tableY + 5);
        currentX += colWidths[2];
        doc.text(`${article.total.toFixed(2)} €`, currentX + 2, tableY + 5);
        tableY += 6;
      });

      // Total
      tableY += 10;
      const totalAmount = articles.reduce((sum, article) => sum + article.total, 0);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setFillColor(245, 245, 245);
      doc.rect(margin + 100, tableY, 70, 8, 'F');
      doc.text('Total HT', margin + 105, tableY + 5);
      doc.text(`${totalAmount.toFixed(2)} €`, margin + 165, tableY + 5, { align: 'right' });

      return doc.output('blob');
      
    } catch (error) {
      console.error('Erreur lors de la génération du PDF pour email:', error);
      // Fallback: PDF simple en cas d'erreur
      doc.text(`Facture #${invoice.invoiceNumber}`, 20, 20);
      const total = articles.reduce((sum, article) => sum + article.total, 0);
      doc.text(`Total: ${total.toFixed(2)}€`, 20, 30);
      return doc.output('blob');
    }
  }
  throw new Error('jsPDF non disponible');
};

// Composant Modal d'email
const EmailModal: React.FC<{
  invoice: Invoice;
  articles: Article[];
  companyInfo: CompanyInfo;
  clientInfo: ClientInfo;
  onClose: () => void;
  onSend: (emailData: any, invoice: Invoice, articles: Article[], companyInfo: CompanyInfo, clientInfo: ClientInfo) => Promise<any>;
}> = ({ invoice, articles, companyInfo, clientInfo, onClose, onSend }) => {
  const [toEmail, setToEmail] = useState(clientInfo.email || '');
  const [subject, setSubject] = useState(`Facture #${invoice.invoiceNumber} - ${companyInfo.companyName || companyInfo.firstName + ' ' + companyInfo.lastName}`);
  const [message, setMessage] = useState(`Bonjour ${clientInfo.firstName} ${clientInfo.lastName},

Veuillez trouver ci-joint la facture #${invoice.invoiceNumber} d'un montant de ${articles.reduce((sum, article) => sum + article.total, 0).toFixed(2)}€.

Cette facture est à régler selon les conditions convenues : ${invoice.paymentTerms}.
Date d'échéance : ${invoice.paymentDue}

Nous vous remercions pour votre confiance.

Cordialement,
${companyInfo.companyName || companyInfo.firstName + ' ' + companyInfo.lastName}
${companyInfo.email}
${companyInfo.phone}`);
  const [sending, setSending] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSend = async () => {
    if (!toEmail) {
      setNotification({ type: 'error', message: 'Veuillez saisir une adresse email de destination.' });
      return;
    }

    setSending(true);
    try {
      const result = await onSend(
        { to: toEmail, subject, message },
        invoice,
        articles,
        companyInfo,
        clientInfo
      );

      if (result.success) {
        setNotification({ type: 'success', message: result.message });
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setNotification({ type: 'error', message: result.message });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Erreur inattendue lors de l\'envoi.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Envoyer la facture par email</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={sending}
          >
            ×
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {/* Notification */}
          {notification && (
            <div className={`p-4 rounded-lg border ${
              notification.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {notification.message}
            </div>
          )}

          {/* Informations de la facture */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Facture à envoyer</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Numéro :</strong> #{invoice.invoiceNumber}</p>
              <p><strong>Client :</strong> {clientInfo.firstName} {clientInfo.lastName}</p>
              <p><strong>Montant :</strong> {articles.reduce((sum, article) => sum + article.total, 0).toFixed(2)}€</p>
              <p><strong>Échéance :</strong> {invoice.paymentDue}</p>
            </div>
          </div>

          {/* Formulaire d'email */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destinataire
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="email@exemple.com"
                  disabled={sending}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Objet
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={sending}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                disabled={sending}
                required
              />
            </div>

            {/* Information sur l'expéditeur */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">
                    Configuration de l'envoi
                  </h4>
                  <div className="text-xs text-blue-700 space-y-1">
                    <p><strong>Expéditeur :</strong> {companyInfo.companyName || companyInfo.firstName + ' ' + companyInfo.lastName} &lt;service sécurisé&gt;</p>
                    <p><strong>Réponses vers :</strong> {companyInfo.email}</p>
                    <p className="text-blue-600 font-medium mt-2">
                      ℹ️ L'email sera envoyé depuis notre service sécurisé, mais les réponses arriveront directement dans votre boîte mail.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-xl transition-all duration-200"
              disabled={sending}
            >
              Annuler
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !toEmail}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  <span>Envoyer la facture</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant Modal d'aperçu
const PreviewModal: React.FC<{ 
  invoice: Invoice; 
  articles: Article[];
  companyInfo: CompanyInfo;
  clientInfo: ClientInfo;
  onClose: () => void; 
}> = ({ invoice, articles, companyInfo, clientInfo, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Aperçu de la facture</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Contenu de la facture - synchronisé avec PDF */}
        <div className="p-8 bg-white" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', lineHeight: '1.4' }}>
          <div className="flex justify-between items-start mb-8">
            {/* Logo et informations émetteur */}
            <div className="flex items-start space-x-4">
              <div className="flex items-center justify-center" style={{ width: '56px', height: '56px' }}>
                <img src="/logo.png" alt="Logo" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900" style={{ fontSize: '14px', lineHeight: '1.2', marginBottom: '6px' }}>{companyInfo.companyName || `${companyInfo.firstName} ${companyInfo.lastName}`}</h3>
                <p className="text-gray-600" style={{ fontSize: '10px', lineHeight: '1.4', marginBottom: '2px' }}>{companyInfo.address}</p>
                <p className="text-gray-600" style={{ fontSize: '10px', lineHeight: '1.4', marginBottom: '2px' }}>{companyInfo.phone} | {companyInfo.email}</p>
                <p className="text-gray-600" style={{ fontSize: '10px', lineHeight: '1.4' }}>SIRET: {companyInfo.siret}</p>
              </div>
            </div>

            {/* Numéro de facture */}
            <div className="text-right">
              <h1 className="font-bold text-gray-900" style={{ fontSize: '14px' }}>Facture #{invoice.invoiceNumber}</h1>
            </div>
          </div>

          {/* Titre Facture */}
          <h1 className="font-bold text-gray-900" style={{ fontSize: '32px', marginBottom: '20px' }}>Facture</h1>

          {/* Informations client - synchronisé avec PDF */}
          <div className="mb-8">
            <h3 className="font-bold text-blue-600" style={{ fontSize: '12px', marginBottom: '8px' }}>Adresse de facturation</h3>
            <div className="text-gray-900" style={{ lineHeight: '1.6' }}>
              <p className="font-bold" style={{ fontSize: '10px', marginBottom: '6px' }}>{clientInfo.firstName} {clientInfo.lastName}</p>
              <p style={{ fontSize: '10px', marginBottom: '6px' }}>{`À l'attention de ${clientInfo.firstName} ${clientInfo.lastName}`}</p>
              <p style={{ fontSize: '10px', marginBottom: '6px' }}>{clientInfo.address}</p>
              <p style={{ fontSize: '10px', marginBottom: '6px' }}>{clientInfo.postalCode} {clientInfo.city}</p>
              <p style={{ fontSize: '10px', marginBottom: '6px' }}>Tél: {clientInfo.phone?.replace(/(\d{2})(?=\d)/g, '$1 ')}</p>
              <p style={{ fontSize: '10px' }}>SIRET: {clientInfo.siret?.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4')}</p>
            </div>
          </div>

          {/* Dates et conditions - synchronisé avec PDF */}
          <div className="mb-8" style={{ fontSize: '10px', lineHeight: '14px' }}>
            <div className="flex mb-2">
              <div style={{ width: '75px' }}> {/* 20mm */}
                <p className="font-bold text-gray-500" style={{ fontSize: '10px', marginBottom: '4px' }}>Date de facture</p>
                <p className="text-gray-900" style={{ fontSize: '10px' }}>{invoice.invoiceDate}</p>
              </div>
              <div style={{ width: '95px' }}> {/* 55mm */}
                <p className="font-bold text-gray-500" style={{ fontSize: '10px', marginBottom: '4px' }}>Date de livraison</p>
                <p className="text-gray-900" style={{ fontSize: '10px' }}>{invoice.deliveryDate}</p>
              </div>
              <div style={{ width: '100px' }}> {/* 90mm */}
                <p className="font-bold text-gray-500" style={{ fontSize: '10px', marginBottom: '4px' }}>Conditions de règlement</p>
                <p className="text-gray-900" style={{ fontSize: '10px' }}>{invoice.paymentTerms}</p>
              </div>
              <div style={{ width: '100px' }}> {/* 125mm */}
                <p className="font-bold text-gray-500" style={{ fontSize: '10px', marginBottom: '4px' }}>Échéance de paiement</p>
                <p className="text-gray-900" style={{ fontSize: '10px' }}>{invoice.paymentDue}</p>
              </div>
            </div>
          </div>

          {/* Tableau des produits - synchronisé avec PDF */}
          <div className="border border-gray-200 overflow-hidden mb-8" style={{ borderRadius: '0' }}>
            <table className="w-full" style={{ fontSize: '9px' }}>
              <thead style={{ backgroundColor: '#f8fafc' }}>
                <tr>
                  <th className="px-2 py-2 text-left font-bold text-gray-900" style={{ fontSize: '9px', width: '30px' }}>N°</th>
                  <th className="px-2 py-2 text-left font-bold text-gray-900" style={{ fontSize: '9px', width: '200px' }}>ARTICLE</th>
                  <th className="px-2 py-2 text-center font-bold text-gray-900" style={{ fontSize: '9px', width: '80px' }}>QUANTITÉ</th>
                  <th className="px-2 py-2 text-right font-bold text-gray-900" style={{ fontSize: '9px', width: '80px' }}>PRIX UNITÉ</th>
                  <th className="px-2 py-2 text-right font-bold text-gray-900" style={{ fontSize: '9px', width: '80px' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article, index) => (
                  <tr key={article.id} className="border-t border-gray-200">
                    <td className="px-2 py-3" style={{ fontSize: '10px' }}>{index + 1}</td>
                    <td className="px-2 py-3">
                      <div>
                        <p className="font-bold" style={{ fontSize: '10px', marginBottom: '2px' }}>{article.name}</p>
                        {article.description.map((desc, i) => (
                          <p key={i} className="text-gray-600" style={{ fontSize: '8px', lineHeight: '1.3', marginBottom: '1px' }}>{desc}</p>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <div>
                        <p className="font-bold" style={{ fontSize: '10px' }}>{article.quantity}</p>
                        <p className="text-gray-600" style={{ fontSize: '8px' }}>{article.quantity > 1 ? `${article.unit}s` : article.unit}</p>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right" style={{ fontSize: '10px' }}>{article.unitPrice.toFixed(2)} €</td>
                    <td className="px-2 py-3 text-right font-bold" style={{ fontSize: '10px' }}>{article.total.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total - synchronisé avec PDF */}
          <div className="flex justify-end mb-8">
            <div className="text-right">
              <div className="border-2 border-gray-800 rounded px-3 py-2">
                <div className="flex justify-between items-center" style={{ minWidth: '140px' }}>
                  <span className="font-bold" style={{ fontSize: '12px' }}>Total HT</span>
                  <span className="font-bold" style={{ fontSize: '12px' }}>{articles.reduce((sum, article) => sum + article.total, 0).toFixed(2)} €</span>
                </div>
              </div>
            </div>
          </div>

          {/* Informations bancaires - synchronisé avec PDF */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-900" style={{ fontSize: '11px', marginBottom: '12px' }}>Paiement souhaité par virement bancaire</h3>
            <div className="flex" style={{ gap: '60px' }}>
              <div style={{ width: '200px' }}>
                <p className="font-bold text-gray-600" style={{ fontSize: '9px', marginBottom: '3px' }}>Nom associé au compte</p>
                <p className="text-gray-900" style={{ fontSize: '9px', marginBottom: '8px' }}>{companyInfo.accountName}</p>
                <p className="font-bold text-gray-600" style={{ fontSize: '9px', marginBottom: '3px' }}>BIC</p>
                <p className="text-gray-900" style={{ fontSize: '9px' }}>{companyInfo.bic}</p>
              </div>
              <div style={{ width: '200px' }}>
                <p className="font-bold text-gray-600" style={{ fontSize: '9px', marginBottom: '3px' }}>IBAN</p>
                <p className="text-gray-900" style={{ fontSize: '9px', marginBottom: '8px' }}>{companyInfo.iban?.replace(/(.{4})/g, '$1 ').trim()}</p>
                <p className="font-bold text-gray-600" style={{ fontSize: '9px', marginBottom: '3px' }}>Nom de la banque</p>
                <p className="text-gray-900" style={{ fontSize: '9px' }}>{companyInfo.bankName}</p>
              </div>
            </div>
          </div>

          {/* Mentions légales - synchronisé avec PDF */}
          <div className="text-gray-500 pt-4" style={{ fontSize: '7px', lineHeight: '1.4', marginTop: '25px' }}>
            <p style={{ marginBottom: '3px' }}>Pour tout professionnel, en cas de retard de paiement, seront exigibles, conformément à l'article L 441-6 du code de commerce,</p>
            <p style={{ marginBottom: '3px' }}>une indemnité calculée sur la base de trois fois le taux de l'intérêt légal en vigueur ainsi qu'une indemnité forfaitaire pour frais</p>
            <p>de recouvrement de 40 euros. - TVA non applicable, art. 293B du CGI.</p>
          </div>

          {/* Bas de page - synchronisé avec PDF */}
          <div className="flex justify-between items-center text-gray-500" style={{ fontSize: '8px', marginTop: '15px' }}>
            <span>Enregistré au RM de: Val-d'Oise</span>
            <span>Page 1 / 1</span>
          </div>
        </div>

        {/* Footer avec boutons */}
        <div className="flex justify-end space-x-4 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg transition-all duration-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// Composant Modal d'historique
const HistoryModal: React.FC<{
  onClose: () => void;
  onLoadInvoice: (invoice: SavedInvoice) => void;
  getHistory: () => Promise<SavedInvoice[]>;
}> = ({ onClose, onLoadInvoice, getHistory }) => {
  const [history, setHistory] = useState<SavedInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      const data = await getHistory();
      setHistory(data);
      setLoading(false);
    };
    
    loadHistory();
  }, [getHistory]);

  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Historique des factures</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Chargement des factures...</p>
            </div>
          ) : sortedHistory.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucune facture dans l'historique</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedHistory.map((invoice) => (
                <div
                  key={invoice.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          Facture {invoice.invoiceNumber}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          invoice.status === 'finalized' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.status === 'finalized' ? 'Finalisée' : 'Brouillon'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <p className="font-medium">Client</p>
                          <p>{invoice.clientInfo.firstName} {invoice.clientInfo.lastName}</p>
                        </div>
                        <div>
                          <p className="font-medium">Date</p>
                          <p>{invoice.invoiceDate}</p>
                        </div>
                        <div>
                          <p className="font-medium">Montant</p>
                          <p>{invoice.totalAmount.toFixed(2)} €</p>
                        </div>
                        <div>
                          <p className="font-medium">Articles</p>
                          <p>{invoice.articles.length} article(s)</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onLoadInvoice(invoice)}
                      className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-all duration-200"
                    >
                      Charger
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Composant Modal de confirmation
const ConfirmationModal: React.FC<{
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">Confirmation</h3>
          </div>
          
          <p className="text-gray-600 mb-6 whitespace-pre-line">{message}</p>
          
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg transition-all duration-200"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant Modal des Paramètres
const SettingsModal: React.FC<{
  companyInfo: CompanyInfo;
  setCompanyInfo: (info: CompanyInfo) => void;
  clientInfo: ClientInfo;
  setClientInfo: (info: ClientInfo) => void;
  clients: ClientInfo[];
  setClients: (clients: ClientInfo[]) => void;
  selectedClientIndex: number;
  setSelectedClientIndex: (index: number) => void;
  articles: Article[];
  setArticles: (articles: Article[]) => void;
  setClientToDeleteIndex: (index: number | null) => void;
  setShowDeleteClientFromSettingsConfirmation: (show: boolean) => void;
  setArticleToDelete: (id: string | null) => void;
  setShowDeleteArticleConfirmation: (show: boolean) => void;
  checkDuplicateArticleName: (name: string, excludeId?: string) => boolean;
  setDuplicateMessage: (message: string) => void;
  setDuplicateAction: (action: () => void) => void;
  setShowDuplicateConfirmation: (show: boolean) => void;
  formatPhoneNumber: (phone: string) => string;
  formatSiret: (siret: string) => string;
  formatIban: (iban: string) => string;
  validateSiret: (siret: string) => boolean;
  createClientWithCheck: (clientData: ClientInfo, onConfirm: () => void) => void;
  onSave: () => void;
  onClose: () => void;
}> = ({ companyInfo, setCompanyInfo, clientInfo, setClientInfo, clients, setClients, selectedClientIndex, setSelectedClientIndex, articles, setArticles, setClientToDeleteIndex, setShowDeleteClientFromSettingsConfirmation, setArticleToDelete, setShowDeleteArticleConfirmation, checkDuplicateArticleName, setDuplicateMessage, setDuplicateAction, setShowDuplicateConfirmation, formatPhoneNumber, formatSiret, formatIban, validateSiret, createClientWithCheck, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState<'company' | 'client' | 'articles'>('company');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Fonction pour uploader le logo vers Supabase Storage
  const uploadLogo = async (file: File) => {
    if (!isSupabaseConfigured || !supabase) {
      setDuplicateMessage('Supabase n\'est pas configuré. L\'upload de logo n\'est pas disponible.');
      setDuplicateAction(() => () => {}); // Fonction vide
      setShowDuplicateConfirmation(true);
      return;
    }
  
    try {
      setUploadingLogo(true);
      
      // Vérifier la taille du fichier (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Le fichier est trop volumineux. Taille maximum : 2MB');
      }
  
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        throw new Error('Veuillez sélectionner une image (PNG, JPG, GIF, etc.)');
      }
  
      // Générer un nom unique pour le fichier
      const fileExt = file.name && file.name.includes('.') ? file.name.split('.').pop() : 'png';
      const fileName = `logo_${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;
  
      // Upload vers Supabase Storage
      const { data, error } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file);
  
      if (error) {
        throw error;
      }
  
      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);
  
      // Mettre à jour les informations de l'entreprise
      setCompanyInfo({ ...companyInfo, logoUrl: publicUrl });
      
      // Message de succès avec fonction vide
      setDuplicateMessage('Logo uploadé avec succès !');
      setDuplicateAction(() => () => {}); // Fonction vide pour éviter l'erreur
      setShowDuplicateConfirmation(true);
      
    } catch (error: any) {
      console.error('Erreur upload logo:', error);
      setDuplicateMessage(error.message || 'Erreur lors de l\'upload du logo. Veuillez réessayer.');
      setDuplicateAction(() => () => {}); // Fonction vide pour éviter l'erreur
      setShowDuplicateConfirmation(true);
    } finally {
      setUploadingLogo(false);
    }
  };

  // Fonction pour supprimer le logo
  const removeLogo = async () => {
    if (!companyInfo.logoUrl) return;
    
    try {
      // Extraire le chemin du fichier depuis l'URL
      const url = new URL(companyInfo.logoUrl);
      const pathParts = url.pathname ? url.pathname.split('/') : [];
      const filePath = pathParts.length >= 2 ? pathParts.slice(-2).join('/') : ''; // Récupérer "logos/filename.ext"
      
      if (isSupabaseConfigured && supabase) {
        // Supprimer le fichier de Supabase Storage
        await supabase.storage
          .from('company-logos')
          .remove([filePath]);
      }
      
      // Supprimer l'URL du logo
      setCompanyInfo({ ...companyInfo, logoUrl: undefined });
      
    } catch (error) {
      console.error('Erreur suppression logo:', error);
      // Même en cas d'erreur, on retire l'URL localement
      setCompanyInfo({ ...companyInfo, logoUrl: undefined });
    }
  };

  const addArticle = () => {
    const newArticle: Article = {
      id: Date.now().toString(),
      name: 'Nouveau service',
      description: ['Description du service'],
      quantity: 1,
      unit: 'Unité',
      unitPrice: 0,
      total: 0
    };
    
    if (checkDuplicateArticleName(newArticle.name)) {
      setDuplicateMessage(`Un produit nommé "${newArticle.name}" existe déjà. Créer quand même ? Cela peut causer de la confusion.`);
      setDuplicateAction(() => () => setArticles([...articles, newArticle]));
      setShowDuplicateConfirmation(true);
    } else {
      setArticles([...articles, newArticle]);
    }
  };

  const updateArticle = (id: string, field: keyof Article, value: any) => {
    const updatedArticles = articles.map(article => {
      if (article.id === id) {
        const updated = { ...article, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      }
      return article;
    });
    setArticles(updatedArticles);
  };

  const deleteArticle = (id: string) => {
    setArticles(articles.filter(article => article.id !== id));
  };

  const handleSave = () => {
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Gérer mes informations</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('company')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'company' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Mon Entreprise
          </button>
          <button
            onClick={() => setActiveTab('client')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'client' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Clients
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'articles' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Produits
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'company' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Mes informations personnelles</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={companyInfo.firstName}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Votre prénom"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={companyInfo.lastName}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Votre nom de famille"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={companyInfo.email}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="votre.email@exemple.com"
                  />
                </div>
              </div>

              <h4 className="text-md font-medium text-gray-900 mt-6 mb-4 pt-4 border-t border-gray-200">Informations de votre entreprise</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise</label>
                  <input
                    type="text"
                    value={companyInfo.companyName}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Mon Entreprise SARL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo de l'entreprise</label>
                  <div className="flex flex-col space-y-3">
                    {/* Prévisualisation du logo */}
                    {companyInfo.logoUrl ? (
                      <div className="flex items-center space-x-3">
                        <img 
                          src={companyInfo.logoUrl} 
                          alt="Logo entreprise" 
                          className="w-16 h-16 object-contain border border-gray-200 rounded-lg bg-white p-1"
                        />
                        <div className="flex-1">
                          <p className="text-sm text-green-600 font-medium">✓ Logo configuré</p>
                          <p className="text-xs text-gray-500">Ce logo sera utilisé dans vos factures PDF</p>
                        </div>
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="text-red-600 hover:text-red-700 text-sm px-3 py-1 border border-red-300 rounded-md hover:bg-red-50 transition-colors duration-200"
                        >
                          Supprimer
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
                        <div className="text-gray-400 text-sm">Aucun logo configuré</div>
                      </div>
                    )}
                    
                    {/* Input d'upload */}
                    <div className="flex items-center space-x-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            uploadLogo(file);
                            e.target.value = ''; // Reset input
                          }
                        }}
                        className="hidden"
                        id="logo-upload"
                        disabled={uploadingLogo}
                      />
                      <label
                        htmlFor="logo-upload"
                        className={`flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer transition-all duration-200 ${
                          uploadingLogo 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-white hover:bg-gray-50 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        {uploadingLogo ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                            <span className="text-sm">Upload en cours...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span className="text-sm">{companyInfo.logoUrl ? 'Changer le logo' : 'Ajouter un logo'}</span>
                          </>
                        )}
                      </label>
                      <div className="text-xs text-gray-500">
                        PNG, JPG, GIF - Max 2MB
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse complète</label>
                  <input
                    type="text"
                    value={companyInfo.address}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1 Rue de la Paix, 75001 Paris"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={companyInfo.phone}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, phone: formatPhoneNumber(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="01 23 45 67 89"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                  <input
                    type="text"
                    value={companyInfo.siret}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, siret: formatSiret(e.target.value) })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      companyInfo.siret && !validateSiret(companyInfo.siret) 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                    placeholder="123 456 789 00012"
                  />
                  {companyInfo.siret && !validateSiret(companyInfo.siret) && (
                    <p className="text-red-600 text-xs mt-1">Le SIRET doit contenir exactement 14 chiffres</p>
                  )}
                </div>
              </div>

              {/* Section Informations bancaires */}
              <h4 className="text-md font-medium text-gray-900 mt-6 mb-4 pt-4 border-t border-gray-200">Informations bancaires</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom associé au compte</label>
                  <input
                    type="text"
                    value={companyInfo.accountName}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, accountName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nom sur le compte bancaire"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BIC</label>
                  <input
                    type="text"
                    value={companyInfo.bic}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, bic: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="BNPAFRPPXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                  <input
                    type="text"
                    value={companyInfo.iban}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, iban: formatIban(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="FR14 2004 1010 0505 0001 3M02 606"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la banque</label>
                  <input
                    type="text"
                    value={companyInfo.bankName}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="LCL"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'client' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Gestion des clients</h3>
                <button
                  onClick={() => {
                    const newClient: ClientInfo = { firstName: 'Nouveau', lastName: 'Client', address: '', postalCode: '', city: '', siret: '', phone: '', email: '' };
                    createClientWithCheck(newClient, () => {
                      setClients([...clients, newClient]);
                      setSelectedClientIndex(clients.length);
                      setClientInfo(newClient);
                    });
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter un client</span>
                </button>
              </div>
              
              <div className="space-y-4">
                {clients.length > 0 ? (
                  clients.map((client, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">{client.firstName} {client.lastName || `Client ${index + 1}`}</h4>
                          <p className="text-sm text-gray-600">{client.address}</p>
                          <p className="text-sm text-gray-600">{client.postalCode} {client.city}</p>
                          {client.phone && <p className="text-sm text-gray-600">Tél: {formatPhoneNumber(client.phone)}</p>}
                          {client.siret && <p className="text-sm text-gray-600">SIRET: {formatSiret(client.siret)}</p>}
                        </div>
                        <button
                          onClick={() => {
                            setClientToDeleteIndex(index);
                            setShowDeleteClientFromSettingsConfirmation(true);
                          }}
                          className="p-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-lg transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                          <input
                            type="text"
                            value={client.firstName}
                            onChange={(e) => {
                              const updatedClients = [...clients];
                              updatedClients[index] = { ...client, firstName: e.target.value };
                              setClients(updatedClients);
                              if (selectedClientIndex === index) {
                                setClientInfo(updatedClients[index]);
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Prénom du client"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                          <input
                            type="text"
                            value={client.lastName}
                            onChange={(e) => {
                              const updatedClients = [...clients];
                              updatedClients[index] = { ...client, lastName: e.target.value };
                              setClients(updatedClients);
                              if (selectedClientIndex === index) {
                                setClientInfo(updatedClients[index]);
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Nom de famille du client"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                          <AddressAutocomplete
                            value={client.address}
                            onChange={(address) => {
                              const updatedClients = [...clients];
                              updatedClients[index] = { ...client, address };
                              setClients(updatedClients);
                              if (selectedClientIndex === index) {
                                setClientInfo(updatedClients[index]);
                              }
                            }}
                            onSelect={(suggestion) => {
                              const updatedClients = [...clients];
                              updatedClients[index] = {
                                ...client,
                                address: suggestion.street ? `${suggestion.housenumber || ''} ${suggestion.street}`.trim() : suggestion.label,
                                postalCode: suggestion.postcode || client.postalCode,
                                city: suggestion.city || client.city
                              };
                              setClients(updatedClients);
                              if (selectedClientIndex === index) {
                                setClientInfo(updatedClients[index]);
                              }
                            }}
                            placeholder="Tapez l'adresse du client..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                          <input
                            type="text"
                            value={client.postalCode}
                            onChange={(e) => {
                              const updatedClients = [...clients];
                              updatedClients[index] = { ...client, postalCode: e.target.value };
                              setClients(updatedClients);
                              if (selectedClientIndex === index) {
                                setClientInfo(updatedClients[index]);
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="75001"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                          <input
                            type="text"
                            value={client.city}
                            onChange={(e) => {
                              const updatedClients = [...clients];
                              updatedClients[index] = { ...client, city: e.target.value };
                              setClients(updatedClients);
                              if (selectedClientIndex === index) {
                                setClientInfo(updatedClients[index]);
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Paris"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                          <input
                            type="text"
                            value={client.siret}
                            onChange={(e) => {
                              const updatedClients = [...clients];
                              updatedClients[index] = { ...client, siret: formatSiret(e.target.value) };
                              setClients(updatedClients);
                              if (selectedClientIndex === index) {
                                setClientInfo(updatedClients[index]);
                              }
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              client.siret && !validateSiret(client.siret) 
                                ? 'border-red-300 bg-red-50' 
                                : 'border-gray-300'
                            }`}
                            placeholder="987 654 321 00019"
                          />
                          {client.siret && !validateSiret(client.siret) && (
                            <p className="text-red-600 text-xs mt-1">Le SIRET doit contenir exactement 14 chiffres</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                          <input
                            type="text"
                            value={client.phone}
                            onChange={(e) => {
                              const updatedClients = [...clients];
                              updatedClients[index] = { ...client, phone: formatPhoneNumber(e.target.value) };
                              setClients(updatedClients);
                              if (selectedClientIndex === index) {
                                setClientInfo(updatedClients[index]);
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="02 34 56 78 90"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={client.email}
                            onChange={(e) => {
                              const updatedClients = [...clients];
                              updatedClients[index] = { ...client, email: e.target.value };
                              setClients(updatedClients);
                              if (selectedClientIndex === index) {
                                setClientInfo(updatedClients[index]);
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="client@exemple.com"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Aucun client configuré.</p>
                    <p>Cliquez sur "Ajouter un client" pour commencer.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'articles' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Gestion des produits</h3>
                <button
                  onClick={addArticle}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter</span>
                </button>
              </div>
              
              <div className="space-y-4">
                {articles.map((article) => (
                  <div key={article.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom du service</label>
                        <input
                          type="text"
                          value={article.name}
                          onChange={(e) => updateArticle(article.id, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
                        <input
                          type="number"
                          value={article.quantity}
                          onChange={(e) => updateArticle(article.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prix unitaire (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={article.unitPrice}
                          onChange={(e) => updateArticle(article.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        Total: {article.total.toFixed(2)} €
                      </div>
                      {articles.length > 1 && (
                        <button
                          onClick={() => {
                            setArticleToDelete(article.id);
                            setShowDeleteArticleConfirmation(true);
                          }}
                          className="p-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-lg transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg transition-all duration-200"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
          >
            Mettre à jour
          </button>
        </div>
      </div>
    </div>
  );
};

// Fonction utilitaire pour calculer l'échéance de paiement
function calculatePaymentDue(invoiceDate: Date, terms: string): string {
  if (!terms || typeof terms !== 'string') {
    return new Date().toLocaleDateString('fr-FR');
  }
  
  const days = parseInt(terms.split(' ')[0]);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + (isNaN(days) ? 30 : days));
  return dueDate.toLocaleDateString('fr-FR');
}




export default InvoiceApp;