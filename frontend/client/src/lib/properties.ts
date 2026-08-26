export type Severity = "critical" | "warning" | "info" | "good";

export interface Issue {
  id: string; // Add ID for linking
  title: string;
  description: string;
  severity: Severity;
  category: string;
  costEstimate?: string;
  imageLocation?: { // Add coordinates for the dot overlay
    imageId: "hero" | "living" | "kitchen" | "backyard";
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
  };
}

export interface PropertyData {
  id: string;
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
  foundlyScore: number;
  images: {
    hero: string;
    living: string;
    kitchen: string;
    backyard: string;
  };
  issues: Issue[];
  priceHistory: { year: string; price: number }[];
  schools: { name: string; type: string; grades: string; rating: number; distance: string }[];
}

import heroImg from "@assets/generated_images/modern_suburban_home_exterior_with_blue_sky.png";
import kitchenImg from "@assets/generated_images/modern_kitchen_interior_with_island.png";
import livingImg from "@assets/generated_images/spacious_living_room_with_fireplace.png";
import backyardImg from "@assets/generated_images/backyard_with_patio_and_lawn.png";

import victorianExt from "@assets/generated_images/victorian_house_exterior_requiring_renovation.png";
import victorianInt from "@assets/generated_images/old_interior_room_with_wood_details.png";

import condoExt from "@assets/generated_images/modern_glass_condo_building_exterior.png";
import condoInt from "@assets/generated_images/modern_condo_living_room_with_view.png";

export const properties: Record<string, PropertyData> = {
  "123-maple-drive": {
    id: "123-maple-drive",
    address: "123 Maple Drive",
    city: "San Francisco",
    state: "CA",
    zip: "94110",
    price: "$1,850,000",
    beds: 4,
    baths: 3,
    sqft: 2450,
    yearBuilt: 1985,
    description: "Stunning modern home in the heart of the city. Features a chef's kitchen, spacious backyard, and recently updated interiors. Close to schools and parks.",
    foundlyScore: 72,
    images: {
      hero: heroImg,
      living: livingImg,
      kitchen: kitchenImg,
      backyard: backyardImg
    },
    issues: [
      {
        id: "foundation",
        title: "Potential Foundation Settlement",
        description: "Analysis of exterior photos suggests slight cracking near the garage foundation. This is common in 1980s builds in this area but warrants a professional structural inspection.",
        severity: "critical",
        category: "Structural",
        costEstimate: "$5,000 - $15,000",
        imageLocation: { imageId: "hero", x: 20, y: 85 }
      },
      {
        id: "roof",
        title: "Roof Age Concern",
        description: "Visual inspection indicates roof shingles are showing signs of granular loss. Based on permit history, the roof was last replaced in 2003 (21 years ago).",
        severity: "warning",
        category: "Exterior",
        costEstimate: "$12,000 - $18,000",
        imageLocation: { imageId: "hero", x: 50, y: 20 }
      },
      {
        id: "flood",
        title: "Flood Zone Risk Increasing",
        description: "While currently Zone X (low risk), new FEMA maps proposed for 2026 suggest this area may be reclassified to Zone AE due to changing drainage patterns.",
        severity: "warning",
        category: "Location",
        costEstimate: "Potential Insurance Hike"
      },
      {
        id: "electrical",
        title: "Outdated Electrical Panel",
        description: "Interior photos show a Zinsco-style panel. These are known safety hazards and many insurers will require replacement before binding coverage.",
        severity: "critical",
        category: "Electrical",
        costEstimate: "$2,500 - $4,000",
        imageLocation: { imageId: "living", x: 85, y: 60 }
      },
      {
        id: "hvac",
        title: "HVAC System Updated",
        description: "Good news: The condenser unit visible in the backyard appears to be a 2023 model Carrier unit, indicating recent replacement.",
        severity: "good",
        category: "Mechanical",
        imageLocation: { imageId: "backyard", x: 75, y: 75 }
      }
    ],
    priceHistory: [
      { year: '2019', price: 1450000 },
      { year: '2020', price: 1520000 },
      { year: '2021', price: 1680000 },
      { year: '2022', price: 1750000 },
      { year: '2023', price: 1720000 },
      { year: '2024', price: 1850000 },
    ],
    schools: [
      { name: "Mission High", type: "Public", grades: "9-12", rating: 6, distance: "0.4 mi" },
      { name: "Everett Middle", type: "Public", grades: "6-8", rating: 5, distance: "0.8 mi" },
      { name: "Sanchez Elementary", type: "Public", grades: "K-5", rating: 7, distance: "0.3 mi" },
    ]
  },
  "456-oak-street": {
    id: "456-oak-street",
    address: "456 Oak Street",
    city: "San Francisco",
    state: "CA",
    zip: "94117",
    price: "$1,250,000",
    beds: 3,
    baths: 2,
    sqft: 1800,
    yearBuilt: 1905,
    description: "Charming Victorian fixer-upper with incredible potential. Original details include wainscoting, high ceilings, and hardwood floors. Needs love to restore to former glory.",
    foundlyScore: 45,
    images: {
      hero: victorianExt,
      living: victorianInt,
      kitchen: victorianInt, // Reusing for now
      backyard: victorianExt // Reusing for now
    },
    issues: [
      {
        id: "dry-rot",
        title: "Significant Dry Rot",
        description: "Exterior trim and siding show visible signs of advanced dry rot. Water intrusion likely in wall cavities.",
        severity: "critical",
        category: "Exterior",
        costEstimate: "$20,000 - $45,000",
        imageLocation: { imageId: "hero", x: 30, y: 60 }
      },
      {
        id: "wiring",
        title: "Knob & Tube Wiring",
        description: "Listing age and interior photos suggest presence of original knob and tube wiring. Full rewire likely required for insurance.",
        severity: "critical",
        category: "Electrical",
        costEstimate: "$15,000 - $25,000",
        imageLocation: { imageId: "living", x: 90, y: 40 }
      },
      {
        id: "foundation-brick",
        title: "Unreinforced Masonry Foundation",
        description: "Brick foundation appears original and unreinforced. High seismic risk.",
        severity: "critical",
        category: "Structural",
        costEstimate: "$50,000+",
        imageLocation: { imageId: "hero", x: 50, y: 90 }
      },
      {
        id: "historic",
        title: "Historic District Restrictions",
        description: "Property is in a designated historic district. Exterior alterations will require additional permits and review.",
        severity: "info",
        category: "Regulatory",
      }
    ],
    priceHistory: [
      { year: '2019', price: 950000 },
      { year: '2020', price: 1000000 },
      { year: '2021', price: 1100000 },
      { year: '2022', price: 1200000 },
      { year: '2023', price: 1150000 },
      { year: '2024', price: 1250000 },
    ],
    schools: [
      { name: "Alamo Elementary", type: "Public", grades: "K-5", rating: 8, distance: "0.2 mi" },
      { name: "Roosevelt Middle", type: "Public", grades: "6-8", rating: 7, distance: "0.5 mi" },
    ]
  },
  "789-skyline-ave": {
    id: "789-skyline-ave",
    address: "789 Skyline Ave",
    city: "San Francisco",
    state: "CA",
    zip: "94105",
    price: "$2,450,000",
    beds: 2,
    baths: 2.5,
    sqft: 1600,
    yearBuilt: 2021,
    description: "Luxury high-rise living with panoramic city views. Floor-to-ceiling windows, premium appliances, and world-class amenities.",
    foundlyScore: 92,
    images: {
      hero: condoExt,
      living: condoInt,
      kitchen: condoInt, // Reusing
      backyard: condoExt // Reusing
    },
    issues: [
      {
        id: "hoa",
        title: "High HOA Dues",
        description: "Monthly HOA dues are $1,200, which is 20% above average for similar units in the area.",
        severity: "info",
        category: "Financial",
        costEstimate: "$1,200/mo"
      },
      {
        id: "assessment",
        title: "Special Assessment Risk",
        description: "Building reserve study shows 60% funding. Potential for future assessments for elevator maintenance.",
        severity: "warning",
        category: "Financial",
      },
      {
        id: "energy",
        title: "Excellent Energy Efficiency",
        description: "LEED Gold certified building with high-efficiency HVAC and double-pane low-E glass.",
        severity: "good",
        category: "Energy",
        imageLocation: { imageId: "hero", x: 50, y: 50 }
      }
    ],
    priceHistory: [
      { year: '2021', price: 2200000 },
      { year: '2022', price: 2350000 },
      { year: '2023', price: 2300000 },
      { year: '2024', price: 2450000 },
    ],
    schools: [
      { name: "Downtown High", type: "Public", grades: "9-12", rating: 5, distance: "0.8 mi" },
    ]
  }
};
