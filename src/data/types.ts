export type Pos = "n" | "v" | "a" | "s" | "r";
export type Lang = "en" | "it";

export interface LemmaRef {
  synset: string;
  lemma: string;
}

export interface Lemma {
  name: string;
  count?: number;
  antonyms?: LemmaRef[];
}

export interface Synset {
  id: string;
  pos: Pos;
  lexname: string;
  def: Partial<Record<Lang, string>>;
  examples?: Partial<Record<Lang, string[]>>;
  en?: Lemma[];
  it?: Lemma[];
}

export interface Card {
  prompt: string;
  promptLang: Lang;
  synsetId: string;
  options: Option[];
}

export interface Option {
  word: string;
  lang: Lang;
  correct: boolean;
}

export type LangFilter = "en" | "it" | "both";
