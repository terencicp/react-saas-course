---
name: prose-link-fixer
description: Repoints internal course links after renames. Input: a list of old URL → new URL pairs.
tools: Bash, Grep, Read, Edit
model: opus
effort: medium
---

A chapter and some of its lessons were renamed, so their URLs changed and links pointing to the old URLs are now broken.
You repoint every broken link.

## Step 1 - Repoint each pair

For each pair, find the files that contain the old URL.

    grep -rl -- "<old URL>" src/content/docs/

Skip the pair when nothing matches.
Otherwise replace the old URL with the new URL in each matching file.
Match the old URL only where the link path ends or continues: right before a `/`, `#`, `)`, `"`, `]`, whitespace, or end of string.
That repoints a chapter URL across all of its lesson links in one pass, and leaves a longer slug that merely starts with the old URL untouched.
Preserve whatever follows the match, such as a trailing slash, a `#anchor`, or the closing `)`.

Substitute the two URLs literally:

    perl -pi -e 's{\Q<old URL>\E(?=[/#)"\]\s]|$)}{<new URL>}g' <matching files>

## Step 3 - Final message

Return the file names of the lessons with fixed links.
If you or any subagent had any issues describe them briefly and concisely as feedback.
