# Chapter 4.8 prerequisites review

## Missing prerequisites

- **Lesson 4.8.2** — `useEffect` signature and dependency array. Quote: "`const [value, setValue] = useState(props.value); useEffect(() => setValue(props.value), [props.value])`". The lesson presents this code (and two further `useEffect` anti-pattern reproductions) as code the student is expected to read and critique, but `useEffect`'s signature — callback plus optional dependency array, reruns when deps change — is not introduced until Lesson 4.9.2. The only prior mention is one sentence in 4.7.3 ("a function React calls after commit, in response to render"), which does not cover the dependency-array contract. Suggested source: a brief `useEffect` primer (signature, dependency array, "reruns when deps change") added to 4.8.2's setup, or a new lesson in Chapter 4.7 or early 4.8 that introduces the minimal `useEffect` mental model before the anti-pattern catalog. Severity: medium.
