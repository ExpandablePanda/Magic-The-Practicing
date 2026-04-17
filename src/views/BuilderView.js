import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert, Modal, Pressable, ScrollView } from 'react-native';
import { Search, Save, Plus, Check, ArrowLeft, ChevronRight, LayoutGrid, FileText, BarChart2 } from 'lucide-react-native';
import { ScryfallService } from '../services/scryfall';
import { StorageService } from '../services/storage';

export default function BuilderView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('decks'); // 'decks', 'search', 'deck', 'import'
  const [decks, setDecks] = useState([]);
  const [currentDeckId, setCurrentDeckId] = useState(null);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isAddingCommander, setIsAddingCommander] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [alternatePrints, setAlternatePrints] = useState([]);
  const [loadingPrints, setLoadingPrints] = useState(false);
  
  // Metagame State
  const [metaQuery, setMetaQuery] = useState('');
  const [metaSuggestions, setMetaSuggestions] = useState([]);
  const [showMetaSuggestions, setShowMetaSuggestions] = useState(false);
  const [metaCommander, setMetaCommander] = useState(null);
  const [metaTopCards, setMetaTopCards] = useState([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaSuggestLoading, setMetaSuggestLoading] = useState(false);
  const [metaError, setMetaError] = useState(null);
  const [metaAddedNames, setMetaAddedNames] = useState(new Set());

  // Load decks on mount
  useEffect(() => {
    const loadAllData = async () => {
      const allDecks = await StorageService.getDecks();
      const lastId = await StorageService.getCurrentDeckId();
      setDecks(allDecks);
      if (lastId && allDecks.find(d => d.id === lastId)) {
        setCurrentDeckId(lastId);
      } else if (allDecks.length > 0) {
        setCurrentDeckId(allDecks[0].id);
      }
      setIsLoaded(true);
    };
    loadAllData();
  }, []);

  const [previewCard, setPreviewCard] = useState(null);

  // Auto-save whenever decks change, but only after initial load
  useEffect(() => {
    if (isLoaded) {
      StorageService.saveDecks(decks);
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [decks, isLoaded]);

  // Metagame Search Debounce
  useEffect(() => {
    if (!metaQuery.trim() || metaQuery.length < 2) {
      setMetaSuggestions([]);
      setShowMetaSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setMetaSuggestLoading(true);
      try {
        const results = await ScryfallService.searchCards(`${metaQuery} is:commander`);
        setMetaSuggestions(results.slice(0, 8));
        setShowMetaSuggestions(true);
      } catch {
        setMetaSuggestions([]);
      } finally {
        setMetaSuggestLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [metaQuery]);

  const currentDeck = decks.find(d => d.id === currentDeckId) || { cards: [], name: 'No Deck Selected' };

  const selectDeck = async (id) => {
    setCurrentDeckId(id);
    await StorageService.setCurrentDeckId(id);
    setViewMode('deck');
  };

  const goBackToDecks = () => {
    setViewMode('decks');
    setCurrentDeckId(null);
  };

  const createNewDeck = async () => {
    Alert.prompt('New Deck', 'Enter a name for your deck:', async (name) => {
      if (!name) return;
      const newDeck = {
        id: StorageService.generateUUID(),
        name: name,
        cards: [],
        maybeCards: [],
        removedHistory: []
      };
      const updatedDecks = [...decks, newDeck];
      setDecks(updatedDecks);
      await StorageService.saveDecks(updatedDecks);
      selectDeck(newDeck.id);
    });
  };

  const cloneDeck = async (deck) => {
    const newDeck = {
      ...deck,
      id: StorageService.generateUUID(),
      name: `${deck.name} (Copy)`,
      instanceId: undefined // Let IDs regenerate if needed
    };
    const updatedDecks = [...decks, newDeck];
    setDecks(updatedDecks);
    await StorageService.saveDecks(updatedDecks);
    Alert.alert('Deck Cloned', `Created ${newDeck.name}`);
  };

  const deleteDeck = async (id) => {
    Alert.alert('Delete Deck', 'Are you sure you want to delete this deck?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          const updatedDecks = decks.filter(d => d.id !== id);
          setDecks(updatedDecks);
          await StorageService.saveDecks(updatedDecks);
          if (currentDeckId === id) {
            setCurrentDeckId(updatedDecks[0]?.id || null);
          }
        }
      }
    ]);
  };

  const selectMetagameCommander = async (card) => {
    setMetaQuery(card.name);
    setMetaSuggestions([]);
    setShowMetaSuggestions(false);
    setMetaLoading(true);
    setMetaError(null);
    setMetaCommander(null);
    setMetaTopCards([]);

    try {
      setMetaCommander(card);
      const colorIdentity = (card.color_identity || []).join('').toLowerCase() || 'c';
      const q = `ci:${colorIdentity} f:commander -is:commander order:edhrec`;
      const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&page=1`);
      if (!res.ok) throw new Error('Failed to fetch card data from Scryfall.');
      const data = await res.json();

      const cards = (data.data || []).slice(0, 60).map(sf => ({
        ...sf,
        imageUrl: ScryfallService.getImageUrl(sf, 'normal'),
      })).filter(c => c.imageUrl);

      setMetaTopCards(cards);
    } catch (e) {
      setMetaError(e.message || 'Failed to load data.');
    } finally {
      setMetaLoading(false);
    }
  };

  const addMetagameCard = (card) => {
    if (!currentDeckId) return;
    
    // Add to the main card list
    const cardToAdd = {
      ...card,
      instanceId: Date.now() + Math.random()
    };
    
    const updatedDecks = decks.map(d => {
      if (d.id === currentDeckId) {
        return { ...d, cards: [...d.cards, cardToAdd] };
      }
      return d;
    });
    
    setDecks(updatedDecks);
    setMetaAddedNames(prev => new Set([...prev, card.name]));
    Alert.alert('Added', `${card.name} added to ${currentDeck.name}`);
  };

  // Fetch alternate printings when previewing a card
  useEffect(() => {
    const fetchPrints = async () => {
      if (previewCard && previewCard.oracle_id) {
        setLoadingPrints(true);
        const prints = await ScryfallService.getAlternatePrintings(previewCard.oracle_id);
        setAlternatePrints(prints);
        setLoadingPrints(false);
      } else {
        setAlternatePrints([]);
      }
    };
    fetchPrints();
  }, [previewCard]);

  // Basic debounce search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        setLoading(true);
        const cards = await ScryfallService.searchCards(searchQuery);
        setResults(cards);
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const addToDeck = async (card, asCommander = false) => {
    if (!currentDeckId) {
      Alert.alert('No Deck Selected', 'Please select or create a deck first.');
      setViewMode('decks');
      return;
    }

    const updatedDecks = decks.map(d => {
      if (d.id === currentDeckId) {
        if (asCommander) {
          return { ...d, commander: { ...card, instanceId: 'commander' } };
        }
        
        const isDuplicate = d.cards.some(c => c.name.toLowerCase() === card.name.toLowerCase());
        const isBasicLand = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'].includes(card.name);
        
        if (isDuplicate && !isBasicLand) {
          Alert.alert('Duplicate Card', `You already have ${card.name} in this deck. Continue?`, [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Add anyway', 
              onPress: () => {
                const updated = decks.map(deck => deck.id === currentDeckId ? { ...deck, cards: [...deck.cards, { ...card, instanceId: Date.now() + Math.random() }] } : deck);
                setDecks(updated);
              }
            }
          ]);
          return d;
        }

        return { ...d, cards: [...d.cards, { ...card, instanceId: Date.now() + Math.random() }] };
      }
      return d;
    });

    setDecks(updatedDecks);
    // setSaved(false) is now handled by the auto-save effect
    setSaved(false);
    
    if (asCommander) {
      Alert.alert('Commander Set', `${card.name} is now your Commander.`);
      setIsAddingCommander(false);
      setViewMode('deck');
    } else {
      // Small toast-like feedback could go here, but Alert might be too intrusive for regular adds
      // Let's do a simple count check
      const total = (updatedDecks.find(d => d.id === currentDeckId)?.cards.length || 0);
      console.log(`Added ${card.name}. Total: ${total}`);
    }
  };

  const swapPrinting = (newPrint) => {
    if (!previewCard) return;

    // Instance to match depends on if we are in search or deck view
    const instanceIdToMatch = previewCard.instanceId;

    const updatedDecks = decks.map(d => {
      if (d.id === currentDeckId) {
        // Update Commander if applicable
        const isCommander = d.commander && d.commander.instanceId === instanceIdToMatch;
        let updatedCommander = d.commander;
        let updatedCards = [...d.cards];

        if (isCommander) {
          updatedCommander = { ...newPrint, instanceId: 'commander' };
        } else {
          updatedCards = d.cards.map(c => 
            c.instanceId === instanceIdToMatch ? { ...newPrint, instanceId: c.instanceId } : c
          );
        }

        return { ...d, commander: updatedCommander, cards: updatedCards };
      }
      return d;
    });

    setDecks(updatedDecks);
    // Update the preview card so the zoom reflects the change immediately
    setPreviewCard({ ...newPrint, instanceId: instanceIdToMatch });
  };

  const removeFromDeck = async (instanceId, isCommander = false, isMaybe = false) => {
    const updatedDecks = decks.map(d => {
      if (d.id === currentDeckId) {
        if (isCommander) return { ...d, commander: null };
        
        const cardToRemove = isMaybe ? d.maybeCards.find(c => c.instanceId === instanceId) : d.cards.find(c => c.instanceId === instanceId);
        const updatedHistory = [cardToRemove, ...(d.removedHistory || [])].slice(0, 10);

        if (isMaybe) {
          return { 
            ...d, 
            maybeCards: d.maybeCards.filter(c => c.instanceId !== instanceId),
            removedHistory: updatedHistory
          };
        }
        return { 
          ...d, 
          cards: d.cards.filter(c => c.instanceId !== instanceId),
          removedHistory: updatedHistory
        };
      }
      return d;
    });
    setDecks(updatedDecks);
    setSaved(false);
  };

  const addToMaybeboard = (card) => {
    const updatedDecks = decks.map(d => {
      if (d.id === currentDeckId) {
        return { ...d, maybeCards: [...(d.maybeCards || []), { ...card, instanceId: Date.now() }] };
      }
      return d;
    });
    setDecks(updatedDecks);
    Alert.alert('Added to Maybeboard', `${card.name} saved as an idea.`);
  };

  const massSetLandArt = async (newLandPrint) => {
    if (!currentDeckId) return;
    const landName = newLandPrint.name;
    const updatedDecks = decks.map(d => {
      if (d.id === currentDeckId) {
        const updatedCards = d.cards.map(c => 
          c.name === landName ? { ...newLandPrint, instanceId: c.instanceId } : c
        );
        return { ...d, cards: updatedCards };
      }
      return d;
    });
    setDecks(updatedDecks);
    setPreviewCard({ ...newLandPrint });
    Alert.alert('Lands Updated', `All ${landName}s now use this art.`);
  };

  const saveAll = async () => {
    await StorageService.saveDecks(decks);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Helper to group cards by type
  const getSectionedCards = () => {
    const sections = [];
    if (currentDeck.commander) {
      sections.push({ title: 'COMMANDER', data: [currentDeck.commander], isCommander: true });
    }
    
    const groups = {
      'CREATURES': [],
      'INSTANTS/SORCERIES': [],
      'ARTIFACTS/ENCHANTMENTS': [],
      'LANDS': [],
      'OTHER': []
    };

    currentDeck.cards.forEach(card => {
      // Case-insensitive name match to ensure no duplicates
      if (currentDeck.commander && card.name.toLowerCase() === currentDeck.commander.name.toLowerCase()) return;

      const type = card.type_line.toLowerCase();
      if (type.includes('creature')) groups['CREATURES'].push(card);
      else if (type.includes('instant') || type.includes('sorcery')) groups['INSTANTS/SORCERIES'].push(card);
      else if (type.includes('artifact') || type.includes('enchantment')) groups['ARTIFACTS/ENCHANTMENTS'].push(card);
      else if (type.includes('land')) groups['LANDS'].push(card);
      else groups['OTHER'].push(card);
    });

    Object.keys(groups).forEach(title => {
      if (groups[title].length > 0) {
        sections.push({ title, data: groups[title] });
      }
    });

    return sections;
  };

  const getCollectionData = () => {
    const allCards = [];
    decks.forEach(d => {
      if (d.commander) allCards.push(d.commander);
      allCards.push(...d.cards);
    });

    const counts = {};
    const uniqueCards = [];
    allCards.forEach(c => {
      const key = c.name;
      if (!counts[key]) {
        counts[key] = 1;
        uniqueCards.push(c);
      } else {
        counts[key]++;
      }
    });

    return uniqueCards.map(c => ({ ...c, totalQuantity: counts[c.name] })).sort((a,b) => a.name.localeCompare(b.name));
  };

  const importFromManaBox = async () => {
    if (!importText.trim()) return;
    
    setIsImporting(true);
    const lines = importText.split('\n');
    const cardsToFetch = [];
    
    let isCommanderNext = false;
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.startsWith('//')) {
        if (trimmed.toLowerCase().includes('commander')) isCommanderNext = true;
        return;
      }

      const fullMatch = trimmed.match(/^(\d+)\s+(.*?)\s+\((.*?)\)\s+([^\s\*]+)/);
      const simpleMatch = trimmed.match(/^(\d+)\s+(.+)$/);

      if (fullMatch) {
        const count = parseInt(fullMatch[1]);
        const name = fullMatch[2].trim();
        const set = fullMatch[3].toLowerCase();
        const collector_number = fullMatch[4].trim();
        for (let i = 0; i < count; i++) {
          cardsToFetch.push({ name, set, collector_number, asCommander: isCommanderNext });
        }
        isCommanderNext = false;
      } else if (simpleMatch) {
        const count = parseInt(simpleMatch[1]);
        const name = simpleMatch[2].trim();
        for (let i = 0; i < count; i++) {
          cardsToFetch.push({ name, asCommander: isCommanderNext });
        }
        isCommanderNext = false;
      }
    });

    if (cardsToFetch.length === 0) {
      setIsImporting(false);
      return;
    }

    try {
      const uniqueIds = Array.from(new Set(cardsToFetch.map(c => 
        c.set ? `${c.set}|${c.collector_number}` : `name|${c.name}`
      )));

      const identifiers = uniqueIds.map(id => {
        if (id.startsWith('name|')) return { name: id.split('|')[1] };
        const [set, collector_number] = id.split('|');
        return { set, collector_number };
      });
      
      const scryfallCards = await ScryfallService.getCardsCollection(identifiers);
      const cardMap = new Map();
      scryfallCards.forEach(c => {
        cardMap.set(c.name.toLowerCase(), c);
        if (c.set && c.collector_number) {
          cardMap.set(`${c.set.toLowerCase()}|${c.collector_number.toLowerCase()}`, c);
        }
      });
      
      let importedCommander = null;
      const newItems = [];
      cardsToFetch.forEach(item => {
        let found = item.set && item.collector_number ? cardMap.get(`${item.set}|${item.collector_number}`) : cardMap.get(item.name.toLowerCase());

        if (found) {
          if (item.asCommander && !importedCommander) {
            importedCommander = { ...found, instanceId: 'commander' };
          } else {
            newItems.push({ ...found, instanceId: Math.random() + Date.now() });
          }
        }
      });
      
      const updatedDecks = decks.map(d => {
        if (d.id === currentDeckId) {
          return { 
            ...d, 
            commander: importedCommander || d.commander,
            cards: [...d.cards, ...newItems] 
          };
        }
        return d;
      });
      setDecks(updatedDecks);
      setImportText('');
      setViewMode('deck');
      Alert.alert('Import Complete', `Added ${newItems.length} cards${importedCommander ? ' and set Commander' : ''}.`);
    } catch (error) {
      Alert.alert('Import Error', 'Failed to fetch cards.');
    } finally {
      setIsImporting(false);
    }
  };

  const renderCardItem = ({ item, isCommander = false }) => (
    <View style={[styles.cardItem, isCommander && styles.commanderItem]}>
      <TouchableOpacity onPress={() => setPreviewCard(item)} onLongPress={() => setPreviewCard(item)}>
        <Image source={{ uri: ScryfallService.getImageUrl(item, 'small') }} style={styles.cardThumb} resizeMode="contain" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.cardInfo} 
        onPress={() => setPreviewCard(item)} 
        onLongPress={() => setPreviewCard(item)}
      >
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardType} numberOfLines={1}>{item.type_line}</Text>
      </TouchableOpacity>
      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={viewMode === 'search' ? styles.addButton : styles.removeButton} 
          onPress={() => viewMode === 'search' ? addToDeck(item, isAddingCommander) : removeFromDeck(item.instanceId, isCommander)}
        >
          {viewMode === 'search' ? <Plus color="#fff" size={20} /> : <Text style={styles.removeIcon}>×</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDeckItem = ({ item }) => (
    <TouchableOpacity style={[styles.deckItem, currentDeckId === item.id && styles.activeDeckItem]} onPress={() => selectDeck(item.id)}>
      <View style={styles.deckItemContent}>
        {item.commander ? (
          <Image 
            source={{ uri: ScryfallService.getImageUrl(item.commander, 'small') }} 
            style={styles.listDeckThumb} 
            resizeMode="contain" 
          />
        ) : (
          <View style={styles.listDeckThumbPlaceholder}>
            <LayoutGrid color="#ccc" size={24} />
          </View>
        )}
        <View style={styles.deckInfo}>
          <Text style={styles.deckName}>{item.name}</Text>
          <Text style={styles.deckCount}>{(item.cards?.length || 0) + (item.commander ? 1 : 0)} cards</Text>
        </View>
      </View>
      <View style={styles.miniDeleteContainer}>
        <TouchableOpacity onPress={() => cloneDeck(item)} style={[styles.miniDeleteBtn, { marginRight: 5 }]}>
          <Text style={[styles.deleteLabel, { color: '#666' }]}>Clone</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteDeck(item.id)} style={styles.miniDeleteBtn}>
          <Text style={styles.deleteLabel}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const getDataForCurrentView = () => {
    if (viewMode === 'deck') return getSectionedCards();
    if (viewMode === 'maybe') return [{ title: 'MAYBEBOARD', data: currentDeck.maybeCards || [] }];
    if (viewMode === 'history') return [{ title: 'RECENTLY REMOVED', data: currentDeck.removedHistory || [] }];
    if (viewMode === 'collection') return [{ title: 'TOTAL COLLECTION', data: getCollectionData() }];
    return [];
  };

  return (
    <View style={styles.container}>
      {/* Navigation Header Group */}
      <View style={styles.navHeaderGroup}>
        {/* Premium Header - Conditional Spacing */}
        <View style={[
          styles.premiumHeader, 
          viewMode === 'decks' ? styles.indexHeader : styles.builderHeader
        ]}>
          {viewMode !== 'decks' && (
            <TouchableOpacity onPress={goBackToDecks} style={styles.backButton}>
               <ArrowLeft color="#b30000" size={24} />
            </TouchableOpacity>
          )}

          {viewMode !== 'decks' && (
            currentDeck.commander ? (
              <Image 
                source={{ uri: ScryfallService.getImageUrl(currentDeck.commander, 'small') }} 
                style={[styles.deckThumb, { marginRight: 15 }]} 
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.deckThumbPlaceholder, { marginRight: 15 }]}>
                <LayoutGrid color="#ccc" size={18} />
              </View>
            )
          )}

          <View style={styles.headerTitleGroup}>
            <Text style={styles.brandSubtitle}>MAGIC: THE PRACTICING {currentDeckId ? `- ${currentDeck.cards.length + (currentDeck.commander ? 1 : 0)} CARDS` : ''}</Text>
            <Text style={styles.mainTitle} numberOfLines={1}>
              {viewMode === 'decks' ? 'MY DECKS' : (currentDeck.name || 'DECK BUILDER')}
            </Text>
          </View>
          {currentDeckId && (
            <TouchableOpacity 
              style={[styles.compactSaveBtn, saved && styles.savedBtn]} 
              onPress={saveAll}
            >
              {saved ? <Check color="#fff" size={18} /> : <Save color="#fff" size={18} />}
            </TouchableOpacity>
          )}
        </View>

        {viewMode !== 'decks' && (
          <View style={styles.chipBarContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBar} contentContainerStyle={styles.chipContent}>
              <TouchableOpacity 
                style={[styles.chip, viewMode === 'deck' && styles.activeChip]} 
                onPress={() => setViewMode('deck')}
              >
                <Text style={[styles.chipText, viewMode === 'deck' && styles.activeChipText]}>Cards</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.chip, viewMode === 'search' && styles.activeChip]} 
                onPress={() => setViewMode('search')}
              >
                <Text style={[styles.chipText, viewMode === 'search' && styles.activeChipText]}>Search</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.chip, viewMode === 'import' && styles.activeChip]} 
                onPress={() => setViewMode('import')}
              >
                <Text style={[styles.chipText, viewMode === 'import' && styles.activeChipText]}>Import</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.chip, viewMode === 'maybe' && styles.activeChip]} 
                onPress={() => setViewMode('maybe')}
              >
                <Text style={[styles.chipText, viewMode === 'maybe' && styles.activeChipText]}>Maybe</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.chip, viewMode === 'history' && styles.activeChip]} 
                onPress={() => setViewMode('history')}
              >
                <Text style={[styles.chipText, viewMode === 'history' && styles.activeChipText]}>History</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.chip, viewMode === 'collection' && styles.activeChip]} 
                onPress={() => setViewMode('collection')}
              >
                <Text style={[styles.chipText, viewMode === 'collection' && styles.activeChipText]}>Collection</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.chip, viewMode === 'metagame' && styles.activeChip]} 
                onPress={() => setViewMode('metagame')}
              >
                <Text style={[styles.chipText, viewMode === 'metagame' && styles.activeChipText]}>Metagame</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </View>

      {(viewMode === 'deck' || viewMode === 'maybe' || viewMode === 'history' || viewMode === 'collection') && (
        <FlatList
          data={getDataForCurrentView()}
          keyExtractor={(section, index) => section.title + index}
          renderItem={({ item: section }) => (
            <View style={styles.typeSection}>
              <Text style={styles.sectionTitle}>{section.title} ({section.data.length})</Text>
              {section.data.map((card, cardIndex) => (
                <View key={card.instanceId || cardIndex}>
                   <View style={styles.cardItemRow}>
                    {renderCardItem({ 
                      item: card, 
                      isCommander: section.isCommander 
                    })}
                    {viewMode === 'collection' && (
                      <View style={styles.collectionBadge}>
                        <Text style={styles.collectionBadgeText}>{card.totalQuantity}x</Text>
                      </View>
                    )}
                    {viewMode === 'history' && (
                      <TouchableOpacity style={styles.restoreBtn} onPress={() => addToDeck(card)}>
                        <Text style={styles.restoreText}>Restore</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
          ListHeaderComponent={(
            <View>
              {currentDeck.notes && (
                <View style={styles.notesInsightContainer}>
                  <View style={styles.notesInsightHeader}>
                    <FileText color="#ff8f00" size={14} />
                    <Text style={styles.notesInsightTitle}>PLAYTEST INSIGHTS</Text>
                  </View>
                  <Text style={styles.notesInsightText}>{currentDeck.notes}</Text>
                </View>
              )}
              {!currentDeck.commander && (
                <TouchableOpacity 
                  style={styles.bigAddCommanderBtn} 
                  onPress={() => {
                    setIsAddingCommander(true);
                    setViewMode('search');
                  }}
                >
                  <Plus color="#856404" size={24} />
                  <Text style={styles.bigAddCommanderText}>Add Commander</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No cards in deck yet.</Text>}
          contentContainerStyle={styles.listContent}
          style={styles.flex1}
        />
      )}

      {viewMode === 'decks' && (
        <View style={styles.deckListContainer}>
          <FlatList
            data={decks}
            keyExtractor={item => item.id}
            renderItem={renderDeckItem}
            ListEmptyComponent={<Text style={styles.emptyText}>No decks found. Create one!</Text>}
            contentContainerStyle={styles.listContent}
          />
          <TouchableOpacity style={styles.createNewButton} onPress={createNewDeck}>
            <Text style={styles.importButtonText}>+ Create New Deck</Text>
          </TouchableOpacity>
        </View>
      )}

      {viewMode === 'search' && (
        <>
          <View style={styles.searchBar}>
            <Search color="#999" size={20} />
            <TextInput style={styles.input} placeholder="Search cards..." value={searchQuery} onChangeText={setSearchQuery} autoFocus />
            {loading && <ActivityIndicator size="small" color="#b30000" />}
          </View>
          <FlatList
            data={results}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={renderCardItem}
            ListEmptyComponent={!loading && <Text style={styles.emptyText}>Search for cards...</Text>}
            contentContainerStyle={styles.listContent}
            style={styles.flex1}
          />
        </>
      )}

      {viewMode === 'import' && (
        <View style={styles.importContainer}>
          <TextInput
            style={styles.importInput}
            placeholder="Paste ManaBox export text..."
            multiline
            value={importText}
            onChangeText={setImportText}
          />
          <TouchableOpacity style={styles.importButton} onPress={importFromManaBox} disabled={isImporting}>
            {isImporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.importButtonText}>Import Deck</Text>}
          </TouchableOpacity>
        </View>
      )}

      {viewMode === 'metagame' && (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={metaStyles.searchSection}>
            <View style={metaStyles.inputWrapper}>
              <Search color="#999" size={18} style={{ marginRight: 10 }} />
              <TextInput
                style={metaStyles.input}
                placeholder="Trending for which Commander?"
                value={metaQuery}
                onChangeText={text => {
                  setMetaQuery(text);
                  setMetaCommander(null);
                  setMetaTopCards([]);
                  setMetaError(null);
                }}
                autoCorrect={false}
                autoCapitalize="words"
              />
              {metaSuggestLoading && <ActivityIndicator size="small" color="#b30000" style={{ marginLeft: 8 }} />}
            </View>

            {showMetaSuggestions && metaSuggestions.length > 0 && (
              <View style={metaStyles.suggestionList}>
                {metaSuggestions.map((card, i) => (
                  <TouchableOpacity
                    key={card.id}
                    style={[metaStyles.suggestionRow, i < metaSuggestions.length - 1 && metaStyles.suggestionBorder]}
                    onPress={() => selectMetagameCommander(card)}
                  >
                    {ScryfallService.getImageUrl(card, 'small') ? (
                      <Image
                        source={{ uri: ScryfallService.getImageUrl(card, 'small') }}
                        style={metaStyles.suggestionThumb}
                        resizeMode="cover"
                      />
                    ) : null}
                    <View style={metaStyles.suggestionText}>
                      <Text style={metaStyles.suggestionName}>{card.name}</Text>
                      <Text style={metaStyles.suggestionType} numberOfLines={1}>{card.type_line}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {metaLoading && (
            <View style={metaStyles.centered}>
              <ActivityIndicator size="large" color="#b30000" />
              <Text style={metaStyles.loadingText}>Fetching trending cards...</Text>
            </View>
          )}

          {metaError && !metaLoading && (
            <View style={metaStyles.centered}>
              <Text style={metaStyles.errorText}>{metaError}</Text>
            </View>
          )}

          {!metaLoading && metaCommander && (
            <View style={{ padding: 16 }}>
              <View style={metaStyles.commanderRow}>
                {ScryfallService.getImageUrl(metaCommander, 'normal') && (
                  <Image
                    source={{ uri: ScryfallService.getImageUrl(metaCommander, 'normal') }}
                    style={metaStyles.commanderImage}
                    resizeMode="contain"
                  />
                )}
                <View style={metaStyles.commanderInfo}>
                  <Text style={metaStyles.commanderName}>{metaCommander.name}</Text>
                  <Text style={metaStyles.commanderType}>{metaCommander.type_line}</Text>
                  <TouchableOpacity 
                    style={styles.commanderAddBtn}
                    onPress={() => addToDeck(metaCommander, true)}
                  >
                    <Text style={styles.commanderAddText}>Add as Commander</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={metaStyles.sectionLabel}>Trending Cards for {metaCommander.name}</Text>
              <View style={metaStyles.cardGrid}>
                {metaTopCards.map((card, i) => (
                  <View key={i} style={metaStyles.cardCell}>
                    <TouchableOpacity onPress={() => setPreviewCard(card)}>
                      <Image
                        source={{ uri: card.imageUrl }}
                        style={metaStyles.cardImage}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={metaStyles.addOverlay} 
                      onPress={() => addMetagameCard(card)}
                    >
                      {metaAddedNames.has(card.name) ? <Check color="#fff" size={20} /> : <Plus color="#fff" size={20} />}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!metaLoading && !metaCommander && !metaError && (
            <View style={metaStyles.centered}>
              <BarChart2 color="#ccc" size={48} style={{ marginBottom: 16 }} />
              <Text style={metaStyles.hint}>Type your commander's name to see which cards other players are using most!</Text>
              {currentDeck.commander && (
                 <TouchableOpacity 
                  style={[styles.importButton, { marginTop: 20, width: '100%' }]}
                  onPress={() => selectMetagameCommander(currentDeck.commander)}
                >
                  <Text style={styles.importButtonText}>Search for {currentDeck.commander.name}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Card Preview Modal */}
      <Modal visible={!!previewCard} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => {
          setPreviewCard(null);
          setAlternatePrints([]);
        }}>
          <View style={styles.previewContainer}>
            {previewCard && (
              <>
                <Image 
                  source={{ uri: ScryfallService.getImageUrl(previewCard, 'normal') }} 
                  style={styles.previewImage} 
                  resizeMode="contain" 
                />
                
                <View style={styles.printSelectorContainer}>
                  <Text style={styles.printSelectorTitle}>ALTERNATE PRINTINGS</Text>
                  {loadingPrints ? (
                    <ActivityIndicator color="#b30000" style={{ marginTop: 10 }} />
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.printsList}>
                      {alternatePrints.map((print, idx) => (
                        <TouchableOpacity 
                          key={`${print.id}-${idx}`} 
                          style={[
                            styles.printThumbContainer, 
                            previewCard.id === print.id && styles.activePrintThumb
                          ]}
                          onPress={() => swapPrinting(print)}
                        >
                          <Image 
                            source={{ uri: ScryfallService.getImageUrl(print, 'small') }} 
                            style={styles.printThumb} 
                          />
                          <Text style={styles.printSetName} numberOfLines={1}>{print.set.toUpperCase()}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </>
            )}
            <View style={styles.previewActionsContainer}>
              <TouchableOpacity style={styles.previewActionBtn} onPress={() => addToMaybeboard(previewCard)}>
                <Text style={styles.previewActionText}>Move to Maybeboard</Text>
              </TouchableOpacity>
              
              {previewCard?.type_line?.includes('Basic Land') && (
                <TouchableOpacity style={[styles.previewActionBtn, {backgroundColor: '#b30000'}]} onPress={() => massSetLandArt(previewCard)}>
                  <Text style={[styles.previewActionText, {color: '#fff'}]}>Set Art for All {previewCard.name}s</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.dismissText}>Tap anywhere to close</Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  navHeaderGroup: {
    backgroundColor: '#fff',
    paddingBottom: 0,
    marginBottom: 0,
    flex: 0,
  },
  chipBarContainer: {
    height: 48,
    flex: 0,
    marginTop: 0,
    marginBottom: 10,
  },
  premiumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  indexHeader: {
    marginTop: 20,
    marginBottom: 20,
  },
  builderHeader: {
    marginTop: 0,
    marginBottom: 10,
    paddingTop: 0,
  },
  headerTitleGroup: {
    flex: 1,
  },
  deckThumb: {
    width: 32,
    height: 44,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
  },
  deckThumbPlaceholder: {
    width: 32,
    height: 44,
    borderRadius: 4,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  listDeckThumb: {
    width: 50,
    height: 70,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    marginRight: 15,
  },
  listDeckThumbPlaceholder: {
    width: 50,
    height: 70,
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
    marginRight: 15,
  },
  backToTypesText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#b30000',
    textDecorationLine: 'underline',
  },
  notesInsightContainer: {
    backgroundColor: '#fff8e1',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ff8f00',
  },
  notesInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  notesInsightTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ff8f00',
    letterSpacing: 1,
  },
  notesInsightText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b30000',
    letterSpacing: 1.5,
    marginBottom: 0,
    paddingTop: 0,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  compactSaveBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedBtn: {
    backgroundColor: '#28a745',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '700',
  },
  activeTabText: {
    color: '#b30000',
  },
  chipBar: {
    height: 44,
    marginTop: 0,
    marginBottom: 0,
  },
  chipContent: {
    paddingHorizontal: 0,
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#eee',
  },
  activeChip: {
    backgroundColor: '#b30000',
    borderColor: '#b30000',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  activeChipText: {
    color: '#fff',
  },
  backButton: {
    marginRight: 15,
  },
  deckListContainer: {
    flex: 1,
  },
  deckItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activeDeckItem: {
    borderColor: '#b30000',
    borderWidth: 1,
  },
  deckItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deckInfo: {
    flex: 1,
  },
  deckName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  deckCount: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },
  miniDeleteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniDeleteBtn: {
    padding: 8,
  },
  deleteLabel: {
    color: '#b30000',
    fontSize: 12,
    fontWeight: '600',
  },
  createNewButton: {
    backgroundColor: '#b30000',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  flex1: {
    flex: 1,
  },
  typeSection: {
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#bbb',
    letterSpacing: 1.2,
    marginTop: 10,
    marginBottom: 9,
  },
  commanderItem: {
    backgroundColor: '#fffcf0',
    borderColor: '#f0d78c',
    borderWidth: 1,
    borderBottomWidth: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commanderAddBtn: {
    backgroundColor: '#f0d78c',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  commanderAddText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#856404',
  },
  bigAddCommanderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffcf0',
    borderColor: '#f0d78c',
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 24,
    borderRadius: 16,
    marginTop: 0,
    marginBottom: 5,
    gap: 12,
  },
  bigAddCommanderText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#856404',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    borderRadius: 10,
    height: 50,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  importContainer: {
    gap: 12,
    marginBottom: 20,
  },
  importInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
    height: 150,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  importButton: {
    backgroundColor: '#b30000',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    marginBottom: 4,
  },
  cardThumb: {
    width: 40,
    height: 56,
    borderRadius: 4,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  cardType: {
    fontSize: 11,
    color: '#777',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#b30000',
    padding: 8,
    borderRadius: 20,
  },
  removeButton: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: {
    fontSize: 20,
    color: '#999',
    fontWeight: 'bold',
    marginTop: -2,
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
  },
  listContent: {
    paddingBottom: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    width: '90%',
    height: '85%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '65%',
  },
  printSelectorContainer: {
    width: '100%',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 15,
  },
  printSelectorTitle: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
    opacity: 0.6,
  },
  printsList: {
    gap: 12,
    paddingRight: 20,
  },
  printThumbContainer: {
    alignItems: 'center',
    width: 60,
  },
  activePrintThumb: {
    transform: [{ scale: 1.1 }],
    borderColor: '#b30000',
    borderWidth: 2,
    borderRadius: 4,
  },
  printThumb: {
    width: 60,
    height: 84,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  printSetName: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 4,
    opacity: 0.8,
  },
  dismissText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 20,
    opacity: 0.5,
  },
  cardItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  collectionBadge: {
    backgroundColor: '#b30000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  collectionBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  restoreBtn: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  restoreText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  previewActionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
    width: '100%',
    justifyContent: 'center',
  },
  previewActionBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
  },
  previewActionText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#333',
  },
});

const metaStyles = StyleSheet.create({
  searchSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 10,
    marginTop: 10,
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
    minHeight: 300,
  },
  loadingText: { marginTop: 12, color: '#888', fontSize: 14 },
  errorText: { color: '#b30000', fontSize: 15, textAlign: 'center' },
  hint: { color: '#aaa', fontSize: 15, textAlign: 'center', lineHeight: 22 },
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
