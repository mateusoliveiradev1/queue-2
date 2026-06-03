export function MatchScoreBlock({
  factors,
  label,
  recommended
}: {
  factors: string[];
  label: string;
  recommended: boolean;
}) {
  return (
    <div className="match-score" data-recommended={recommended}>
      <span className="eyebrow">Compatibilidade</span>
      <strong>{label}</strong>
      <ul>
        {factors.map((factor) => (
          <li key={factor}>{factor}</li>
        ))}
      </ul>
    </div>
  );
}
