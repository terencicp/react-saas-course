# Chapter 13.4 prerequisites review

## Missing prerequisites

- <Lesson 13.4.4> — `XMLHttpRequest` API surface. Quote: "`XMLHttpRequest` for the R2 PUT (so `xhr.upload.onprogress` fires); `fetch` for the two Server Action calls." The student must write `xhr.open('PUT', url)`, `xhr.setRequestHeader('Content-Type', file.type)`, `xhr.upload.onprogress = (e) => ...`, and `xhr.send(file)` from scratch. Chapter 3.6.1 names XHR as "recognition only" and explicitly defers its teaching to this chapter ("the 13.4 R2 upload chapter names the trigger"); chapter 3.7 does not cover XHR at all. No prior chapter teaches the actual call shape. Suggested source: new lesson in Unit 3 (extend 3.6.1 or add 3.6.3) covering the XHR API at the depth needed for upload-progress use. Severity: high.
