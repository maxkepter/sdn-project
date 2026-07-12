const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { User, Category, Product, Inventory, Address, Order, OrderItem } = require("./models");

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/sdn_db";

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

async function seed() {
  await mongoose.connect(DATABASE_URL);
  console.log("Connected to MongoDB, seeding...");

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
      password: "$2a$10$dummyhashedpassword",
      role: "seller",
    });
    console.log("Seller user created");
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
    const imageUrls = [
      `${baseUrl}/abc${imgIdx}/s-l1600.webp`,
    ];

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
      password: "$2a$10$dummyhashedpassword",
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

  const seededProducts = await Product.find({ sellerId: seller._id }).sort({ createdAt: 1 }).limit(5).lean();

  if (seededProducts.length >= 3) {
    const order1 = await Order.create({
      buyerId: buyer._id,
      addressId: address._id,
      totalPrice: seededProducts[0].price + seededProducts[1].price * 2,
      status: "paid",
      orderDate: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    });
    await OrderItem.create({ orderId: order1._id, productId: seededProducts[0]._id, quantity: 1, unitPrice: seededProducts[0].price });
    await OrderItem.create({ orderId: order1._id, productId: seededProducts[1]._id, quantity: 2, unitPrice: seededProducts[1].price });

    const order2 = await Order.create({
      buyerId: buyer._id,
      addressId: address._id,
      totalPrice: seededProducts[2].price,
      status: "shipped",
      orderDate: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    });
    await OrderItem.create({ orderId: order2._id, productId: seededProducts[2]._id, quantity: 1, unitPrice: seededProducts[2].price });

    if (seededProducts.length >= 5) {
      const order3 = await Order.create({
        buyerId: buyer._id,
        addressId: address._id,
        totalPrice: seededProducts[3].price + seededProducts[4].price,
        status: "delivered",
        orderDate: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      });
      await OrderItem.create({ orderId: order3._id, productId: seededProducts[3]._id, quantity: 1, unitPrice: seededProducts[3].price });
      await OrderItem.create({ orderId: order3._id, productId: seededProducts[4]._id, quantity: 1, unitPrice: seededProducts[4].price });
    }

    console.log("Seeded 3 test orders successfully");
  }

  console.log(`\nSeeded ${productsData.length} products successfully`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
