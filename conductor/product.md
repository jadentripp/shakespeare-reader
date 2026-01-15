# Initial Concept
A desktop e-book and play reader application built with Tauri, React, and Rust, specifically designed for reading and managing Shakespearean works and other digital books (MOBI format support detected).

# Product Guide - Shakespeare Reader

## Vision
Shakespeare Reader is a high-performance, elegant desktop application built with Tauri, React, and Rust. It provides a specialized environment for reading, managing, and interacting with the works of William Shakespeare and other digital texts. By leveraging local SQLite storage and modern web technologies, it offers a fast, offline-first experience for literature enthusiasts.

## Target Users
*   **Students and Scholars:** Individuals who need a reliable tool for studying classic texts with features like library management and (planned) annotation support.
*   **Classic Literature Enthusiasts:** Casual readers looking for a beautiful, distraction-free interface to enjoy plays and poetry.
*   **AI-Assisted Readers:** Users who want to leverage LLMs (integrated via OpenAI) to explain complex passages or provide historical context.

## Core Features
*   **Digital Library:** Organize and browse a collection of books retrieved from sources like Project Gutenberg (Gutendex).
*   **Advanced Reader:** A premium "Classic Academic" reading environment featuring immersive paper-like textures, dual-column "open book" layouts, and a hierarchical navigation system (Act > Scene).
*   **Appearance Customization:** Advanced typography controls including font switching (EB Garamond, Baskerville, etc.), line height, and margin adjustments.
*   **Offline Access:** Local database (SQLite) for storing book metadata and content.
*   **AI Integration:** Built-in support for OpenAI to assist in understanding archaic language and providing deep literary analysis.

## Success Criteria
*   **Speed:** Near-instant loading of large play scripts.
*   **Extensibility:** Ease of adding new book sources or reading formats.
*   **User Experience:** A clean, focused interface that puts the text first.
