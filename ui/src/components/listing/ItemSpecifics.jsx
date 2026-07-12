import { useState } from "react";

const predefined = [
  { key: "Brand", placeholder: "e.g. Levi's, Nike, Sony" },
  { key: "Style", placeholder: "e.g. Bootcut, Sneaker, DSLR" },
  { key: "Material", placeholder: "e.g. Denim, Leather, Plastic" },
  { key: "Color", placeholder: "e.g. Blue, Black, Red" },
  { key: "Pattern", placeholder: "e.g. Solid, Striped, Floral" },
  { key: "Size", placeholder: "e.g. 30x32, 10, XL" },
  { key: "Handle/Strap", placeholder: "e.g. Top handle, Crossbody" },
  { key: "Closure", placeholder: "e.g. Zipper, Button, Lace" },
  { key: "Dimensions WxHxD", placeholder: "e.g. 10x8x3 in" },
  { key: "Hardware", placeholder: "e.g. Gold, Silver, Brass" },
];

export default function ItemSpecifics({ specifics = {}, onSpecificsChange }) {
  const [customKeys, setCustomKeys] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupKey, setPopupKey] = useState("");
  const [popupValue, setPopupValue] = useState("");

  const handleChange = (key) => (e) => {
    onSpecificsChange({ ...specifics, [key]: e.target.value });
  };

  const openPopup = () => {
    setPopupKey("");
    setPopupValue("");
    setShowPopup(true);
  };

  const confirmCustom = () => {
    const trimmedKey = popupKey.trim();
    if (!trimmedKey) return;
    const id = `custom-${Date.now()}`;
    setCustomKeys([...customKeys, { id, label: trimmedKey }]);
    onSpecificsChange({ ...specifics, [id]: popupValue });
    setShowPopup(false);
  };

  const removeCustom = (id) => {
    const updated = { ...specifics };
    delete updated[id];
    onSpecificsChange(updated);
    setCustomKeys(customKeys.filter((k) => k.id !== id));
  };

  const entries = [
    ...predefined.map((p) => ({
      id: p.key,
      label: p.key,
      placeholder: p.placeholder,
      isCustom: false,
    })),
    ...customKeys.map((k) => ({
      id: k.id,
      label: k.label,
      placeholder: "",
      isCustom: true,
    })),
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-1">Item specifics</h2>
      <p className="text-sm text-gray-500 mb-4">Help buyers find your item with accurate details.</p>

      <div className="space-y-3">
        {entries.map(({ id, label, placeholder, isCustom }) => (
          <div key={id} className="flex items-center gap-2">
            <span className="w-40 text-sm font-medium text-gray-700 shrink-0">{label}</span>
            <input
              type="text"
              value={specifics[id] || ""}
              onChange={handleChange(id)}
              placeholder={placeholder}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {isCustom && (
              <button
                type="button"
                onClick={() => removeCustom(id)}
                className="text-gray-400 hover:text-red-500 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={openPopup}
        className="mt-4 text-sm text-[#0968F6] hover:text-blue-700 font-medium"
      >
        + Add custom specific
      </button>

      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Add custom specific</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={popupKey}
                  onChange={(e) => setPopupKey(e.target.value)}
                  placeholder="e.g. Country of Manufacture"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Value</label>
                <input
                  type="text"
                  value={popupValue}
                  onChange={(e) => setPopupValue(e.target.value)}
                  placeholder="e.g. Italy"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCustom}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0968F6] hover:bg-blue-700 rounded-lg transition"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
