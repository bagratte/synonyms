export type Pos = "n" | "v" | "a" | "s" | "r";
export type Lang = "en" | "it";

export interface Synset {
  id: string;
  pos: Pos;
  en?: string[];
  it?: string[];
}

export interface Card {
  prompt: string;
  promptLang: Lang;
  options: Option[];
}

export interface Option {
  word: string;
  lang: Lang;
  correct: boolean;
}

export type LangFilter = "en" | "it" | "both";
