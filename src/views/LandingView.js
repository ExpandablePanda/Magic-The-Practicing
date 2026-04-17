import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Play, PlusSquare, BarChart2, ChevronRight } from 'lucide-react-native';

export default function LandingView({ onStartPlay, onOpenBuilder, onOpenMetagame }) {
  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.brand}>Magic: The <Text style={styles.brandRed}>Practicing</Text></Text>
        <Text style={styles.subtitle}>Practice, Playtesting, and Planning Studio</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>

        <TouchableOpacity style={styles.primaryButton} onPress={onStartPlay}>
          <View style={styles.buttonLeft}>
            <View style={styles.iconCircle}>
              <Play color="#b30000" size={20} fill="#b30000" />
            </View>
            <View>
              <Text style={styles.buttonText}>Start Practicing</Text>
              <Text style={styles.buttonSubtext}>Test your active deck</Text>
            </View>
          </View>
          <ChevronRight color="#ccc" size={20} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={onOpenBuilder}>
          <View style={styles.buttonLeft}>
            <View style={[styles.iconCircle, styles.secondaryIcon]}>
              <PlusSquare color="#666" size={20} />
            </View>
            <View>
              <Text style={styles.rowText}>Deck Builder</Text>
              <Text style={styles.buttonSubtext}>Search & manage cards</Text>
            </View>
          </View>
          <ChevronRight color="#ccc" size={20} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={onOpenMetagame}>
          <View style={styles.buttonLeft}>
            <View style={[styles.iconCircle, styles.secondaryIcon]}>
              <BarChart2 color="#666" size={20} />
            </View>
            <View>
              <Text style={styles.rowText}>Metagame</Text>
              <Text style={styles.buttonSubtext}>Top cards by commander</Text>
            </View>
          </View>
          <ChevronRight color="#ccc" size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by Scryfall & EDHREC</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brand: {
    fontSize: 32,
    fontWeight: '900',
    color: '#333',
    letterSpacing: -1,
    textAlign: 'center',
  },
  brandRed: {
    color: '#b30000',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 16,
  },
  buttonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryIcon: {
    backgroundColor: '#f5f5f5',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#b30000',
  },
  buttonSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
  },
  rowText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#444',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#bbb',
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
