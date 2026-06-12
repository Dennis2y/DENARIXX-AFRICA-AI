import { useState } from "react";
import { motion } from "framer-motion";
import { Show } from "@clerk/react";
import { Redirect, Link } from "wouter";
import {
  ArrowLeft, Search, ShoppingCart, Star, MapPin, Tag, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const CATEGORIES = ["All", "Technology", "Agriculture", "Crafts & Art", "Fashion", "Food & Beverage", "Services", "Books & Education"];

const PRODUCTS = [
  { id: 1, name: "Solar-Powered Lantern", seller: "GreenLight Kenya", location: "Nairobi, Kenya", price: "KES 2,500", category: "Technology", rating: 4.8, reviews: 142, image: "🔆", tags: ["Off-grid", "Sustainable"] },
  { id: 2, name: "Shea Butter (Raw, 1kg)", seller: "Burkina Pure", location: "Ouagadougou, Burkina Faso", price: "XOF 8,000", category: "Food & Beverage", rating: 4.9, reviews: 89, image: "🫙", tags: ["Organic", "Cosmetic grade"] },
  { id: 3, name: "Ankara Print Fabric (6 yards)", seller: "Kente House", location: "Accra, Ghana", price: "GHS 180", category: "Fashion", rating: 4.7, reviews: 203, image: "🧵", tags: ["Handmade", "Cotton"] },
  { id: 4, name: "Cassava Flour (5kg)", seller: "Farmfresh Nigeria", location: "Lagos, Nigeria", price: "₦4,500", category: "Agriculture", rating: 4.6, reviews: 67, image: "🌾", tags: ["Gluten-free", "Organic"] },
  { id: 5, name: "Maasai Beaded Bracelet Set", seller: "Maasai Craft Co.", location: "Arusha, Tanzania", price: "TZS 15,000", category: "Crafts & Art", rating: 5.0, reviews: 38, image: "📿", tags: ["Handcrafted", "Fair trade"] },
  { id: 6, name: "Programming Bootcamp (Online)", seller: "CodeAfrica", location: "Remote — Pan-African", price: "USD 99", category: "Books & Education", rating: 4.8, reviews: 512, image: "💻", tags: ["12-week", "Certificate"] },
  { id: 7, name: "Moringa Powder (500g)", seller: "EthioNutrition", location: "Addis Ababa, Ethiopia", price: "ETB 350", category: "Food & Beverage", rating: 4.7, reviews: 91, image: "🌿", tags: ["Superfood", "Organic"] },
  { id: 8, name: "Solar Water Pump Kit", seller: "AgraTech Rwanda", location: "Kigali, Rwanda", price: "USD 280", category: "Agriculture", rating: 4.9, reviews: 24, image: "💧", tags: ["Irrigation", "Solar"] },
  { id: 9, name: "Kente Cloth Tote Bag", seller: "Accra Artisans", location: "Accra, Ghana", price: "GHS 95", category: "Fashion", rating: 4.6, reviews: 156, image: "👜", tags: ["Handwoven", "Eco-friendly"] },
  { id: 10, name: "African Business Law Guide", seller: "LexAfrica Publishing", location: "Johannesburg, SA", price: "ZAR 290", category: "Books & Education", rating: 4.5, reviews: 43, image: "📖", tags: ["Legal", "2024 Edition"] },
  { id: 11, name: "Smartphone Repair Service", seller: "FixIt Lagos", location: "Lagos, Nigeria", price: "₦5,000+", category: "Services", rating: 4.7, reviews: 318, image: "📱", tags: ["Warranty", "Same-day"] },
  { id: 12, name: "Rooibos Tea (100 bags)", seller: "Cape Harvest", location: "Cape Town, SA", price: "ZAR 85", category: "Food & Beverage", rating: 4.8, reviews: 229, image: "🍵", tags: ["Caffeine-free", "Antioxidant"] },
  { id: 13, name: "Hand-Carved Ebony Figurine", seller: "Zimbabwe Artcraft", location: "Harare, Zimbabwe", price: "USD 45", category: "Crafts & Art", rating: 4.9, reviews: 62, image: "🗿", tags: ["Handcarved", "Authentic"] },
  { id: 14, name: "Mobile Money API Integration", seller: "PayConnect Africa", location: "Nairobi, Kenya", price: "USD 199/yr", category: "Technology", rating: 4.6, reviews: 77, image: "💳", tags: ["M-Pesa", "Multi-country"] },
  { id: 15, name: "Ugali Maize Flour (10kg)", seller: "MiliFresh Kenya", location: "Eldoret, Kenya", price: "KES 1,800", category: "Agriculture", rating: 4.5, reviews: 185, image: "🌽", tags: ["Milled fresh", "Bulk"] },
];

export default function Marketplace() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<number[]>([]);

  const filtered = PRODUCTS.filter(p => {
    const matchCat = category === "All" || p.category === category;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase()) || p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  function addToCart(id: number) {
    setCart(prev => prev.includes(id) ? prev : [...prev, id]);
  }

  return (
    <>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
      <div className="min-h-screen bg-background text-foreground">
        <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-40">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="font-bold text-sm leading-none">Marketplace</p>
                  <p className="text-xs text-muted-foreground">Pan-African commerce</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 relative">
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Cart</span>
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                    {cart.length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-black mb-1">Pan-African Marketplace</h1>
            <p className="text-muted-foreground">Buy and sell across all 54 African nations</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products, sellers, locations…"
                className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    category === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-4">{filtered.length} products found</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all group"
              >
                <div className="h-36 bg-gradient-to-br from-muted to-background flex items-center justify-center text-5xl group-hover:scale-105 transition-transform">
                  {product.image}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-sm leading-tight">{product.name}</h3>
                    <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                      {product.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{product.seller}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <MapPin className="w-3 h-3" />
                    {product.location}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {product.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-base">{product.price}</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-muted-foreground">{product.rating} ({product.reviews})</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={cart.includes(product.id) ? "outline" : "default"}
                      className="text-xs"
                      onClick={() => addToCart(product.id)}
                    >
                      {cart.includes(product.id) ? "Added ✓" : "Add to Cart"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-semibold">No products found</p>
              <p className="text-sm">Try a different search or category</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
