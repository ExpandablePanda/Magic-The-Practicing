import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { Minus, Plus, RefreshCcw, User, Heart, Shield, Skull } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function ScoreView({ onBack }) {
  const [playerCount, setPlayerCount] = useState(4);
  const [players, setPlayers] = useState([
    { id: 1, name: 'P1', life: 40, poison: 0, commander: 0 },
    { id: 2, name: 'P2', life: 40, poison: 0, commander: 0 },
    { id: 3, name: 'P3', life: 40, poison: 0, commander: 0 },
    { id: 4, name: 'P4', life: 40, poison: 0, commander: 0 },
  ]);

  const resetScores = () => {
    setPlayers(players.map(p => ({ ...p, life: playerCount === 2 ? 20 : 40, poison: 0, commander: 0 })));
  };

  const updateLife = (id, delta) => {
    setPlayers(players.map(p => p.id === id ? { ...p, life: p.life + delta } : p));
  };

  const updateStat = (id, stat, delta) => {
    setPlayers(players.map(p => p.id === id ? { ...p, [stat]: Math.max(0, p[stat] + delta) } : p));
  };

  const renderPlayer = (player, index) => {
    // Layout logic for 2, 3, or 4 players
    const isSquare = playerCount === 4 || playerCount === 3;
    const playerStyle = isSquare ? styles.playerSquare : styles.playerFull;
    
    // Rotate players for "around the table" feel in mobile
    const rotation = playerCount === 4 ? (index === 0 || index === 1 ? '180deg' : '0deg') : '0deg';

    return (
      <View key={player.id} style={[playerStyle, { transform: [{ rotate: rotation }] }]}>
        <View style={styles.playerHeader}>
          <Text style={styles.playerName}>{player.name}</Text>
        </View>
        
        <View style={styles.lifeMain}>
          <TouchableOpacity onPress={() => updateLife(player.id, -1)} style={styles.lifeBtn}>
            <Minus color="#b30000" size={32} />
          </TouchableOpacity>
          
          <View style={styles.lifeDisplay}>
            <Text style={styles.lifeText}>{player.life}</Text>
          </View>
          
          <TouchableOpacity onPress={() => updateLife(player.id, 1)} style={styles.lifeBtn}>
            <Plus color="#28a745" size={32} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Skull color="#6c5ce7" size={16} />
            <View style={styles.statControls}>
               <TouchableOpacity onPress={() => updateStat(player.id, 'poison', -1)}><Minus color="#999" size={14} /></TouchableOpacity>
               <Text style={styles.statText}>{player.poison}</Text>
               <TouchableOpacity onPress={() => updateStat(player.id, 'poison', 1)}><Plus color="#999" size={14} /></TouchableOpacity>
            </View>
          </View>
          <View style={styles.statItem}>
            <Shield color="#ff8f00" size={16} />
            <View style={styles.statControls}>
               <TouchableOpacity onPress={() => updateStat(player.id, 'commander', -1)}><Minus color="#999" size={14} /></TouchableOpacity>
               <Text style={styles.statText}>{player.commander}</Text>
               <TouchableOpacity onPress={() => updateStat(player.id, 'commander', 1)}><Plus color="#999" size={14} /></TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={styles.brandTitle}>REAL PLAY <Text style={{color: '#b30000'}}>SCOREKEEP</Text></Text>
          <View style={styles.countSelector}>
            {[2, 3, 4].map(c => (
              <TouchableOpacity 
                key={c} 
                style={[styles.countBtn, playerCount === c && styles.activeCountBtn]}
                onPress={() => {
                  setPlayerCount(c);
                  setPlayers(Array.from({ length: c }, (_, i) => ({ id: i+1, name: `P${i+1}`, life: c === 2 ? 20 : 40, poison: 0, commander: 0 })));
                }}
              >
                <Text style={[styles.countText, playerCount === c && styles.activeCountText]}>{c}P</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <TouchableOpacity onPress={resetScores} style={styles.resetBtn}>
          <RefreshCcw color="#666" size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {players.map((p, i) => renderPlayer(p, i))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111', // Premium dark mode for players
  },
  header: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  brandTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  countSelector: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 20,
    padding: 2,
  },
  countBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 18,
  },
  activeCountBtn: {
    backgroundColor: '#b30000',
  },
  countText: {
    color: '#999',
    fontSize: 10,
    fontWeight: '900',
  },
  activeCountText: {
    color: '#fff',
  },
  resetBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  playerSquare: {
    width: '50%',
    height: '50%',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  playerFull: {
    width: '100%',
    height: '50%',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  playerHeader: {
    marginBottom: 10,
  },
  playerName: {
    color: '#666',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  lifeMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  lifeDisplay: {
    minWidth: 80,
    alignItems: 'center',
  },
  lifeText: {
    color: '#fff',
    fontSize: 64,
    fontWeight: '900',
  },
  lifeBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 8,
  },
  statControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    minWidth: 20,
    textAlign: 'center',
  },
});
