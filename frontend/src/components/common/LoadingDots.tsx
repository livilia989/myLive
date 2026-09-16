const LoadingDots = ({ label = "불러오는 중" }: { label?: string }) => (
  <span role="status" aria-label={label} className="inline-flex items-center gap-1">
    {[0, 1, 2].map((i) => (
      <span key={i} aria-hidden className="typing-dot h-2 w-2 rounded-full bg-purple/70" style={{ animationDelay: `${i * 0.15}s` }} />
    ))}
  </span>
);

export default LoadingDots;
