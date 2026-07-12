export default function HeroBanner() {
  return (
    <div
      className="relative bg-cover bg-center rounded-2xl mx-4 mt-6 overflow-hidden"
      style={{
        backgroundImage: "url('https://i.ebayimg.com/images/g/hiMAAOSwWXtlYHui/s-l1600.webp')",
        minHeight: "400px",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
      <div className="relative z-10 flex flex-col justify-center h-full max-w-lg px-8 py-16">
        <h1 className="text-4xl font-bold text-white leading-tight">
          If you don't love it, list it
        </h1>
        <p className="mt-3 text-lg text-white/90">
          Turn your pre-loved items into cash. It's fast, easy, and free to sell.
        </p>
        <button className="mt-6 w-fit bg-blue-600 hover:bg-blue-700 text-white font-semibold px-10 py-3 rounded-full text-lg transition">
          Sell now
        </button>
      </div>
    </div>
  );
}
