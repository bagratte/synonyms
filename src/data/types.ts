export type Pos = "n" | "v" | "a" | "s" | "r";
export type Lang = "en" | "it" | "ru";
export const LANGS: Lang[] = ["en", "it", "ru"];

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
  lang: Lang;
  ili?: string;
  pos: Pos;
  lexname?: string;
  def?: string;
  examples?: string[];
  hypernyms?: string[];
  lemmas: Lemma[];
}

export interface Card {
  prompt: string;
  promptLang: Lang;
  synsetId: string;
  options: Option[];
  lexname?: string;
  def?: string;
  examples?: string[];
}

export interface Option {
  word: string;
  lang: Lang;
  correct: boolean;
  synsetId: string;
}

export type LangFilter = Record<Lang, boolean>;
