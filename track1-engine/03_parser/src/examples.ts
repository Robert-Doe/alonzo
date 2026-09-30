// examples.ts — the classic named terms, built with constructors (there is no parser yet).
//
// The names I, K, S come from combinatory logic (Schönfinkel 1924, Curry 1930). ω and Ω
// are the standard names for self-application and the smallest term that never finishes
// reducing (Module 9).

import { App, Lam, Var, apps, lams, type Term } from "./term.ts";

const x = Var("x"), y = Var("y"), z = Var("z");

export const I: Term = Lam("x", x);                                  // λx. x         identity
export const K: Term = lams(["x", "y"], x);                          // λx. λy. x     constant
export const S: Term = lams(["x", "y", "z"], App(App(x, z), App(y, z))); // λx. λy. λz. x z (y z)
export const omega: Term = Lam("x", App(x, x));                      // λx. x x       ω
export const Omega: Term = App(omega, omega);                        // (λx. x x) (λx. x x)   Ω

// Terms chosen to exercise every parenthesization rule in print.ts.
export const parenCases: { name: string; term: Term }[] = [
  { name: "app is left-assoc",           term: apps(Var("f"), Var("a"), Var("b")) },            // f a b
  { name: "right-nested app needs parens", term: App(Var("f"), App(Var("a"), Var("b"))) },       // f (a b)
  { name: "λ body extends right",        term: Lam("x", App(x, y)) },                           // λx. x y
  { name: "λ applied needs parens",      term: App(Lam("x", x), y) },                           // (λx. x) y
  { name: "trailing λ arg: no parens",   term: App(Var("f"), Lam("x", x)) },                    // f λx. x
  { name: "λ arg followed by more",      term: apps(Var("f"), Lam("x", x), Var("g")) },         // f (λx. x) g
  { name: "λ arg inside right-nested app", term: App(Var("f"), App(Var("g"), Lam("x", x))) },   // f (g λx. x)
  { name: "Ω",                           term: Omega },                                         // (λx. x x) λx. x x
];
