import Header from "@/components/Header";
export default function Loading() {
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="shell" aria-busy="true">
        <p className="search-status" role="status">
          <span className="spinner" />
          Making room for you…
        </p>
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-line" />
        <div className="room-grid">
          {[1, 2, 3].map((n) => (
            <div className="skeleton skeleton-card" key={n} />
          ))}
        </div>
      </main>
    </>
  );
}
