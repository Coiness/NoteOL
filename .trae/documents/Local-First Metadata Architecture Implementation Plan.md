# Implementation Plan: Local-First Metadata Architecture

We will implement the Local-First architecture where `Y.js` is the source of truth for both content and metadata, and `IndexedDB` serves as a high-performance search index.

## Phase 1: Upgrade Storage Layer (OfflineManager)

We will upgrade `lib/offline-manager.ts` to support the new `notes_index` and Y.js integration.

### 1.1 Add `notes_index` object store

- **Action**: Increment `DB_VERSION` to `2`.
- **Schema**: Create `notes_index` store with `id` as keyPath.
- **Indexes**: Add indexes for `repositoryId`, `updatedAt`, `title` to support fast filtering and sorting.
- **Goal**: This store will hold lightweight JSON objects for list rendering and search, decoupling UI from heavy Y.js parsing.

### 1.2 Implement `updateNoteIndex`

- **Action**: Add a new method `updateNoteIndex(doc: Y.Doc)` to `OfflineManager`.
- **Logic**:
  1. Extract `title`, `tags`, `updatedAt` from `doc.getMap('metadata')`.
  2. Extract plain text preview from `doc.getText('default')` (or 'content').
  3. Construct a flat JSON object: `{ id, title, tags, preview, updatedAt, repositoryId }`.
  4. Write this object to `notes_index`.

## Phase 2: Refactor NoteService for Local-First Operations

We will update `lib/services/note-service.ts` to read/write from the new index and Y.js structures.

### 2.1 Update `createNote`

- **Action**: Rewrite `createNote` to be Y.js-native.
- **Logic**:
  1. Create a new `Y.Doc`.
  2. Populate `metadata` Map (title, tags) and `content` Text.
  3. Persist `Y.Doc` to `y-indexeddb` (ensuring data safety).
  4. Call `offlineManager.updateNoteIndex(doc)` to update the search index immediately.

### 2.2 Update `getNotes`

- **Action**: Switch `getNotes` source from `offline_notes` to `notes_index`.
- **Logic**: Query `notes_index` for fast, pagination-ready data. This eliminates the need to load full note content for list views.

### 2.3 Implement `syncMetadataSnapshot`

- **Action**: Add `syncMetadataSnapshot` method.
- **Logic**:
  1. Call API `GET /api/notes/snapshot` (or similar) to get a list of all note metadata.
  2. Batch write these to `notes_index`.
  3. This ensures a new device has a full list of notes immediately after login.

## Technical Notes

- **Dependencies**: We assume `yjs` and `y-indexeddb` are available.
- **Data Flow**: `UI -> NoteService -> Y.Doc -> (y-indexeddb + notes_index)`.
- **Search**: We will implement a simple local search within `OfflineManager` querying `notes_index`.
