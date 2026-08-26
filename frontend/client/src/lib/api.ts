import type { Property, Issue } from "@shared/schema";
import { API_BASE_URL } from "./config";

export interface PropertyFeatures {
  type?: string | null;
  lotSize?: string | null;
  hoaFee?: string | null;
  roofType?: string | null;
  foundationDetails?: string | null;
  constructionMaterials?: string | null;
  heating?: string | null;
  cooling?: string | null;
  appliances?: string | null;
  fireplaceFeatures?: string | null;
  windowFeatures?: string | null;
  flooring?: string | null;
  fencing?: string | null;
  basement?: string | null;
  parking?: string | null;
  stories?: string | null;
}

export interface PropertyWithIssues extends Property {
  issues: Issue[];
  features?: PropertyFeatures;
}

export { API_BASE_URL, API_TARGET, API_TARGETS, type ApiTarget } from "./config";

export const api = {
  async getProperties(): Promise<Property[]> {
    const response = await fetch(`${API_BASE_URL}/properties`);
    if (!response.ok) {
      throw new Error("Failed to fetch properties");
    }
    return response.json();
  },

  async getProperty(id: string): Promise<PropertyWithIssues> {
    const response = await fetch(`${API_BASE_URL}/properties/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch property");
    }
    return response.json();
  },

  async createProperty(property: {
    address: string;
    city: string;
    state: string;
    zip: string;
    price: string;
    beds: number;
    baths: number;
    sqft: number;
    yearBuilt: number;
    description: string;
    images: Array<{
      id: string;
      url: string;
      label: string;
    }>;
    priceHistory?: Array<{ year: string; price: number }>;
    schools?: Array<{ name: string; type: string; grades: string; rating: number; distance: string }>;
  }): Promise<Property> {
    const response = await fetch(`${API_BASE_URL}/properties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(property),
    });
    if (!response.ok) {
      throw new Error("Failed to create property");
    }
    return response.json();
  },

  async analyzeProperty(id: string): Promise<PropertyWithIssues> {
    const response = await fetch(`${API_BASE_URL}/properties/${id}/analyze`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Failed to analyze property");
    }
    const data = await response.json();
    return { ...data.property, issues: data.issues };
  },

  async deleteProperty(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/properties/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete property");
    }
  },
};
