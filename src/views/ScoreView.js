import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, SafeAreaView,
  Dimensions, TextInput, Modal, Pressable, ScrollView
} from 'react-native';
import { RefreshCcw, Skull, Shield, Zap, Swords, ChevronDown, UserPlus, Trophy } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

const PROFILES_KEY = 'mtg_local_players';

const { width, height } = Dimensions.get('window');

const PLAYMAT_COLORS = [
  { label: 'White',   value: '#f5f5f0' },
  { label: 'Felt',    value: '#2d5a27' },
  { label: 'Slate',   value: '#1e2a3a' },
  { label: 'Black',   value: '#0d0d0d' },
  { label: 'Navy',    value: '#0f1f3d' },
  { label: 'Burgundy',value: '#3d0f1f' },
  { label: 'Sand',    value: '#c8b89a' },
];

export default function ScoreView() {
  const [playerCount, setPlayerCount] = useState(4);
  const [players, setPlayers] = useState(makePlayers(4));
  const [playmateColor, setPlaymatColor] = useState(PLAYMAT_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editingName, setEditingName] = useState(null);
  const [tempName, setTempName] = useState('');
  const [statsModal, setStatsModal] = useState(null);
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [importingForId, setImportingForId] = useState(null); // player id picking a profile
  const [showLogResult, setShowLogResult] = useState(false);
  const [mySession, setMySession] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(PROFILES_KEY).then(v => setSavedProfiles(v ? JSON.parse(v) : []));
    supabase.auth.getSession().then(({ data: { session } }) => setMySession(session));
  }, []);

  const isDarkMat = ['#0d0d0d','#1e2a3a','#0f1f3d','#3d0f1f','#2d5a27'].includes(playmateColor.value);

  function makePlayers(count) {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Player ${i + 1}`,
      life: 40,
      poison: 0,
      commander: 0,
      energy: 0,
    }));
  }

  const resetScores = () => {
    setPlayers(p => p.map(pl => ({ ...pl, life: 40, poison: 0, commander: 0, energy: 0 })));
  };

  const updateLife = (id, delta) => {
    setPlayers(p => p.map(pl => pl.id === id ? { ...pl, life: pl.life + delta } : pl));
  };

  const updateStat = (id, stat, delta) => {
    setPlayers(p => p.map(pl => pl.id === id ? { ...pl, [stat]: Math.max(0, pl[stat] + delta) } : pl));
  };

  const changeCount = (c) => {
    setPlayerCount(c);
    setPlayers(makePlayers(c));
  };

  const importProfile = (playerId, profile) => {
    setPlayers(p => p.map(pl => pl.id === playerId
      ? { ...pl, name: profile.name, profileId: profile.id, isLocal: profile.isLocal }
      : pl
    ));
    setImportingForId(null);
  };

  const logGameResults = async (winnerId) => {
    const now = new Date().toISOString();
    const loggedBy = mySession?.user?.id || null;
    for (const player of players) {
      const result = player.id === winnerId ? 'win' : 'loss';
      // Update local profile game history
      if (player.profileId) {
        const raw = await AsyncStorage.getItem(PROFILES_KEY);
        const profiles = raw ? JSON.parse(raw) : [];
        const updated = profiles.map(p => {
          if (p.id !== player.profileId) return p;
          return { ...p, games: [{ result, deck: 'Live Game', date: now }, ...(p.games || [])] };
        });
        await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
        // Push to cloud for registered users
        if (!player.isLocal && loggedBy) {
          await supabase.from('game_results').insert({
            player_id: player.profileId,
            deck_name: 'Live Game',
            result,
            game_type: 'live',
            logged_by: loggedBy,
            created_at: now,
          });
        }
      }
      // Log the session user's own result
      if (mySession?.user && player.profileId === mySession.user.id) {
        await supabase.from('game_results').insert({
          player_id: mySession.user.id,
          deck_name: 'Live Game',
          result,
          game_type: 'live',
          logged_by: mySession.user.id,
          created_at: now,
        });
      }
    }
    setShowLogResult(false);
  };

  const getRotation = (index) => {
    if (playerCount === 2) return index === 0 ? '180deg' : '0deg';
    return index < 2 ? '180deg' : '0deg';
  };

  const getPanelStyle = (index) => {
    if (playerCount === 2) return { width: '100%', height: '50%' };
    if (playerCount === 3) {
      if (index < 2) return { width: '50%', height: '50%' };
      return { width: '100%', height: '50%' };
    }
    return { width: '50%', height: '50%' };
  };

  const textColor = isDarkMat ? '#fff' : '#111';
  const subTextColor = isDarkMat ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';
  const btnBg = isDarkMat ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const borderColor = isDarkMat ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';

  const statsForPlayer = (id) => players.find(p => p.id === id);

  const renderPlayer = (player, index) => {
    const rotation = getRotation(index);
    const panelStyle = getPanelStyle(index);
    const isDead = player.life <= 0 || player.poison >= 10;
    const hasBadge = player.poison > 0 || player.commander > 0 || player.energy > 0;

    return (
      <View
        key={player.id}
        style={[styles.panel, panelStyle, { borderColor }, isDead && { backgroundColor: 'rgba(180,0,0,0.15)' }]}
      >
        <View style={[styles.panelInner, { transform: [{ rotate: rotation }] }]}>

          {/* Name row — tap name to edit, import button to load a profile */}
          <View style={styles.nameRow}>
            <TouchableOpacity
              style={styles.nameBtn}
              onPress={() => { setEditingName(player.id); setTempName(player.name); }}
            >
              <Text style={[styles.playerName, { color: subTextColor }]} numberOfLines={1}>
                {player.name}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.importProfileBtn, { borderColor }]}
              onPress={() => setImportingForId(player.id)}
            >
              <UserPlus color={subTextColor} size={12} />
            </TouchableOpacity>
          </View>

          {/* Life total — left = minus, right = plus */}
          <View style={styles.lifeArea}>
            <TouchableOpacity
              style={styles.lifeTouchLeft}
              onPress={() => updateLife(player.id, -1)}
              onLongPress={() => updateLife(player.id, -5)}
            >
              <Text style={[styles.lifeDelta, { color: subTextColor }]}>−</Text>
            </TouchableOpacity>

            <Text style={[styles.lifeText, { color: isDead ? '#c0392b' : textColor }]}>
              {player.life}
            </Text>

            <TouchableOpacity
              style={styles.lifeTouchRight}
              onPress={() => updateLife(player.id, 1)}
              onLongPress={() => updateLife(player.id, 5)}
            >
              <Text style={[styles.lifeDelta, { color: subTextColor }]}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Stats button — bottom right */}
          <View style={styles.bottomRow}>
            <View style={styles.badgeRow}>
              {player.commander > 0 && (
                <View style={[styles.miniPill, { backgroundColor: '#c9a84c22', borderColor: '#c9a84c55' }]}>
                  <Shield color="#c9a84c" size={10} />
                  <Text style={[styles.miniPillText, { color: '#c9a84c' }]}>{player.commander}</Text>
                </View>
              )}
              {player.poison > 0 && (
                <View style={[styles.miniPill, { backgroundColor: '#9b59b622', borderColor: '#9b59b655' }]}>
                  <Skull color="#9b59b6" size={10} />
                  <Text style={[styles.miniPillText, { color: '#9b59b6' }]}>{player.poison}</Text>
                </View>
              )}
              {player.energy > 0 && (
                <View style={[styles.miniPill, { backgroundColor: '#f39c1222', borderColor: '#f39c1255' }]}>
                  <Zap color="#f39c12" size={10} />
                  <Text style={[styles.miniPillText, { color: '#f39c12' }]}>{player.energy}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[styles.statsBtn, { backgroundColor: btnBg, borderColor }]}
              onPress={() => setStatsModal(player.id)}
            >
              <Swords color={subTextColor} size={14} />
              <Text style={[styles.statsBtnText, { color: subTextColor }]}>STATS</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    );
  };

  const activeStatsPlayer = statsModal ? statsForPlayer(statsModal) : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: playmateColor.value }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: borderColor }]}>
        <View style={styles.countSelector}>
          {[2, 3, 4].map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.countBtn, playerCount === c && styles.countBtnActive]}
              onPress={() => changeCount(c)}
            >
              <Text style={[styles.countText, { color: playerCount === c ? '#000' : subTextColor }]}>{c}P</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Color picker toggle */}
        <TouchableOpacity
          style={[styles.colorPickerBtn, { backgroundColor: btnBg, borderColor }]}
          onPress={() => setShowColorPicker(v => !v)}
        >
          <View style={[styles.colorDot, { backgroundColor: playmateColor.value, borderColor }]} />
          <Text style={[styles.colorPickerLabel, { color: subTextColor }]}>{playmateColor.label}</Text>
          <ChevronDown color={subTextColor} size={12} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowLogResult(true)} style={[styles.resetBtn, { backgroundColor: btnBg, borderColor }]}>
          <Trophy color={subTextColor} size={16} />
        </TouchableOpacity>
        <TouchableOpacity onPress={resetScores} style={[styles.resetBtn, { backgroundColor: btnBg, borderColor }]}>
          <RefreshCcw color={subTextColor} size={16} />
        </TouchableOpacity>
      </View>

      {/* Color picker dropdown */}
      {showColorPicker && (
        <View style={[styles.colorDropdown, { backgroundColor: isDarkMat ? '#1a1a1a' : '#fff', borderColor }]}>
          {PLAYMAT_COLORS.map(c => (
            <TouchableOpacity
              key={c.value}
              style={[styles.colorOption, playmateColor.value === c.value && styles.colorOptionActive]}
              onPress={() => { setPlaymatColor(c); setShowColorPicker(false); }}
            >
              <View style={[styles.colorSwatch, { backgroundColor: c.value, borderColor: '#ccc' }]} />
              <Text style={[styles.colorOptionText, { color: isDarkMat ? '#eee' : '#222' }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Player grid */}
      <View style={styles.grid}>
        {players.map((p, i) => renderPlayer(p, i))}
      </View>

      {/* Stats modal */}
      <Modal visible={!!statsModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setStatsModal(null)}>
          <Pressable style={styles.statsModalContent} onPress={e => e.stopPropagation()}>
            {activeStatsPlayer && (
              <>
                <Text style={styles.statsModalTitle}>{activeStatsPlayer.name} — STATS</Text>

                {[
                  { stat: 'commander', label: 'Commander Damage', icon: <Shield color="#c9a84c" size={18} />, color: '#c9a84c' },
                  { stat: 'poison',    label: 'Poison Counters',  icon: <Skull color="#9b59b6" size={18} />, color: '#9b59b6' },
                  { stat: 'energy',    label: 'Energy',           icon: <Zap color="#f39c12" size={18} />,   color: '#f39c12' },
                ].map(({ stat, label, icon, color }) => (
                  <View key={stat} style={styles.statRow}>
                    <View style={styles.statRowLeft}>
                      {icon}
                      <Text style={styles.statRowLabel}>{label}</Text>
                    </View>
                    <View style={styles.statRowControls}>
                      <TouchableOpacity style={styles.statRowBtn} onPress={() => updateStat(activeStatsPlayer.id, stat, -1)}>
                        <Text style={styles.statRowBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={[styles.statRowValue, { color }]}>{activeStatsPlayer[stat]}</Text>
                      <TouchableOpacity style={styles.statRowBtn} onPress={() => updateStat(activeStatsPlayer.id, stat, 1)}>
                        <Text style={styles.statRowBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.editNameBtn}
                  onPress={() => {
                    setStatsModal(null);
                    setEditingName(activeStatsPlayer.id);
                    setTempName(activeStatsPlayer.name);
                  }}
                >
                  <Text style={styles.editNameBtnText}>EDIT NAME</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Name edit modal */}
      <Modal visible={editingName !== null} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setEditingName(null)}>
          <Pressable style={styles.nameModal} onPress={e => e.stopPropagation()}>
            <Text style={styles.statsModalTitle}>PLAYER NAME</Text>
            <TextInput
              style={styles.nameInput}
              value={tempName}
              onChangeText={setTempName}
              autoFocus
              maxLength={16}
              selectTextOnFocus
              placeholderTextColor="#555"
            />
            <View style={styles.nameModalBtns}>
              <TouchableOpacity style={styles.nameModalCancel} onPress={() => setEditingName(null)}>
                <Text style={styles.nameModalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nameModalSave}
                onPress={() => {
                  setPlayers(p => p.map(pl => pl.id === editingName ? { ...pl, name: tempName || pl.name } : pl));
                  setEditingName(null);
                }}
              >
                <Text style={styles.nameModalSaveText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Import Profile Modal */}
      <Modal visible={importingForId !== null} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setImportingForId(null)}>
          <Pressable style={styles.importModalContent} onPress={e => e.stopPropagation()}>
            <Text style={styles.statsModalTitle}>LOAD PLAYER PROFILE</Text>
            {savedProfiles.length === 0 && (
              <Text style={{ color: '#888', textAlign: 'center', marginTop: 12 }}>
                No profiles saved. Add players in the Stats tab first.
              </Text>
            )}
            {savedProfiles.map(profile => (
              <TouchableOpacity
                key={profile.id}
                style={styles.profilePickerRow}
                onPress={() => importProfile(importingForId, profile)}
              >
                <View style={styles.profilePickerAvatar}>
                  <Text style={styles.profilePickerInitial}>{profile.name[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profilePickerName}>{profile.name}</Text>
                  {!profile.isLocal && (
                    <Text style={{ color: '#1565c0', fontSize: 10, fontWeight: '700' }}>☁ Cloud Account</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Log Game Result Modal */}
      <Modal visible={showLogResult} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowLogResult(false)}>
          <Pressable style={styles.importModalContent} onPress={e => e.stopPropagation()}>
            <Text style={styles.statsModalTitle}>WHO WON?</Text>
            {players.map(player => (
              <TouchableOpacity
                key={player.id}
                style={styles.winnerRow}
                onPress={() => logGameResults(player.id)}
              >
                <Trophy color="#c9a84c" size={16} />
                <Text style={styles.winnerName}>{player.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowLogResult(false)} style={{ marginTop: 8, alignItems: 'center' }}>
              <Text style={{ color: '#666', fontSize: 12, fontWeight: '700' }}>Skip</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  countSelector: {
    flexDirection: 'row',
    gap: 2,
  },
  countBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  countBtnActive: {
    backgroundColor: '#c9a84c',
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  colorPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  colorPickerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
  },
  resetBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDropdown: {
    position: 'absolute',
    top: 58,
    left: 70,
    right: 60,
    zIndex: 100,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  colorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  colorOptionActive: {
    backgroundColor: 'rgba(201,168,76,0.15)',
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  colorOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },

  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  panel: {
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  panelInner: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },

  nameBtn: {
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  playerName: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  lifeArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lifeTouchLeft: {
    flex: 1,
    height: '100%',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 8,
  },
  lifeTouchRight: {
    flex: 1,
    height: '100%',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 8,
  },
  lifeDelta: {
    fontSize: 32,
    fontWeight: '200',
  },
  lifeText: {
    fontSize: 82,
    fontWeight: '900',
    includeFontPadding: false,
    lineHeight: 86,
    minWidth: 90,
    textAlign: 'center',
  },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
    flexWrap: 'wrap',
  },
  miniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  miniPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  statsBtnText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Stats modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  statsModalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  statsModalTitle: {
    color: '#888',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  statRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statRowLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  statRowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statRowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRowBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '300',
  },
  statRowValue: {
    fontSize: 24,
    fontWeight: '900',
    minWidth: 36,
    textAlign: 'center',
  },
  editNameBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    marginTop: 4,
  },
  editNameBtnText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // Name modal
  nameModal: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  nameInput: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginVertical: 16,
  },
  nameModalBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  nameModalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  nameModalCancelText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  nameModalSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#c9a84c',
    alignItems: 'center',
  },
  nameModalSaveText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  importProfileBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importModalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 4,
  },
  profilePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  profilePickerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#b30000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePickerInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  profilePickerName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  winnerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
