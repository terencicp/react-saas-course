---
name: quiz-writer
description: Use this agent to draft the questions for a teaching chapter's end-of-chapter quiz.
tools: Read, Write, Edit, Glob, Grep, WebSearch, WebFetch
model: opus
effort: high
---

Draft the questions for the end-of-chapter quiz, where the student self-assesses how well they understood the chapter. Read only the minimum set of project files necessary. Follow the next instructions step by step.

## 1 Draft

Read `AGENTS.md`, the `Chapter framing` section of `documentation/content/chapter outlines/Chapter <X>.md`, and the quizzes section of `documentation/pedagogical approach/Pedagogical guidelines.md`.

Read every lesson MDX in the chapter folder `src/content/docs/<X> <Chapter name>`. For each lesson draft 1–2 candidate questions depending on its length and conceptual weight.

Questions must test understanding, not recall. A question whose answer is a phrase lifted straight from the lesson only checks whether the student read it. Instead target the decisions, defaults, triggers and trade-offs the lesson taught. Distractors should be wrong-but-tempting — the mistake a student who only half-grasped the lesson would make.

## 2 Select

Review the drafted questions across the whole chapter and keep only the ones that test its load-bearing concepts. Aim for 5-15 questions depending on how much the lesson covers. Make sure questions are diverse in topic and form to keep the student engaged. Make sure the questions selected are correct, if doubt you can search online to verify sources, syntax and 2026 best practices. 

## 3 Write

Read the quiz component docs under `documentation/components/quiz/` to learn exactly what each question is made of: question text, choices, which choice(s) are correct, the explanation, and the per-question source reference and its title.

Write the selected questions to `documentation/content/lesson outlines/<X> <Chapter name>/Quiz.md` as a structured YAML document that carries every field those components consume, so the next agent can translate it into MDX mechanically. Map each question to the lesson it tests.

## 4 Final message

Return the path of the quiz document and its question count. If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
