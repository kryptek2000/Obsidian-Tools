import { RawFileEntry } from '../utils/vaultParser';

export const SAMPLE_VAULT_FILES: RawFileEntry[] = [
  {
    path: '00 - Meta/000 - Index (Home MOC).md',
    name: '000 - Index (Home MOC).md',
    content: `---
title: Home Map of Content
type: moc
status: active
tags: [moc, index, meta]
date: 2026-08-10
---

# 🌌 Welcome to the Second Brain Vault

This is the central Map of Content (MOC) connecting our knowledge base.

## 📌 Core Hubs
- [[010 - Projects MOC]] - Active initiatives and sprint goals
- [[020 - Learning & Concepts MOC]] - Computer science, philosophy, and mental models
- [[030 - People & CRM]] - Contact notes and collaborator logs
- [[040 - Daily Notes Hub]] - Journal logs and daily retrospectives

## ⚡ Quick Nav
- Review [[Atomic Habits - Summary]]
- Deep dive into [[Zettelkasten Method]]
- Check current work in [[Project Obsidian Auditor]]
- Inspect broken link test: [[NonExistentResearchNote]]
- Check missing diagram embed: ![[architecture-diagram-v2.png]]

## 🏷️ Vault Philosophy
Knowledge grows through dense interconnected [[Networked Thought]].
`,
  },
  {
    path: '00 - Meta/010 - Projects MOC.md',
    name: '010 - Projects MOC.md',
    content: `---
title: Projects Map of Content
tags: [moc, projects]
date: 2026-08-11
---

# 🚀 Active Projects

- [[Project Obsidian Auditor]] - An automated diagnostic tool for link integrity and graph visualization.
- [[Project Neural Synapse]] - Exploring agentic workflows with [[Gemini API]].
- [[Project Quantum Leap]] - Secret stealth project.
- Next milestone: Complete UI polish and sync with [[000 - Index (Home MOC)]].
`,
  },
  {
    path: '00 - Meta/020 - Learning & Concepts MOC.md',
    name: '020 - Learning & Concepts MOC.md',
    content: `---
title: Learning & Concepts
tags: [moc, concepts, learning]
date: 2026-08-05
---

# 🧠 Core Concepts & Mental Models

- [[Zettelkasten Method]] - Niklas Luhmann's slip-box system.
- [[Networked Thought]] - Non-linear association of ideas.
- [[Spaced Repetition & Flashcards]] - Long-term retention mechanisms.
- [[Bi-directional Linking]] - How backlink networks emerge.
- Explore connection with [[Atomic Habits - Summary|Habit Loops]].
`,
  },
  {
    path: '01 - Projects/Project Obsidian Auditor.md',
    name: 'Project Obsidian Auditor.md',
    content: `---
title: Project Obsidian Auditor
status: in-progress
priority: high
tags: [projects, dev, typescript, obsidian]
date: 2026-08-12
---

# Project Obsidian Auditor

An interactive auditor for Obsidian markdown vaults.

## Key Features
1. **Broken Links Audit**: Detect missing \`[[WikiLinks]]\` and broken image embeds.
2. **Orphan Detection**: Identify isolated notes with no incoming or outgoing connections.
3. **Interactive Graph**: Visual D3 force network of note nodes and links.
4. **Frontmatter Linting**: Verify YAML syntax and standard fields.

## Tech Stack
- React & TypeScript
- Tailwind CSS
- D3 Force Simulation
- [[Zettelkasten Method]] philosophy

Related: [[010 - Projects MOC]] and [[000 - Index (Home MOC)]].
`,
  },
  {
    path: '01 - Projects/Project Neural Synapse.md',
    name: 'Project Neural Synapse.md',
    content: `---
title: Project Neural Synapse
status: planning
tags: [projects, ai, gemini]
---

# Project Neural Synapse

Building context-aware agents for automated second-brain organization.

## Notes & Hypotheses
- Agents can analyze vault semantics and propose new [[Bi-directional Linking]] pathways.
- Integrating with [[Gemini API]] allows automatic tagging suggestions.
- Reference: [[010 - Projects MOC]].
`,
  },
  {
    path: '01 - Projects/Project Quantum Leap.md',
    name: 'Project Quantum Leap.md',
    content: `---
title: Project Quantum Leap
status: paused
tags: [projects, experimental]
---

# Project Quantum Leap

Exploratory research into quantum computation algorithms.

- Needs research paper review: [[Quantum State Simulation Paper]] *(broken link)*
- Cross-ref: [[010 - Projects MOC]]
`,
  },
  {
    path: '02 - Zettelkasten/Zettelkasten Method.md',
    name: 'Zettelkasten Method.md',
    content: `---
title: Zettelkasten Method
tags: [zettelkasten, pkm, productivity, productivity-systems]
date: 2026-08-01
---

# Zettelkasten Method

The **Zettelkasten** (German for "slip box") is a knowledge management and note-taking method pioneered by sociologist Niklas Luhmann.

## Core Tenets
1. **Atomicity**: Each note should contain one single idea.
2. **Connectivity**: Notes gain value through [[Bi-directional Linking]] and [[Networked Thought]].
3. **Decentralization**: Avoid strict nested hierarchies; let structure emerge naturally via [[000 - Index (Home MOC)|MOCs]].

See also:
- [[Atomic Habits - Summary]]
- [[Spaced Repetition & Flashcards]]
`,
  },
  {
    path: '02 - Zettelkasten/Networked Thought.md',
    name: 'Networked Thought.md',
    content: `---
title: Networked Thought
tags: [pkm, philosophy, cognition]
---

# Networked Thought

Human memory and cognition do not operate like a rigid hierarchical filing cabinet; ideas trigger associative chains.

## Key Insights
- Backlinks reflect neural synaptic connectivity.
- Related: [[Zettelkasten Method]], [[Bi-directional Linking]], [[020 - Learning & Concepts MOC]].
`,
  },
  {
    path: '02 - Zettelkasten/Bi-directional Linking.md',
    name: 'Bi-directional Linking.md',
    content: `---
title: Bi-directional Linking
tags: [pkm, obsidian, links]
---

# Bi-directional Linking

When Note A links to Note B using \`[[Note B]]\`, Note B automatically registers a backlink to Note A.

## Benefits
- Discovery of serendipitous connections.
- Enables graph visualization.
- Strengthens [[Networked Thought]].
- Foundational to [[Zettelkasten Method]].
`,
  },
  {
    path: '02 - Zettelkasten/Spaced Repetition & Flashcards.md',
    name: 'Spaced Repetition & Flashcards.md',
    content: `---
title: Spaced Repetition
tags: [learning, memory, habit]
---

# Spaced Repetition & Flashcards

Spacing out review sessions exponentially flattens the Ebbinghaus forgetting curve.

- Combines well with [[Atomic Habits - Summary]] to build daily review rituals.
- Part of [[020 - Learning & Concepts MOC]].
`,
  },
  {
    path: '03 - Literature/Atomic Habits - Summary.md',
    name: 'Atomic Habits - Summary.md',
    content: `---
title: Atomic Habits by James Clear
author: James Clear
rating: 5/5
tags: [books, psychology, habit, productivity]
date: 2026-07-20
---

# 📚 Atomic Habits - Summary

An actionable framework for improving 1% every day.

## The 4 Laws of Behavior Change
1. Make it obvious
2. Make it attractive
3. Make it easy
4. Make it satisfying

## Connection to Note-Taking
Daily writing habits amplify the [[Zettelkasten Method]] and [[Spaced Repetition & Flashcards]].
`,
  },
  {
    path: '04 - People/Niklas Luhmann.md',
    name: 'Niklas Luhmann.md',
    content: `---
title: Niklas Luhmann
tags: [people, sociology, researcher]
---

# Niklas Luhmann (1927–1998)

Prolific German sociologist who authored over 70 books and 400 scholarly articles using his legendary [[Zettelkasten Method]].
`,
  },
  {
    path: '05 - Daily Notes/2026-08-10.md',
    name: '2026-08-10.md',
    content: `---
date: 2026-08-10
tags: [daily, journal]
---

# 📅 Daily Note: August 10, 2026

## What I Worked On
- Structured the [[000 - Index (Home MOC)]].
- Kicked off [[Project Obsidian Auditor]].
- Reviewed [[Atomic Habits - Summary]] for daily writing routines.
`,
  },
  {
    path: '05 - Daily Notes/2026-08-11.md',
    name: '2026-08-11.md',
    content: `---
date: 2026-08-11
tags: [daily, journal]
---

# 📅 Daily Note: August 11, 2026

## Highlights
- Explored graph algorithms for [[Project Obsidian Auditor]].
- Discussed slip-box conventions with [[Niklas Luhmann|Luhmann's principles]].
- Need to check [[010 - Projects MOC]] progress.
`,
  },
  {
    path: '06 - Isolated Scratchpad/Random Unconnected Thought.md',
    name: 'Random Unconnected Thought.md',
    content: `---
title: Random Midnight Spark
status: draft
---

# Random Midnight Spark

An orphan note with no incoming or outgoing links whatsoever.
This tests the vault auditor's orphan detection algorithm!
#thoughts #unprocessed
`,
  },
  {
    path: '06 - Isolated Scratchpad/Old Abandoned Grocery List.md',
    name: 'Old Abandoned Grocery List.md',
    content: `
# Grocery List from July

- Oat milk
- Green tea matcha
- Dark chocolate 85%
- Sourdough loaf

(Notice: This note has missing frontmatter and zero links!)
`,
  },
  {
    path: '06 - Isolated Scratchpad/Corrupted Frontmatter Note.md',
    name: 'Corrupted Frontmatter Note.md',
    content: `---
title: Bad YAML Example
tags: [broken, syntax
date: 2026-08-12: error
---

# Syntax Error Note

This note has broken YAML frontmatter syntax that should be flagged by the YAML parser.
`,
  },
  {
    path: '07 - Attachments/vault-banner.png',
    name: 'vault-banner.png',
    content: '',
    isBinary: true,
    size: 245000,
  },
  {
    path: '07 - Attachments/unused-screenshot.png',
    name: 'unused-screenshot.png',
    content: '',
    isBinary: true,
    size: 489000,
  },
  // Obsidian Configuration & Community Plugins (.obsidian folder)
  {
    path: '.obsidian/community-plugins.json',
    name: 'community-plugins.json',
    content: JSON.stringify([
      'dataview',
      'obsidian-excalidraw-plugin',
      'templater-obsidian',
      'omnisearch',
      'obsidian-kanban'
    ], null, 2),
    isConfigOrPlugin: true,
    size: 140,
  },
  {
    path: '.obsidian/core-plugins.json',
    name: 'core-plugins.json',
    content: JSON.stringify([
      'file-explorer',
      'global-search',
      'graph',
      'backlink',
      'canvas',
      'daily-notes',
      'templates',
      'tag-pane'
    ], null, 2),
    isConfigOrPlugin: true,
    size: 160,
  },
  {
    path: '.obsidian/app.json',
    name: 'app.json',
    content: JSON.stringify({
      useTab: true,
      tabSize: 2,
      newFileLocation: 'folder',
      newFileFolderPath: '02 - Notes',
      attachmentFolderPath: '07 - Attachments',
      livePreview: true,
      readableLineLength: true,
      showLineNumber: true
    }, null, 2),
    isConfigOrPlugin: true,
    size: 240,
  },
  {
    path: '.obsidian/appearance.json',
    name: 'appearance.json',
    content: JSON.stringify({
      baseTheme: 'dark',
      cssTheme: 'Minimal',
      accentColor: '#6366f1',
      enabledCssSnippets: ['callout-styles', 'custom-cards']
    }, null, 2),
    isConfigOrPlugin: true,
    size: 180,
  },
  {
    path: '.obsidian/hotkeys.json',
    name: 'hotkeys.json',
    content: JSON.stringify({
      'graph:open': [{ modifiers: ['Mod', 'Alt'], key: 'G' }],
      'omnisearch:omnisearch': [{ modifiers: ['Mod'], key: 'O' }]
    }, null, 2),
    isConfigOrPlugin: true,
    size: 150,
  },
  {
    path: '.obsidian/plugins/dataview/manifest.json',
    name: 'manifest.json',
    content: JSON.stringify({
      id: 'dataview',
      name: 'Dataview',
      version: '0.5.67',
      minAppVersion: '0.13.11',
      description: 'Complex data queries and tables for your knowledge base.',
      author: 'Michael Brenan',
      isDesktopOnly: false
    }, null, 2),
    isConfigOrPlugin: true,
    size: 260,
  },
  {
    path: '.obsidian/plugins/dataview/data.json',
    name: 'data.json',
    content: JSON.stringify({
      renderNullAs: '\\-',
      taskCompletionTracking: true,
      inlineQueryPrefix: '=',
      maxRecursiveRenderDepth: 4
    }, null, 2),
    isConfigOrPlugin: true,
    size: 190,
  },
  {
    path: '.obsidian/plugins/templater-obsidian/manifest.json',
    name: 'manifest.json',
    content: JSON.stringify({
      id: 'templater-obsidian',
      name: 'Templater',
      version: '2.9.1',
      minAppVersion: '0.12.0',
      description: 'Create and insert templates with powerful dynamic functions.',
      author: 'SilentVoid13',
      isDesktopOnly: false
    }, null, 2),
    isConfigOrPlugin: true,
    size: 250,
  },
  {
    path: '.obsidian/snippets/callout-styles.css',
    name: 'callout-styles.css',
    content: `/* Custom Obsidian Callout Styling */
.callout[data-callout="quote"] {
  --callout-color: 99, 102, 241;
  border-left: 3px solid #6366f1;
}
.callout[data-callout="seedling"] {
  --callout-color: 16, 185, 129;
  border-left: 3px solid #10b981;
}`,
    isConfigOrPlugin: true,
    size: 280,
  },
];
