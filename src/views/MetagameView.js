import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, FlatList } from 'react-native';
import { ScryfallService } from '../services/scryfall';
import { StorageService } from '../services/storage';
import { Search, ArrowLeft, Plus, Check } from 'lucide-react-native';
import { Alert } from 'react-native';

function commanderSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export default function MetagameView({ onBack }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [commanderCard, setCommanderCard] = useState(null);
  const [topCards, setTopCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeDeckName, setActiveDeckName] = useState('');
  const [addedIds, setAddedIds] = useState(new Set());
  const debounceRef = useRef(null);

  useEffect(() => {
    const loadActiveDeck = async () => {
      const decks = await StorageService.getDecks();
      const activeId = await StorageService.getCurrentDeckId();
      const active = decks.find(d => d.id === activeId);
      if (active) setActiveDeckName(active.name);
    };
    loadActiveDeck();
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const results = await ScryfallService.searchCards(`${query} is:commander`);
        setSuggestions(results.slice(0, 8));
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  async function selectCommander(card) {
    setQuery(card.name);
    setSuggestions([]);
    setShowSuggestions(false);
    setLoading(true);
    setError(null);
    setCommanderCard(null);
    setTopCards([]);

    try {
      setCommanderCard(card);

      // Build color identity string e.g. ["R","G"] → "rg"
      const colorIdentity = (card.color_identity || []).join('').toLowerCase() || 'c';

      // Scryfall: cards legal in commander with matching color identity, sorted by EDHREC rank
      const q = `ci:${colorIdentity} f:commander -is:commander order:edhrec`;
      const res = await fetch(
        `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&page=1`
      );
      if (!res.ok) throw new Error('Failed to fetch card data from Scryfall.');
      const data = await res.json();

      const cards = (data.data || []).slice(0, 60).map(sf => ({
        name: sf.name,
        imageUrl: ScryfallService.getImageUrl(sf, 'normal'),
        type_line: sf.type_line,
      })).filter(c => c.imageUrl);

      setTopCards(cards);
    } catch (e) {
      setError(e.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  async function addToDeck(card) {
    try {
      const decks = await StorageService.getDecks();
      const activeId = await StorageService.getCurrentDeckId();
      if (!activeId) {
        Alert.alert('No Deck Selected', 'Please set an active deck in the Builder first.');
        return;
      }

      const updatedDecks = decks.map(d => {
        if (d.id === activeId) {
          // Flatten card object to match builder schema
          const cardToAdd = {
            id: card.id,
            name: card.name,
            type_line: card.type_line,
            image_uris: { normal: card.imageUrl, small: card.imageUrl },
            instanceId: Date.now() + Math.random()
          };
          return { ...d, cards: [...d.cards, cardToAdd] };
        }
        return d;
      });

      await StorageService.saveDecks(updatedDecks);
      setAddedIds(prev => new Set([...prev, card.name]));
      console.log(`Added ${card.name} to ${activeDeckName}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to add card to deck.');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft color="#666" size={22} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Commander Metagame</Text>
          <Text style={styles.titleSub}>Powered by Scryfall</Text>
        </View>
      </View>

      {/* Search with autocomplete */}
      <View style={styles.searchSection}>
        <View style={styles.inputWrapper}>
          <Search color="#999" size={18} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.input}
            placeholder="Type a commander name..."
            value={query}
            onChangeText={text => {
              setQuery(text);
              setCommanderCard(null);
              setTopCards([]);
              setError(null);
            }}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {suggestLoading && <ActivityIndicator size="small" color="#b30000" style={{ marginLeft: 8 }} />}
        </View>

        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionList}>
            {suggestions.map((card, i) => (
              <TouchableOpacity
                key={card.id}
                style={[styles.suggestionRow, i < suggestions.length - 1 && styles.suggestionBorder]}
                onPress={() => selectCommander(card)}
              >
                {ScryfallService.getImageUrl(card, 'small') ? (
                  <Image
                    source={{ uri: ScryfallService.getImageUrl(card, 'small') }}
                    style={styles.suggestionThumb}
                    resizeMode="cover"
                  />
                ) : null}
                <View style={styles.suggestionText}>
                  <Text style={styles.suggestionName}>{card.name}</Text>
                  <Text style={styles.suggestionType} numberOfLines={1}>{card.type_line}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#b30000" />
          <Text style={styles.loadingText}>Fetching metagame data...</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && commanderCard && (
        <ScrollView contentContainerStyle={styles.results}>
          <View style={styles.commanderRow}>
            {ScryfallService.getImageUrl(commanderCard, 'normal') && (
              <Image
                source={{ uri: ScryfallService.getImageUrl(commanderCard, 'normal') }}
                style={styles.commanderImage}
                resizeMode="contain"
              />
            )}
            <View style={styles.commanderInfo}>
              <Text style={styles.commanderName}>{commanderCard.name}</Text>
              <Text style={styles.commanderType}>{commanderCard.type_line}</Text>
              {commanderCard.oracle_text ? (
                <Text style={styles.commanderOracle} numberOfLines={6}>{commanderCard.oracle_text}</Text>
              ) : null}
            </View>
          </View>

          {topCards.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Top Cards for {commanderCard.name} (by EDHREC rank)</Text>
              <View style={styles.cardGrid}>
                {topCards.map((card, i) => (
                  <View key={i} style={styles.cardCell}>
                    <Image
                      source={{ uri: card.imageUrl }}
                      style={styles.cardImage}
                      resizeMode="contain"
                    />
                    <TouchableOpacity 
                      style={styles.addOverlay} 
                      onPress={() => addToDeck(card)}
                    >
                      {addedIds.has(card.name) ? <Check color="#fff" size={20} /> : <Plus color="#fff" size={20} />}
                    </TouchableOpacity>
                    <Text style={styles.cardLabel} numberOfLines={2}>{card.type_line}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {topCards.length === 0 && !loading && (
            <Text style={styles.errorText}>No card data found for this commander.</Text>
          )}
        </ScrollView>
      )}

      {!loading && !commanderCard && !error && (
        <View style={styles.centered}>
          <Text style={styles.hint}>Type any legendary creature's name to see the most played cards in that commander's decks.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#222' },
  titleSub: { fontSize: 12, color: '#aaa', marginTop: 1 },
  searchSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  input: { flex: 1, fontSize: 15, color: '#333' },
  suggestionList: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  suggestionThumb: {
    width: 34,
    height: 48,
    borderRadius: 4,
  },
  suggestionText: { flex: 1 },
  suggestionName: { fontSize: 15, fontWeight: '700', color: '#222' },
  suggestionType: { fontSize: 12, color: '#999', marginTop: 2 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: { marginTop: 12, color: '#888', fontSize: 14 },
  errorText: { color: '#b30000', fontSize: 15, textAlign: 'center' },
  hint: { color: '#aaa', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  results: { padding: 16 },
  commanderRow: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  commanderImage: { width: 110, height: 154, borderRadius: 8 },
  commanderInfo: { flex: 1 },
  commanderName: { fontSize: 18, fontWeight: '800', color: '#222', marginBottom: 4 },
  commanderType: { fontSize: 13, color: '#888', marginBottom: 8 },
  commanderOracle: { fontSize: 13, color: '#555', lineHeight: 18 },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 14,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardCell: {
    width: '30%',
    alignItems: 'center',
  },
  cardImage: { width: '100%', aspectRatio: 0.714, borderRadius: 6 },
  inclusionPct: { fontSize: 12, fontWeight: '700', color: '#b30000', marginTop: 5 },
  cardLabel: { fontSize: 11, color: '#888', textAlign: 'center', marginTop: 2 },
  addOverlay: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(179,0,0,0.8)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
});
