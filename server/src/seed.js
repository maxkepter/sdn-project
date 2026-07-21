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
} = require("./models");

// ---- Fixture orders -------------------------------------------------------
const FIXTURE_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled", "returned"];
const FIXTURE_BUYERS = [
  { name: "Alice Nguyen", username: "alice_ng", email: "alice@example.com" },
  { name: "Bob Tran",    username: "bob_t",   email: "bob@example.com" },
  { name: "Carol Le",    username: "carol_l", email: "carol@example.com" },
  { name: "David Pham",  username: "david_p", email: "david@example.com" },
  { name: "Emma Vo",     username: "emma_v",  email: "emma@example.com" },
  { name: "Frank Bui",   username: "frank_b", email: "frank@example.com" },
  { name: "Grace Do",    username: "grace_d", email: "grace@example.com" },
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
  const quantity = (i % 4) + 1;                                  // 1..4
  const shippingCost = [0, 0, 5.99, 9.99, 14.5][i % 5];
  const taxRate = 0.08;
  const currency = FIXTURE_CURRENCIES[i % FIXTURE_CURRENCIES.length];

  // Spread purchases across 60 days, with a cluster "today" (i % 6 === 0) for "fresh" testing.
  const daysBack = i % 3 === 0 ? i % 5 : 5 + i;
  const purchaseDate = daysBack < 1 ? fixtureHoursAgo(i * 3) : fixtureDaysAgo(daysBack);
  const paymentDate = status === "pending" ? null : new Date(purchaseDate.getTime() + 1000 * 60 * 30); // +30min

  const [city, country, postal] = FIXTURE_CITIES[i % FIXTURE_CITIES.length];

  const tracking =
    status === "shipped" || status === "delivered"
      ? {
          carrier: FIXTURE_CARRIERS[i % FIXTURE_CARRIERS.length],
          trackingNumber: "TRK" + fixturePad(100000 + i, 8),
          shippedDate: new Date(purchaseDate.getTime() + 1000 * 60 * 60), // +1h
          estimatedDelivery: new Date(purchaseDate.getTime() + 1000 * 60 * 60 * 24 * 3), // +3d
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

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/sdn_db";
const dropOnly = process.argv.includes("--drop");

const categoryNames = [
  "Electronics", "Fashion", "Home & Garden", "Sports",
  "Motors", "Collectibles", "Health & Beauty", "Industrial",
];

const productsData = [
  { title: "Apple iPhone 15 Pro Max 256GB - Natural Titanium", price: 1199, cat: "Electronics", imgIdx: 1 },
  { title: "Samsung Galaxy S24 Ultra 512GB - Titanium Gray", price: 999, cat: "Electronics", imgIdx: 2 },
  { title: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones", price: 329, cat: "Electronics", imgIdx: 3 },
  { title: "MacBook Air M3 15-inch - 16GB RAM 512GB SSD", price: 1399, cat: "Electronics", imgIdx: 4 },
  { title: "Apple Watch Series 9 GPS 45mm - Midnight Aluminum", price: 399, cat: "Electronics", imgIdx: 5 },
  { title: "Louis Vuitton Neverfull MM Damier Ebene Tote Bag", price: 1890, cat: "Fashion", imgIdx: 6 },
  { title: "Gucci GG Marmont Matelassé Mini Bag - Black", price: 1580, cat: "Fashion", imgIdx: 7 },
  { title: "Nike Air Jordan 1 Retro High OG - Chicago Reimagined", price: 499, cat: "Fashion", imgIdx: 8 },
  { title: "Chanel Classic Flap Bag Medium - Black Lambskin", price: 8200, cat: "Fashion", imgIdx: 9 },
  { title: "Prada Re-Edition 2005 Nylon Shoulder Bag - Black", price: 1750, cat: "Fashion", imgIdx: 10 },
  { title: "Dyson V15 Detect Cordless Vacuum Cleaner", price: 749, cat: "Home & Garden", imgIdx: 11 },
  { title: "KitchenAid Artisan Stand Mixer 5-Quart - Empire Red", price: 449, cat: "Home & Garden", imgIdx: 12 },
  { title: "Nespresso Vertuo Next Coffee Machine - Matte Black", price: 179, cat: "Home & Garden", imgIdx: 13 },
  { title: "Le Creuset Dutch Oven 5.5qt - Marseille Blue", price: 349, cat: "Home & Garden", imgIdx: 14 },
  { title: "Vitamix E310 Explorian Blender - Black", price: 299, cat: "Home & Garden", imgIdx: 15 },
  { title: "TaylorMade Stealth 2 Driver 10.5° - Men's Right Hand", price: 599, cat: "Sports", imgIdx: 16 },
  { title: "Nike Air Force 1 Low '07 - White", price: 129, cat: "Fashion", imgIdx: 17 },
  { title: "Rolex Submariner Date 126610LN - Black Dial 41mm", price: 14500, cat: "Fashion", imgIdx: 18 },
  { title: "Adidas Ultraboost Light Running Shoe - Core Black", price: 179, cat: "Sports", imgIdx: 19 },
  { title: "YETI Rambler 26oz Bottle - Stainless Steel", price: 45, cat: "Sports", imgIdx: 20 },
  { title: "Callaway Paradym Ai Smoke Driver 9° - Right Hand", price: 549, cat: "Sports", imgIdx: 21 },
  { title: "Bose QuietComfort Ultra Earbuds - Black", price: 279, cat: "Electronics", imgIdx: 22 },
  { title: "Canon EOS R6 Mark II Mirrorless Camera - Body Only", price: 2499, cat: "Electronics", imgIdx: 23 },
  { title: "PlayStation 5 Slim Console - Disc Version", price: 499, cat: "Electronics", imgIdx: 24 },
  { title: "LEGO Star Wars Millennium Falcon 75192 - 7541 Pieces", price: 849, cat: "Collectibles", imgIdx: 25 },
  { title: "Pokemon TCG: 151 Booster Box - English", price: 499, cat: "Collectibles", imgIdx: 26 },
  { title: "Funko Pop! Star Wars Darth Vader #01 - Original", price: 89, cat: "Collectibles", imgIdx: 27 },
  { title: "1969 Topps Mickey Mantle Baseball Card #500", price: 299, cat: "Collectibles", imgIdx: 28 },
  { title: "Stanley Quencher H2.0 FlowState 40oz - Rose Quartz", price: 45, cat: "Health & Beauty", imgIdx: 29 },
  { title: "Dyson Airwrap Multi-Styler Complete Long - Nickel/Copper", price: 599, cat: "Health & Beauty", imgIdx: 30 },
  { title: "Theragun Pro 5th Gen Massage Gun - Black", price: 399, cat: "Health & Beauty", imgIdx: 31 },
  { title: "Oral-B iO Series 10 Electric Toothbrush - Black Onyx", price: 279, cat: "Health & Beauty", imgIdx: 32 },
  { title: "Makita XT269M 18V LXT Cordless Combo Kit", price: 349, cat: "Industrial", imgIdx: 33 },
  { title: "DeWalt 20V MAX XR 5-Ah Lithium Ion Battery 2-Pack", price: 169, cat: "Industrial", imgIdx: 34 },
  { title: "Milwaukee M18 Fuel 1/2\" Impact Wrench - Bare Tool", price: 249, cat: "Industrial", imgIdx: 35 },
  { title: "Bosch 12V Max 3/8\" Drill/Driver Kit - PS31-2A", price: 119, cat: "Industrial", imgIdx: 36 },
  { title: "Ralph Lauren Cashmere Crew Neck Sweater - Navy", price: 198, cat: "Fashion", imgIdx: 37 },
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

function pad(n, len = 6) { return String(n).padStart(len, "0"); }

async function generateOrderNumber() {
  const today = new Date();
  const ymd = `${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate(), 2)}`;
  const count = await Order.countDocuments({ orderNumber: new RegExp(`^ORD-${ymd}-`) });
  return `ORD-${ymd}-${pad(count + 1)}`;
}

async function seed() {
  await mongoose.connect(DATABASE_URL);

  if (dropOnly) {
    await Promise.all([
      User.deleteMany({}), Category.deleteMany({}), Product.deleteMany({}),
      Inventory.deleteMany({}), Address.deleteMany({}), Order.deleteMany({}), OrderItem.deleteMany({}),
      Review.deleteMany({}), Feedback.deleteMany({}),
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

  for (const name of categoryNames) {
    await Category.findOneAndUpdate({ name }, { name }, { upsert: true, new: true });
  }
  const categories = await Category.find().lean();
  const catMap = {};
  categories.forEach((c) => { catMap[c.name] = c._id; });
  console.log("Categories seeded");

  let seller = await User.findOne({ email: "seller@test.com" });
  if (!seller) {
    seller = await User.create({
      username: "seller",
      email: "seller@test.com",
      password: await bcrypt.hash("password123", 10),
      role: "seller",
    });
    console.log("Seller user created (login: seller@test.com / password123)");
  }

  await Product.deleteMany({});
  await Inventory.deleteMany({});
  console.log("Cleared existing products & inventory");

  const baseUrl = "https://i.ebayimg.com/images/g";

  for (const p of productsData) {
    const catId = catMap[p.cat];
    if (!catId) {
      console.log(`Skipping ${p.title}: category "${p.cat}" not found`);
      continue;
    }

    const imgIdx = String(p.imgIdx).padStart(2, "0");
    const imageUrls = [`${baseUrl}/abc${imgIdx}/s-l1600.webp`];

    const product = await Product.create({
      title: p.title,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      price: p.price,
      images: imageUrls,
      categoryId: catId,
      sellerId: seller._id,
      condition: "New",
      isHidden: false,
      sku: `SKU-${String(p.imgIdx).padStart(4, "0")}`,
    });

    await Inventory.create({
      productId: product._id,
      quantity: Math.floor(Math.random() * 50) + 1,
    });

    console.log(`  Created: ${p.title} ($${p.price})`);
  }

  let buyer = await User.findOne({ email: "buyer@test.com" });
  if (!buyer) {
    buyer = await User.create({
      username: "buyer",
      email: "buyer@test.com",
      password: await bcrypt.hash("password123", 10),
      role: "buyer",
    });
    console.log("Buyer user created");
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

  const seededProducts = await Product.find({ sellerId: seller._id }).sort({ createdAt: 1 }).limit(5).lean();

  const buyerSnapshot = {
    buyerName: buyer.username === "buyer" ? "Jane Doe" : buyer.username,
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
    await OrderItem.create({ orderId: order1._id, productId: p0._id, quantity: 1, unitPrice: p0.price });
    await OrderItem.create({ orderId: order1._id, productId: p1._id, quantity: 2, unitPrice: p1.price });

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
    await OrderItem.create({ orderId: order2._id, productId: p2._id, quantity: 1, unitPrice: p2.price });

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
      await OrderItem.create({ orderId: order3._id, productId: p3._id, quantity: 1, unitPrice: p3.price });
      await OrderItem.create({ orderId: order3._id, productId: p4._id, quantity: 1, unitPrice: p4.price });
    }

    console.log("Seeded 3 test orders successfully");
  }

  // Seed 20 fixture orders using the seller's own products + extra demo buyers.
  const fixtureBuyerHash = await bcrypt.hash("password123", 10);
  const fixtureBuyers = await Promise.all(
    FIXTURE_BUYERS.map((b) =>
      User.findOneAndUpdate(
        { username: b.username },
        {
          username: b.username,
          email: b.email,
          password: fixtureBuyerHash,
          role: "buyer",
          firstName: b.name.split(" ")[0],
          lastName: b.name.split(" ")[1] || "",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );
  const buyerByUsername = Object.fromEntries(fixtureBuyers.map((u) => [u.username, u]));

  const sellerProducts = await Product.find({ sellerId: seller._id }).sort({ createdAt: 1 }).lean();
  if (sellerProducts.length) {
    await Order.deleteMany({ orderNumber: { $regex: /^ORD-/ } });
    let i = 0;
    for (const row of FIXTURE_ORDERS) {
      const product = sellerProducts[i % sellerProducts.length];
      const buyer = buyerByUsername[row.buyer.username];
      const itemPrice = product.price;
      const subtotal = itemPrice * row.quantity;
      const tax = +(subtotal * row.taxRate).toFixed(2);
      const total = +(subtotal + row.shippingCost + tax).toFixed(2);
      const order = await Order.create({
        orderNumber: row.orderNumber,
        buyerId: buyer._id,
        buyerName: row.buyer.name,
        buyerUsername: row.buyer.username,
        addressId: buyer._id,
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

  // Seed sample reviews from delivered orders
  const { recalcFeedback } = require("./modules/reviews/controllers/reviewController");
  const deliveredOrders = await Order.find({ status: "delivered" }).lean();
  console.log(`Found ${deliveredOrders.length} delivered orders to generate reviews`);

  const sampleReviewTexts = [
    { rating: 5, comment: "Absolutely amazing product! Extremely fast shipping and high quality.", title: "Excellent!" },
    { rating: 5, comment: "Great value for money. Highly recommend this seller.", title: "Superb product" },
    { rating: 4, comment: "Decent product, arrived on time. Works as described.", title: "Good quality" },
    { rating: 3, comment: "Average item. It gets the job done but nothing special.", title: "It's okay" },
    { rating: 2, comment: "Not as good as expected. Item had minor cosmetic issues.", title: "A bit disappointed" },
    { rating: 1, comment: "Terrible service. Product broke after first use. Avoid!", title: "Waste of money" }
  ];

  let reviewCount = 0;
  for (let j = 0; j < Math.min(deliveredOrders.length, 10); j++) {
    const order = deliveredOrders[j];
    const item = await OrderItem.findOne({ orderId: order._id }).lean();
    if (!item) continue;

    const product = await Product.findById(item.productId).select("sellerId").lean();
    if (!product) continue;

    const text = sampleReviewTexts[j % sampleReviewTexts.length];

    await Review.create({
      productId: item.productId,
      reviewerId: order.buyerId,
      sellerId: product.sellerId,
      orderId: order._id,
      rating: text.rating,
      title: text.title,
      comment: text.comment,
      verifiedPurchase: true,
      reviewDate: new Date(order.orderDate.getTime() + 2 * 24 * 3600 * 1000) // 2 days after order
    });
    reviewCount++;
  }
  console.log(`Seeded ${reviewCount} sample reviews`);

  const uniqueSellers = await Review.distinct("sellerId");
  for (const sId of uniqueSellers) {
    await recalcFeedback(sId);
  }
  console.log(`Recalculated feedback for ${uniqueSellers.length} unique sellers`);

  console.log(`\nSeeded ${productsData.length} products successfully`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});