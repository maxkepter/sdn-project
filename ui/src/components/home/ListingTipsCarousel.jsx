const tips = [
  { title: "Take great photos", desc: "Good lighting and clear shots help your item sell faster.", color: "bg-blue-500" },
  { title: "Write a compelling title", desc: "Include brand, size, color, and condition for best results.", color: "bg-green-500" },
  { title: "Set the right price", desc: "Research similar listings to price competitively.", color: "bg-purple-500" },
  { title: "Describe accurately", desc: "Honest descriptions build trust and reduce returns.", color: "bg-orange-500" },
  { title: "Offer fast shipping", desc: "Buyers love quick delivery. Offer tracking when possible.", color: "bg-pink-500" },
  { title: "Respond to questions", desc: "Quick replies help close the sale.", color: "bg-teal-500" },
];

export default function ListingTipsCarousel() {
  return (
    <div className="mx-4 mt-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Create a great listing</h2>
      <div className="relative group">
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {tips.map((tip, i) => (
            <div
              key={i}
              className={`${tip.color} min-w-[260px] snap-start rounded-2xl p-6 text-white flex-shrink-0`}
            >
              <div className="text-3xl font-bold mb-2">0{i + 1}</div>
              <h3 className="text-lg font-bold">{tip.title}</h3>
              <p className="mt-2 text-sm text-white/80">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
