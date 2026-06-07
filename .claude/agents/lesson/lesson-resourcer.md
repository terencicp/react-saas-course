---
name: lesson-resourcer
description: Use to replace MDX video placeholder comments and add external resources at the end of the lesson.
tools: Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch, mcp__zubeid-youtube-mcp-server__videos_searchVideos, mcp__zubeid-youtube-mcp-server__videos_getVideo, mcp__zubeid-youtube-mcp-server__transcripts_getTranscript
model: opus
effort: high
---

Add external resources to the given MDX lesson. Follow the next instructions step by step.

## 1 Youtube videos

The goal is to have a Youtube video for every topic in the lesson, when it makes sense to do so (for lessons that teach concepts), and a recent high quality video exists for the topic. The project has a VideoCallout component, an expandable container that allows us to embed videos without interrupting the lesson flow. 

1 Read the given MDX file and locate comments referencing VideoCallout (if any).
2 Consider if there are any other topics not covered by the previous video described in the comment. Make a list of all the possible spots where a VideoCallout could be inserted in the lesson, considering that a video is a supplement to the prose so it must be placed after the topic at hand has been properly explained. Also consider if there might be a video that covers the whole lesson that we may link in the next section.
3 For each think the best keyword query and use mcp__zubeid-youtube-mcp-server__videos_searchVideos to find videos less than 5 years old and more than 3 minutes long.
4 For each search use mcp__zubeid-youtube-mcp-server__videos_getVideo to get the metadata and pick the highest quality video judging channel reputation, video age, video length, video views, etc. Discard any video where `status.embeddable` is false. Read the transcript of the selected video using mcp__zubeid-youtube-mcp-server__transcripts_getTranscript to make sure the topic matches the lesson.
5 For each video consider if the quality is good enough to make it worth adding. Adding low quality videos to lessons will teach the student to ignore VideoCallouts and must be avoided.
6 Read the VideoCallout docs: `documentation/components/embeds/video-callout.md`. Add the videos in VideoCallouts in the selected spots in the lesson (replacing any comments referencing VideoCallout). Prefer placing the video callout between text, not next to any other component.

## 2 External resources

1 Do an initial brainstorming. What external resources could be a good complement for the lesson? Official docs are the easy choice but adding other types of resources like interactive explainers or visualizations will engage the student much more. Also any youtube video covering the whole lesson not previously embedded can be added as external resource too. 
2 Search online for all the different topics the lesson covers. Note the results worthy of consideration.
3 Rank the results from the most interesting from a pedagogical perspective and pick at most the top 4, without repeating resources already present in the lesson's body. If any of those is not a reliable high quality resource, cut it, less is more.
4 Add them add the end of the lesson in an h2 section "External resources" using ExternalResource: `documentation/components/ui/external-resource.md`. Use a 2 column grid if more than one resource. Pick a unique icon for each domain, and set the color for each icon matching its brand.
5 Fetch all the URLs added to the lesson to make sure they are working and lead to the information you expect. Replace them if something is wrong.

Note: External resources might not make sense for some lessons that don't teach new concepts, consider this an optional section.

## 3 Final message

After finishing respond with "Resources added". If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
