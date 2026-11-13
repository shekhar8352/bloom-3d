export function LoadingScreen({ visible }: { visible: boolean }) {
  return (
    <div className={`loader ${visible ? '' : 'loader-hide'}`} role="status" aria-live="polite" aria-hidden={!visible}>
      <div className="loader-flower" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} style={{ transform: `rotate(${index * 60}deg)` }}>
            <b style={{ animationDelay: `${index * 0.08}s` }} />
          </span>
        ))}
        <i />
      </div>
      <p className="font-serif text-4xl text-ink">Bloom</p>
      <p className="text-sm tracking-[0.14em] text-ink/70">Arranging the bouquet</p>
    </div>
  )
}
