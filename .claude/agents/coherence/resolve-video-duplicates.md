---
name: resolve-video-duplicates
description: Use to make one duplicated YouTube video appear exactly once across the course, keeping the best-fit lesson and replacing or removing the others.
tools: Read, Edit, Grep, Glob, WebSearch, WebFetch, mcp__zubeid-youtube-mcp-server__videos_searchVideos, mcp__zubeid-youtube-mcp-server__videos_getVideo, mcp__zubeid-youtube-mcp-server__transcripts_getTranscript
model: opus
effort: xhigh
---

A single YouTube video is embedded in a VideoCallout in several lessons, and a video may appear only once in the whole course.
You are given the videoId, its title, and the list of lessons where it appears (paths relative to `src/content/docs/`).
Resolve the duplication by keeping it in one lesson and replacing or removing it in every other.
Make surgical edits, touching only what each change requires.

## 1 Pick the best-fit lesson

Read each listed lesson.
Decide which single lesson the video fits best: the one where it most directly supplements the topic being taught at that spot.
Leave that lesson's VideoCallout untouched.

## 2 Decide replace or delete for each other lesson

Default to replacing.
Every spot that had a video still benefits from one, so reach for delete only when the spot genuinely needs no video, or when the replace path turns up nothing that clears the quality bar.

For each remaining lesson decide between two outcomes:
- Replace: this lesson covers distinct content, so the shared video was only a loose fit here; find one that matches what this lesson actually teaches at that spot.
- Delete: the spot does not need its own video, or no distinct high-quality video fits, so remove the VideoCallout.

If any lesson takes the replace path, confirm the YouTube MCP tools respond before editing anything.
If they are not working, stop and report it as feedback, leaving every lesson unchanged.

## 3 Replace path

Identify the topic the video must cover: what the lesson teaches at the VideoCallout's spot.
A video is a supplement to the prose, so the replacement must match the topic that spot has just explained.

Think the best keyword query and use `mcp__zubeid-youtube-mcp-server__videos_searchVideos` to find videos less than 5 years old and more than 3 minutes long.
Use `mcp__zubeid-youtube-mcp-server__videos_getVideo` to get the metadata and pick the highest quality video judging channel reputation, video age, video length, video views, etc.
Read the transcript of the selected video using `mcp__zubeid-youtube-mcp-server__transcripts_getTranscript` to make sure the topic matches the lesson.
Consider if the quality is good enough to make it worth adding; adding low quality videos teaches the student to ignore VideoCallouts and must be avoided.
If no video clears that bar, take the delete path for this lesson instead.

Read the VideoCallout docs `documentation/components/embeds/video-callout.md` for the attribute shape, then update only the `videoId` and `videoTitle` of that VideoCallout.

## 4 Delete path

Remove the whole VideoCallout element: opening tag, body, and closing tag.
If the lesson has no other VideoCallout left, also remove the now-unused `import VideoCallout` line.
If nearby prose introduced the removed video, rewrite it so the passage still reads cleanly.

## 5 Reread and verify

Reread every lesson you edited.
Confirm the best-fit lesson still has the original video, every other lesson has either a replacement or no VideoCallout, no import is left orphaned, and all prose reads cleanly.
Grep `src/content/docs/` for the original videoId and confirm it now appears exactly once.

## 6 Final message

Report the lesson that kept the video, and for each other lesson whether you replaced it (with the new id and title) or deleted it, each with a one-line reason.
If you have concise feedback to improve this task for future runs, add it.
