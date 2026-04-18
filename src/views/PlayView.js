import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Image, FlatList, Modal, Pressable, Alert, Dimensions, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { Heart, Plus, Minus, User, RefreshCcw, LayoutGrid, ArrowLeft, ChevronLeft, ChevronRight, Layers, Circle, Trash2, XCircle, Sword, RotateCcw, Zap, RotateCw, UserPlus, FileText, CheckCircle } from 'lucide-react-native';
import { StorageService } from '../services/storage';
import { ScryfallService, CARD_BACK_URL } from '../services/scryfall';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COMMON_TOKENS = [
  { id: 'treasure', name: 'Treasure', p: null, t: null, meta: 'Artifact \u2022 Ramp' },
  { id: 'clue', name: 'Clue', p: null, t: null, meta: 'Artifact \u2022 Draw' },
  { id: 'food', name: 'Food', p: null, t: null, meta: 'Artifact \u2022 Life' },
  { id: 'blood', name: 'Blood', p: null, t: null, meta: 'Artifact \u2022 Draw' },
  { id: 'map', name: 'Map', p: null, t: null, meta: 'Artifact \u2022 Explore' },
  { id: 'soldier', name: 'Soldier', p: 1, t: 1, meta: 'White Creature' },
  { id: 'spirit', name: 'Spirit', p: 1, t: 1, meta: 'White Flying' },
  { id: 'human', name: 'Human', p: 1, t: 1, meta: 'White Creature' },
  { id: 'knight', name: 'Knight', p: 2, t: 2, meta: 'White Vigilance' },
  { id: 'angel', name: 'Angel', p: 4, t: 4, meta: 'White Flying' },
  { id: 'faerie', name: 'Faerie', p: 1, t: 1, meta: 'Blue Flying' },
  { id: 'drake', name: 'Drake', p: 2, t: 2, meta: 'Blue Flying' },
  { id: 'zombie', name: 'Zombie', p: 2, t: 2, meta: 'Black Creature' },
  { id: 'vampire', name: 'Vampire', p: 1, t: 1, meta: 'Black Lifelink' },
  { id: 'goblin', name: 'Goblin', p: 1, t: 1, meta: 'Red Creature' },
  { id: 'elemental', p11: '1/1 Elemental', name: 'Elemental', p: 1, t: 1, meta: 'Red Creature' },
  { id: 'saproling', name: 'Saproling', p: 1, t: 1, meta: 'Green Creature' },
  { id: 'beast', name: 'Beast', p: 3, t: 3, meta: 'Green Creature' },
  { id: 'wolf', name: 'Wolf', p: 2, t: 2, meta: 'Green Creature' },
  { id: 'elephant', name: 'Elephant', p: 3, t: 3, meta: 'Green Creature' },
  { id: 'dragon', name: 'Dragon', p: 4, t: 4, meta: 'Red Flying' },
  { id: 'wurm', name: 'Wurm', p: 5, t: 5, meta: 'Green Trample' },
  { id: 'myr', name: 'Myr', p: 1, t: 1, meta: 'Artifact Creature' },
  { id: 'thopter', name: 'Thopter', p: 1, t: 1, meta: 'Artifact Flying' },
  { id: 'servo', name: 'Servo', p: 1, t: 1, meta: 'Artifact Creature' },
  { id: 'golem', name: 'Golem', p: 3, t: 3, meta: 'Artifact Creature' },
];

const BattlefieldCard = ({ card, onUpdatePT, onDelete }) => {
  return (
    <View style={[styles.cardContainer, card.isCommander && styles.commanderCard]}>
      <TouchableOpacity onPress={() => onDelete(card.instanceId)}>
        <Image 
          source={{ uri: ScryfallService.getImageUrl(card, 'normal') }} 
          style={styles.cardImage}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <View style={styles.ptOverlay}>
        <TouchableOpacity style={styles.ptButton} onPress={() => onUpdatePT(card.instanceId, 'p', -1)}>
          <Minus color="#fff" size={14} />
        </TouchableOpacity>
        <Text style={styles.ptText}>{card.currentP}/{card.currentT}</Text>
        <TouchableOpacity style={styles.ptButton} onPress={() => onUpdatePT(card.instanceId, 'p', 1)}>
          <Plus color="#fff" size={14} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.deleteCardButton} onPress={() => onDelete(card.instanceId, !!card.isCommander)}>
        <Text style={styles.deleteText}>×</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function PlayView({ onSetFooterVisible = () => {} }) {
  const [myLife, setMyLife] = useState(20);
  const [oppLife, setOppLife] = useState(20);
  const [poisonCounters, setPoisonCounters] = useState(0);
  const [turnNumber, setTurnNumber] = useState(1);
  
  // Game Zones
  const [library, setLibrary] = useState([]);
  const [hand, setHand] = useState([]);
  const [battlefield, setBattlefield] = useState([]);
  const [graveyard, setGraveyard] = useState([]);
  const [exile, setExile] = useState([]);
  const [history, setHistory] = useState([]);
  
  // Game Logic State
  const [landsPlayedThisTurn, setLandsPlayedThisTurn] = useState(0);
  const [commanderTax, setCommanderTax] = useState(0);
  const [gameAlert, setGameAlert] = useState(null); // { message, onConfirm, confirmLabel }
  
  // Interaction State
  const [viewMode, setViewMode] = useState('index'); 
  const [allDecks, setAllDecks] = useState([]);
  const [fullDeckData, setFullDeckData] = useState(null);
  const [previewCard, setPreviewCard] = useState(null);
  const [galleryCards, setGalleryCards] = useState([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [shuffleToast, setShuffleToast] = useState(false);
  const [hasPlayedCardThisTurn, setHasPlayedCardThisTurn] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedHandId, setSelectedHandId] = useState(null);
  const [activeActionId, setActiveActionId] = useState(null);
  
  // Counter System State
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenQuantity, setTokenQuantity] = useState(1);
  const [tokenArtOptions, setTokenArtOptions] = useState([]);
  const [tokenTypeToSpawn, setTokenTypeToSpawn] = useState(null); // { name, p, t }
  const [loadingTokenArt, setLoadingTokenArt] = useState(false);
  const [isTargeting, setIsTargeting] = useState(false);
  const [activeCounter, setActiveCounter] = useState({ type: '+1/+1', count: 1 });
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [currentNotes, setCurrentNotes] = useState('');
  const [showLibraryMenu, setShowLibraryMenu] = useState(false);
  const [showLibrarySearch, setShowLibrarySearch] = useState(false);
  const [isCommanderSelected, setIsCommanderSelected] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(null); // 'graveyard' or 'exile'
  const [activeQuantityAction, setActiveQuantityAction] = useState(null); // { action, card, max }
  const [modalQuantity, setModalQuantity] = useState(1);
  const [showMulliganModal, setShowMulliganModal] = useState(false);
  const [mulliganCount, setMulliganCount] = useState(0);
  const [bottomingState, setBottomingState] = useState(null); // { required: n, selected: Set of instanceIds, hand: [], library: [] }
  const [bottomingZoom, setBottomingZoom] = useState(null);
  const [showEmblemModal, setShowEmblemModal] = useState(false);
  const [emblems, setEmblems] = useState([]); // { name, icon }
  
  // New Token Flow State
  const [tokenStep, setTokenStep] = useState(1); // 1: Quick/Choose, 2: Name, 3: P/T, 4: Abilities, 5: Art
  const [pendingToken, setPendingToken] = useState({ name: '', p: null, t: null, abilities: [] });
  const [savedTokens, setSavedTokens] = useState([]); // { name, p, t, abilities, isHearted, url }
  const [tokenSearch, setTokenSearch] = useState('');

  const galleryRef = useRef(null);

  useEffect(() => {
    loadDecks();
    onSetFooterVisible(viewMode === 'index');
    return () => onSetFooterVisible(true);
  }, []);

  useEffect(() => {
    onSetFooterVisible(viewMode === 'index');
  }, [viewMode]);

  const loadDecks = async () => {
    const data = await StorageService.getDecks();
    setAllDecks(data);
  };

  const shuffleArray = (array) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  const prepareCard = (card) => ({
    ...card,
    instanceId: Math.random().toString(36).slice(2, 11), // Stable ID
    baseP: parseInt(card.power) || 0,
    baseT: parseInt(card.toughness) || 0,
    counters: [], // Refactored to array: { name, value, isTemp }
    isTapped: false,
    quantity: 1
  });

  const selectDeck = (deckObj) => {
    const isEDH = !!deckObj.commander;
    setFullDeckData(deckObj);
    
    // Prepare the library
    let deckCards = deckObj.cards.map(c => prepareCard(c));
    let shuffled = shuffleArray(deckCards);
    
    // Starting hand
    const startHand = shuffled.slice(0, 7);
    const startLibrary = shuffled.slice(7);

    setLibrary(startLibrary);
    setHand(startHand);
    setBattlefield([]);
    setGraveyard([]);
    setExile([]);
    setLandsPlayedThisTurn(0);
    setCommanderTax(0);
    setCurrentNotes(deckObj.notes || '');
    
    setMyLife(isEDH ? 40 : 20);
    setOppLife(isEDH ? 40 : 20);
    setPoisonCounters(0);
    setViewMode('game');
  };

  const drawCard = () => {
    if (library.length === 0) return;
    const [card, ...rest] = library;
    setLibrary(rest);
    setHand([card, ...hand]);
  };

  const mulligan = (type) => {
    pushHistory();
    const isMultiplayer = type === 'multiplayer';
    const isFree = isMultiplayer && mulliganCount === 0;

    // Put hand back and reshuffle
    const fullDeck = [...hand, ...library].map(c => prepareCard(c));
    const shuffled = shuffleArray(fullDeck);
    const newHand = shuffled.slice(0, 7);
    const newLibrary = shuffled.slice(7);

    setShowMulliganModal(false);

    if (isFree) {
      setHand(newHand);
      setLibrary(newLibrary);
      setMulliganCount(1);
    } else {
      const nextCount = mulliganCount + 1;
      setMulliganCount(nextCount);

      if (type === 'london') {
        // Just redraw — bottoming happens when player chooses to keep
        setHand(newHand);
        setLibrary(newLibrary);
      } else {
        // Multiplayer: auto-bottom the last N cards (no choice needed)
        const reducedHand = newHand.slice(0, 7 - nextCount);
        const extraLib = newHand.slice(7 - nextCount);
        setHand(reducedHand);
        setLibrary([...newLibrary, ...extraLib]);
      }
    }
  };

  const confirmBottoming = () => {
    if (!bottomingState) return;
    const { selected, hand: currentHand, library: currentLibrary } = bottomingState;
    const kept = currentHand.filter(c => !selected.has(c.instanceId));
    const bottomed = currentHand.filter(c => selected.has(c.instanceId));
    setHand(kept);
    setLibrary([...currentLibrary, ...bottomed]);
    setBottomingState(null);
    setMulliganCount(0);
  };

  const toggleBottomCard = (instanceId) => {
    setBottomingState(prev => {
      const next = new Set(prev.selected);
      if (next.has(instanceId)) next.delete(instanceId);
      else next.add(instanceId);
      return { ...prev, selected: next };
    });
  };

  const nextTurn = () => {
    const MAX_HAND = 7;
    if (hand.length > MAX_HAND) {
      Alert.alert(
        'Too Many Cards',
        `You have ${hand.length} cards in hand. Discard down to ${MAX_HAND} before ending your turn.\n\nIf a card lets you hold more than 7, long-press it in your hand to discard others first.`,
        [{ text: 'OK' }]
      );
      return;
    }
    pushHistory();
    setTurnNumber(prev => prev + 1);
    
    // 1. Untap all cards, Clear sickness, and Remove temporary counters
    setBattlefield(prev => {
      const updated = prev.map(c => ({
        ...c,
        isTapped: false,
        hasSickness: false,
        counters: (c.counters || []).filter(cnt => !cnt.isTemp)
      }));
      return groupBattlefield(updated);
    });
    
    setLandsPlayedThisTurn(0);
    setHasPlayedCardThisTurn(false);
    drawCard();
    Alert.alert('Turn Reset', `Starting Turn ${turnNumber + 1}. All cards untapped & temporary effects removed.`);
  };

  const shuffleLibrary = () => {
    setLibrary(prev => shuffleArray([...prev]));
    setShuffleToast(true);
    setTimeout(() => setShuffleToast(false), 2000);
  };

  const playCard = (instanceId) => {
    const card = hand.find(c => c.instanceId === instanceId);
    if (!card) return;

    const isLand = card.type_line?.includes('Land');

    if (isLand && landsPlayedThisTurn >= 1) {
      setGameAlert({
        message: 'You\'ve already played a land this turn. Do you have a card allowing an additional land?',
        confirmLabel: 'Yes, Play It',
        onConfirm: () => finalizePlayCard(card),
      });
      return;
    }

    finalizePlayCard(card);
  };

  const parseManaCost = (costString) => {
    if (!costString) return { generic: 0 };
    const matches = costString.match(/\{([^}]+)\}/g);
    const cost = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, generic: 0 };
    if (!matches) return cost;

    matches.forEach(m => {
      const val = m.replace(/[{}]/g, '');
      if (['W', 'U', 'B', 'R', 'G', 'C'].includes(val)) {
        cost[val]++;
      } else if (!isNaN(val)) {
        cost.generic += parseInt(val);
      } else if (val === 'X') {
        // X is treated as 0 for initial generic check
      } else {
        // Fallback for hybrid/other: treat as generic
        cost.generic += 1;
      }
    });
    return cost;
  };

  const getAvailableMana = () => {
    const counts = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    const untappedSources = battlefield.filter(c => 
      (c.type_line?.includes('Land') || c.type_line?.includes('Artifact')) && !c.isTapped
    );
    
    untappedSources.forEach(source => {
      const color = identifyManaColor(source);
      counts[color] += (source.quantity || 1);
    });
    
    return counts;
  };

  const identifyManaColor = (card) => {
    const type = card.type_line?.toLowerCase() || '';
    const name = card.name?.toLowerCase() || '';
    const text = (card.oracle_text || '').toLowerCase();

    // Specific Artifacts
    if (name.includes('sol ring')) return 'C';
    if (name.includes('mana crypt')) return 'C';
    
    // Check for explicit mana symbols in text if not a basic land type
    if (text.includes('{w}')) return 'W';
    if (text.includes('{u}')) return 'U';
    if (text.includes('{b}')) return 'B';
    if (text.includes('{r}')) return 'R';
    if (text.includes('{g}')) return 'G';
    if (text.includes('{c}')) return 'C';

    if (type.includes('plains') || name.includes('plains')) return 'W';
    if (type.includes('island') || name.includes('island')) return 'U';
    if (type.includes('swamp') || name.includes('swamp')) return 'B';
    if (type.includes('mountain') || name.includes('mountain')) return 'R';
    if (type.includes('forest') || name.includes('forest')) return 'G';
    
    return 'C';
  };

  const canAfford = (requirement, available) => {
    // 1. Check specific colors
    const colors = ['W', 'U', 'B', 'R', 'G', 'C'];
    for (const c of colors) {
      if (available[c] < requirement[c]) return false;
    }
    
    // 2. Check total (including generic)
    const totalAvailable = Object.values(available).reduce((a, b) => a + b, 0);
    const totalRequired = Object.values(requirement).reduce((a, b) => a + b, 0);
    return totalAvailable >= totalRequired;
  };

  const payMana = (requirement) => {
    const untappedLands = [...battlefield.filter(c => c.type_line?.includes('Land') && !c.isTapped)];
    const landToTapIds = [];
    const req = { ...requirement };

    // 1. Pay colored requirements first
    ['W', 'U', 'B', 'R', 'G', 'C'].forEach(color => {
      while (req[color] > 0) {
        const landIdx = untappedLands.findIndex(l => identifyManaColor(l) === color);
        if (landIdx !== -1) {
          landToTapIds.push(untappedLands[landIdx].instanceId);
          untappedLands.splice(landIdx, 1);
          req[color]--;
        } else {
          // If we reached here, canAfford failed previously or logic error
          req[color] = 0;
        }
      }
    });

    // 2. Pay generic requirement from remaining lands
    while (req.generic > 0 && untappedLands.length > 0) {
      const land = untappedLands.pop();
      landToTapIds.push(land.instanceId);
      req.generic--;
    }

    // 3. Apply taps to battlefield using functional update to avoid race conditions
    setBattlefield(prev => prev.map(c => 
      landToTapIds.includes(c.instanceId) ? { ...c, isTapped: true } : c
    ));
  };

  const finalizePlayCard = (card, force = false) => {
    if (!force && !card.type_line?.includes('Land')) {
      const cost = parseManaCost(card.mana_cost);
      const available = getAvailableMana();
      if (!canAfford(cost, available)) {
        setGameAlert({
          message: `Casting ${card.name} requires ${card.mana_cost || 'mana'}. Not enough untapped lands of the right colors.`,
          confirmLabel: 'Force Play',
          onConfirm: () => finalizePlayCard(card, true),
        });
        return;
      }
      payMana(cost);
    }

    pushHistory();
    setHand(prev => prev.filter(c => c.instanceId !== card.instanceId));
    setBattlefield(prev => [{
      ...card,
      hasSickness: !card.type_line?.includes('Land')
    }, ...prev]);

    if (card.type_line?.includes('Land')) {
      setLandsPlayedThisTurn(prev => prev + 1);
    }
    setHasPlayedCardThisTurn(true);
    setSelectedHandId(null);
  };

  const selectFromHand = (id) => {
    setIsCommanderSelected(false);
    if (selectedHandId === id) setSelectedHandId(null);
    else setSelectedHandId(id);
  };

  const toggleCommanderSelection = () => {
    setSelectedHandId(null);
    setIsCommanderSelected(!isCommanderSelected);
  };

  const getCMC = (card) => {
    if (!card.mana_cost) return 0;
    const cost = parseManaCost(card.mana_cost);
    // Sum up all colored requirements and generic mana
    return Object.keys(cost).reduce((total, key) => total + cost[key], 0);
  };

  const sortHand = () => {
    const sorted = [...hand].sort((a, b) => {
      const aLand = a.type_line?.includes('Land') ? 1 : 0;
      const bLand = b.type_line?.includes('Land') ? 1 : 0;
      
      if (aLand !== bLand) return bLand - aLand; // Lands first
      
      return getCMC(a) - getCMC(b); // Then by CMC
    });
    setHand(sorted);
  };

  const castCommander = (force = false) => {
    if (!fullDeckData?.commander) return;
    if (battlefield.some(c => c.instanceId === 'commander')) {
      Alert.alert('Commander is out', 'Your commander is already on the battlefield.');
      setIsCommanderSelected(false);
      return;
    }

    const card = fullDeckData.commander;
    if (!force) {
      const baseCost = parseManaCost(card.mana_cost);
      const totalCost = { ...baseCost, generic: baseCost.generic + (commanderTax * 2) };
      const available = getAvailableMana();
      
      if (!canAfford(totalCost, available)) {
        setGameAlert({
          message: `Casting your commander requires ${card.mana_cost || 'mana'}${commanderTax > 0 ? ` + {${commanderTax * 2}} commander tax` : ''}. Not enough mana.`,
          confirmLabel: 'Force Play',
          onConfirm: () => castCommander(true),
          onCancel: () => setIsCommanderSelected(false),
        });
        return;
      }
      payMana(totalCost);
    }

    setIsCommanderSelected(false);
    pushHistory();
    const readyCard = prepareCard(card);
    readyCard.instanceId = 'commander'; // Permanent ID for commander
    readyCard.isCommander = true;
    readyCard.hasSickness = true; // Commanders get sick too!
    
    setBattlefield(prev => [readyCard, ...prev]);
    setCommanderTax(prev => prev + 1);
    setHasPlayedCardThisTurn(true);
  };

  const openGallery = (pool, initialCard) => {
    const idx = pool.findIndex(c => c.instanceId === initialCard.instanceId);
    setGalleryCards(pool);
    setGalleryIndex(idx !== -1 ? idx : 0);
    setPreviewCard(initialCard);
  };

  const navGallery = (dir) => {
    const newIdx = galleryIndex + dir;
    if (newIdx < 0 || newIdx >= galleryCards.length) return;
    setGalleryIndex(newIdx);
    galleryRef.current?.scrollToIndex({ index: newIdx, animated: true });
  };

  const calculateAvailableMana = () => {
    return battlefield
      .filter(c => (c.type_line?.includes('Land') || c.type_line?.includes('Artifact')) && !c.isTapped)
      .reduce((sum, c) => sum + (c.quantity || 1), 0);
  };

  const getTotalLands = () => {
    return battlefield
      .filter(c => c.type_line?.includes('Land'))
      .reduce((sum, c) => sum + (c.quantity || 1), 0);
  };

  const groupBattlefield = (field) => {
    const grouped = [];
    field.forEach(card => {
      // Find a matching stack: same name, art, tapped, sickness, and counters
      const matchIdx = grouped.findIndex(c => 
        c.name === card.name &&
        c.image_uris?.normal === card.image_uris?.normal &&
        c.isTapped === card.isTapped &&
        c.hasSickness === card.hasSickness &&
        c.isCommander === card.isCommander &&
        JSON.stringify(c.counters) === JSON.stringify(card.counters)
      );

      if (matchIdx !== -1 && card.isToken) {
        grouped[matchIdx].quantity = (grouped[matchIdx].quantity || 1) + (card.quantity || 1);
      } else {
        grouped.push({ ...card });
      }
    });
    return grouped;
  };

  const applyCounters = (targetId) => {
    pushHistory();
    setBattlefield(prev => prev.map(card => {
      if (card.instanceId === targetId) {
        const existingIdx = card.counters.findIndex(c => c.name === activeCounter.type && c.isTemp === !!activeCounter.isTemp);
        
        let newCounters;
        if (existingIdx !== -1) {
          newCounters = [...card.counters];
          newCounters[existingIdx] = { 
            ...newCounters[existingIdx], 
            value: newCounters[existingIdx].value + activeCounter.count 
          };
        } else {
          newCounters = [...card.counters, { 
            name: activeCounter.type, 
            value: activeCounter.count, 
            isTemp: !!activeCounter.isTemp 
          }];
        }

        return {
          ...card,
          counters: newCounters
        };
      }
      return card;
    }));
  };

  const renderBattlefieldCard = (card) => {
    const displayPT = calculateDisplayPT(card);
    const hasCounters = (card.counters || []).some(c => c.value > 0);
    const isEditing = activeActionId === card.instanceId;

    return (
      <View key={card.instanceId} style={[
        styles.cardContainer, 
        card.isCommander && styles.commanderCard, 
        isTargeting && styles.targetingCard,
        card.isTapped && styles.tappedCard
      ]}>
        <TouchableOpacity 
          style={{ width: '100%', height: '100%' }}
          onPress={() => {
            if (isTargeting) applyCounters(card.instanceId);
            else if (isEditing) setActiveActionId(null);
            else setActiveActionId(card.instanceId);
          }}
          onLongPress={() => openGallery(battlefield, card)}
        >
          <Image 
            source={{ uri: ScryfallService.getImageUrl(card, 'normal') }} 
            style={[
              styles.cardImage, 
              card.isTapped && styles.tappedImage,
              card.hasSickness && styles.summoningSicknessImage
            ]}
            resizeMode="contain"
          />
          {card.quantity > 1 && (
            <View style={styles.quantityBadge}>
              <Text style={styles.quantityBadgeText}>x{card.quantity}</Text>
            </View>
          )}
          {isTargeting && <View style={styles.targetingOverlay}><Plus color="#fff" size={32} /></View>}
          
           {isEditing && (
            <View style={styles.cardActionsOverlay}>
              {!card.type_line?.includes('Land') && !card.hasSickness && (
                <TouchableOpacity style={styles.actionBtnCombat} onPress={() => attackWithCard(card)}>
                  <Sword color="#fff" size={16} />
                  <Text style={styles.actionBtnText}>ATTACK</Text>
                </TouchableOpacity>
              )}
              {card.quantity > 1 && (
                <TouchableOpacity style={styles.actionBtnSplit} onPress={() => splitStack(card.instanceId)}>
                  <LayoutGrid color="#fff" size={16} />
                  <Text style={styles.actionBtnText}>SPLIT</Text>
                </TouchableOpacity>
              )}
              {card.hasSickness && (
                <TouchableOpacity style={styles.actionBtnHaste} onPress={() => grantHaste(card.instanceId)}>
                  <Zap color="#fff" size={16} fill="#fff" />
                  <Text style={styles.actionBtnText}>HASTE</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionBtnTap} onPress={() => toggleTap(card.instanceId)}>
                <RotateCcw color="#fff" size={16} />
                <Text style={styles.actionBtnText}>
                  {card.isTapped ? 'UNTAP' : 'TAP'}
                </Text>
              </TouchableOpacity>
              {card.type_line?.includes('Land') && !card.isTapped && (
                <TouchableOpacity style={styles.actionBtnETBTapped} onPress={() => toggleTap(card.instanceId)}>
                  <Layers color="#fff" size={16} />
                  <Text style={styles.actionBtnText}>ETB TAPPED</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionBtnClose} onPress={() => setActiveActionId(null)}>
                <Text style={styles.actionBtnText}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {card.isCommander && <View style={styles.commanderBadge}><Text style={styles.commanderBadgeText}>C</Text></View>}
        
        {hasCounters && (
          <View style={styles.topCardOverlay}>
            <View style={styles.counterList}>
              {card.counters.map((c, i) => (
                <View key={i} style={[styles.counterBadge, c.isTemp && styles.tempCounterBadge]}>
                  <Text style={styles.counterBadgeText}>{c.value > 1 ? c.value : ''}{c.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.ptOverlay}>
          <TouchableOpacity style={styles.ptButton} onPress={() => updatePT(card.instanceId, 'p', -1)}>
            <Minus color="#fff" size={10} />
          </TouchableOpacity>
          <Text style={styles.ptText}>{displayPT}</Text>
          <TouchableOpacity style={styles.ptButton} onPress={() => updatePT(card.instanceId, 'p', 1)}>
            <Plus color="#fff" size={10} />
          </TouchableOpacity>
        </View>

        <View style={styles.zoneActionsContainer}>
          <TouchableOpacity style={styles.zoneActionBtn} onPress={() => moveCard(card.instanceId, 'battlefield', 'graveyard')}>
            <Trash2 color="#fff" size={10} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoneActionBtn} onPress={() => moveCard(card.instanceId, 'battlefield', 'exile')}>
            <XCircle color="#fff" size={10} />
          </TouchableOpacity>
          {card.isCommander && (
            <TouchableOpacity style={styles.zoneActionBtn} onPress={() => moveCard(card.instanceId, 'battlefield', 'command')}>
              <RefreshCcw color="#fff" size={10} />
            </TouchableOpacity>
          )}
        </View>

        {card.type_line?.includes('Land') && !card.isTapped && (
          <View style={styles.landIndicator}>
            <Zap color="#ffd700" size={8} fill="#ffd700" />
          </View>
        )}
      </View>
    );
  };

  const toggleTap = (id) => {
    const card = battlefield.find(c => c.instanceId === id);
    if (!card) return;
    
    if (card.quantity > 1) {
      setModalQuantity(1);
      setActiveQuantityAction({ action: 'TAP', card, max: card.quantity });
    } else {
      executeActionOnQuantity(card, 1, 'TAP');
    }
  };

  const deleteCard = (id) => {
    const card = battlefield.find(c => c.instanceId === id);
    if (!card) return;

    if (card.quantity > 1) {
      setModalQuantity(1);
      setActiveQuantityAction({ action: 'DELETE', card, max: card.quantity });
    } else {
      executeActionOnQuantity(card, 1, 'DELETE');
    }
  };

  // Re-use land identification logic

  const updatePT = (id, type, val) => {
    pushHistory();
    setBattlefield(prev => prev.map(c => {
      if (c.instanceId === id) {
        const counterName = type === 'p' ? (val > 0 ? '+1/+1' : '-1/-1') : '+1/+1';
        const existingIdx = c.counters.findIndex(ct => ct.name === counterName && !ct.isTemp);
        let newCounters;
        if (existingIdx !== -1) {
          newCounters = [...c.counters];
          newCounters[existingIdx] = { ...newCounters[existingIdx], value: newCounters[existingIdx].value + Math.abs(val) };
        } else {
          newCounters = [...c.counters, { name: counterName, value: Math.abs(val), isTemp: false }];
        }
        return { ...c, counters: newCounters };
      }
      return c;
    }));
  };

  const grantHaste = (id) => {
    pushHistory();
    setBattlefield(battlefield.map(c => 
      c.instanceId === id ? { ...c, hasSickness: false } : c
    ));
    setActiveActionId(null);
  };

  const attackWithCard = (card) => {
    if (card.quantity > 1) {
      setModalQuantity(1);
      setActiveQuantityAction({ action: 'ATTACK', card, max: card.quantity });
    } else {
      executeActionOnQuantity(card, 1, 'ATTACK');
    }
  };

  const modifyLife = (player, amount) => {
    pushHistory();
    if (player === 'me') setMyLife(prev => Math.max(0, prev + amount));
    else setOppLife(prev => Math.max(0, prev + amount));
  };

  const pushHistory = () => {
    const snapshot = {
      myLife,
      oppLife,
      library: [...library],
      hand: [...hand],
      battlefield: [...battlefield],
      graveyard: [...graveyard],
      exile: [...exile],
      landsPlayedThisTurn,
      commanderTax,
      turnNumber,
      poisonCounters,
    };
    setHistory(prev => [snapshot, ...prev].slice(0, 20)); // Keep last 20 steps
  };

  const undo = () => {
    if (history.length === 0) return;
    const [last, ...rest] = history;
    
    setMyLife(last.myLife);
    setOppLife(last.oppLife);
    setLibrary(last.library);
    setHand(last.hand);
    setBattlefield(last.battlefield);
    setGraveyard(last.graveyard);
    setExile(last.exile);
    setLandsPlayedThisTurn(last.landsPlayedThisTurn);
    setCommanderTax(last.commanderTax);
    setTurnNumber(last.turnNumber || 1);
    setPoisonCounters(last.poisonCounters ?? 0);
    setHistory(rest);
  };

  const openTokenArtPicker = async (name, p, t) => {
    setLoadingTokenArt(true);
    setTokenTypeToSpawn({ name, p, t });
    const prints = await ScryfallService.fetchTokenPrints(name);
    setTokenArtOptions(prints);
    setLoadingTokenArt(false);
  };

  const spawnTokens = (count = 1, customArt = null) => {
    if (!tokenTypeToSpawn) return;
    pushHistory();
    const { name, p, t } = tokenTypeToSpawn;
    const artUrl = customArt || 'https://cards.scryfall.io/normal/front/5/8/5859600a-2007-4f93-9c88-e2074f939c88.jpg';
    const artifactTokens = ['Treasure', 'Clue', 'Food'];
    const isArtifactToken = artifactTokens.includes(name);
    const tokenSick = !isArtifactToken;

    // Check if an identical token stack already exists (STRICT: state must match)
    const existingIdx = battlefield.findIndex(c =>
      c.isToken &&
      c.name === name &&
      c.image_uris?.normal === artUrl &&
      !c.isTapped &&
      c.hasSickness === tokenSick &&
      c.baseP === p &&
      c.baseT === t &&
      (c.counters || []).every(ct => ct.value === 0)
    );

    if (existingIdx !== -1) {
      setBattlefield(prev => prev.map((c, idx) =>
        idx === existingIdx ? { ...c, quantity: (c.quantity || 1) + count } : c
      ));
    } else {
      const newToken = {
        instanceId: `token-${Math.random().toString(36).slice(2, 11)}`,
        name,
        power: p.toString(),
        toughness: t.toString(),
        baseP: p,
        baseT: t,
        type_line: isArtifactToken ? 'Token Artifact' : 'Token Creature',
        counters: [],
        isTapped: false,
        hasSickness: tokenSick,
        isToken: true,
        image_uris: { normal: artUrl, small: artUrl },
        quantity: count
      };
      setBattlefield(prev => [newToken, ...prev]);
    }
    
    setShowTokenModal(false);
    setTokenTypeToSpawn(null);
    setTokenArtOptions([]);
  };

  const performQuantityAction = (qty) => {
    if (!activeQuantityAction) return;
    const { action, card } = activeQuantityAction;
    
    executeActionOnQuantity(card, qty, action);
    setActiveQuantityAction(null);
  };

  const executeActionOnQuantity = (card, qty, action) => {
    pushHistory();
    
    setBattlefield(prev => {
      const idx = prev.findIndex(c => c.instanceId === card.instanceId);
      if (idx === -1) return prev;
      
      const stack = prev[idx];
      const selectedQty = Math.min(qty, stack.quantity || 1);
      const remainingQty = (stack.quantity || 1) - selectedQty;
      
      let newResult = [...prev];
      
      // 1. Create the card(s) that are being acted upon
      const actedCard = { 
        ...stack, 
        instanceId: `token-${Math.random().toString(36).slice(2, 11)}`,
        quantity: selectedQty 
      };

      // 2. Apply the action
      if (action === 'TAP') actedCard.isTapped = !actedCard.isTapped;
      if (action === 'ATTACK') {
        actedCard.isTapped = true;
        const ptStr = calculateDisplayPT(actedCard);
        const power = parseInt(ptStr.split('/')[0]) || 0;
        modifyLife('opp', -(power * selectedQty));
      }
      if (action === 'DELETE') {
        // Do nothing, actedCard won't be added back
      }

      // 3. Update the original stack or remove it
      if (remainingQty <= 0) {
        newResult.splice(idx, 1);
      } else {
        newResult[idx] = { ...stack, quantity: remainingQty };
      }

      // 4. Add the acted card back (if not deleted)
      if (action !== 'DELETE') {
        newResult = [actedCard, ...newResult];
      }

      return groupBattlefield(newResult);
    });

    if (action === 'ATTACK') {
      const ptStr = calculateDisplayPT(card);
      const power = parseInt(ptStr.split('/')[0]) || 0;
      Alert.alert('Combat', `${qty} creatures attack for ${power * qty} total damage.`);
    }
    setActiveActionId(null);
  };

  const splitStack = (instanceId) => {
    pushHistory();
    setBattlefield(prev => {
      const idx = prev.findIndex(c => c.instanceId === instanceId);
      if (idx === -1 || (prev[idx].quantity || 1) <= 1) return prev;
      
      const stack = prev[idx];
      const newStack = { ...stack, quantity: stack.quantity - 1 };
      const individual = { ...stack, quantity: 1, instanceId: `token-${Math.random().toString(36).slice(2, 11)}` };
      
      const newField = [...prev];
      newField[idx] = newStack;
      return [individual, ...newField];
    });
    setActiveActionId(null);
  };

  const saveDeckNote = async () => {
    if (!fullDeckData) return;
    
    try {
      const allDecks = await StorageService.getDecks();
      const updatedDecks = allDecks.map(d => 
        d.id === fullDeckData.id ? { ...d, notes: currentNotes } : d
      );
      await StorageService.saveDecks(updatedDecks);
      setShowNotesModal(false);
    } catch (e) {
      Alert.alert('Save Error', 'Failed to save notes.');
    }
  };

  const calculateDisplayPT = (card) => {
    const { baseP, baseT, counters } = card;
    let p = baseP;
    let t = baseT;

    (counters || []).forEach(c => {
      if (c.name === '+1/+1') { p += c.value; t += c.value; }
      else if (c.name === '+1/0') { p += c.value; }
      else if (c.name === '-1/-1') { p -= c.value; t -= c.value; }
      else if (c.name === '-1/0') { p -= c.value; }
      // Custom named counters don't affect P/T by default unless specifically handled
    });

    return `${p}/${t}`;
  };

  const moveCard = (instanceId, fromZone, toZone) => {
    pushHistory();
    let card;
    // Extract card
    if (fromZone === 'hand') {
      card = hand.find(c => c.instanceId === instanceId);
      setHand(hand.filter(c => c.instanceId !== instanceId));
    } else if (fromZone === 'battlefield') {
      card = battlefield.find(c => c.instanceId === instanceId);
      setBattlefield(battlefield.filter(c => c.instanceId !== instanceId));
    } else if (fromZone === 'library') {
      card = library.find(c => c.instanceId === instanceId);
      setLibrary(library.filter(c => c.instanceId !== instanceId));
    } else if (fromZone === 'graveyard') {
      card = graveyard.find(c => c.instanceId === instanceId);
      setGraveyard(graveyard.filter(c => c.instanceId !== instanceId));
    } else if (fromZone === 'exile') {
      card = exile.find(c => c.instanceId === instanceId);
      setExile(exile.filter(c => c.instanceId !== instanceId));
    }

    if (!card) return;

    // Tokens vanish when they leave the battlefield
    if (card.isToken && fromZone === 'battlefield') {
      Alert.alert('Token Vanished', `${card.name} token was removed from the game.`);
      return;
    }

    // Command Zone Logic (Tax Increment)
    if (toZone === 'command' && card.isCommander) {
      setCommanderTax(prev => prev + 1);
    }

    // Add to target
    if (toZone === 'graveyard') setGraveyard([card, ...graveyard]);
    else if (toZone === 'exile') setExile([card, ...exile]);
    else if (toZone === 'battlefield') setBattlefield([...battlefield, card]);
    else if (toZone === 'hand') setHand([card, ...hand]);
    else if (toZone === 'library') setLibrary([card, ...library]);
  };

  const searchLibraryAndMove = (instanceId, toZone) => {
    moveCard(instanceId, 'library', toZone);
    setShowLibrarySearch(false);
    // Standard rule: Shuffle after searching
    setTimeout(() => {
      shuffleLibrary();
    }, 500);
  };

  const deleteCardZones = (id) => {
    setBattlefield(battlefield.filter(card => card.instanceId !== id));
  };

  const resetGame = () => {
    if (!fullDeckData) return;
    const isEDH = !!fullDeckData.commander;
    setMyLife(isEDH ? 40 : 20);
    setOppLife(isEDH ? 40 : 20);
    setPoisonCounters(0);
    setBattlefield([]);
    setLandsPlayedThisTurn(0);
    setCommanderTax(0);
    setCurrentNotes(fullDeckData.notes || '');
    setHistory([]);
    setTurnNumber(1); // FIX: Reset turn to 1
    
    // Reshuffle library
    let deckCards = fullDeckData.cards.map(c => prepareCard(c));
    let shuffled = shuffleArray(deckCards);
    const startHand = shuffled.slice(0, 7);
    const startLibrary = shuffled.slice(7);
    setLibrary(startLibrary);
    setHand(startHand);
    setGraveyard([]);
    setExile([]);
  };

  const millCards = (count) => {
    if (library.length === 0) return;
    pushHistory();
    const toMill = library.slice(0, count);
    const remaining = library.slice(count);
    setLibrary(remaining);
    setGraveyard(prev => [...toMill, ...prev]);
    Alert.alert('Mill', `Milled ${toMill.length} cards to graveyard.`);
  };

  const renderDeckItem = ({ item }) => (
    <TouchableOpacity style={styles.deckItem} onPress={() => selectDeck(item)}>
      {item.commander ? (
        <Image 
          source={{ uri: ScryfallService.getImageUrl(item.commander, 'small') }} 
          style={styles.deckThumb} 
          resizeMode="contain"
        />
      ) : (
        <View style={styles.deckThumbPlaceholder}>
          <LayoutGrid color="#ccc" size={24} />
        </View>
      )}
      <View style={styles.deckInfo}>
        <Text style={styles.deckName}>{item.name}</Text>
        <Text style={styles.deckMeta}>
          {item.commander ? 'COMMANDER' : '60-CARD'} • {item.cards.length + (item.commander ? 1 : 0)} CARDS
        </Text>
      </View>
      <ChevronRight color="#ccc" size={20} />
    </TouchableOpacity>
  );
  return (
    <View style={styles.container}>
      {viewMode === 'index' ? (
        <View style={styles.indexContainer}>
          <View style={styles.header}>
            <Text style={styles.brandSubtitle}>MAGIC: THE PRACTICING</Text>
            <Text style={styles.mainTitle}>PLAYTEST STUDIO</Text>
          </View>
          <FlatList
            data={allDecks}
            keyExtractor={item => item.id}
            renderItem={renderDeckItem}
            ListEmptyComponent={<Text style={styles.emptyText}>No decks found. Go to the Builder to create one!</Text>}
            contentContainerStyle={styles.listContent}
          />
        </View>
      ) : (
        <>
          {/* Game Header */}
          <View style={styles.gameHeader}>
            <TouchableOpacity onPress={() => setViewMode('index')} style={styles.backButton}>
              <ArrowLeft color="#333" size={24} />
            </TouchableOpacity>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.gameTitle}>Playtesting</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.turnBadge}>
                <Text style={styles.turnLabel}>TURN</Text>
                <Text style={styles.turnVal}>{turnNumber}</Text>
              </View>
              <TouchableOpacity style={styles.notesBtn} onPress={() => setShowNotesModal(true)}>
                <FileText color="#ff8f00" size={14} />
                <Text style={[styles.undoText, { color: '#ff8f00' }]}>NOTES</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={undo} disabled={history.length === 0} style={[styles.undoButton, history.length === 0 && {opacity: 0.3}]}>
                <RotateCcw color="#b30000" size={14} />
                <Text style={styles.undoText}>UNDO</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.resetButton, !fullDeckData && { opacity: 0.3 }]} disabled={!fullDeckData} onPress={() => { if (turnNumber > 1) setShowResultModal(true); else selectDeck(fullDeckData); }}>
              <RefreshCcw color="#b30000" size={20} />
            </TouchableOpacity>
          </View>
        </View>

          {/* Stock Area (Library/GY/Exile) */}
          <View style={styles.stockArea}>
            <View style={styles.stockItem}>
              <TouchableOpacity onPress={() => setShowLibraryMenu(true)}>
                <Image source={{ uri: CARD_BACK_URL }} style={styles.stockCardBack} />
                <View style={styles.stockCount}><Text style={styles.stockCountText}>{library.length}</Text></View>
              </TouchableOpacity>
              <Text style={styles.stockLabel}>LIBRARY</Text>
            </View>

            {fullDeckData?.commander && (
              <View style={styles.stockItem}>
                <TouchableOpacity 
                  onPress={toggleCommanderSelection} 
                  onLongPress={() => openGallery([fullDeckData.commander], fullDeckData.commander)}
                  disabled={battlefield.some(c => c.instanceId === 'commander')}
                >
                  <View style={[
                    styles.stockCardBack, 
                    battlefield.some(c => c.instanceId === 'commander') && styles.emptyStock,
                    isCommanderSelected && styles.selectedCommanderZone
                  ]}>
                    {!battlefield.some(c => c.instanceId === 'commander') ? (
                      <Image 
                        source={{ uri: ScryfallService.getImageUrl(fullDeckData.commander, 'small') }} 
                        style={styles.stockCardBack} 
                      />
                    ) : (
                      <User color="#ccc" size={24} />
                    )}
                  </View>
                </TouchableOpacity>
                <Text style={styles.stockLabel}>COMMAND</Text>
              </View>
            )}
            
            <View style={styles.stockItem}>
              <TouchableOpacity 
                onPress={() => setShowZoneModal('graveyard')}
                disabled={graveyard.length === 0}
              >
                <View style={[styles.stockCardBack, styles.emptyStock]}>
                  {graveyard.length > 0 ? <Image source={{ uri: ScryfallService.getImageUrl(graveyard[0], 'small') }} style={styles.stockCardBack} /> : <Trash2 color="#ccc" size={24} />}
                  <View style={styles.stockCount}><Text style={styles.stockCountText}>{graveyard.length}</Text></View>
                </View>
              </TouchableOpacity>
              <Text style={styles.stockLabel}>GRAVEYARD</Text>
            </View>

            <View style={styles.stockItem}>
              <TouchableOpacity 
                onPress={() => setShowZoneModal('exile')}
                disabled={exile.length === 0}
              >
                <View style={[styles.stockCardBack, styles.emptyStock]}>
                  {exile.length > 0 ? <Image source={{ uri: ScryfallService.getImageUrl(exile[0], 'small') }} style={styles.stockCardBack} /> : <XCircle color="#ccc" size={24} />}
                  <View style={styles.stockCount}><Text style={styles.stockCountText}>{exile.length}</Text></View>
                </View>
              </TouchableOpacity>
              <Text style={styles.stockLabel}>EXILE</Text>
            </View>

            <View style={styles.headerLifeArea}>
              <View style={styles.manaHUD}>
                {['C', 'B', 'U', 'G', 'W', 'R'].map(color => {
                  const count = getAvailableMana()[color];
                  return (
                    <View 
                      key={color} 
                      style={[styles.manaGem, styles[`manaGem${color}`], count === 0 && styles.emptyGem]}
                    >
                      <Text style={[styles.manaGemText, color === 'W' && {color: '#333'}]}>{count > 0 ? count : ''}</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.oppLifeTitle}>OPPONENT</Text>
              <View style={styles.lifeRow}>
                <TouchableOpacity onPress={() => setOppLife(prev => prev - 1)}><Minus color="#b30000" size={24} /></TouchableOpacity>
                <Text style={styles.lifeValSmall}>{oppLife}</Text>
                <TouchableOpacity onPress={() => setOppLife(prev => prev + 1)}><Plus color="#b30000" size={24} /></TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Battlefield */}
          {/* Header Info Banner / Global Effects */}
      <View style={styles.utilityBanner}>
        <View style={styles.turnIndicator}>
          <Text style={styles.turnLabel}>TURN</Text>
          <Text style={styles.turnVal}>{turnNumber}</Text>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emblemScroll}>
          {emblems.map((emb, idx) => (
            <TouchableOpacity key={idx} style={styles.emblemChip} onLongPress={() => {
              setEmblems(prev => prev.filter((_, i) => i !== idx));
            }}>
              <Text style={styles.emblemText}>{emb.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addEmblemBtn} onPress={() => {
            if (Platform.OS === 'web') {
              const name = window.prompt('New Global Effect', '');
              if (name) setEmblems(prev => [...prev, { name }]);
            } else {
              Alert.prompt('New Global Effect', 'Enter name (e.g. Emblem, Engine, City\'s Blessing):', (name) => {
                if (name) setEmblems(prev => [...prev, { name }]);
              });
            }
          }}>
            <Plus color="#999" size={14} />
            <Text style={styles.addEmblemText}>ADD EFFECT</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.battlefieldContainer}>
            {shuffleToast && (
              <View style={styles.shuffleToast} pointerEvents="none">
                <Text style={styles.shuffleToastText}>🔀 Library Shuffled</Text>
              </View>
            )}
            {mulliganCount > 0 && !bottomingState && !hasPlayedCardThisTurn && (
              <View style={styles.mulliganChip}>
                <Text style={styles.mulliganChipLabel}>MULLIGAN {mulliganCount}×</Text>
                <TouchableOpacity style={styles.mulliganChipBtn} onPress={() => setShowMulliganModal(true)}>
                  <Text style={styles.mulliganChipBtnText}>MULL AGAIN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mulliganChipBtn, styles.mulliganChipKeep, { backgroundColor: '#2d8a4e' }]}
                  onPress={() => {
                    setBottomingState({ required: mulliganCount, selected: new Set(), hand: [...hand], library: [...library] });
                  }}
                >
                  <Text style={[styles.mulliganChipBtnText, { color: '#fff' }]}>KEEP HAND</Text>
                </TouchableOpacity>
              </View>
            )}
            <ScrollView
              style={styles.battlefieldScroll}
              contentContainerStyle={styles.battlefieldContent}
              scrollEnabled={!isTargeting}
            >
              {battlefield.length === 0 ? (
                <View style={styles.emptyBattlefield}>
                  <LayoutGrid color="#555" size={48} />
                  <Text style={styles.placeholderText}>Battlefield is empty</Text>
                </View>
              ) : (
                <View style={styles.battlefieldGrid}>
                  {battlefield.map(card => renderBattlefieldCard(card))}
                </View>
              )}
            </ScrollView>

            {/* THE GREAT FIX: Drop Zone Overlay */}
            {(selectedHandId || isCommanderSelected) && (
              <Pressable 
                style={styles.dropZoneOverlay} 
                onPress={() => isCommanderSelected ? castCommander() : playCard(selectedHandId)}
              >
                <View style={styles.dropZoneIndicator}>
                  <Plus color="#fff" size={32} />
                  <Text style={styles.dropZoneText}>TAP ANYWHERE TO PLACE CARD</Text>
                </View>
              </Pressable>
            )}
          </View>

          {/* Targeting Mode Notification */}
          {isTargeting && (
            <View style={styles.targetingBanner}>
              <Text style={styles.targetingBannerText}>TAP A CARD TO APPLY {activeCounter.count}x {activeCounter.type}</Text>
              <TouchableOpacity onPress={() => setIsTargeting(false)} style={styles.cancelTargetingBtn}>
                <Text style={styles.cancelTargetingText}>DONE</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom Interaction Area */}
          <View style={styles.bottomArea}>
            {/* Hand Area (Arena Style) */}
            <View style={styles.handContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.handHeaderScroll}>
                <View style={styles.handHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={styles.handTitle}>YOUR HAND ({hand.length})</Text>
                    <TouchableOpacity onPress={sortHand} style={styles.sortBtn}>
                      <RefreshCcw color="#b30000" size={10} />
                      <Text style={styles.sortBtnText}>SORT</Text>
                    </TouchableOpacity>
                    {turnNumber === 1 && hand.length > 0 && !hasPlayedCardThisTurn && (
                      <TouchableOpacity onPress={() => setShowMulliganModal(true)} style={[styles.sortBtn, { borderColor: '#a855f7' }]}>
                        <RefreshCcw color="#a855f7" size={10} />
                        <Text style={[styles.sortBtnText, { color: '#a855f7' }]}>MULLIGAN</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {turnNumber === 1 && hand.length >= 5 && (() => {
                    const lands = hand.filter(c => c.type_line?.includes('Land')).length;
                    const spells = hand.length - lands;
                    const avgCmc = spells > 0
                      ? (hand.filter(c => !c.type_line?.includes('Land')).reduce((s, c) => s + (c.cmc || 0), 0) / spells).toFixed(1)
                      : 0;
                    let label, color;
                    if (lands < 2) { label = `⚠ Flood risk — ${lands} land`; color = '#b30000'; }
                    else if (lands > 4) { label = `⚠ Mana flood — ${lands} lands`; color = '#b30000'; }
                    else if (parseFloat(avgCmc) > 4) { label = `😬 Heavy hand — avg ${avgCmc} CMC`; color = '#ff8f00'; }
                    else if (lands === 2 && parseFloat(avgCmc) <= 3) { label = `✓ Fast hand — ${lands} lands, ${avgCmc} avg`; color = '#2d8a4e'; }
                    else { label = `✓ Keepable — ${lands} lands, ${avgCmc} avg CMC`; color = '#2d8a4e'; }
                    return <Text style={[styles.handScore, { color }]}>{label}</Text>;
                  })()}
                  {selectedHandId && <Text style={styles.instructionText}>TAP BATTLEFIELD TO PLACE</Text>}
                </View>
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.handList}>
                {hand.map((card, index) => (
                  <TouchableOpacity
                    key={card.instanceId}
                    onPress={() => selectFromHand(card.instanceId)}
                    onLongPress={() => {
                      if (hand.length > 7) {
                        Alert.alert(
                          `Discard ${card.name}?`,
                          'Send this card to the graveyard to reduce hand size.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Discard', style: 'destructive', onPress: () => {
                              pushHistory();
                              setHand(prev => prev.filter(c => c.instanceId !== card.instanceId));
                              setGraveyard(prev => [card, ...prev]);
                            }},
                          ]
                        );
                      } else {
                        openGallery(hand, card);
                      }
                    }}
                    style={[styles.handCardWrapper, selectedHandId === card.instanceId && styles.selectedHandCard, hand.length > 7 && styles.discardableCard]}
                  >
                    <Image source={{ uri: ScryfallService.getImageUrl(card, 'small') }} style={styles.handCard} resizeMode="contain" />
                    {hand.length > 7 && (
                      <View style={styles.discardBadge}>
                        <Text style={styles.discardBadgeText}>HOLD</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Action Bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionBarScroll} contentContainerStyle={styles.actionBar}>
              <TouchableOpacity
                style={[styles.floatingCounterBtn, history.length === 0 && { opacity: 0.3 }]}
                onPress={undo}
                disabled={history.length === 0}
              >
                <RotateCcw color="#b30000" size={24} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.floatingCounterBtn, isTargeting && styles.activeCounterBtn]}
                onPress={() => setShowCounterModal(true)}
              >
                <Layers color={isTargeting ? "#fff" : "#b30000"} size={24} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.floatingCounterBtn}
                onPress={() => {
                  setTokenQuantity(1);
                  setShowTokenModal(true);
                }}
              >
                <UserPlus color="#b30000" size={24} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.nextTurnBtn} onPress={nextTurn}>
                <RefreshCcw color="#fff" size={20} />
                <Text style={styles.nextTurnText}>NEXT TURN</Text>
              </TouchableOpacity>

              <View style={styles.playerLifeDisplay}>
                <TouchableOpacity onPress={() => setMyLife(prev => prev - 1)}><Minus color="#fff" size={24} /></TouchableOpacity>
                <View style={styles.playerLifeCircle}>
                  <Heart color="#fff" size={14} />
                  <Text style={styles.playerLifeText}>{myLife}</Text>
                </View>
                <TouchableOpacity onPress={() => setMyLife(prev => prev + 1)}><Plus color="#fff" size={24} /></TouchableOpacity>
              </View>

              <View style={styles.poisonDisplay}>
                <TouchableOpacity onPress={() => setPoisonCounters(prev => {
                  const next = Math.max(0, prev - 1);
                  return next;
                })}>
                  <Minus color={poisonCounters >= 10 ? '#fff' : '#2d8a4e'} size={18} />
                </TouchableOpacity>
                <View style={styles.poisonCircle}>
                  <Text style={styles.poisonIcon}>☠</Text>
                  <Text style={[styles.poisonText, poisonCounters >= 10 && styles.poisonTextDanger]}>{poisonCounters}</Text>
                </View>
                <TouchableOpacity onPress={() => {
                  setPoisonCounters(prev => {
                    const next = prev + 1;
                    if (next >= 10) {
                      setTimeout(() => Alert.alert('💀 Poisoned Out', 'You have 10 poison counters. You lose!'), 100);
                    }
                    return next;
                  });
                }}>
                  <Plus color={poisonCounters >= 10 ? '#fff' : '#2d8a4e'} size={18} />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </>
      )}

      {/* Counter Selection Modal */}
      <Modal visible={showCounterModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowCounterModal(false)}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 65 : 25} // 60 default + 5px padding requested
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}
          >
            <Pressable style={styles.counterModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.modalTitle}>PLACE COUNTERS</Text>
              <TouchableOpacity onPress={() => setShowCounterModal(false)}>
                <XCircle color="#333" size={24} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.counterTypeGrid}>
              {['+1/+1', '+1/0', '-1/-1', '-1/0'].map(type => (
                <TouchableOpacity 
                  key={type} 
                  style={[styles.typeOption, activeCounter.type === type && styles.activeTypeOption]}
                  onPress={() => setActiveCounter({...activeCounter, type})}
                >
                  <Text style={[styles.typeOptionText, activeCounter.type === type && styles.activeTypeOptionText]}>{type}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                style={[styles.typeOption, {width: '92%'}]}
                onPress={() => {
                  Alert.prompt('Custom Counter', 'Enter counter name (e.g. Shield, Poison, Stun):', (name) => {
                    if (name) setActiveCounter({...activeCounter, type: name});
                  });
                }}
              >
                <Text style={styles.typeOptionText}>+ Custom Name</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.quantityRow, {marginTop: 15}]}>
              <TouchableOpacity 
                style={[styles.tempToggle, activeCounter.isTemp && styles.tempToggleActive]}
                onPress={() => setActiveCounter({...activeCounter, isTemp: !activeCounter.isTemp})}
              >
                <CheckCircle color={activeCounter.isTemp ? "#fff" : "#999"} size={16} />
                <Text style={[styles.tempToggleText, activeCounter.isTemp && {color: '#fff'}]}>End of Turn only</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.quantityRow}>
              <Text style={styles.qtyLabel}>QUANTITY:</Text>
              <View style={styles.qtyControls}>
                <TouchableOpacity onPress={() => setActiveCounter({...activeCounter, count: Math.max(1, activeCounter.count-1)})} style={styles.qtyBtn}>
                  <Minus color="#333" size={20} />
                </TouchableOpacity>
                <TextInput 
                  style={styles.qtyVal}
                  keyboardType="numeric"
                  value={String(activeCounter.count)}
                  onChangeText={(val) => {
                    const num = parseInt(val) || 0;
                    setActiveCounter({...activeCounter, count: num});
                  }}
                  selectTextOnFocus
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
                <TouchableOpacity onPress={() => setActiveCounter({...activeCounter, count: Math.min(10, activeCounter.count+1)})} style={styles.qtyBtn}>
                  <Plus color="#333" size={20} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.startTargetingBtn} 
              onPress={() => {
                setShowCounterModal(false);
                setIsTargeting(true);
              }}
            >
              <Text style={styles.startTargetingText}>SELECT TARGET CARD</Text>
            </TouchableOpacity>
          </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Token Creation Modal */}
      <Modal visible={showTokenModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowTokenModal(false)}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 65 : 10}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.counterModalContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Text style={styles.modalTitle}>SPAWN TOKENS</Text>
                  <TouchableOpacity onPress={() => { setShowTokenModal(false); setTokenStep(1); }}>
                    <XCircle color="#333" size={24} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.quantityRow, { marginBottom: 20 }]}>
                  <Text style={styles.qtyLabel}>QUANTITY:</Text>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity onPress={() => setTokenQuantity(Math.max(1, tokenQuantity - 1))} style={styles.qtyBtn}>
                      <Minus color="#333" size={20} />
                    </TouchableOpacity>
                    <TextInput 
                      style={styles.qtyVal}
                      keyboardType="numeric"
                      value={String(tokenQuantity)}
                      onChangeText={(val) => setTokenQuantity(parseInt(val) || 0)}
                      selectTextOnFocus
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                    <TouchableOpacity onPress={() => setTokenQuantity(Math.min(20, tokenQuantity + 1))} style={styles.qtyBtn}>
                      <Plus color="#333" size={20} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flex: 1 }}>
            
            {!tokenTypeToSpawn && tokenStep === 1 ? (
              <>
                <View style={styles.tokenTabHeader}>
                   <Text style={styles.tokenTabLabel}>QUICK SPAWN</Text>
                </View>

                <ScrollView 
                  style={{ flex: 1 }} 
                  contentContainerStyle={{ flexGrow: 1 }}
                >
                  <View style={styles.quickSpawnList}>
                    {savedTokens.length === 0 && (
                      <View style={styles.emptySavedTokens}>
                        <LayoutGrid color="#ccc" size={32} />
                        <Text style={styles.emptySavedText}>No saved tokens yet</Text>
                      </View>
                    )}
                    {savedTokens.map((st, idx) => (
                      <View key={idx} style={styles.savedTokenRow}>
                        <TouchableOpacity 
                          style={styles.savedTokenBtn}
                          onPress={() => {
                            setTokenTypeToSpawn({ name: st.name, p: st.p, t: st.t });
                            spawnTokens(tokenQuantity, st.url, st.abilities);
                          }}
                        >
                           <View style={styles.savedTokenIcon}>
                             {st.url ? <Image source={{ uri: st.url }} style={styles.savedTokenImg} /> : <Circle color="#b30000" size={16} />}
                           </View>
                           <View>
                             <Text style={styles.savedTokenName}>
                               {st.p !== null ? `${st.p}/${st.t} ` : ''}{st.name}
                             </Text>
                             {st.abilities?.length > 0 && (
                               <Text style={styles.savedTokenMeta}>{st.abilities.join(', ')}</Text>
                             )}
                           </View>
                        </TouchableOpacity>
                        <View style={styles.savedTokenActions}>
                          <TouchableOpacity onPress={() => {
                            const newSaved = [...savedTokens];
                            newSaved[idx].isHearted = !newSaved[idx].isHearted;
                            setSavedTokens(newSaved.sort((a,b) => (b.isHearted?1:0) - (a.isHearted?1:0)));
                          }}>
                            <Heart color={st.isHearted ? "#b30000" : "#ccc"} fill={st.isHearted ? "#b30000" : "transparent"} size={18} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setSavedTokens(prev => prev.filter((_, i) => i !== idx))}>
                            <Trash2 color="#ff4d4d" size={18} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity 
                    style={styles.chooseTypeStartBtn} 
                    onPress={() => {
                      setTokenSearch('');
                      setTokenStep(2);
                    }}
                  >
                    <LayoutGrid color="#fff" size={20} />
                    <Text style={styles.chooseTypeStartText}>CHOOSE TOKEN TYPE</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.customTokenInlineBtn} 
                    onPress={() => {
                      setPendingToken({ name: '', p: null, t: null, abilities: [] });
                      setTokenStep(2);
                    }}
                  >
                    <Text style={styles.customTokenInlineText}>+ CREATE CUSTOM TOKEN</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            ) : tokenStep === 2 ? (
              <View style={styles.tokenFlowStep}>
                 <Text style={styles.stepTitle}>STEP 1: SELECT TYPE</Text>
                 <TextInput 
                   style={styles.tokenSearchInput}
                   placeholder="Search (e.g. Elf, Treasure...)"
                   placeholderTextColor="#aaa"
                   value={tokenSearch}
                   onChangeText={setTokenSearch}
                   returnKeyType="done"
                   onSubmitEditing={() => Keyboard.dismiss()}
                   autoFocus
                 />
                 <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={styles.tokenGridSearch}>
                   {COMMON_TOKENS
                     .filter(t => t.name.toLowerCase().includes(tokenSearch.toLowerCase()))
                     .sort((a,b) => a.name.localeCompare(b.name))
                     .map(token => (
                       <TouchableOpacity 
                         key={token.id} 
                         style={styles.tokenSearchRow} 
                         onPress={() => {
                           setPendingToken({ ...token, abilities: [], p: token.p, t: token.t });
                           setTokenStep(3);
                         }}
                       >
                         <Text style={styles.tokenSearchRowText}>{token.name.toUpperCase()}</Text>
                       </TouchableOpacity>
                     ))
                   }
                   <TouchableOpacity 
                     style={[styles.tokenSearchRow, { backgroundColor: '#f0f0f0', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' }]} 
                     onPress={() => {
                       setPendingToken({ name: tokenSearch || '', p: null, t: null, abilities: [] });
                       setTokenStep(2.5); // Dedicate step for custom name entry
                     }}
                   >
                     <Text style={[styles.tokenSearchRowText, { color: '#666' }]}>+ USE CUSTOM NAME {tokenSearch ? `: "${tokenSearch}"` : ''}</Text>
                   </TouchableOpacity>
                 </ScrollView>
                 <TouchableOpacity onPress={() => setTokenStep(1)} style={styles.stepBackBtn}>
                    <Text style={styles.stepBackText}>GO BACK</Text>
                 </TouchableOpacity>
              </View>
            ) : tokenStep === 2.5 ? (
              <View style={styles.tokenFlowStep}>
                 <Text style={styles.stepTitle}>STEP 1: CUSTOM NAME</Text>
                 <TextInput 
                   style={styles.tokenInput}
                   placeholder="Enter Name..."
                   placeholderTextColor="#aaa"
                   value={pendingToken.name}
                   onChangeText={val => setPendingToken(prev => ({ ...prev, name: val }))}
                   autoFocus
                   returnKeyType="done"
                   onSubmitEditing={() => {
                      if (pendingToken.name) setTokenStep(3);
                      else Keyboard.dismiss();
                   }}
                 />
                 <TouchableOpacity 
                   style={[styles.stepNextBtn, !pendingToken.name && { opacity: 0.5 }]} 
                   disabled={!pendingToken.name}
                   onPress={() => setTokenStep(3)}
                 >
                   <Text style={styles.stepNextText}>SET P/T & ABILITIES</Text>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => setTokenStep(2)} style={styles.stepBackBtn}>
                    <Text style={styles.stepBackText}>GO BACK TO SEARCH</Text>
                 </TouchableOpacity>
              </View>
            ) : tokenStep === 3 ? (
              <View style={styles.tokenFlowStep}>
                <Text style={styles.stepTitle}>STEP 2: POWER / TOUGHNESS</Text>
                
                <View style={styles.ptDualRow}>
                   <View style={styles.ptInputContainer}>
                     <Text style={styles.ptInputLabel}>POWER</Text>
                     <TextInput 
                       style={styles.ptActionInput}
                       keyboardType="numeric"
                       value={pendingToken.p !== null ? String(pendingToken.p) : ''}
                       onChangeText={val => setPendingToken(prev => ({ ...prev, p: val }))}
                       placeholder="0"
                       placeholderTextColor="#eee"
                       autoFocus
                       returnKeyType="done"
                       onSubmitEditing={() => Keyboard.dismiss()}
                     />
                   </View>
                   <View style={styles.ptInputContainer}>
                     <Text style={styles.ptInputLabel}>TOUGHNESS</Text>
                     <TextInput 
                       style={styles.ptActionInput}
                       keyboardType="numeric"
                       value={pendingToken.t !== null ? String(pendingToken.t) : ''}
                       onChangeText={val => setPendingToken(prev => ({ ...prev, t: val }))}
                       placeholder="0"
                       placeholderTextColor="#eee"
                       returnKeyType="done"
                       onSubmitEditing={() => Keyboard.dismiss()}
                     />
                   </View>
                </View>

                <TouchableOpacity style={styles.stepNextBtn} onPress={() => setTokenStep(4)}>
                   <Text style={styles.stepNextText}>CONTINUE TO ABILITIES</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setTokenStep(2)} style={styles.stepBackBtn}>
                    <Text style={styles.stepBackText}>GO BACK</Text>
                </TouchableOpacity>
              </View>
            ) : tokenStep === 4 ? (
              <View style={styles.tokenFlowStep}>
                 <Text style={styles.stepTitle}>STEP 3: ADD ABILITIES</Text>
                 <View style={styles.abilityGrid}>
                   {['Flying', 'Lifelink', 'Deathtouch', 'Vigilance', 'Trample', 'Haste', 'Ward 1', 'Indestructible'].map(ab => (
                     <TouchableOpacity 
                       key={ab} 
                       style={[styles.abilityChip, pendingToken.abilities.includes(ab) && styles.abilityChipActive]}
                       onPress={() => {
                         const abs = pendingToken.abilities.includes(ab) 
                           ? pendingToken.abilities.filter(a => a !== ab)
                           : [...pendingToken.abilities, ab];
                         setPendingToken(prev => ({ ...prev, abilities: abs }));
                       }}
                     >
                        <Text style={[styles.abilityChipText, pendingToken.abilities.includes(ab) && styles.abilityChipTextActive]}>{ab}</Text>
                     </TouchableOpacity>
                   ))}
                 </View>
                 <TouchableOpacity style={styles.stepNextBtn} onPress={() => {
                    setTokenTypeToSpawn({ name: pendingToken.name, p: pendingToken.p, t: pendingToken.t });
                    openTokenArtPicker(pendingToken.name, pendingToken.p, pendingToken.t);
                    setTokenStep(5);
                 }}>
                   <Text style={styles.stepNextText}>FIND ART & SPAWN</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setTokenStep(3)} style={styles.stepBackBtn}>
                    <Text style={styles.stepBackText}>GO BACK</Text>
                </TouchableOpacity>
              </View>
            ) : tokenStep === 5 ? (
              <View style={styles.artPickerContainer}>
                <Text style={styles.artPickerSubtitle}>CHOOSE ART FOR {pendingToken.name.toUpperCase()}</Text>
                {loadingTokenArt ? (
                  <ActivityIndicator color="#b30000" size="large" style={{ margin: 40 }} />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artList}>
                    {tokenArtOptions.length > 0 ? tokenArtOptions.map((print, idx) => (
                      <TouchableOpacity key={idx} style={styles.artOption} onPress={() => {
                        const img = ScryfallService.getImageUrl(print);
                        spawnTokens(tokenQuantity, img, pendingToken.abilities);
                        // Save to quick spawn
                        if (!savedTokens.some(s => s.name === pendingToken.name && s.p === pendingToken.p && s.t === pendingToken.t)) {
                           setSavedTokens(prev => [{ ...pendingToken, url: img, isHearted: false }, ...prev].slice(0, 10));
                        }
                        setShowTokenModal(false);
                      }}>
                        <Image source={{ uri: ScryfallService.getImageUrl(print, 'small') }} style={styles.artThumb} />
                        <Text style={styles.artSetName}>{print.set_name}</Text>
                      </TouchableOpacity>
                    )) : (
                      <TouchableOpacity style={styles.artOption} onPress={() => {
                        spawnTokens(tokenQuantity, null, pendingToken.abilities);
                        setShowTokenModal(false);
                      }}>
                        <View style={[styles.artThumb, {backgroundColor: '#eee', justifyContent:'center', alignItems:'center'}]}><LayoutGrid color="#ccc" /></View>
                        <Text style={styles.artSetName}>Default Art</Text>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                )}
                <TouchableOpacity onPress={() => setTokenStep(4)} style={styles.backToTypesBtn}>
                  <Text style={styles.backToTypesText}>BACK TO ABILITIES</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

            <TouchableOpacity 
              style={[styles.startTargetingBtn, { marginTop: 'auto' }]} 
              onPress={() => { setShowTokenModal(false); setTokenStep(1); }}
            >
              <Text style={styles.startTargetingText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Library Menu Modal */}
      <Modal visible={showLibraryMenu} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowLibraryMenu(false)}>
          <View style={styles.libraryMenuContainer}>
            <Text style={styles.menuTitle}>LIBRARY ACTIONS</Text>
            
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => { drawCard(); setShowLibraryMenu(false); }}
            >
              <Plus color="#333" size={24} />
              <Text style={styles.menuItemText}>Draw Card</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => { shuffleLibrary(); setShowLibraryMenu(false); }}
            >
              <RefreshCcw color="#333" size={24} />
              <Text style={styles.menuItemText}>Shuffle Library</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => { setShowLibrarySearch(true); setShowLibraryMenu(false); }}
            >
              <LayoutGrid color="#333" size={24} />
              <Text style={styles.menuItemText}>Search Library</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowLibraryMenu(false);
                if (Platform.OS === 'web') {
                  const raw = window.prompt('How many cards to mill?', '1');
                  const count = parseInt(raw);
                  if (!isNaN(count) && count > 0) millCards(count);
                } else {
                  Alert.prompt('Mill', 'How many cards to mill?', (raw) => {
                    const count = parseInt(raw);
                    if (!isNaN(count) && count > 0) millCards(count);
                  });
                }
              }}
            >
              <Trash2 color="#333" size={24} />
              <Text style={styles.menuItemText}>Mill Cards</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, {marginTop: 10, borderTopWidth: 0}]} 
              onPress={() => setShowLibraryMenu(false)}
            >
              <Text style={[styles.menuItemText, {color: '#999'}]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Library Search Modal */}
      <Modal visible={showLibrarySearch} transparent animationType="slide">
        <View style={styles.searchModalContainer}>
          <View style={styles.searchHeader}>
            <Text style={styles.searchTitle}>SEARCH LIBRARY</Text>
            <TouchableOpacity onPress={() => setShowLibrarySearch(false)}>
              <XCircle color="#333" size={24} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={[...library].sort((a, b) => a.name.localeCompare(b.name))}
            keyExtractor={(item) => item.instanceId}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.searchItem}
                onLongPress={() => openGallery([...library].sort((a, b) => a.name.localeCompare(b.name)), item)}
              >
                <Image 
                  source={{ uri: ScryfallService.getImageUrl(item, 'small') }} 
                  style={styles.searchThumb} 
                />
                <View style={styles.searchItemInfo}>
                  <Text style={styles.searchItemName}>{item.name}</Text>
                  <Text style={styles.searchItemType}>{item.type_line}</Text>
                </View>
                <View style={styles.searchActions}>
                  <TouchableOpacity 
                    style={styles.searchActionBtn}
                    onPress={() => searchLibraryAndMove(item.instanceId, 'hand')}
                  >
                    <Text style={styles.searchActionText}>HAND</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.searchActionBtn, styles.searchActionBtnPrimary]}
                    onPress={() => searchLibraryAndMove(item.instanceId, 'battlefield')}
                  >
                    <Text style={[styles.searchActionText, {color: '#fff'}]}>FIELD</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ padding: 15 }}
          />
          <View style={styles.searchFooter}>
            <Text style={styles.searchFooterText}>Selecting a card will automatically shuffle your library.</Text>
          </View>
        </View>
      </Modal>

      {/* Selective Action Quantity Modal */}
      <Modal visible={!!activeQuantityAction} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setActiveQuantityAction(null)}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 65 : 25}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}
          >
            <Pressable style={styles.counterModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.modalTitle}>{activeQuantityAction?.action} QUANTITY</Text>
              <TouchableOpacity onPress={() => setActiveQuantityAction(null)}>
                <XCircle color="#333" size={24} />
              </TouchableOpacity>
            </View>
            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.qtyLabel, { textAlign: 'center' }]}>Choose how many to {activeQuantityAction?.action.toLowerCase()}:</Text>
            </View>

            <View style={styles.quantityRow}>
              <View style={styles.qtyControls}>
                <TouchableOpacity onPress={() => setModalQuantity(Math.max(1, modalQuantity - 1))} style={styles.qtyBtn}>
                  <Minus color="#333" size={20} />
                </TouchableOpacity>
                <TextInput 
                  style={styles.qtyVal}
                  keyboardType="numeric"
                  value={String(modalQuantity)}
                  onChangeText={(val) => setModalQuantity(Math.min(activeQuantityAction?.max || 1, parseInt(val) || 0))}
                  selectTextOnFocus
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
                <TouchableOpacity onPress={() => setModalQuantity(Math.min(activeQuantityAction?.max || 1, modalQuantity + 1))} style={styles.qtyBtn}>
                  <Plus color="#333" size={20} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.startTargetingBtn, { marginTop: 30 }]} 
              onPress={() => performQuantityAction(modalQuantity)}
            >
              <Text style={styles.startTargetingBtnText}>CONFIRM {activeQuantityAction?.action}</Text>
            </TouchableOpacity>
          </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* End-of-Game Result Modal */}
      <Modal visible={showResultModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.resultModal}>
            <Text style={styles.resultTitle}>LOG RESULT</Text>
            <Text style={styles.resultSubtitle}>Turn {turnNumber} · {fullDeckData?.name}</Text>
            <TouchableOpacity
              style={[styles.resultBtn, { backgroundColor: '#2d8a4e' }]}
              onPress={async () => {
                if (fullDeckData?.id) await StorageService.recordResult(fullDeckData.id, 'win', { deckName: fullDeckData.name, turnCount: turnNumber });
                setShowResultModal(false);
                selectDeck(fullDeckData);
              }}
            >
              <Text style={styles.resultBtnText}>🏆  WIN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.resultBtn, { backgroundColor: '#b30000' }]}
              onPress={async () => {
                if (fullDeckData?.id) await StorageService.recordResult(fullDeckData.id, 'loss', { deckName: fullDeckData.name, turnCount: turnNumber });
                setShowResultModal(false);
                selectDeck(fullDeckData);
              }}
            >
              <Text style={styles.resultBtnText}>💀  LOSS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resultSkip}
              onPress={() => { setShowResultModal(false); selectDeck(fullDeckData); }}
            >
              <Text style={styles.resultSkipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Zone Inventory Modal (Graveyard/Exile) */}
      <Modal visible={!!showZoneModal} transparent animationType="slide">
        <View style={styles.searchModalContainer}>
          <View style={[styles.searchHeader, {backgroundColor: showZoneModal === 'exile' ? '#f5f5f5' : '#fff'}]}>
            <Text style={styles.searchTitle}>{showZoneModal?.toUpperCase()}</Text>
            <TouchableOpacity onPress={() => setShowZoneModal(null)}>
              <XCircle color="#333" size={24} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={showZoneModal === 'exile' ? exile : graveyard}
            keyExtractor={(item) => item.instanceId}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.searchItem}
                onLongPress={() => openGallery(showZoneModal === 'exile' ? exile : graveyard, item)}
              >
                <Image 
                  source={{ uri: ScryfallService.getImageUrl(item, 'small') }} 
                  style={styles.searchThumb} 
                />
                <View style={styles.searchItemInfo}>
                  <Text style={styles.searchItemName}>{item.name}</Text>
                  <Text style={styles.searchItemType}>{item.type_line}</Text>
                </View>
                <View style={[styles.searchActions, {flexWrap: 'wrap', maxWidth: 150, justifyContent: 'flex-end'}]}>
                  <TouchableOpacity
                    style={styles.searchActionBtn}
                    onPress={() => { moveCard(item.instanceId, showZoneModal, 'hand'); if ((showZoneModal === 'exile' ? exile : graveyard).length <= 1) setShowZoneModal(null); }}
                  >
                    <Text style={styles.searchActionText}>HAND</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.searchActionBtn}
                    onPress={() => { moveCard(item.instanceId, showZoneModal, 'battlefield'); if ((showZoneModal === 'exile' ? exile : graveyard).length <= 1) setShowZoneModal(null); }}
                  >
                    <Text style={styles.searchActionText}>FIELD</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.searchActionBtn, styles.searchActionBtnPrimary]}
                    onPress={() => { moveCard(item.instanceId, showZoneModal, 'library'); if ((showZoneModal === 'exile' ? exile : graveyard).length <= 1) setShowZoneModal(null); }}
                  >
                    <Text style={[styles.searchActionText, {color: '#fff'}]}>DECK</Text>
                  </TouchableOpacity>

                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ padding: 15 }}
          />
          <View style={styles.searchFooter}>
            <Text style={styles.searchFooterText}>Tutor cards back to any zone. Long-press to zoom.</Text>
          </View>
        </View>
      </Modal>

      {/* Universal Card Gallery Modal */}
      <Modal visible={!!previewCard} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => { setPreviewCard(null); setGalleryCards([]); }}>
          <View style={styles.galleryContainer}>
            {galleryCards.length > 0 && (
              <View style={styles.gallerySlide}>
                <Image
                  source={{ uri: ScryfallService.getImageUrl(galleryCards[galleryIndex], 'normal') }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
                <Text style={styles.dismissTextUnderCard}>
                  {galleryCards.length > 1 ? `${galleryIndex + 1} / ${galleryCards.length} • ` : ''}Tap background to close
                </Text>
              </View>
            )}

            {galleryIndex > 0 && (
              <TouchableOpacity
                style={[styles.galleryArrow, styles.leftArrow]}
                onPress={(e) => { e.stopPropagation?.(); navGallery(-1); }}
              >
                <ChevronLeft color="#fff" size={48} />
              </TouchableOpacity>
            )}

            {galleryIndex < galleryCards.length - 1 && (
              <TouchableOpacity
                style={[styles.galleryArrow, styles.rightArrow]}
                onPress={(e) => { e.stopPropagation?.(); navGallery(1); }}
              >
                <ChevronRight color="#fff" size={48} />
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Playtest Notes Modal */}
      <Modal visible={showNotesModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowNotesModal(false)}>
          <View style={styles.notesContainer}>
            <View style={styles.notesHeader}>
              <Text style={styles.notesTitle}>PLAYTEST INSIGHTS</Text>
              <TouchableOpacity onPress={saveDeckNote} style={styles.saveNoteBtn}>
                <CheckCircle color="#fff" size={20} />
                <Text style={styles.saveNoteText}>SAVE</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.notesInput}
              multiline
              placeholder="What changes does this deck need? (e.g., Needs more card draw, too slow on turn 3...)"
              placeholderTextColor="#999"
              value={currentNotes}
              onChangeText={setCurrentNotes}
              autoFocus
            />
            <TouchableOpacity onPress={() => setShowNotesModal(false)} style={styles.cancelNoteBtn}>
              <Text style={styles.cancelNoteText}>DISCARD CHANGES</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Mulligan Modal */}
      <Modal visible={showMulliganModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowMulliganModal(false)}>
          <View style={styles.mulliganContent}>
            <Text style={styles.mullTitle}>CHOOSE MULLIGAN TYPE</Text>
            <Text style={styles.mullSub}>Current Mulligan Count: {mulliganCount}</Text>
            
            <TouchableOpacity style={styles.mullOption} onPress={() => mulligan('london')}>
              <Text style={styles.mullOptionText}>London Mulligan</Text>
              <Text style={styles.mullOptionSub}>Draw 7, then bottom {mulliganCount + 1} cards.</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mullOption} onPress={() => mulligan('multiplayer')}>
              <Text style={styles.mullOptionText}>Multiplayer Style</Text>
              <Text style={styles.mullOptionSub}>{mulliganCount === 0 ? "First one is FREE! Draw 7 again." : `Draw 7, then bottom ${mulliganCount + 1}.`}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelMullBtn}
              onPress={() => {
                setShowMulliganModal(false);
                if (mulliganCount > 0) {
                  setBottomingState({ required: mulliganCount, selected: new Set(), hand: [...hand], library: [...library] });
                }
              }}
            >
              <Text style={styles.cancelMullText}>KEEP HAND</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Bottom cards selection modal */}
      <Modal visible={!!bottomingState} transparent animationType="slide">
        <View style={styles.bottomingOverlay}>
          <View style={styles.bottomingContent}>
            <Text style={styles.mullTitle}>PUT ON BOTTOM</Text>
            <Text style={styles.mullSub}>
              Select {bottomingState?.required} card{bottomingState?.required !== 1 ? 's' : ''} to bottom
              {bottomingState ? ` (${bottomingState.selected.size}/${bottomingState.required} chosen)` : ''}
            </Text>
            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
              {bottomingState?.hand.map(card => {
                const isSelected = bottomingState.selected.has(card.instanceId);
                return (
                  <TouchableOpacity
                    key={card.instanceId}
                    style={[styles.bottomCardRow, isSelected && styles.bottomCardRowSelected]}
                    onPress={() => toggleBottomCard(card.instanceId)}
                    onLongPress={() => setBottomingZoom(card)}
                  >
                    <Image
                      source={{ uri: ScryfallService.getImageUrl(card, 'small') }}
                      style={styles.bottomCardThumb}
                      resizeMode="contain"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bottomCardName} numberOfLines={1}>{card.name}</Text>
                      <Text style={styles.bottomCardType} numberOfLines={1}>{card.type_line}</Text>
                    </View>
                    <View style={[styles.bottomCheckbox, isSelected && styles.bottomCheckboxSelected]}>
                      {isSelected && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[
                styles.confirmBottomBtn,
                bottomingState?.selected.size !== bottomingState?.required && styles.confirmBottomBtnDisabled
              ]}
              disabled={bottomingState?.selected.size !== bottomingState?.required}
              onPress={confirmBottoming}
            >
              <Text style={styles.confirmBottomText}>CONFIRM — BOTTOM SELECTED</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ marginTop: 15, alignSelf: 'center' }} 
              onPress={() => setBottomingState(null)}
            >
              <Text style={{ color: '#aaa', fontWeight: '800', fontSize: 11, letterSpacing: 1 }}>CANCEL & START OVER</Text>
            </TouchableOpacity>

            {/* Card zoom overlay inside the modal */}
            {bottomingZoom && (
              <Pressable style={styles.bottomZoomOverlay} onPress={() => setBottomingZoom(null)}>
                <Image
                  source={{ uri: ScryfallService.getImageUrl(bottomingZoom, 'normal') }}
                  style={styles.bottomZoomImage}
                  resizeMode="contain"
                />
                <Text style={styles.bottomZoomHint}>Tap anywhere to dismiss</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      {/* Cross-platform game alert (replaces Alert.alert which doesn't work on web) */}
      <Modal visible={!!gameAlert} transparent animationType="fade">
        <Pressable style={styles.gameAlertOverlay} onPress={() => { gameAlert?.onCancel?.(); setGameAlert(null); }}>
          <Pressable style={styles.gameAlertBox} onPress={e => e.stopPropagation()}>
            <Text style={styles.gameAlertMessage}>{gameAlert?.message}</Text>
            <View style={styles.gameAlertBtns}>
              <TouchableOpacity
                style={styles.gameAlertCancel}
                onPress={() => { gameAlert?.onCancel?.(); setGameAlert(null); }}
              >
                <Text style={styles.gameAlertCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.gameAlertConfirm}
                onPress={() => { gameAlert?.onConfirm?.(); setGameAlert(null); }}
              >
                <Text style={styles.gameAlertConfirmText}>{gameAlert?.confirmLabel || 'OK'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  gameAlertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameAlertBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 340,
    gap: 20,
  },
  gameAlertMessage: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
  },
  gameAlertBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  gameAlertCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  gameAlertCancelText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  gameAlertConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#b30000',
    alignItems: 'center',
  },
  gameAlertConfirmText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  indexContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  header: {
    marginTop: 20,
    marginBottom: 20,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#b30000',
    letterSpacing: 2,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  deckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  deckThumb: {
    width: 44,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
  },
  deckThumbPlaceholder: {
    width: 44,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  deckInfo: {
    flex: 1,
    marginLeft: 15,
  },
  deckName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a1a',
  },
  deckMeta: {
    fontSize: 10,
    fontWeight: '900',
    color: '#b30000',
    letterSpacing: 1,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 20,
    paddingTop: 5,
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    paddingRight: 15,
  },
  headerTitleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
  },
  undoText: {
    color: '#b30000',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a1a',
  },
  utilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 15,
  },
  turnIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  turnLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: '#999',
    letterSpacing: 1,
  },
  turnVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a1a',
  },
  emblemScroll: {
    flex: 1,
  },
  emblemChip: {
    backgroundColor: '#fff8e1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ff8f00',
    marginRight: 8,
    height: 30,
    justifyContent: 'center',
  },
  emblemText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ff8f00',
    letterSpacing: 0.5,
  },
  addEmblemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
    height: 30,
  },
  addEmblemText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#999',
  },
  stockArea: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    gap: 16,
  },
  stockItem: {
    alignItems: 'center',
  },
  stockCardBack: {
    width: 44,
    height: 62,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  emptyStock: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCommanderZone: {
    borderColor: '#b30000',
    borderWidth: 3,
    transform: [{ scale: 1.05 }],
  },
  stockCount: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#b30000',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  stockCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stockLabel: {
    fontSize: 7,
    fontWeight: '900',
    marginTop: 4,
    color: '#999',
    letterSpacing: 1,
  },
  manaHUD: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  manaGem: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  manaGemW: { backgroundColor: '#e8d8b1' }, // Deeper Tan/White
  manaGemU: { backgroundColor: '#3b82f6' }, // Blue
  manaGemB: { backgroundColor: '#1a1a1a' }, // Black
  manaGemR: { backgroundColor: '#ef4444' }, // Red
  manaGemG: { backgroundColor: '#22c55e' }, // Green
  manaGemC: { backgroundColor: '#94a3b8' }, // Colorless
  emptyGem: { opacity: 0.3 },
  manaGemText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
  },
  headerLifeArea: {
    alignItems: 'flex-end',
  },
  oppLifeTitle: {
    fontSize: 7,
    fontWeight: '900',
    color: '#999',
    marginBottom: 2,
  },
  lifeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lifeValSmall: {
    fontSize: 24,
    fontWeight: '900',
    color: '#333',
    minWidth: 30,
    textAlign: 'center',
  },
  battlefieldContainer: {
    flex: 1,
    position: 'relative',
  },
  battlefieldScroll: {
    flex: 1,
  },
  battlefieldContent: {
    flexGrow: 1,
  },
  mulliganChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a0b2e',
    borderBottomWidth: 1,
    borderBottomColor: '#a855f733',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mulliganChipLabel: {
    color: '#d8b4fe',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    flex: 1,
  },
  mulliganChipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2e1065',
    borderWidth: 1,
    borderColor: '#7c3aed55',
  },
  mulliganChipKeep: {
    backgroundColor: '#2d8a4e',
    borderColor: '#2d8a4e',
  },
  mulliganChipBtnText: {
    color: '#d8b4fe',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptyBattlefield: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 60,
  },
  placeholderText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  shuffleToast: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 200,
  },
  shuffleToastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  battlefieldGrid: {
    padding: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
  },
  dropZoneOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(179,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  dropZoneIndicator: {
    backgroundColor: '#b30000',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  dropZoneText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  landIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 2,
    borderRadius: 4,
  },
  cardContainer: {
    width: 100,
    aspectRatio: 0.72,
    marginBottom: 15,
    position: 'relative',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  commanderBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#f0d78c',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#856404',
  },
  commanderBadgeText: {
    color: '#856404',
    fontSize: 8,
    fontWeight: 'bold',
  },
  targetingCard: {
    borderColor: '#b30000',
    borderWidth: 2,
  },
  targetingOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(179,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tappedCard: {
    backgroundColor: 'transparent',
  },
  tappedImage: {
    opacity: 0.7,
    transform: [{ rotate: '90deg' }, { scale: 0.8 }], // Scaled down slightly more to fit 2-across when tapped
  },
  summoningSicknessImage: {
    opacity: 0.7,
    transform: [{ rotate: '180deg' }],
  },
  cardActionsOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    borderRadius: 6,
    zIndex: 50,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
    padding: 4,
  },
  actionBtnCombat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#b30000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  actionBtnSplit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  actionBtnTap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  actionBtnClose: {
    marginTop: 5,
    padding: 5,
  },
  actionBtnHaste: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffd700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  actionBtnETBTapped: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6c5ce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  actionBtnTextDark: {
    color: '#333',
  },
  dropText: {
    color: '#b30000',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 10,
    letterSpacing: 1,
  },
  handHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 15,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#b30000',
    letterSpacing: 1,
  },
  handCardWrapper: {
    borderRadius: 6,
    padding: 2,
  },
  selectedHandCard: {
    backgroundColor: '#b30000',
    elevation: 10,
    shadowColor: '#b30000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  discardableCard: {
    borderWidth: 2,
    borderColor: '#ff8f00',
    borderRadius: 6,
  },
  discardBadge: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  discardBadgeText: {
    backgroundColor: 'rgba(255,143,0,0.85)',
    color: '#fff',
    fontSize: 7,
    fontWeight: '900',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  nextTurnBtn: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  nextTurnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  tempCounterBadge: {
    backgroundColor: 'rgba(179,0,0,0.8)',
    borderWidth: 1,
    borderColor: '#ffd700',
  },
  topCardOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 10,
  },
  counterList: {
    flexDirection: 'column',
    gap: 2,
  },
  counterBadge: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  counterBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
  ptOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  ptText: {
    color: '#333',
    fontWeight: '900',
    fontSize: 11,
  },
  zoneActionsContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    flexDirection: 'row',
    gap: 4,
    zIndex: 100,
  },
  zoneActionBtn: {
    backgroundColor: '#b30000',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
  },
  bottomArea: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  handContainer: {
    paddingVertical: 10,
    paddingLeft: 15,
    backgroundColor: '#fcfcfc',
  },
  handTitle: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#ccc',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sortBtnText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#b30000',
    letterSpacing: 1,
  },
  handList: {
    gap: 10,
    paddingRight: 20,
  },
  handCard: {
    width: 70,
    height: 98,
    borderRadius: 6,
    backgroundColor: '#eee',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 5,
    gap: 15,
  },
  floatingCounterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  activeCounterBtn: {
    backgroundColor: '#b30000',
    borderColor: '#b30000',
  },
  commanderBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fffcf0',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#f0d78c',
  },
  playerLifeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#b30000',
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 10,
    gap: 8,
  },
  playerLifeCircle: {
    alignItems: 'center',
    minWidth: 30,
  },
  playerLifeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  handScore: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  poisonDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#2d8a4e',
  },
  poisonCircle: {
    alignItems: 'center',
    minWidth: 32,
  },
  poisonIcon: {
    fontSize: 10,
  },
  poisonText: {
    color: '#2d8a4e',
    fontSize: 16,
    fontWeight: '900',
  },
  poisonTextDanger: {
    color: '#b30000',
  },
  targetingBanner: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#b30000',
    padding: 12,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10,
    zIndex: 1000,
  },
  targetingBannerText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 10,
  },
  cancelTargetingBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cancelTargetingText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  counterModalContent: {
    width: SCREEN_WIDTH > 500 ? 500 : '90%',
    height: SCREEN_HEIGHT * 0.8,
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 25,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#b30000',
    marginBottom: 20,
    textAlign: 'center',
  },
  counterTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  typeOption: {
    width: '45%',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  activeTypeOption: {
    backgroundColor: '#b30000',
    borderColor: '#b30000',
  },
  typeOptionText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#333',
  },
  activeTypeOptionText: {
    color: '#fff',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    gap: 20,
  },
  qtyLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#999',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  qtyVal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1a1a1a',
    minWidth: 60,
    textAlign: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  startTargetingBtn: {
    backgroundColor: '#1a1a1a',
    padding: 18,
    borderRadius: 15,
    marginTop: 30,
    alignItems: 'center',
  },
  startTargetingText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    width: '94%',
    height: '85%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    color: '#fff',
    marginTop: 20,
    fontSize: 14,
    opacity: 0.5,
  },
  previewImage: {
    width: 300,
    height: 420,
  },
  galleryContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryContent: {
    alignItems: 'center',
  },
  gallerySlide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dismissTextUnderCard: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 20,
    opacity: 0.8,
    textAlign: 'center',
  },
  resultModal: {
    backgroundColor: '#fff',
    width: 300,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: 2,
  },
  resultSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  resultBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  resultBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  resultSkip: {
    marginTop: 4,
    padding: 8,
  },
  resultSkipText: {
    color: '#999',
    fontSize: 13,
  },
  notesContainer: {
    backgroundColor: '#fff8e1',
    width: '90%',
    height: '60%',
    borderRadius: 20,
    padding: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  tempToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#eee',
  },
  tempToggleActive: {
    backgroundColor: '#ff8f00',
    borderColor: '#ff8f00',
  },
  tempToggleText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#999',
    letterSpacing: 1,
  },
  mulliganContent: {
    backgroundColor: '#fff',
    width: '85%',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  mullTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#b30000',
    letterSpacing: 2,
    marginBottom: 5,
  },
  mullSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#999',
    marginBottom: 20,
  },
  mullOption: {
    width: '100%',
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
  },
  mullOptionText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a1a',
  },
  mullOptionSub: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  cancelMullBtn: {
    marginTop: 10,
    padding: 10,
  },
  cancelMullText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#999',
    letterSpacing: 1,
  },
  bottomingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  bottomingContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  bottomCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
  },
  bottomCardRowSelected: {
    borderColor: '#b30000',
    backgroundColor: '#2a1010',
  },
  bottomCardThumb: {
    width: 36,
    height: 50,
    borderRadius: 4,
  },
  bottomCardName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomCardType: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  bottomCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomCheckboxSelected: {
    backgroundColor: '#b30000',
    borderColor: '#b30000',
  },
  confirmBottomBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#b30000',
    alignItems: 'center',
  },
  confirmBottomBtnDisabled: {
    backgroundColor: '#333',
  },
  confirmBottomText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bottomZoomOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.92)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 50,
  },
  bottomZoomImage: {
    width: '100%',
    height: 380,
    borderRadius: 12,
  },
  bottomZoomHint: {
    color: '#555',
    fontSize: 11,
    marginTop: 12,
    letterSpacing: 1,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ff8f00',
    letterSpacing: 1,
  },
  saveNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff8f00',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  saveNoteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  notesInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  cancelNoteBtn: {
    alignItems: 'center',
    padding: 10,
    marginTop: 10,
  },
  cancelNoteText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  tokenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  tokenOption: {
    width: '45%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tokenOptionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a1a',
  },
  tokenOptionMeta: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 2,
  },
  customTokenArea: {
    marginTop: 25,
    padding: 20,
    backgroundColor: '#fffcf0',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#f0d78c',
    alignItems: 'center',
  },
  massBtn: {
    backgroundColor: '#b30000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  massBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  artPickerContainer: {
    width: '100%',
    alignItems: 'center',
  },
  artPickerSubtitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#999',
    marginBottom: 15,
    letterSpacing: 1,
  },
  artList: {
    paddingVertical: 10,
    gap: 15,
  },
  artOption: {
    alignItems: 'center',
    width: 100,
  },
  artThumb: {
    width: 80,
    height: 110,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  artSetName: {
    fontSize: 8,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  backToTypesBtn: {
    marginTop: 15,
    padding: 5,
  },
  backToTypesText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#b30000',
    textDecorationLine: 'underline',
  },
  libraryMenuContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  menuTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#999',
    letterSpacing: 2,
    marginBottom: 20,
  },
  menuItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 15,
  },
  menuItemText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },
  searchModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#333',
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  searchThumb: {
    width: 100,
    height: 140,
    borderRadius: 6,
    marginRight: 12,
  },
  searchItemInfo: {
    flex: 1,
  },
  searchItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  searchItemType: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  searchActions: {
    flexDirection: 'row',
    gap: 8,
  },
  searchActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  searchActionBtnPrimary: {
    backgroundColor: '#b30000',
  },
  searchActionText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#333',
  },
  searchFooter: {
    padding: 20,
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  searchFooterText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  turnBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 45,
  },
  turnLabel: {
    color: '#999',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 1,
  },
  turnVal: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  quantityBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#ff8f00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fff',
    zIndex: 10,
  },
  quantityBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  galleryArrow: {
    position: 'absolute',
    top: '40%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  leftArrow: {
    left: 10,
  },
  rightArrow: {
    right: 10,
  },
  handHeaderScroll: {
    backgroundColor: '#fff',
  },
  actionBarScroll: {
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
    backgroundColor: '#fff',
  },
  tokenTabHeader: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 15,
  },
  tokenTabLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#999',
    letterSpacing: 1.5,
  },
  quickSpawnList: {
    gap: 12,
  },
  savedTokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  savedTokenBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savedTokenIcon: {
    width: 32,
    height: 44,
    backgroundColor: '#eee',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  savedTokenImg: {
    width: '100%',
    height: '100%',
  },
  savedTokenName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#333',
  },
  savedTokenMeta: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  savedTokenActions: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    paddingLeft: 10,
  },
  emptySavedTokens: {
    padding: 30,
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fafafa',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#eee',
  },
  emptySavedText: {
    fontSize: 12,
    color: '#aaa',
    fontWeight: '600',
  },
  tokenFlowStep: {
    padding: 10,
    gap: 20,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#b30000',
    letterSpacing: 1,
    textAlign: 'center',
  },
  tokenInput: {
    backgroundColor: '#f5f5f5',
    padding: 18,
    borderRadius: 16,
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
    textAlign: 'center',
  },
  stepNextBtn: {
    backgroundColor: '#b30000',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  stepNextText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  stepBackBtn: {
    alignItems: 'center',
    marginTop: 10,
  },
  stepBackText: {
    color: '#999',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  ptDualRow: {
    flexDirection: 'row',
    gap: 15,
    justifyContent: 'center',
    marginTop: 10,
  },
  ptInputContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  ptInputLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#bbb',
    letterSpacing: 1.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  ptActionInput: {
    fontSize: 42,
    fontWeight: '900',
    color: '#333',
    width: '100%',
    textAlign: 'center',
    padding: 0,
    margin: 0,
    height: 60,
  },
  abilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  abilityChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  abilityChipActive: {
    backgroundColor: '#b30000',
    borderColor: '#b30000',
  },
  abilityChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
  },
  abilityChipTextActive: {
    color: '#fff',
  },
  chooseTypeStartBtn: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  chooseTypeStartText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  customTokenInlineBtn: {
    alignSelf: 'center',
    marginTop: 15,
    padding: 10,
  },
  customTokenInlineText: {
    color: '#999',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tokenSearchInput: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  tokenGridSearch: {
    gap: 8,
  },
  tokenSearchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  tokenSearchRowText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#333',
  },
  tokenSearchRowMeta: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
  },
});
