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
      <p className="card__hint">Select all synonyms</p>
      <h1 className="card__prompt">
        <button className="card__prompt-word" onClick={() => onViewSynset(card.synsetId)}>
          {card.prompt.replace(/_/g, " ")}
        </button>
        <span className={`card__lang${card.promptLang !== "en" ? ` card__lang--${card.promptLang}` : ""}`}>{card.promptLang}</span>
      </h1>

      {card.def && (
        <div className="card__def">
          <p className="card__def-text">"{card.def}"</p>
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
