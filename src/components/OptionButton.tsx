import type { Option } from "../data/types";

interface Props {
  option: Option;
  selected: boolean;
  submitted: boolean;
  onToggle: (word: string) => void;
  onNavigate: (id: string) => void;
}

export function OptionButton({ option, selected, submitted, onToggle, onNavigate }: Props) {
  let state = "idle";
  if (submitted) {
    if (option.correct && selected) state = "correct";
    else if (option.correct && !selected) state = "missed";
    else if (!option.correct && selected) state = "wrong";
    else state = "idle";
  } else if (selected) {
    state = "selected";
  }

  return (
    <button
      className={`option option--${state}${submitted ? " option--submitted" : ""}`}
      onClick={() => submitted ? onNavigate(option.synsetId) : onToggle(option.word)}
    >
      {option.word.replace(/_/g, " ")}
      <span className={`card__lang${option.lang !== "en" ? ` card__lang--${option.lang}` : ""}`}>{option.lang}</span>
    </button>
  );
}
