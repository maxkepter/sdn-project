export default function BusinessBanner() {
  return (
    <div className="relative bg-cover bg-center rounded-2xl mx-4 mt-10 overflow-hidden"
      style={{
        backgroundImage: "url('https://i.ebayimg.com/images/g/6TkAAOSwj-Zl7O~k/s-l1600.webp')",
        minHeight: "300px",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-l from-black/60 to-transparent" />
      <div className="relative z-10 flex flex-col items-end justify-center h-full px-8 py-12">
        <div className="max-w-md text-right">
          <h2 className="text-3xl font-bold text-white">Selling as a business?</h2>
          <p className="mt-3 text-white/80">
            Get access to bulk listing, advanced analytics, and dedicated support with an eBay Store.
          </p>
          <button className="mt-5 w-fit bg-white text-gray-900 font-semibold px-8 py-3 rounded-full text-sm hover:bg-gray-100 transition">
            Learn more
          </button>
        </div>
      </div>
    </div>
  );
}
