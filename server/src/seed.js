const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const {
  User,
  Category,
  Product,
  Inventory,
  Address,
  Order,
  OrderItem,
  Review,
  Feedback,
  Dispute,
} = require("./models");

// Spread seeded createdAt timestamps evenly across the last 90 days so
// dashboard time-series charts have a realistic distribution instead of a
// single spike. Deterministic on idx so re-running the seed produces a
// stable dataset (useful for diffing screenshots during load testing).
function randomCreatedAt(idx) {
  const slot = Math.floor((idx * 7919) % 90); // prime stride -> good spread
  const jitter = (idx * 31) % (24 * 60 * 60 * 1000);
  return new Date(Date.now() - slot * 24 * 60 * 60 * 1000 - jitter);
}

// ---- Fixture orders -------------------------------------------------------
const FIXTURE_STATUSES = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];
const FIXTURE_BUYERS = [
  { name: "Alice Nguyen", username: "alice_ng", email: "alice@example.com" },
  { name: "Bob Tran", username: "bob_t", email: "bob@example.com" },
  { name: "Carol Le", username: "carol_l", email: "carol@example.com" },
  { name: "David Pham", username: "david_p", email: "david@example.com" },
  { name: "Emma Vo", username: "emma_v", email: "emma@example.com" },
  { name: "Frank Bui", username: "frank_b", email: "frank@example.com" },
  { name: "Grace Do", username: "grace_d", email: "grace@example.com" },
];

const FIXTURE_CITIES = [
  ["Hanoi", "Vietnam", "100000"],
  ["HCMC", "Vietnam", "700000"],
  ["Da Nang", "Vietnam", "550000"],
  ["Hue", "Vietnam", "530000"],
  ["Singapore", "Singapore", "238859"],
  ["Bangkok", "Thailand", "10110"],
];

const FIXTURE_CARRIERS = ["VNPost", "DHL", "FedEx", "UPS", "J&T"];
const FIXTURE_CURRENCIES = ["USD", "USD", "USD", "EUR"]; // weighted toward USD
const FIXTURE_NOTES = [
  "",
  "Handle with care — fragile item",
  "Gift wrap requested",
  "Customer requested express shipping",
  "VIP customer — priority handling",
  "Bulk order — verify quantities on arrival",
];

function fixturePad(n, len = 6) {
  return String(n).padStart(len, "0");
}

function fixtureYmd(date) {
  return `${date.getFullYear()}${fixturePad(date.getMonth() + 1, 2)}${fixturePad(date.getDate(), 2)}`;
}

function fixtureDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function fixtureHoursAgo(h) {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d;
}

// ponytail: 40 rows spanning ~60 days — enough to exercise filters/pagination/sort.
const FIXTURE_ORDERS = Array.from({ length: 40 }, (_, i) => {
  const buyer = FIXTURE_BUYERS[i % FIXTURE_BUYERS.length];
  const status = FIXTURE_STATUSES[i % FIXTURE_STATUSES.length];
  const quantity = (i % 4) + 1; // 1..4
  const shippingCost = [0, 0, 5.99, 9.99, 14.5][i % 5];
  const taxRate = 0.08;
  const currency = FIXTURE_CURRENCIES[i % FIXTURE_CURRENCIES.length];

  // Spread purchases across 60 days, with a cluster "today" (i % 6 === 0) for "fresh" testing.
  const daysBack = i % 3 === 0 ? i % 5 : 5 + i;
  const purchaseDate =
    daysBack < 1 ? fixtureHoursAgo(i * 3) : fixtureDaysAgo(daysBack);
  const paymentDate =
    status === "pending"
      ? null
      : new Date(purchaseDate.getTime() + 1000 * 60 * 30); // +30min

  const [city, country, postal] = FIXTURE_CITIES[i % FIXTURE_CITIES.length];

  const tracking =
    status === "shipped" || status === "delivered"
      ? {
          carrier: FIXTURE_CARRIERS[i % FIXTURE_CARRIERS.length],
          trackingNumber: "TRK" + fixturePad(100000 + i, 8),
          shippedDate: new Date(purchaseDate.getTime() + 1000 * 60 * 60), // +1h
          estimatedDelivery: new Date(
            purchaseDate.getTime() + 1000 * 60 * 60 * 24 * 3,
          ), // +3d
        }
      : undefined;

  return {
    status,
    quantity,
    shippingCost,
    taxRate,
    currency,
    buyer,
    purchaseDate,
    paymentDate,
    shippingAddress: {
      fullName: buyer.name,
      phone: "+84 9" + fixturePad(10000000 + i, 8),
      street: `${10 + i} Main Street`,
      ward: "Ward " + ((i % 5) + 1),
      district: "District " + ((i % 4) + 1),
      city,
      postalCode: postal,
      country,
    },
    tracking,
    sellerNotes: FIXTURE_NOTES[i % FIXTURE_NOTES.length],
    orderNumber: `ORD-${fixtureYmd(purchaseDate)}-${fixturePad(i + 1)}`,
  };
});
// ---------------------------------------------------------------------------

const DATABASE_URL =
  process.env.DATABASE_URL || "mongodb://localhost:27017/sdn_db";
const dropOnly = process.argv.includes("--drop");

const categoryNames = [
  "Electronics",
  "Fashion",
  "Home & Garden",
  "Sports",
  "Motors",
  "Collectibles",
  "Health & Beauty",
  "Industrial",
];

// ---------------------------------------------------------------------------
// Real product images from Unsplash (stable CDN URLs, no API key needed)
// Format: https://images.unsplash.com/photo-{ID}?w=800&q=80&auto=format&fit=crop
// Each product gets 2 images: main + alternate angle
// ---------------------------------------------------------------------------
const productsData = [
  // Electronics
  {
    title: "Apple iPhone 15 Pro Max 256GB - Natural Titanium",
    price: 1199,
    cat: "Electronics",
    images: [
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1592286927505-1def25115558?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Samsung Galaxy S24 Ultra 512GB - Titanium Gray",
    price: 999,
    cat: "Electronics",
    images: [
      "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
    price: 329,
    cat: "Electronics",
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "MacBook Air M3 15-inch - 16GB RAM 512GB SSD",
    price: 1399,
    cat: "Electronics",
    images: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1611186871525-5bc0ea8d5e8a?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Apple Watch Series 9 GPS 45mm - Midnight Aluminum",
    price: 399,
    cat: "Electronics",
    images: [
      "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1523475496153-3206d8aaa759?w=800&q=80&auto=format&fit=crop",
    ],
  },
  // Fashion
  {
    title: "Louis Vuitton Neverfull MM Damier Ebene Tote Bag",
    price: 1890,
    cat: "Fashion",
    images: [
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Gucci GG Marmont Matelassé Mini Bag - Black",
    price: 1580,
    cat: "Fashion",
    images: [
      "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Nike Air Jordan 1 Retro High OG - Chicago Reimagined",
    price: 499,
    cat: "Fashion",
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Chanel Classic Flap Bag Medium - Black Lambskin",
    price: 8200,
    cat: "Fashion",
    images: [
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Prada Re-Edition 2005 Nylon Shoulder Bag - Black",
    price: 1750,
    cat: "Fashion",
    images: [
      "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80&auto=format&fit=crop",
    ],
  },
  // Home & Garden
  {
    title: "Dyson V15 Detect Cordless Vacuum Cleaner",
    price: 749,
    cat: "Home & Garden",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1527515637462-cff94aca7a79?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "KitchenAid Artisan Stand Mixer 5-Quart - Empire Red",
    price: 449,
    cat: "Home & Garden",
    images: [
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Nespresso Vertuo Next Coffee Machine - Matte Black",
    price: 179,
    cat: "Home & Garden",
    images: [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Le Creuset Dutch Oven 5.5qt - Marseille Blue",
    price: 349,
    cat: "Home & Garden",
    images: [
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Vitamix E310 Explorian Blender - Black",
    price: 299,
    cat: "Home & Garden",
    images: [
      "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop",
    ],
  },
  // Sports
  {
    title: "TaylorMade Stealth 2 Driver 10.5° - Men's Right Hand",
    price: 599,
    cat: "Sports",
    images: [
      "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Nike Air Force 1 Low '07 - White",
    price: 129,
    cat: "Fashion",
    images: [
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Rolex Submariner Date 126610LN - Black Dial 41mm",
    price: 14500,
    cat: "Fashion",
    images: [
      "https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Adidas Ultraboost Light Running Shoe - Core Black",
    price: 179,
    cat: "Sports",
    images: [
      "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "YETI Rambler 26oz Bottle - Stainless Steel",
    price: 45,
    cat: "Sports",
    images: [
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Callaway Paradym Ai Smoke Driver 9° - Right Hand",
    price: 549,
    cat: "Sports",
    images: [
      "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800&q=80&auto=format&fit=crop",
    ],
  },
  // Electronics (more)
  {
    title: "Bose QuietComfort Ultra Earbuds - Black",
    price: 279,
    cat: "Electronics",
    images: [
      "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Canon EOS R6 Mark II Mirrorless Camera - Body Only",
    price: 2499,
    cat: "Electronics",
    images: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "PlayStation 5 Slim Console - Disc Version",
    price: 499,
    cat: "Electronics",
    images: [
      "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&q=80&auto=format&fit=crop",
    ],
  },
  // Collectibles
  {
    title: "LEGO Star Wars Millennium Falcon 75192 - 7541 Pieces",
    price: 849,
    cat: "Collectibles",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Pokemon TCG: 151 Booster Box - English",
    price: 499,
    cat: "Collectibles",
    images: [
      "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Funko Pop! Star Wars Darth Vader #01 - Original",
    price: 89,
    cat: "Collectibles",
    images: [
      "https://images.unsplash.com/photo-1608278047522-58806a6ac85b?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1531259683007-016a7b628fc3?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "1969 Topps Mickey Mantle Baseball Card #500",
    price: 299,
    cat: "Collectibles",
    images: [
      "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80&auto=format&fit=crop",
    ],
  },
  // Health & Beauty
  {
    title: "Stanley Quencher H2.0 FlowState 40oz - Rose Quartz",
    price: 45,
    cat: "Health & Beauty",
    images: [
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Dyson Airwrap Multi-Styler Complete Long - Nickel/Copper",
    price: 599,
    cat: "Health & Beauty",
    images: [
      "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1560066984-138daaa2a340?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Theragun Pro 5th Gen Massage Gun - Black",
    price: 399,
    cat: "Health & Beauty",
    images: [
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Oral-B iO Series 10 Electric Toothbrush - Black Onyx",
    price: 279,
    cat: "Health & Beauty",
    images: [
      "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1559591935-b3c7cefecd4f?w=800&q=80&auto=format&fit=crop",
    ],
  },
  // Industrial
  {
    title: "Makita XT269M 18V LXT Cordless Combo Kit",
    price: 349,
    cat: "Industrial",
    images: [
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "DeWalt 20V MAX XR 5-Ah Lithium Ion Battery 2-Pack",
    price: 169,
    cat: "Industrial",
    images: [
      "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: 'Milwaukee M18 Fuel 1/2" Impact Wrench - Bare Tool',
    price: 249,
    cat: "Industrial",
    images: [
      "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: 'Bosch 12V Max 3/8" Drill/Driver Kit - PS31-2A',
    price: 119,
    cat: "Industrial",
    images: [
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&q=80&auto=format&fit=crop",
    ],
  },
  {
    title: "Ralph Lauren Cashmere Crew Neck Sweater - Navy",
    price: 198,
    cat: "Fashion",
    images: [
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80&auto=format&fit=crop",
    ],
  },
];

const descriptions = [
  "Brand new, sealed in box. Free shipping within continental US.",
  "Excellent condition. Lightly used, no signs of wear. Includes original packaging.",
  "Pre-owned but in great condition. Fully functional with minor cosmetic wear.",
  "Authentic item. All original accessories included. Ships within 24 hours.",
  "Limited edition. Very hard to find. Buyer pays shipping.",
  "Open box - never used. All paperwork and packaging included.",
  "Like new - used only once. Stored in smoke-free home.",
  "Condition shows normal use. No rips, stains, or damage. See photos for details.",
];

// ---------------------------------------------------------------------------
// Real avatar images for users (Unsplash portrait photos)
// ---------------------------------------------------------------------------
const SELLER_AVATAR =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80&auto=format&fit=crop&crop=face";
const BUYER_AVATAR =
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80&auto=format&fit=crop&crop=face";

// One avatar per fixture buyer — diverse real portraits
const FIXTURE_BUYER_AVATARS = [
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80&auto=format&fit=crop&crop=face", // Alice
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&auto=format&fit=crop&crop=face", // Bob
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80&auto=format&fit=crop&crop=face", // Carol
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80&auto=format&fit=crop&crop=face", // David
  "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&q=80&auto=format&fit=crop&crop=face", // Emma
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80&auto=format&fit=crop&crop=face", // Frank
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80&auto=format&fit=crop&crop=face", // Grace
];

// ---------------------------------------------------------------------------
// Store seed data — real banner/logo/story images
// ---------------------------------------------------------------------------
const STORE_SEED = {
  storeName: "TechLux Store",
  description:
    "Your one-stop shop for premium electronics, luxury fashion, and top-tier sporting goods. All items are 100% authentic with buyer protection guaranteed.",
  logoUrl:
    "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&q=80&auto=format&fit=crop",
  bannerImageURL:
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80&auto=format&fit=crop",
  storyTitle: "Our Story",
  storyText:
    "Founded in 2018, TechLux Store has grown from a small electronics reseller into a trusted marketplace for premium goods across multiple categories. We source directly from authorized distributors and certified resellers worldwide.",
  storyImageUrl:
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80&auto=format&fit=crop",
  featuredCategories: [
    {
      name: "Electronics",
      imageUrl:
        "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80&auto=format&fit=crop",
    },
    {
      name: "Fashion",
      imageUrl:
        "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80&auto=format&fit=crop",
    },
    {
      name: "Sports",
      imageUrl:
        "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&q=80&auto=format&fit=crop",
    },
  ],
};

// ---------------------------------------------------------------------------
// Review photos — real product/unboxing style photos
// ---------------------------------------------------------------------------
const REVIEW_PHOTOS = [
  [
    "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80&auto=format&fit=crop",
  ],
  [
    "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&q=80&auto=format&fit=crop",
  ],
  [
    "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80&auto=format&fit=crop",
  ],
  [], // no photos
  [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80&auto=format&fit=crop",
  ],
  [], // no photos
];

function pad(n, len = 6) {
  return String(n).padStart(len, "0");
}

async function generateOrderNumber() {
  const today = new Date();
  const ymd = `${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate(), 2)}`;
  const count = await Order.countDocuments({
    orderNumber: new RegExp(`^ORD-${ymd}-`),
  });
  return `ORD-${ymd}-${pad(count + 1)}`;
}

async function seed() {
  await mongoose.connect(DATABASE_URL);

  if (dropOnly) {
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Inventory.deleteMany({}),
      Address.deleteMany({}),
      Order.deleteMany({}),
      OrderItem.deleteMany({}),
      Review.deleteMany({}),
      Feedback.deleteMany({}),
      Dispute.deleteMany({}),
    ]);
    console.log("Dropped all collections");
    await mongoose.disconnect();
    return;
  }

  console.log("Connected to MongoDB, seeding...");

  // Clear ALL transactional data first to avoid stale references after re-seeding.
  await Promise.all([
    Order.deleteMany({}),
    OrderItem.deleteMany({}),
    Inventory.deleteMany({}),
    Review.deleteMany({}),
    Feedback.deleteMany({}),
  ]);
  console.log("Cleared orders, order items, inventory, reviews, and feedback");
  await Dispute.deleteMany({});
  console.log("Cleared disputes");

  for (const name of categoryNames) {
    await Category.findOneAndUpdate(
      { name },
      { name },
      { upsert: true, new: true },
    );
  }
  const categories = await Category.find().lean();
  const catMap = {};
  categories.forEach((c) => {
    catMap[c.name] = c._id;
  });
  console.log("Categories seeded");

  // ---- Seller user --------------------------------------------------------
  let seller = await User.findOne({ email: "seller@test.com" });
  if (!seller) {
    seller = await User.create({
      username: "seller",
      email: "seller@test.com",
      password: await bcrypt.hash("123456", 10),
      role: "seller",
      firstName: "Alex",
      lastName: "Morgan",
      avatarURL: SELLER_AVATAR,
    });
    console.log("Seller user created (login: seller@test.com / 123456)");
  } else {
    // Update avatar if missing
    if (!seller.avatarURL) {
      await User.updateOne(
        { _id: seller._id },
        { $set: { avatarURL: SELLER_AVATAR } },
      );
    }
  }

  // ---- Products -----------------------------------------------------------
  await Product.deleteMany({});
  await Inventory.deleteMany({});
  console.log("Cleared existing products & inventory");

  for (let idx = 0; idx < productsData.length; idx++) {
    const p = productsData[idx];
    const catId = catMap[p.cat];
    if (!catId) {
      console.log(`Skipping ${p.title}: category "${p.cat}" not found`);
      continue;
    }

    const product = await Product.create({
      title: p.title,
      description: descriptions[idx % descriptions.length],
      price: p.price,
      images: p.images,
      categoryId: catId,
      sellerId: seller._id,
      condition: "New",
      isHidden: false,
      sku: `SKU-${String(idx + 1).padStart(4, "0")}`,
      createdAt: randomCreatedAt(idx),
    });

    await Inventory.create({
      productId: product._id,
      quantity: Math.floor(Math.random() * 50) + 1,
    });

    console.log(`  Created: ${p.title} ($${p.price})`);
  }

  // ---- Bulk-fill to reach 300 products ----------------------------------
  // Goal: stretch the seed up to TOTAL_PRODUCTS so the dashboard has a
  // realistic dataset to exercise pagination, charts, and filters.
  // We generate variants of the curated anchors above: different colors,
  // sizes, editions, conditions, and price points, spread across the last
  // 90 days so time-series views on the dashboard have meaningful data.
  const TOTAL_PRODUCTS = 300;
  const existingCount = await Product.countDocuments();
  if (existingCount < TOTAL_PRODUCTS) {
    const needed = TOTAL_PRODUCTS - existingCount;
    console.log(
      `Bulk-filling ${needed} variant products to reach ${TOTAL_PRODUCTS} total...`,
    );

    const VARIANT_COLORS = [
      "Midnight Black",
      "Pearl White",
      "Silver",
      "Space Gray",
      "Rose Gold",
      "Champagne",
      "Navy Blue",
      "Forest Green",
      "Burgundy",
      "Sand Beige",
    ];
    const VARIANT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
    const VARIANT_EDITIONS = [
      "Standard Edition",
      "Limited Edition",
      "Pro",
      "Pro Max",
      "Ultra",
      "Lite",
      "Plus",
      "Signature Series",
      "Anniversary Edition",
      "Classic",
    ];
    const VARIANT_CONDITIONS = ["New", "Like New", "Excellent", "Good"];

    const bulkDocs = [];
    const bulkInventory = [];
    for (let i = 0; i < needed; i++) {
      const anchor = productsData[i % productsData.length];
      const catId = catMap[anchor.cat];
      if (!catId) continue;

      // Cycle through different variant axes for each anchor iteration so
      // titles/sku/condition don't repeat.
      const variantIndex = Math.floor(i / productsData.length) + 1;
      const color = VARIANT_COLORS[i % VARIANT_COLORS.length];
      const size = VARIANT_SIZES[i % VARIANT_SIZES.length];
      const edition = VARIANT_EDITIONS[variantIndex % VARIANT_EDITIONS.length];
      const condition =
        VARIANT_CONDITIONS[i % VARIANT_CONDITIONS.length];

      // Vary the price by ±25% to give dashboard price-distribution charts
      // real spread (avoiding a flat histogram).
      const priceJitter = 1 + ((i * 37) % 50 - 25) / 100;
      const variantPrice = Math.max(
        9,
        Math.round(anchor.price * priceJitter),
      );

      const variantTitle = `${anchor.title} — ${edition} / ${color} / ${size}`;
      const sku = `SKU-${String(existingCount + i + 1).padStart(4, "0")}`;
      const description =
        descriptions[(i + existingCount) % descriptions.length] +
        ` Variant #${variantIndex}. Color: ${color}. Size: ${size}. Edition: ${edition}.`;

      // Use the anchor's first image as the variant's cover so the dashboard
      // has something to render without depending on a per-variant asset.
      const variantImages = anchor.images;

      bulkDocs.push({
        title: variantTitle,
        description,
        price: variantPrice,
        images: variantImages,
        categoryId: catId,
        sellerId: seller._id,
        condition,
        isHidden: false,
        sku,
        createdAt: randomCreatedAt(existingCount + i),
      });
      bulkInventory.push({
        productId: null, // filled after insert
        quantity: Math.floor(Math.random() * 80) + 1,
      });
    }

    // insertMany is significantly faster than looping Product.create here.
    const inserted = await Product.insertMany(bulkDocs, { ordered: false });
    for (let k = 0; k < inserted.length; k++) {
      bulkInventory[k].productId = inserted[k]._id;
    }
    await Inventory.insertMany(bulkInventory, { ordered: false });
    console.log(
      `Bulk-seeded ${inserted.length} variant products (total now ${existingCount + inserted.length})`,
    );
  }

  // ---- Buyer user ---------------------------------------------------------
  let buyer = await User.findOne({ email: "buyer@test.com" });
  if (!buyer) {
    buyer = await User.create({
      username: "buyer",
      email: "buyer@test.com",
      password: await bcrypt.hash("password123", 10),
      role: "buyer",
      firstName: "Jane",
      lastName: "Doe",
      avatarURL: BUYER_AVATAR,
    });
    console.log("Buyer user created");
  } else {
    if (!buyer.avatarURL) {
      await User.updateOne(
        { _id: buyer._id },
        { $set: { avatarURL: BUYER_AVATAR } },
      );
    }
  }

  let address = await Address.findOne({ userId: buyer._id });
  if (!address) {
    address = await Address.create({
      userId: buyer._id,
      fullName: "Jane Doe",
      phone: "+1 555-0199",
      street: "123 Main Street",
      city: "San Jose",
      state: "CA",
      country: "United States",
      isDefault: true,
    });
    console.log("Buyer address created");
  }

  await Order.deleteMany({});
  await OrderItem.deleteMany({});
  await Review.deleteMany({});
  await Feedback.deleteMany({});

  const seededProducts = await Product.find({ sellerId: seller._id })
    .sort({ createdAt: 1 })
    .limit(5)
    .lean();

  const buyerSnapshot = {
    buyerName: "Jane Doe",
    buyerUsername: buyer.username,
  };
  const addrSnapshot = {
    fullName: address.fullName,
    phone: address.phone,
    street: address.street,
    city: address.city,
    state: address.state,
    country: address.country,
  };

  if (seededProducts.length >= 3) {
    const p0 = seededProducts[0];
    const p1 = seededProducts[1];
    const order1Total = p0.price + p1.price * 2;
    const order1 = await Order.create({
      orderNumber: await generateOrderNumber(),
      buyerId: buyer._id,
      ...buyerSnapshot,
      addressId: address._id,
      shippingAddress: addrSnapshot,
      totalPrice: order1Total,
      pricing: {
        itemPrice: p0.price,
        quantity: 3,
        subtotal: order1Total,
        shippingCost: 0,
        tax: 0,
        total: order1Total,
        currency: "USD",
      },
      listingTitle: p0.title,
      listingImage: p0.images?.[0],
      status: "paid",
      paymentStatus: "paid",
      paymentDate: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      orderDate: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      purchaseDate: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    });
    await OrderItem.create({
      orderId: order1._id,
      productId: p0._id,
      quantity: 1,
      unitPrice: p0.price,
    });
    await OrderItem.create({
      orderId: order1._id,
      productId: p1._id,
      quantity: 2,
      unitPrice: p1.price,
    });

    const p2 = seededProducts[2];
    const order2 = await Order.create({
      orderNumber: await generateOrderNumber(),
      buyerId: buyer._id,
      ...buyerSnapshot,
      addressId: address._id,
      shippingAddress: addrSnapshot,
      totalPrice: p2.price,
      pricing: {
        itemPrice: p2.price,
        quantity: 1,
        subtotal: p2.price,
        shippingCost: 0,
        tax: 0,
        total: p2.price,
        currency: "USD",
      },
      listingTitle: p2.title,
      listingImage: p2.images?.[0],
      status: "shipped",
      paymentStatus: "paid",
      paymentDate: new Date(Date.now() - 4 * 24 * 3600 * 1000),
      orderDate: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      purchaseDate: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      tracking: {
        carrier: "USPS",
        trackingNumber: "9400111202555555555555",
        shippedDate: new Date(Date.now() - 3 * 24 * 3600 * 1000),
        estimatedDelivery: new Date(Date.now() + 2 * 24 * 3600 * 1000),
      },
    });
    await OrderItem.create({
      orderId: order2._id,
      productId: p2._id,
      quantity: 1,
      unitPrice: p2.price,
    });

    if (seededProducts.length >= 5) {
      const p3 = seededProducts[3];
      const p4 = seededProducts[4];
      const order3Total = p3.price + p4.price;
      const order3 = await Order.create({
        orderNumber: await generateOrderNumber(),
        buyerId: buyer._id,
        ...buyerSnapshot,
        addressId: address._id,
        shippingAddress: addrSnapshot,
        totalPrice: order3Total,
        pricing: {
          itemPrice: p3.price,
          quantity: 2,
          subtotal: order3Total,
          shippingCost: 0,
          tax: 0,
          total: order3Total,
          currency: "USD",
        },
        listingTitle: p3.title,
        listingImage: p3.images?.[0],
        status: "delivered",
        paymentStatus: "paid",
        paymentDate: new Date(Date.now() - 9 * 24 * 3600 * 1000),
        orderDate: new Date(Date.now() - 10 * 24 * 3600 * 1000),
        purchaseDate: new Date(Date.now() - 10 * 24 * 3600 * 1000),
        tracking: {
          carrier: "FedEx",
          trackingNumber: "778912345678901",
          shippedDate: new Date(Date.now() - 8 * 24 * 3600 * 1000),
          estimatedDelivery: new Date(Date.now() - 5 * 24 * 3600 * 1000),
        },
      });
      await OrderItem.create({
        orderId: order3._id,
        productId: p3._id,
        quantity: 1,
        unitPrice: p3.price,
      });
      await OrderItem.create({
        orderId: order3._id,
        productId: p4._id,
        quantity: 1,
        unitPrice: p4.price,
      });
    }

    console.log("Seeded 3 test orders successfully");
  }

  // ---- Fixture buyers & orders --------------------------------------------
  const fixtureBuyerHash = await bcrypt.hash("password123", 10);
  const fixtureBuyers = await Promise.all(
    FIXTURE_BUYERS.map((b, i) =>
      User.findOneAndUpdate(
        { username: b.username },
        {
          username: b.username,
          email: b.email,
          password: fixtureBuyerHash,
          role: "buyer",
          firstName: b.name.split(" ")[0],
          lastName: b.name.split(" ")[1] || "",
          avatarURL: FIXTURE_BUYER_AVATARS[i],
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    ),
  );
  const buyerByUsername = Object.fromEntries(
    fixtureBuyers.map((u) => [u.username, u]),
  );
  console.log(`Seeded ${fixtureBuyers.length} fixture buyers with avatars`);

  const sellerProducts = await Product.find({ sellerId: seller._id })
    .sort({ createdAt: 1 })
    .lean();
  if (sellerProducts.length) {
    await Order.deleteMany({ orderNumber: { $regex: /^ORD-/ } });
    let i = 0;
    for (const row of FIXTURE_ORDERS) {
      const product = sellerProducts[i % sellerProducts.length];
      const buyerUser = buyerByUsername[row.buyer.username];
      const itemPrice = product.price;
      const subtotal = itemPrice * row.quantity;
      const tax = +(subtotal * row.taxRate).toFixed(2);
      const total = +(subtotal + row.shippingCost + tax).toFixed(2);
      const order = await Order.create({
        orderNumber: row.orderNumber,
        buyerId: buyerUser._id,
        buyerName: row.buyer.name,
        buyerUsername: row.buyer.username,
        addressId: buyerUser._id,
        orderDate: row.purchaseDate,
        purchaseDate: row.purchaseDate,
        paymentDate: row.paymentDate,
        totalPrice: total,
        pricing: {
          itemPrice,
          quantity: row.quantity,
          subtotal,
          shippingCost: row.shippingCost,
          tax,
          total,
          currency: row.currency,
        },
        shippingAddress: row.shippingAddress,
        listingTitle: product.title,
        listingImage: product.images?.[0],
        customSku: product.sku,
        tracking: row.tracking,
        status: row.status,
        paymentStatus: row.status === "pending" ? "pending" : "paid",
        sellerNotes: row.sellerNotes,
      });
      await OrderItem.create({
        orderId: order._id,
        productId: product._id,
        quantity: row.quantity,
        unitPrice: itemPrice,
      });
      i++;
    }
    console.log(`Seeded ${FIXTURE_ORDERS.length} fixture orders`);
  } else {
    console.log("Skipped fixture orders: seller has no products");
  }

  // ---- Store seed ---------------------------------------------------------
  const Store = mongoose.models.Store || require("./models/Store");
  const storeCategories = await Category.find({
    name: { $in: STORE_SEED.featuredCategories.map((c) => c.name) },
  }).lean();
  const storeCatMap = Object.fromEntries(
    storeCategories.map((c) => [c.name, c._id]),
  );

  const featuredCategoriesWithId = STORE_SEED.featuredCategories.map((c) => ({
    categoryId: storeCatMap[c.name] || null,
    name: c.name,
    imageUrl: c.imageUrl,
  }));

  const storeData = {
    storeName: STORE_SEED.storeName,
    description: STORE_SEED.description,
    logoUrl: STORE_SEED.logoUrl,
    bannerImageURL: STORE_SEED.bannerImageURL,
    storyTitle: STORE_SEED.storyTitle,
    storyText: STORE_SEED.storyText,
    storyImageUrl: STORE_SEED.storyImageUrl,
    featuredCategories: featuredCategoriesWithId,
  };

  await Store.findOneAndUpdate(
    { sellerId: seller._id },
    {
      $set: {
        slug: "techlux-store",
        draft: storeData,
        published: storeData,
        hasUnpublishedChanges: false,
        followersCount: 128,
        itemsSold: 340,
        positiveFeedbackPercent: 98.5,
      },
    },
    { upsert: true, new: true },
  );
  console.log(
    "Store seeded with real images (logo, banner, story, featured categories)",
  );

  // ---- Reviews with real photos -------------------------------------------
  const {
    recalcFeedback,
  } = require("./modules/reviews/controllers/reviewController");
  const deliveredOrders = await Order.find({ status: "delivered" }).lean();
  console.log(
    `Found ${deliveredOrders.length} delivered orders to generate reviews`,
  );

  const sampleReviewTexts = [
    {
      rating: 5,
      comment:
        "Absolutely amazing product! Extremely fast shipping and high quality.",
      title: "Excellent!",
    },
    {
      rating: 5,
      comment: "Great value for money. Highly recommend this seller.",
      title: "Superb product",
    },
    {
      rating: 4,
      comment: "Decent product, arrived on time. Works as described.",
      title: "Good quality",
    },
    {
      rating: 3,
      comment: "Average item. It gets the job done but nothing special.",
      title: "It's okay",
    },
    {
      rating: 2,
      comment: "Not as good as expected. Item had minor cosmetic issues.",
      title: "A bit disappointed",
    },
    {
      rating: 1,
      comment: "Terrible service. Product broke after first use. Avoid!",
      title: "Waste of money",
    },
  ];

  let reviewCount = 0;
  for (let j = 0; j < Math.min(deliveredOrders.length, 10); j++) {
    const order = deliveredOrders[j];
    const item = await OrderItem.findOne({ orderId: order._id }).lean();
    if (!item) continue;

    const product = await Product.findById(item.productId)
      .select("sellerId")
      .lean();
    if (!product) continue;

    const text = sampleReviewTexts[j % sampleReviewTexts.length];
    const photos = REVIEW_PHOTOS[j % REVIEW_PHOTOS.length]; // may be empty array

    await Review.create({
      productId: item.productId,
      reviewerId: order.buyerId,
      sellerId: product.sellerId,
      orderId: order._id,
      rating: text.rating,
      title: text.title,
      comment: text.comment,
      photos,
      verifiedPurchase: true,
      reviewDate: new Date(order.orderDate.getTime() + 2 * 24 * 3600 * 1000), // 2 days after order
    });
    reviewCount++;
  }
  console.log(
    `Seeded ${reviewCount} sample reviews (with real photos on some)`,
  );

  const uniqueSellers = await Review.distinct("sellerId");
  for (const sId of uniqueSellers) {
    await recalcFeedback(sId);
  }
  console.log(
    `Recalculated feedback for ${uniqueSellers.length} unique sellers`,
  );

  // ---- Disputes -----------------------------------------------------------
  console.log("Seeding dispute fixtures...");
  const seededOrders = await Order.find().limit(8);
  const sampleDisputes = [
    {
      status: "open",
      description:
        "Package has not arrived yet, and tracking has not updated in 5 days.",
      resolution: "",
    },
    {
      status: "open",
      description:
        "Received the wrong color of iPhone. I ordered Natural Titanium but received Black.",
      resolution: "",
    },
    {
      status: "open",
      description:
        "The item was described as Brand New, but it came with visible scratches on the side.",
      resolution: "",
    },
    {
      status: "under_review",
      description:
        "Device does not turn on. I tried charging it for 3 hours, still completely dead.",
      resolution: "",
    },
    {
      status: "under_review",
      description:
        "Missing accessories. The box was opened and the charging cable was missing.",
      resolution: "",
    },
    {
      status: "resolved",
      description:
        "Product box is damaged and vacuum cleaner smells like burnt plastic.",
      resolution:
        "Sent a free replacement unit with express shipping. Tracking provided to the customer.",
    },
    {
      status: "resolved",
      description:
        "Wrong size of shoes delivered. I ordered US 10 but received US 9.",
      resolution:
        "Issued a full refund of $499.00 to the buyer. Buyer keeps the items as goodwill.",
    },
    {
      status: "rejected",
      description:
        "Buyer claimed the item is fake, but serial number matches genuine Nike stock.",
      resolution:
        "Dispute rejected. Seller provided official proof of purchase and certificate of authenticity.",
    },
  ];

  let disputeCount = 0;
  for (
    let k = 0;
    k < Math.min(seededOrders.length, sampleDisputes.length);
    k++
  ) {
    const order = seededOrders[k];
    const template = sampleDisputes[k];
    await Dispute.create({
      orderId: order._id,
      raisedBy: order.buyerId,
      description: template.description,
      status: template.status,
      resolution: template.resolution,
    });
    disputeCount++;
  }
  console.log(`Seeded ${disputeCount} dispute fixtures`);

  console.log(`\n✅ Seeded ${productsData.length} products successfully`);
  console.log("✅ All images updated to real Unsplash photos");
  console.log("📦 Products: 2 real images each");
  console.log(
    "👤 Users: real portrait avatars (seller + buyer + 7 fixture buyers)",
  );
  console.log("🏪 Store: real logo, banner, story image, category images");
  console.log("⭐ Reviews: real product photos on 4 out of 10 reviews");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
