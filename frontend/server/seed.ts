import { db } from "./db";
import { properties, issues } from "@shared/schema";
import { eq } from "drizzle-orm";

const sampleProperties = [
  {
    // Victorian Home - ornate older home with character issues
    address: "742 Elmwood Avenue",
    city: "Columbus",
    state: "OH",
    zip: "43215",
    price: "$425,000",
    beds: 4,
    baths: "2.5",
    sqft: 2800,
    yearBuilt: 1892,
    description: "Stunning Queen Anne Victorian with original architectural details. Features wraparound porch, turret, decorative trim, and high ceilings. A true piece of history awaiting restoration.",
    foundlyScore: 35, // Inzly Score: 100 - (2 critical × 20) - (3 warning × 10) + (1 good × 5) = 35
    images: {
      // Victorian-style home exteriors and interiors - consistent aesthetic, no people
      hero: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=1200&h=900&fit=crop",
      living: "/assets/generated_images/victorian_living_room_interior.png",
      kitchen: "/assets/generated_images/victorian_kitchen_interior.png",
      backyard: "/assets/generated_images/victorian_backyard_exterior.png",
    },
    priceHistory: [
      { year: '2019', price: 320000 },
      { year: '2020', price: 345000 },
      { year: '2021', price: 380000 },
      { year: '2022', price: 410000 },
      { year: '2023', price: 395000 },
      { year: '2024', price: 425000 },
    ],
    schools: [
      { name: "Victorian Village Elementary", type: "Public", grades: "K-5", rating: 7, distance: "0.3 mi" },
      { name: "Starling Middle School", type: "Public", grades: "6-8", rating: 6, distance: "0.6 mi" },
    ],
    issues: [
      {
        title: "Aging Slate Roof Tiles",
        description: "The decorative slate roof shows signs of deterioration. Several tiles appear cracked or missing near the peak. Slate replacement is expensive but necessary.",
        severity: "critical" as const,
        category: "Exterior",
        costEstimate: "$15,000 - $35,000",
        imageLocation: { imageId: "hero" as const, x: 50, y: 12 } // Points to roof peak
      },
      {
        title: "Decorative Trim Deterioration",
        description: "The ornate Victorian gingerbread trim along the porch shows paint peeling and wood rot. This decorative woodwork requires specialized restoration.",
        severity: "warning" as const,
        category: "Exterior",
        costEstimate: "$8,000 - $15,000",
        imageLocation: { imageId: "hero" as const, x: 25, y: 55 } // Points to porch area
      },
      {
        title: "Original Plaster Walls",
        description: "Interior walls appear to be original horsehair plaster. Hairline cracks visible suggest settling. Plaster repair or replacement may be needed.",
        severity: "warning" as const,
        category: "Interior",
        costEstimate: "$5,000 - $12,000",
        imageLocation: { imageId: "living" as const, x: 15, y: 40 } // Points to wall area
      },
      {
        title: "Knob and Tube Wiring Likely",
        description: "Homes of this era typically have original knob and tube wiring. Full electrical rewiring will be required for safety and insurance purposes.",
        severity: "critical" as const,
        category: "Electrical",
        costEstimate: "$12,000 - $25,000",
        imageLocation: { imageId: "living" as const, x: 80, y: 15 } // Points to ceiling area
      },
      {
        title: "Outdated Kitchen Plumbing",
        description: "Visible galvanized pipes under the sink suggest original plumbing. These corrode internally and should be replaced with copper or PEX.",
        severity: "warning" as const,
        category: "Plumbing",
        costEstimate: "$6,000 - $12,000",
        imageLocation: { imageId: "kitchen" as const, x: 40, y: 75 } // Points to under-counter area
      },
      {
        title: "Historic Tax Credits Available",
        description: "Good news: This property is in a historic district and may qualify for federal and state historic rehabilitation tax credits of 20-25%.",
        severity: "good" as const,
        category: "Financial",
        imageLocation: { imageId: "hero" as const, x: 50, y: 45 } // Points to main house
      }
    ]
  },
  {
    // Story-and-a-half bungalow - classic starter home
    address: "1847 Maple Street",
    city: "Minneapolis",
    state: "MN",
    zip: "55406",
    price: "$285,000",
    beds: 3,
    baths: "1.5",
    sqft: 1450,
    yearBuilt: 1948,
    description: "Charming story-and-a-half bungalow in desirable neighborhood. Features original hardwood floors, built-in cabinets, and a cozy front porch. Detached garage.",
    foundlyScore: 95, // Inzly Score: 100 - (0 critical × 20) - (2 warning × 10) + (3 good × 5) = 95
    images: {
      // Bungalow/craftsman style home - cozy, traditional, no people
      hero: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?q=80&w=1200&h=900&fit=crop",
      living: "/assets/generated_images/craftsman_bungalow_living_room.png",
      kitchen: "/assets/generated_images/craftsman_bungalow_kitchen.png",
      backyard: "/assets/generated_images/craftsman_bungalow_backyard.png",
    },
    priceHistory: [
      { year: '2019', price: 215000 },
      { year: '2020', price: 235000 },
      { year: '2021', price: 260000 },
      { year: '2022', price: 275000 },
      { year: '2023', price: 270000 },
      { year: '2024', price: 285000 },
    ],
    schools: [
      { name: "Longfellow Elementary", type: "Public", grades: "K-5", rating: 8, distance: "0.2 mi" },
      { name: "Roosevelt High", type: "Public", grades: "9-12", rating: 7, distance: "0.5 mi" },
    ],
    issues: [
      {
        title: "Asphalt Shingle Wear",
        description: "The asphalt shingle roof shows granular loss typical of 15+ year old roofing. Plan for replacement within 3-5 years.",
        severity: "warning" as const,
        category: "Exterior",
        costEstimate: "$8,000 - $12,000",
        imageLocation: { imageId: "hero" as const, x: 50, y: 15 } // Points to roof
      },
      {
        title: "Original Windows",
        description: "Single-pane original wood windows visible throughout. These are drafty and inefficient. Consider replacement or storm windows.",
        severity: "info" as const,
        category: "Energy",
        costEstimate: "$8,000 - $15,000",
        imageLocation: { imageId: "living" as const, x: 85, y: 35 } // Points to window
      },
      {
        title: "Beautiful Hardwood Floors",
        description: "Original oak hardwood floors in excellent condition. A major selling point that would cost $15,000+ to replicate today.",
        severity: "good" as const,
        category: "Interior",
        imageLocation: { imageId: "living" as const, x: 50, y: 85 } // Points to floor
      },
      {
        title: "Dated Electrical Panel",
        description: "60-amp electrical service typical of 1940s homes. Upgrade to 200-amp service recommended for modern appliance usage.",
        severity: "warning" as const,
        category: "Electrical",
        costEstimate: "$2,500 - $4,500",
        imageLocation: { imageId: "kitchen" as const, x: 90, y: 50 } // Points to wall
      },
      {
        title: "Functional Kitchen Layout",
        description: "Kitchen has been modestly updated with newer appliances. Layout is functional though compact by modern standards.",
        severity: "good" as const,
        category: "Interior",
        imageLocation: { imageId: "kitchen" as const, x: 50, y: 50 } // Points to kitchen center
      },
      {
        title: "Foundation in Good Condition",
        description: "Poured concrete foundation appears solid with no visible cracks. Good drainage grading away from the house.",
        severity: "good" as const,
        category: "Structural",
        imageLocation: { imageId: "hero" as const, x: 30, y: 85 } // Points to foundation area
      }
    ]
  },
  {
    // Two-story traditional - suburban family home
    address: "2456 Oakwood Drive",
    city: "Grand Rapids",
    state: "MI",
    zip: "49506",
    price: "$545,000",
    beds: 4,
    baths: "2.5",
    sqft: 2400,
    yearBuilt: 1998,
    description: "Spacious two-story colonial in excellent school district. Open floor plan, large backyard, attached two-car garage. Move-in ready with recent updates.",
    foundlyScore: 100, // Inzly Score: 100 - (0 critical × 20) - (1 warning × 10) + (3 good × 5) = 105, capped at 100
    images: {
      // Modern suburban two-story home - clean, contemporary, no people
      hero: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1200&h=900&fit=crop",
      living: "/assets/generated_images/colonial_living_room_interior.png",
      kitchen: "/assets/generated_images/colonial_kitchen_interior.png",
      backyard: "/assets/generated_images/colonial_backyard_exterior.png",
    },
    priceHistory: [
      { year: '2019', price: 425000 },
      { year: '2020', price: 455000 },
      { year: '2021', price: 495000 },
      { year: '2022', price: 530000 },
      { year: '2023', price: 520000 },
      { year: '2024', price: 545000 },
    ],
    schools: [
      { name: "Forest Hills Elementary", type: "Public", grades: "K-5", rating: 9, distance: "0.4 mi" },
      { name: "Forest Hills Central", type: "Public", grades: "9-12", rating: 9, distance: "1.2 mi" },
    ],
    issues: [
      {
        title: "HVAC System Aging",
        description: "Original 1998 furnace and AC are 26+ years old. While still functional, replacement should be budgeted within 2-3 years.",
        severity: "warning" as const,
        category: "Mechanical",
        costEstimate: "$8,000 - $15,000",
        imageLocation: { imageId: "living" as const, x: 15, y: 85 } // Points to floor vent area
      },
      {
        title: "Vinyl Siding Good Condition",
        description: "Vinyl siding appears well-maintained with no visible warping or damage. Low maintenance exterior is a plus.",
        severity: "good" as const,
        category: "Exterior",
        imageLocation: { imageId: "hero" as const, x: 25, y: 50 } // Points to siding
      },
      {
        title: "Roof Recently Replaced",
        description: "Architectural shingles appear to be less than 5 years old based on condition. Significant remaining lifespan.",
        severity: "good" as const,
        category: "Exterior",
        imageLocation: { imageId: "hero" as const, x: 50, y: 15 } // Points to roof
      },
      {
        title: "Deck Needs Refinishing",
        description: "Wooden deck shows weathering and some board warping. Refinishing or partial board replacement recommended.",
        severity: "info" as const,
        category: "Exterior",
        costEstimate: "$1,500 - $4,000",
        imageLocation: { imageId: "backyard" as const, x: 50, y: 60 } // Points to deck/patio area
      },
      {
        title: "Updated Kitchen Appliances",
        description: "Stainless steel appliances appear to be less than 5 years old. Kitchen was recently updated with modern finishes.",
        severity: "good" as const,
        category: "Interior",
        imageLocation: { imageId: "kitchen" as const, x: 60, y: 45 } // Points to appliances
      },
      {
        title: "Garage Door Opener Age",
        description: "Garage door opener appears older and may lack modern safety features. Consider updating to a newer model with smart home integration.",
        severity: "info" as const,
        category: "Mechanical",
        costEstimate: "$400 - $800",
        imageLocation: { imageId: "hero" as const, x: 75, y: 70 } // Points to garage area
      }
    ]
  }
];

async function seed() {
  console.log("Seeding database with properties and issues...");

  // Clear existing data for clean reseed
  await db.delete(issues);
  await db.delete(properties);
  console.log("Cleared existing properties and issues");

  for (const propertyData of sampleProperties) {
    const { issues: propertyIssues, ...property } = propertyData;
    
    const [inserted] = await db.insert(properties).values(property).returning();
    console.log(`Inserted property: ${property.address}`);
    
    // Insert issues for this property
    for (const issue of propertyIssues) {
      await db.insert(issues).values({
        propertyId: inserted.id,
        ...issue
      });
    }
    console.log(`  Added ${propertyIssues.length} issues for ${property.address}`);
  }

  console.log("\nSeeding complete!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});
