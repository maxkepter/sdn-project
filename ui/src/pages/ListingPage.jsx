import { useState } from "react";
import ListingHeader from "../components/listing/ListingHeader";
import ListingFooter from "../components/listing/ListingFooter";
import PhotoUpload from "../components/listing/PhotoUpload";
import ListingTitle from "../components/listing/ListingTitle";
import DescriptionEditor from "../components/listing/DescriptionEditor";
import ConditionSelector from "../components/listing/ConditionSelector";
import PricingSection from "../components/listing/PricingSection";
import ShippingSection from "../components/listing/ShippingSection";
import ItemSpecifics from "../components/listing/ItemSpecifics";

export default function ListingPage() {
  const [photos, setPhotos] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("pre-owned-good");
  const [pricing, setPricing] = useState({ format: "fixed", duration: "gtc", price: "", quantity: 1 });
  const [shipping, setShipping] = useState({ domestic: "free", international: "none", location: "" });
  const [specifics, setSpecifics] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!pricing.price || parseFloat(pricing.price) <= 0) {
      setError("Price must be greater than 0");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();

      photos.forEach((p) => formData.append("photos", p.file));
      formData.append("title", title);
      formData.append("description", description);
      formData.append("condition", condition);
      formData.append("price", pricing.price);
      formData.append("quantity", pricing.quantity);
      formData.append("format", pricing.format);
      formData.append("duration", pricing.duration);
      formData.append("domesticShipping", shipping.domestic);
      formData.append("internationalShipping", shipping.international);
      formData.append("location", shipping.location);
      formData.append("itemSpecifics", JSON.stringify(specifics));

      const res = await fetch("http://localhost:5000/api/v1/listings", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to create listing");
      }

      const result = await res.json();
      alert("Listing created successfully!");
      console.log("Created listing:", result);

      setPhotos([]);
      setTitle("");
      setDescription("");
      setCondition("pre-owned-good");
      setPricing({ format: "fixed", duration: "gtc", price: "", quantity: 1 });
      setShipping({ domestic: "free", international: "none", location: "" });
      setSpecifics({});
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <ListingHeader />

      <main className="max-w-[900px] mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create your listing</h1>
          <p className="text-sm text-gray-500 mt-1">Fill out the details below to list your item.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <PhotoUpload photos={photos} onPhotosChange={setPhotos} />
          <ListingTitle value={title} onChange={setTitle} />
          <DescriptionEditor value={description} onChange={setDescription} />
          <ConditionSelector value={condition} onChange={setCondition} />
          <ItemSpecifics specifics={specifics} onSpecificsChange={setSpecifics} />
          <PricingSection values={pricing} onChange={setPricing} />
          <ShippingSection values={shipping} onChange={setShipping} />
        </div>

        <div className="mt-8 flex items-center justify-end gap-4 py-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              setPhotos([]);
              setTitle("");
              setDescription("");
              setCondition("pre-owned-good");
              setPricing({ format: "fixed", duration: "gtc", price: "", quantity: 1 });
              setShipping({ domestic: "free", international: "none", location: "" });
              setSpecifics({});
              setError("");
            }}
            className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#0968F6] hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-8 py-3 rounded-full text-sm transition"
          >
            {isSubmitting ? "Creating..." : "List your item"}
          </button>
        </div>
      </main>

      <ListingFooter />
    </div>
  );
}
