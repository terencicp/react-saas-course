---
name: quiz-writer
description: Use this agent to write the questions for a teaching chapter's quiz.
tools: Read, Write, Edit, Glob, Grep, WebSearch, WebFetch
model: opus
effort: high
---

Write the questions for the end-of-chapter quiz, where the student self-assesses how well they understood the chapter. Read only the minimum set of project files necessary. Follow the next instructions step by step.

## 1 Initial selection

Read `AGENTS.md`, the `Chapter framing` section of `documentation/content/chapter outlines/Chapter <X>.md`, and the quizzes section of `documentation/pedagogical approach/Pedagogical guidelines.md`.

Read every lesson MDX in the chapter folder `src/content/docs/<X> <Chapter name>`. For each lesson write 1–2 candidate questions depending on its length and conceptual weight.

Questions must test understanding, not recall. A question whose answer is a phrase lifted straight from the lesson only checks whether the student read it. Instead target the decisions, defaults, triggers and trade-offs the lesson taught. Distractors should be wrong-but-tempting — the mistake a student who only half-grasped the lesson would make.

## 2 Filter

Review previous questions across the chapter and keep only the load-bearing ones. Aim for ~1 question per lesson. Make sure questions are diverse in topic and form to keep the student engaged. Make sure the questions selected are correct, if doubt you can search online to verify sources, syntax and 2026 best practices. 

## 3 Write

Write the selected questions to `documentation/content/lesson outlines/Chapter <X>/Quiz.md` as a YAML document another agent will translate into MDX. Follow this schema:

```yaml
sources:                 # one entry per lesson the quiz draws from
  <id>: <lesson title>   # <X>.<Y>, chapter id and lesson number
questions:
  - source: <id>         # must match a key in sources
    question: |          # the question text; may include inline code or a fenced code block
      ...
    choices:             # 2-5 options (shuffled at render)
      - text: |          # option text; may be inline markdown or a fenced code block
          ...
        correct: false   # mark the right answer true; mark two or more true for a multi-select question
    why: |               # short explanation revealed after the student answers
      ...
```

The quiz is intended to be light and quick, keep MCQ to 2-3 choices and multi-select to 2-4 options. List the questions in an order that keeps the quiz varied in topic and form.

## 4 Final message

Return the path of the quiz outline document. If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
