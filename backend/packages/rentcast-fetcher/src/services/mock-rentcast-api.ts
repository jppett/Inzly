// Mock RentCast API service that provides realistic property data
// This allows the POC to work without requiring real RentCast API access

export interface RentCastPropertyData {
  address: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  yearBuilt: number;
  lotSize: number;
  estimatedValue: number;
  rentEstimate: {
    high: number;
    low: number;
    median: number;
  };
  comparableProperties: Array<{
    address: string;
    distance: number;
    bedrooms: number;
    bathrooms: number;
    squareFootage: number;
    lastSalePrice: number;
    lastSaleDate: string;
  }>;
  marketMetrics: {
    averageDaysOnMarket: number;
    pricePerSquareFoot: number;
    appreciationRate: number;
  };
  location: {
    latitude: number;
    longitude: number;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  propertyHistory: Array<{
    date: string;
    event: 'sale' | 'listing' | 'delisting';
    price?: number;
    description: string;
  }>;
}

export class MockRentCastAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = 'https://api.rentcast.io', apiKey: string = 'mock-key') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Mock property data fetch - generates realistic data based on address
   */
  async getPropertyData(address: string): Promise<RentCastPropertyData> {
    console.log(`🏠 [MOCK] Fetching RentCast data for: ${address}`);
    
    // Simulate API delay
    await this.delay(1000 + Math.random() * 2000);

    // Generate deterministic but varied data based on address hash
    const addressHash = this.hashString(address);
    const random = this.seededRandom(addressHash);

    // Extract location info from address (basic parsing)
    const addressParts = address.split(',').map(s => s.trim());
    const streetAddress = addressParts[0] || address;
    const city = addressParts[1] || 'Springfield';
    const state = addressParts[2] || 'IL';

    const baseValue = 200000 + (random() * 500000);
    const sqft = 1000 + Math.floor(random() * 2500);
    const bedrooms = 2 + Math.floor(random() * 4);
    const bathrooms = 1 + Math.floor(random() * 3.5);

    const mockData: RentCastPropertyData = {
      address: address,
      propertyType: this.randomChoice(['Single Family', 'Condo', 'Townhouse'], random),
      bedrooms,
      bathrooms,
      squareFootage: sqft,
      yearBuilt: 1950 + Math.floor(random() * 70),
      lotSize: Math.floor(5000 + random() * 10000),
      estimatedValue: Math.floor(baseValue),
      rentEstimate: {
        low: Math.floor(baseValue * 0.004),
        median: Math.floor(baseValue * 0.005),
        high: Math.floor(baseValue * 0.006),
      },
      comparableProperties: this.generateComparables(streetAddress, baseValue, random),
      marketMetrics: {
        averageDaysOnMarket: Math.floor(20 + random() * 60),
        pricePerSquareFoot: Math.floor(baseValue / sqft),
        appreciationRate: Math.round((2 + random() * 8) * 100) / 100,
      },
      location: {
        latitude: 39.7817 + (random() - 0.5) * 2,
        longitude: -89.6501 + (random() - 0.5) * 2,
        neighborhood: this.randomChoice(['Downtown', 'Riverside', 'Oak Park', 'Pine Valley'], random),
        city,
        state,
        zipCode: String(60000 + Math.floor(random() * 9999)),
      },
      propertyHistory: this.generatePropertyHistory(baseValue, random),
    };

    console.log(`✅ [MOCK] Generated property data for ${address}: $${mockData.estimatedValue.toLocaleString()}`);
    
    return mockData;
  }

  /**
   * Health check for the mock service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
    return {
      status: 'healthy',
      message: 'Mock RentCast API is ready'
    };
  }

  // Helper methods for generating realistic mock data

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private seededRandom(seed: number): () => number {
    let x = seed;
    return () => {
      x = Math.sin(x) * 10000;
      return x - Math.floor(x);
    };
  }

  private randomChoice<T>(choices: T[], random: () => number): T {
    return choices[Math.floor(random() * choices.length)];
  }

  private generateComparables(baseAddress: string, baseValue: number, random: () => number): Array<any> {
    const comparables = [];
    const count = 3 + Math.floor(random() * 3);
    
    for (let i = 0; i < count; i++) {
      const valueVariation = 0.8 + random() * 0.4; // ±20% variation
      const sqftVariation = 0.9 + random() * 0.2; // ±10% variation
      
      comparables.push({
        address: `${100 + Math.floor(random() * 900)} ${this.randomChoice(['Oak', 'Pine', 'Main', 'Elm'], random)} St`,
        distance: Math.round((0.1 + random() * 0.5) * 100) / 100,
        bedrooms: 2 + Math.floor(random() * 4),
        bathrooms: 1 + Math.floor(random() * 3),
        squareFootage: Math.floor(1000 * sqftVariation),
        lastSalePrice: Math.floor(baseValue * valueVariation),
        lastSaleDate: this.randomDate(random),
      });
    }
    
    return comparables;
  }

  private generatePropertyHistory(baseValue: number, random: () => number): Array<any> {
    const history = [];
    const events = Math.floor(2 + random() * 4);
    
    for (let i = 0; i < events; i++) {
      const eventType = this.randomChoice(['sale', 'listing', 'delisting'] as const, random);
      const daysAgo = Math.floor(30 + random() * 1800); // 1 month to 5 years ago
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      
      history.push({
        date: date.toISOString().split('T')[0],
        event: eventType,
        price: eventType === 'sale' ? Math.floor(baseValue * (0.8 + random() * 0.4)) : undefined,
        description: this.getEventDescription(eventType, random),
      });
    }
    
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private randomDate(random: () => number): string {
    const daysAgo = Math.floor(30 + random() * 365);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  }

  private getEventDescription(eventType: string, random: () => number): string {
    const descriptions = {
      sale: ['Property sold', 'Completed sale', 'Sale transaction recorded'],
      listing: ['Listed for sale', 'Property listed on market', 'New listing'],
      delisting: ['Removed from market', 'Listing withdrawn', 'Delisted by owner'],
    };
    
    return this.randomChoice(descriptions[eventType as keyof typeof descriptions] || ['Property event'], random);
  }
}