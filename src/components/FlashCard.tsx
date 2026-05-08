import type { Card } from "../data/types";
import { OptionButton } from "./OptionButton";

interface Props {
  card: Card;
  selected: Set<string>;
  submitted: boolean;
  onToggle: (word: string) => void;
  onSubmit: () => void;
  onNext: () => void;
  onViewSynset: (id: string) => void;
}

export function FlashCard({ card, selected, submitted, onToggle, onSubmit, onNext, onViewSynset }: Props) {
  const correctCount = card.options.filter((o) => o.correct).length;
  const selectedCorrect = card.options.filter((o) => o.correct && selected.has(o.word)).length;
  const selectedWrong = card.options.filter((o) => !o.correct && selected.has(o.word)).length;

  return (
    <div className="card">
<h1 className="card__prompt">
        <button className="card__prompt-word" onClick={() => submitted && onViewSynset(card.synsetId)} disabled={!submitted}>
          {(() => {
            const words = card.prompt.replace(/_/g, " ").split(" ");
            const lang = <span className={`card__lang${card.promptLang !== "en" ? ` card__lang--${card.promptLang}` : ""}`}>{card.promptLang}</span>;
            const last = <span style={{ whiteSpace: "nowrap" }}>{words[words.length - 1]}{lang}</span>;
            return words.length === 1 ? last : <>{words.slice(0, -1).join(" ")} {last}</>;
          })()}
        </button>
      </h1>

      {(card.lexname || card.def) && (
        <div className="card__def">
          {card.lexname && <p className="card__lexname">{card.lexname}</p>}
          {card.def && <p className="card__def-text">"{card.def}"</p>}
          {card.examples && card.examples.length > 0 && (
            <ul className="card__examples">
              {card.examples.map((ex, i) => <li key={i}>{ex}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="card__options">
        {card.options.map((opt) => (
          <OptionButton
            key={opt.word}
            option={opt}
            selected={selected.has(opt.word)}
            submitted={submitted}
            onToggle={onToggle}
            onNavigate={onViewSynset}
          />
        ))}
      </div>

      {!submitted ? (
        <button
          className="btn btn--primary"
          onClick={onSubmit}
          disabled={selected.size === 0}
        >
          Submit
        </button>
      ) : (
        <div className="card__result">
          <p className="card__score">
            {selectedWrong === 0 && selectedCorrect === correctCount
              ? "Perfect!"
              : `${selectedCorrect} / ${correctCount} correct${selectedWrong > 0 ? `, ${selectedWrong} wrong` : ""}`}
          </p>
          <button className="btn btn--primary" onClick={onNext}>
            Next word
          </button>
        </div>
      )}
    </div>
  );
}
