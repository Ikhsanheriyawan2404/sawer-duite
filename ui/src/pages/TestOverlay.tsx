function TestOverlay() {
  return (
    <main className="page page-center overlay-page">
      <section className="overlay-card">
        <div className="thanks-card">
          <p className="thanks-title">THANKS!</p>
          <span className="thanks-underline" />
        </div>
        <p className="donation-line">
          <span className="donation-amount">IDR10,000</span> dari{' '}
          <span className="donation-name">Test</span>
        </p>
        <p className="donation-note">Ini hanya test notifikasi</p>
      </section>
    </main>
  )
}

export default TestOverlay
