import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const KEYS = {
  DECKS_LIST: 'mtg_practicing_decks_list',
  CURRENT_DECK_ID: 'mtg_practicing_current_deck_id',
  GAME_STATE: 'mtg_practicing_game_state',
};

// Helper for UUID generation (RFC4122)
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const isUUID = (str) => {
  if (typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

export const StorageService = {
  generateUUID,
  // Sync local data to Supabase
  async syncToCloud() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let decks = await this.getDecks();
      let needsLocalUpdate = false;

      // Ensure all decks have UUIDs (Supabase requirement)
      decks = decks.map(deck => {
        if (!isUUID(deck.id)) {
          console.log(`Converting non-UUID deck ID: ${deck.id}`);
          needsLocalUpdate = true;
          return { ...deck, id: generateUUID() };
        }
        return deck;
      });

      if (needsLocalUpdate) {
        await AsyncStorage.setItem(KEYS.DECKS_LIST, JSON.stringify(decks));
      }

      const { data, error } = await supabase
        .from('decks')
        .upsert(decks.map(deck => ({ 
          id: deck.id,
          user_id: user.id,
          name: deck.name,
          cards: deck.cards || [],
          commander: deck.commander || null,
          maybe_cards: deck.maybeCards || [],
          removed_history: deck.removedHistory || [],
          notes: deck.notes || '',
          updated_at: new Date().toISOString()
        })), { onConflict: 'id' });
      
      if (error) {
        console.error('Supabase Upsert Error Status:', error.status);
        console.error('Supabase Error Message:', error.message);
        console.error('Supabase Error Details:', error.details);
        throw error;
      }
      
      console.log('Synced decks to cloud successfully');
    } catch (e) {
      console.error('Sync to Cloud Error Details:', JSON.stringify(e, null, 2));
      console.error('Sync to Cloud Error:', e.message || e);
    }
  },

  async syncGameStateToCloud() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const state = await this.getGameState();
      if (!state) return;

      const { error } = await supabase
        .from('game_states')
        .upsert({ 
          user_id: user.id, 
          state: state,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
      console.log('Synced game state to cloud successfully');
    } catch (e) {
      console.error('Sync Game State Error:', e.message || e);
    }
  },

  async getDecks() {
    try {
      const jsonValue = await AsyncStorage.getItem(KEYS.DECKS_LIST);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
      console.error('Get Decks Error:', e);
      return [];
    }
  },

  async saveDecks(decks) {
    try {
      await AsyncStorage.setItem(KEYS.DECKS_LIST, JSON.stringify(decks));
      await this.syncToCloud();
    } catch (e) {
      console.error('Save Decks Error:', e);
    }
  },

  async setCurrentDeckId(id) {
    try {
      await AsyncStorage.setItem(KEYS.CURRENT_DECK_ID, id);
    } catch (e) {
      console.error('Set Current Deck ID Error:', e);
    }
  },

  async getCurrentDeckId() {
    try {
      return await AsyncStorage.getItem(KEYS.CURRENT_DECK_ID);
    } catch (e) {
      console.error('Get Current Deck ID Error:', e);
      return null;
    }
  },

  async getDeck() {
    try {
      const decks = await this.getDecks();
      const currentId = await this.getCurrentDeckId();
      const deck = decks.find(d => d.id === currentId);
      return deck ? deck.cards : [];
    } catch (e) {
      return [];
    }
  },

  async saveGameState(state) {
    try {
      await AsyncStorage.setItem(KEYS.GAME_STATE, JSON.stringify(state));
      await this.syncGameStateToCloud();
    } catch (e) {
      console.error('Save Game State Error:', e);
    }
  },

  async getGameState() {
    try {
      const jsonValue = await AsyncStorage.getItem(KEYS.GAME_STATE);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.error('Get Game State Error:', e);
      return null;
    }
  },

  async clearGameState() {
    try {
      await AsyncStorage.removeItem(KEYS.GAME_STATE);
    } catch (e) {
      console.error('Clear Game State Error:', e);
    }
  }
};
