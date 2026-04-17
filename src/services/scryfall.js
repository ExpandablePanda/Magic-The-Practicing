const SCRYFALL_BASE_URL = 'https://api.scryfall.com';
export const CARD_BACK_URL = 'https://gamepedia.cursecdn.com/mtgsalvation_gamepedia/f/f8/Magic_card_back.jpg';

export const ScryfallService = {
  /**
   * Search for cards by name.
   * @param {string} query - The search query.
   * @returns {Promise<Array>} - A list of matching card objects.
   */
  async searchCards(query) {
    if (!query || query.length < 3) return [];
    
    try {
      const response = await fetch(`${SCRYFALL_BASE_URL}/cards/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.object === 'error') {
        console.error('Scryfall Error:', data.details);
        return [];
      }
      
      return data.data || [];
    } catch (error) {
      console.error('Fetch Error:', error);
      return [];
    }
  },

  /**
   * Get card details by ID.
   * @param {string} id - The Scryfall card ID.
   */
  async getCardById(id) {
    try {
      const response = await fetch(`${SCRYFALL_BASE_URL}/cards/${id}`);
      return await response.json();
    } catch (error) {
      console.error('Fetch Error:', error);
      return null;
    }
  },

  /**
   * Get dynamic image URL for a card.
   * Handles multi-faced cards.
   */
  getImageUrl(card, size = 'normal') {
    if (!card) return null;
    const SIZE_FALLBACKS = ['normal', 'large', 'small', 'png', 'border_crop', 'art_crop'];

    const pickUrl = (uris) => {
      if (!uris) return null;
      if (uris[size]) return uris[size];
      for (const s of SIZE_FALLBACKS) {
        if (uris[s]) return uris[s];
      }
      return null;
    };

    if (card.image_uris) return pickUrl(card.image_uris);
    if (card.card_faces?.[0]?.image_uris) return pickUrl(card.card_faces[0].image_uris);
    return null;
  },

  /**
   * Bulk lookup cards by name or ID.
   * @param {Array<Object>} identifiers - Array of { name: string } or { id: string }
   */
  async getCardsCollection(identifiers) {
    if (!identifiers || identifiers.length === 0) return [];
    
    try {
      // Scryfall allows up to 75 cards per request
      const response = await fetch(`${SCRYFALL_BASE_URL}/cards/collection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiers })
      });
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Collection Fetch Error:', error);
      return [];
    }
  },

  /**
   * Get all printings of a card by its oracle_id.
   * @param {string} oracleId - The Scryfall oracle ID.
   */
  async getAlternatePrintings(oracleId) {
    if (!oracleId) return [];
    
    try {
      const response = await fetch(`${SCRYFALL_BASE_URL}/cards/search?q=oracle_id:${oracleId}&unique=prints`);
      const data = await response.json();
      
      if (data.object === 'error') {
        console.error('Alternate Prints Error:', data.details);
        return [];
      }
      
      return data.data || [];
    } catch (error) {
      console.error('Fetch Alternate Prints Error:', error);
      return [];
    }
  },

  /**
   * Fetch unique artwork for a specific token name.
   */
  async fetchTokenPrints(name) {
    if (!name) return [];
    try {
      const response = await fetch(`${SCRYFALL_BASE_URL}/cards/search?q=t:token+name:"${encodeURIComponent(name)}"+unique:art`);
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Token Art Fetch Error:', error);
      return [];
    }
  }
};
