import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Modal, Pressable, ActivityIndicator } from 'react-native';
import { Plus, Trash2, Users, BarChart2, User, XCircle, CheckCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from '../services/storage';
import { supabase } from '../services/supabase';

const PROFILES_KEY = 'mtg_local_players';

export default function StatsView() {
  const [tab, setTab] = useState('playtest'); // 'playtest' | 'live'
  const [decks, setDecks] = useState([]);
  const [stats, setStats] = useState({});
  const [profiles, setProfiles] = useState([]); // local player profiles
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [friendSearchResult, setFriendSearchResult] = useState(null);
  const [friendSearching, setFriendSearching] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showLogGame, setShowLogGame] = useState(false);
  const [logDeckName, setLogDeckName] = useState('');
  const [mySession, setMySession] = useState(null);

  useEffect(() => {
    loadAll();
    supabase.auth.getSession().then(({ data: { session } }) => setMySession(session));
  }, []);

  const loadAll = async () => {
    const [allDecks, allStats, rawProfiles] = await Promise.all([
      StorageService.getDecks(),
      StorageService.getStats(),
      AsyncStorage.getItem(PROFILES_KEY).then(v => (v ? JSON.parse(v) : [])),
    ]);
    setDecks(allDecks);
    setStats(allStats);
    setProfiles(rawProfiles);
  };

  const saveProfiles = async (updated) => {
    setProfiles(updated);
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
  };

  const addProfile = async () => {
    const name = newProfileName.trim();
    if (!name) return;
    const profile = { id: `local-${Date.now()}`, name, isLocal: true, games: [] };
    await saveProfiles([...profiles, profile]);
    setNewProfileName('');
    setShowAddProfile(false);
  };

  const deleteProfile = (id) => {
    Alert.alert('Delete Profile', 'Remove this player profile?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await saveProfiles(profiles.filter(p => p.id !== id));
      }},
    ]);
  };

  const searchFriendByEmail = async () => {
    const email = friendEmail.trim().toLowerCase();
    if (!email) return;
    setFriendSearching(true);
    setFriendSearchResult(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .eq('email', email)
        .single();
      if (error || !data) {
        setFriendSearchResult({ error: 'No account found for that email.' });
      } else {
        setFriendSearchResult(data);
      }
    } catch {
      setFriendSearchResult({ error: 'Search failed. Check connection.' });
    }
    setFriendSearching(false);
  };

  const addFriendProfile = async (friend) => {
    if (profiles.find(p => p.id === friend.id)) {
      Alert.alert('Already added', 'This player is already in your list.');
      return;
    }
    const profile = { id: friend.id, name: friend.display_name || friend.email, isLocal: false, email: friend.email, games: [] };
    await saveProfiles([...profiles, profile]);
    setFriendEmail('');
    setFriendSearchResult(null);
    setShowAddFriend(false);
  };

  const logLiveGame = async (profile, result) => {
    const updated = profiles.map(p => {
      if (p.id !== profile.id) return p;
      const game = { result, deck: logDeckName || 'Unknown Deck', date: new Date().toISOString() };
      return { ...p, games: [game, ...(p.games || [])] };
    });
    await saveProfiles(updated);
    if (!profile.isLocal && mySession) {
      // Upload to their cloud account if they're a registered user
      await supabase.from('game_results').insert({
        player_id: profile.id,
        result,
        deck_name: logDeckName || 'Unknown Deck',
        logged_by: mySession.user.id,
        created_at: new Date().toISOString(),
      });
    }
    setShowLogGame(false);
    setLogDeckName('');
    setSelectedProfile(null);
  };

  // Aggregate playtest stats across all decks
  const playtestTotal = Object.values(stats).reduce(
    (acc, s) => ({ wins: acc.wins + (s.wins || 0), losses: acc.losses + (s.losses || 0) }),
    { wins: 0, losses: 0 }
  );
  const winRate = playtestTotal.wins + playtestTotal.losses > 0
    ? Math.round((playtestTotal.wins / (playtestTotal.wins + playtestTotal.losses)) * 100)
    : null;

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, tab === 'playtest' && styles.activeTab]} onPress={() => setTab('playtest')}>
          <BarChart2 color={tab === 'playtest' ? '#b30000' : '#999'} size={16} />
          <Text style={[styles.tabText, tab === 'playtest' && styles.activeTabText]}>PLAYTEST</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'live' && styles.activeTab]} onPress={() => setTab('live')}>
          <Users color={tab === 'live' ? '#b30000' : '#999'} size={16} />
          <Text style={[styles.tabText, tab === 'live' && styles.activeTabText]}>LIVE GAMES</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── PLAYTEST TAB ── */}
        {tab === 'playtest' && (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNum}>{playtestTotal.wins}</Text>
                <Text style={styles.summaryLabel}>WINS</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNum}>{playtestTotal.losses}</Text>
                <Text style={styles.summaryLabel}>LOSSES</Text>
              </View>
              <View style={[styles.summaryCard, { borderColor: '#b30000' }]}>
                <Text style={[styles.summaryNum, { color: '#b30000' }]}>{winRate !== null ? `${winRate}%` : '—'}</Text>
                <Text style={styles.summaryLabel}>WIN RATE</Text>
              </View>
            </View>

            <Text style={styles.sectionHeader}>BY DECK</Text>
            {decks.length === 0 && <Text style={styles.empty}>No decks yet.</Text>}
            {decks.map(deck => {
              const s = stats[deck.id];
              if (!s || (s.wins === 0 && s.losses === 0)) return null;
              const total = s.wins + s.losses;
              const rate = Math.round((s.wins / total) * 100);
              return (
                <View key={deck.id} style={styles.deckRow}>
                  <View style={styles.deckRowInfo}>
                    <Text style={styles.deckRowName}>{deck.name}</Text>
                    <Text style={styles.deckRowRecord}>{s.wins}W – {s.losses}L · {rate}%</Text>
                  </View>
                  <View style={styles.deckBarBg}>
                    <View style={[styles.deckBarFill, { width: `${rate}%` }]} />
                  </View>
                </View>
              );
            }).filter(Boolean)}
            {decks.every(d => !stats[d.id] || (stats[d.id].wins === 0 && stats[d.id].losses === 0)) && (
              <Text style={styles.empty}>Log results from the playtest reset button to see stats here.</Text>
            )}
          </>
        )}

        {/* ── LIVE GAMES TAB ── */}
        {tab === 'live' && (
          <>
            <View style={styles.liveActions}>
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddProfile(true)}>
                <Plus color="#fff" size={16} />
                <Text style={styles.addBtnText}>ADD PLAYER</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#1a1a1a' }]} onPress={() => setShowAddFriend(true)}>
                <User color="#fff" size={16} />
                <Text style={styles.addBtnText}>ADD FRIEND</Text>
              </TouchableOpacity>
            </View>

            {profiles.length === 0 && (
              <Text style={styles.empty}>Add local players or friends to track live game results.</Text>
            )}

            {profiles.map(profile => {
              const wins = (profile.games || []).filter(g => g.result === 'win').length;
              const losses = (profile.games || []).filter(g => g.result === 'loss').length;
              const total = wins + losses;
              const rate = total > 0 ? Math.round((wins / total) * 100) : null;
              return (
                <View key={profile.id} style={styles.profileCard}>
                  <View style={styles.profileHeader}>
                    <View style={styles.profileAvatar}>
                      <Text style={styles.profileInitial}>{profile.name[0].toUpperCase()}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.profileName}>{profile.name}</Text>
                        {!profile.isLocal && (
                          <View style={styles.cloudBadge}><Text style={styles.cloudBadgeText}>☁ CLOUD</Text></View>
                        )}
                      </View>
                      <Text style={styles.profileRecord}>
                        {total > 0 ? `${wins}W – ${losses}L · ${rate}%` : 'No games logged'}
                      </Text>
                    </View>
                    <View style={styles.profileActions}>
                      <TouchableOpacity
                        style={styles.logBtn}
                        onPress={() => { setSelectedProfile(profile); setShowLogGame(true); }}
                      >
                        <Text style={styles.logBtnText}>LOG</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteProfile(profile.id)} style={{ padding: 4 }}>
                        <Trash2 color="#ccc" size={16} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {(profile.games || []).slice(0, 3).map((game, i) => (
                    <View key={i} style={styles.gameRow}>
                      <View style={[styles.resultDot, { backgroundColor: game.result === 'win' ? '#2d8a4e' : '#b30000' }]} />
                      <Text style={styles.gameRowText}>{game.deck}</Text>
                      <Text style={styles.gameRowDate}>{new Date(game.date).toLocaleDateString()}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Add Local Profile Modal */}
      <Modal visible={showAddProfile} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowAddProfile(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>NEW PLAYER</Text>
            <TextInput
              style={styles.input}
              placeholder="Player name"
              value={newProfileName}
              onChangeText={setNewProfileName}
              autoFocus
            />
            <TouchableOpacity style={styles.confirmBtn} onPress={addProfile}>
              <CheckCircle color="#fff" size={16} />
              <Text style={styles.confirmBtnText}>ADD</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Add Friend Modal */}
      <Modal visible={showAddFriend} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => { setShowAddFriend(false); setFriendSearchResult(null); setFriendEmail(''); }}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>ADD FRIEND</Text>
            <Text style={styles.modalSubtitle}>Search by their account email</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="friend@email.com"
                value={friendEmail}
                onChangeText={setFriendEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.searchBtn} onPress={searchFriendByEmail}>
                {friendSearching ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.searchBtnText}>GO</Text>}
              </TouchableOpacity>
            </View>
            {friendSearchResult && !friendSearchResult.error && (
              <View style={styles.friendResult}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileInitial}>{(friendSearchResult.display_name || friendSearchResult.email)[0].toUpperCase()}</Text>
                </View>
                <Text style={styles.friendResultName}>{friendSearchResult.display_name || friendSearchResult.email}</Text>
                <TouchableOpacity style={styles.confirmBtn} onPress={() => addFriendProfile(friendSearchResult)}>
                  <Plus color="#fff" size={14} />
                  <Text style={styles.confirmBtnText}>ADD</Text>
                </TouchableOpacity>
              </View>
            )}
            {friendSearchResult?.error && (
              <Text style={styles.friendError}>{friendSearchResult.error}</Text>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Log Game Modal */}
      <Modal visible={showLogGame} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowLogGame(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>LOG GAME</Text>
            {selectedProfile && <Text style={styles.modalSubtitle}>for {selectedProfile.name}</Text>}
            <TextInput
              style={styles.input}
              placeholder="Deck name (optional)"
              value={logDeckName}
              onChangeText={setLogDeckName}
            />
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: '#2d8a4e' }]}
              onPress={() => selectedProfile && logLiveGame(selectedProfile, 'win')}
            >
              <Text style={styles.confirmBtnText}>🏆 WIN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: '#b30000' }]}
              onPress={() => selectedProfile && logLiveGame(selectedProfile, 'loss')}
            >
              <Text style={styles.confirmBtnText}>💀 LOSS</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#b30000',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#999',
    letterSpacing: 1,
  },
  activeTabText: { color: '#b30000' },
  scroll: { padding: 16, paddingBottom: 60 },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
  },
  summaryNum: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a1a',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#999',
    letterSpacing: 1,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '900',
    color: '#999',
    letterSpacing: 2,
    marginBottom: 12,
  },
  deckRow: {
    marginBottom: 14,
  },
  deckRowInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  deckRowName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  deckRowRecord: {
    fontSize: 12,
    color: '#666',
    fontWeight: '700',
  },
  deckBarBg: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  deckBarFill: {
    height: 6,
    backgroundColor: '#b30000',
    borderRadius: 3,
  },
  empty: {
    color: '#bbb',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },
  liveActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#b30000',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  profileCard: {
    backgroundColor: '#fafafa',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#b30000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  profileRecord: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  profileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logBtn: {
    backgroundColor: '#b30000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  logBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  cloudBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cloudBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#1565c0',
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  resultDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gameRowText: {
    flex: 1,
    fontSize: 12,
    color: '#555',
  },
  gameRowDate: {
    fontSize: 11,
    color: '#bbb',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: 320,
    gap: 12,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: 1,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: -6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#b30000',
    paddingVertical: 12,
    borderRadius: 12,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchBtn: {
    backgroundColor: '#b30000',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },
  friendResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0faf4',
    padding: 10,
    borderRadius: 10,
  },
  friendResultName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  friendError: {
    color: '#b30000',
    fontSize: 13,
    textAlign: 'center',
  },
});
