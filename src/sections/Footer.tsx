export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <hr className="hairline" />
        <div className="footer__row" style={{ paddingTop: 28 }}>
          <ul className="footer__links text-3">
            <li><a href="https://github.com/cooleschimo" target="_blank" rel="noreferrer">GitHub</a></li>
            <li><a href="https://instagram.com/chi.minutiae" target="_blank" rel="noreferrer">Instagram</a></li>
            <li><a href="mailto:chimin.liu777@gmail.com">Email</a></li>
          </ul>
          <p className="label muted" style={{ margin: 0 }}>Chimin Liu · 2026</p>
        </div>
      </div>
    </footer>
  )
}
