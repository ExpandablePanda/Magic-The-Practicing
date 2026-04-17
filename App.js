import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Home, Play, PenTool, User as UserIcon, Heart } from 'lucide-react-native';
import { supabase } from './src/services/supabase';

import LandingView from './src/views/LandingView';
import PlayView from './src/views/PlayView';
import BuilderView from './src/views/BuilderView';
import AuthView from './src/views/AuthView';
import ScoreView from './src/views/ScoreView';
import WebShell from './src/components/WebShell';

const APP_VERSION = 'V.1.0.2';

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    if (supabase && supabase.auth) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

      return () => subscription.unsubscribe();
    } else {
      setSession(null);
    }
  }, []);

  // Loading state while we check for persisted session
  if (session === undefined) {
    return (
      <WebShell>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingBrand}>Magic: The <Text style={styles.brandRed}>Practicing</Text></Text>
          <ActivityIndicator color="#b30000" style={{ marginTop: 24 }} />
        </View>
      </WebShell>
    );
  }

  // Not logged in — show auth as the landing
  if (!session) {
    return (
      <WebShell>
        <SafeAreaView style={styles.container}>
          <View style={styles.versionBar}>
            <Text style={styles.version}>{APP_VERSION}</Text>
          </View>
          <AuthView onAuthComplete={() => setCurrentView('landing')} />
          <StatusBar style="auto" />
        </SafeAreaView>
      </WebShell>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return (
          <LandingView
            onStartPlay={() => setCurrentView('play')}
            onOpenBuilder={() => setCurrentView('builder')}
          />
        );
      case 'play':
        return <PlayView />;
      case 'builder':
        return <BuilderView />;
      case 'builder':
        return <BuilderView />;
      case 'score':
        return <ScoreView onBack={() => setCurrentView('landing')} />;
      case 'account':
        return (
          <View style={accountStyles.container}>
            <View style={accountStyles.header}>
              <View style={accountStyles.avatar}>
                <UserIcon color="#b30000" size={40} />
              </View>
              <Text style={accountStyles.email}>{session.user?.email}</Text>
              <Text style={accountStyles.status}>Synchronized Account</Text>
            </View>
            <TouchableOpacity
              style={accountStyles.logoutButton}
              onPress={() => supabase.auth.signOut()}
            >
              <Text style={accountStyles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return <LandingView onStartPlay={() => setCurrentView('play')} onOpenBuilder={() => setCurrentView('builder')} />;
    }
  };

  return (
    <WebShell>
      <SafeAreaView style={styles.container}>
        <View style={styles.versionBar}>
          <Text style={styles.version}>{APP_VERSION}</Text>
        </View>

        <View style={styles.content}>
          {renderView()}
        </View>

        <View style={styles.navShell}>
          <TouchableOpacity style={styles.navItem} onPress={() => setCurrentView('landing')}>
            <Home color={currentView === 'landing' ? '#b30000' : '#999'} size={24} />
            <Text style={[styles.navText, currentView === 'landing' && styles.activeNav]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setCurrentView('play')}>
            <Play color={currentView === 'play' ? '#b30000' : '#999'} size={24} />
            <Text style={[styles.navText, currentView === 'play' && styles.activeNav]}>Play</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setCurrentView('builder')}>
            <PenTool color={currentView === 'builder' ? '#b30000' : '#999'} size={24} />
            <Text style={[styles.navText, currentView === 'builder' && styles.activeNav]}>Builder</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setCurrentView('score')}>
            <Heart color={currentView === 'score' ? '#b30000' : '#999'} size={24} />
            <Text style={[styles.navText, currentView === 'score' && styles.activeNav]}>Score</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setCurrentView('account')}>
            <UserIcon color={currentView === 'account' ? '#b30000' : '#999'} size={24} />
            <Text style={[styles.navText, currentView === 'account' && styles.activeNav]}>Account</Text>
          </TouchableOpacity>
        </View>

        <StatusBar style="auto" />
      </SafeAreaView>
    </WebShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingBrand: {
    fontSize: 28,
    fontWeight: '900',
    color: '#333',
    letterSpacing: -1,
  },
  brandRed: {
    color: '#b30000',
  },
  versionBar: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 15 : 4,
    paddingBottom: 2,
    backgroundColor: '#fff',
  },
  version: {
    fontSize: 11,
    color: '#bbb',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  navShell: {
    flexDirection: 'row',
    height: Platform.OS === 'web' ? 80 : 85,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 25 : 0,
    backgroundColor: '#fff',
    paddingHorizontal: Platform.OS === 'web' ? '15%' : 0,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: '#999',
  },
  activeNav: {
    color: '#b30000',
    fontWeight: 'bold',
  }
});

const accountStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  email: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  status: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  logoutText: {
    color: '#b30000',
    fontSize: 16,
    fontWeight: '700',
  }
});
