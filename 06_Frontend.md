# Module 06: Frontend & State Management

---

## 1. Purpose

### Why This Module Exists
The **Frontend & State Management** module represents the user interface and local state engine of TaskFlow. In client-side engineering interviews, candidates must demonstrate proficiency in component architecture, state management optimization, network state caching, real-time client sync, complex user gesture handling (drag-and-drop), and UI animation performance.

### What Problem It Solves
TaskFlow's dashboard must feel premium, responsive, and alive.
* Traditional client apps suffer from "stale state" where edits made by one user are not visible to another without manual page reloads.
* Loading state indicators on every click create a sluggish, disjointed user experience.
* Managing complex drag-and-drop gestures requires handling layout offsets, coordinate collision checking, and drag overlays.

Utilizing React Query for server-state synchronization and dnd-kit for canvas movements ensures the interface feels fast and fluid.

### How It Interacts With Other Modules
The frontend acts as the user interaction shell:
* Fetches and caches database payloads exposed by the **Backend API**.
* Synchronizes real-time updates using WebSockets managed by the **Socket Service**.
* Formats UI themes using modern CSS tokens and Framer Motion transitions.

```
                  +--------------------------------+
                  |         React Frontend         |
                  +--------------------------------+
                    |                            ^
            (1) User Drag                (3) Socket Event
                    v                            |
+-----------------------+                +-----------------+
|   Dnd-kit Collision   |                |   React Query   |
+-----------------------+                |   Cache Inval   |
        |                                +-----------------+
  (2) HTTP PATCH                                 ^
        v                                        |
+------------------------------------------------+
|                Express API Server              |
+------------------------------------------------+
```

### Real-World Analogy
Think of the frontend as an interactive, physical bulletin board.
* **React components** are the colored cards and board partitions.
* **React Query** is a secretary who sits next to the board, keeping a catalog of all cards in a drawer. When a change happens, the secretary updates the board instantly and calls the archives (backend) to sync records.
* **Dnd-kit** is the physical hand movement: picking up a card, verifying it fits in the targeted column, and pinning it.
* **Framer Motion** is the smooth visual glide of the card across the board, rather than it teleporting instantly.

---

## 2. High-Level Overview

TaskFlow's frontend is a Single Page Application (SPA) built using React, TypeScript, and Vite. State management is split between React Query (server-state cache) and standard React Hooks (local UI state).

---

## 3. Detailed Workflow

Let us trace the drag-and-drop card mutation flow: **A user drags Task X from Column A to Column B.**

### Execution Sequence
1. **Gesture Capture**:
   * The user clicks and drags a task card. `DndContext` captures the pointer coordinates and activates the `PointerSensor`.
   * A clone of the card is rendered inside a `DragOverlay` to maintain smooth 60fps rendering during movements.
2. **Optimistic Cache Update**:
   * On drag end, the client identifies the target column ID.
   * The `useMutation` callback triggers, canceling any outgoing queries for the project board to prevent overwrite race conditions.
   * It snapshot the current board cache, manually moves the card in the local cache data, and updates the UI instantly (<60ms).
3. **API Synchronisation**:
   * An HTTP `PATCH /api/v1/tasks/:id` request is dispatched with the destination column ID.
   * If the API responds with success, the client invalidates the cache key `['board', projectId]` to sync local state with the database.
4. **Error Rollback**:
   * If the API fails (e.g. database error, timeout), the `onError` callback runs.
   * It reads the cached snapshot taken in step 2 and rolls back the UI, snapping the card back to its original column.

---

## 4. Classes (Custom Hooks)

Frontend structures are functional, with stateful logic extracted into custom hooks.

### `useTimeTracker` (Stateful Stopwatch)
* **Purpose**: Coordinates live stopwatch sessions and manual log submissions.
* **Responsibilities**:
  * Tracks elapsed seconds using a `setInterval` timer.
  * Handles start, pause, and reset actions.
  * Syncs active timer states to local storage to prevent data loss on page refreshes.
* **Why This Design**: Separating stopwatch state from the `TaskDetailDrawer` component prevents layout re-renders on every clock tick, keeping UI updates fast and isolating timer state.

---

## 5. Functions

### `filterTasks(tasks)`
* **Purpose**: Filters the task list based on active search queries and priority filters.
* **Parameters**:
  * `tasks`: `Task[]`
* **Return Value**: Filtered array of tasks.
* **Time Complexity**: $O(N)$ where $N$ is the number of tasks in the list.
* **Execution**:
  ```typescript
  return tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority ? task.priority === filterPriority : true;
    return matchesSearch && matchesPriority;
  });
  ```
* **Why Written This Way**: Performing filtering on the client avoids making redundant API calls for basic search queries.

---

## 6. Architecture Discussion

### SPA State Modularity & Layout Routing
* **State Separation**: We maintain a strict boundary: server data belongs in React Query cache, while local interactive states (like open modals or active inputs) remain in React's local state.
* **Sensors Configuration**: `dnd-kit` uses `PointerSensor` with an activation constraint of 5px. This prevents accidental drag events from triggering when users simply click a card to open details.

---

## 7. Interview Questions

### Easy (15)

#### 1. What is the virtual DOM in React?
* **Answer**: A lightweight representation of the actual DOM stored in memory. React compares this virtual DOM with the real DOM to execute minimal, target updates.
* **Explanation**: Instead of re-rendering the entire page on every state update, React calculates differences (diffs) and only updates modified nodes.
* **Follow-up**: *What triggers a virtual DOM reconciliation?* State updates or changes to component props.
* **Common Mistakes**: Claiming that the virtual DOM is faster than the actual DOM in all cases.

#### 2. What is the role of `queryKey` in React Query?
* **Answer**: A unique array key used to identify, cache, and invalidate specific query states.
* **Explanation**: In TaskFlow, `['board', projectId]` is the query key for fetching board data. Invalidating this key prompts React Query to re-fetch the data.
* **Follow-up**: *What happens if you use a dynamic query key like `['project', id]`?* React Query caches responses separately for each unique ID.
* **Common Mistakes**: Reusing identical query keys for different API endpoints.

#### 3. What does React `useEffect` hook do?
* **Answer**: It allows executing side-effects (like data fetching, subscription setups, or manual DOM modifications) in functional components.
* **Explanation**: We use `useEffect` to manage the stopwatch intervals and update page titles.
* **Follow-up**: *What happens if the dependency array is empty `[]`?* The effect runs once when the component mounts and cleans up on unmount.
* **Common Mistakes**: Forgetting to return a cleanup function, leading to memory leaks (like un-cleared intervals).

#### 4. What is Vite, and why do we use it instead of Create React App (CRA)?
* **Answer**: Vite is a modern frontend build tool that uses native ES modules during development, offering fast startup and hot module replacement (HMR) speeds.
* **Explanation**: CRA uses Webpack, which bundles the entire application before starting the dev server. Vite starts the server instantly and compiles files on-demand.
* **Follow-up**: *How does Vite optimize production builds?* It uses Rollup to generate highly optimized static assets.
* **Common Mistakes**: Stating that Vite runs on Webpack under the hood.

#### 5. What are React Props?
* **Answer**: Read-only properties passed from parent components to child components to configure their rendering logic.
* **Explanation**: The `SortableColumn` component receives the `col` and `tasks` details as props.
* **Follow-up**: *Can a child component modify its props?* No, props are immutable. To change them, the parent must pass down a update handler.
* **Common Mistakes**: Modifying prop variables directly inside child components.

#### 6. What is the difference between `useState` and `useRef`?
* **Answer**: `useState` triggers a component re-render when its value updates. `useRef` stores a mutable value that does not trigger re-renders on change.
* **Explanation**: We use `useRef` to store the active interval ID of the stopwatch because we don't need to re-render the drawer layout when the interval pointer changes.
* **Follow-up**: *How do you access the value of a ref?* Via the `ref.current` property.
* **Common Mistakes**: Using `useState` to store values that have no impact on the rendered HTML output.

#### 7. What is tailwind/vanilla CSS styling tokens?
* **Answer**: Design tokens (variables) that represent our theme values (colors, spacing, fonts) in CSS.
* **Explanation**: In our CSS, we define variables like `--color-primary` inside the `:root` selector, making it easy to support dark/light modes.
* **Follow-up**: *How do you reference these variables in CSS rules?* Using the `var()` function (e.g. `color: var(--color-primary)`).
* **Common Mistakes**: Hardcoding hex color values directly inside components.

#### 8. What is the purpose of Framer Motion in TaskFlow?
* **Answer**: A production-ready animation library for React that simplifies exit/entry transitions, layout morphing, and keyframe animations.
* **Explanation**: We use it to animate card movements, drawer sliding transitions, and modal alerts.
* **Follow-up**: *What wrapper component handles exit animations?* `<AnimatePresence>`.
* **Common Mistakes**: Using complex CSS animation keyframes for layout morphs when Framer Motion can handle them automatically.

#### 9. What does the `dnd-kit` library do?
* **Answer**: A lightweight, modular drag-and-drop toolkit for React that provides sensors, modifiers, collision detection, and sortable context helpers.
* **Explanation**: It coordinates drag interactions, manages layouts, and fires callbacks when items are dropped.
* **Follow-up**: *Which component defines droppable zones?* Components utilizing the `useDroppable` hook.
* **Common Mistakes**: Using HTML5 native drag-and-drop APIs, which are difficult to customize and support on mobile browsers.

#### 10. What is React Hook Form or standard controlled inputs?
* **Answer**: Controlled inputs bind their values to component state, re-rendering the input on every keystroke. React Hook Form uses uncontrolled inputs under the hood, reducing re-renders and improving form performance.
* **Explanation**: For small forms (like task creation), standard state inputs are fine. For larger forms, uncontrolled setups are faster.
* **Follow-up**: *What hook does React Hook Form provide?* `useForm`.
* **Common Mistakes**: Updating global application state variables on every keystroke in input forms.

#### 11. What is the difference between server state and client state?
* **Answer**: Client state is temporary data isolated to the browser (e.g. open dropdowns). Server state is persistent data stored in a database (e.g. board details).
* **Explanation**: React Query manages server state; standard React hooks manage client state.
* **Follow-up**: *Why do we separate them?* To keep local UI states responsive while caching and syncing database data in the background.
* **Common Mistakes**: Storing both server data and local UI states in a single global Redux store.

#### 12. What does `React.memo` do?
* **Answer**: A higher-order component that memoizes the rendering output of a component, preventing unnecessary re-renders if its props have not changed.
* **Explanation**: We wrap static list cards in `React.memo` to optimize performance when parent containers re-render.
* **Follow-up**: *Does it perform deep comparison of props?* No, it performs a shallow comparison of props by default.
* **Common Mistakes**: Wrapping every single component in `React.memo` without analyzing rendering performance, which adds comparison overhead.

#### 13. What is the purpose of the `dnd-kit` Sensor constraint?
* **Answer**: It defines the conditions required to trigger a drag event.
* **Explanation**: We require a pointer movement of at least 5px to distinguish card drag actions from standard clicks.
* **Follow-up**: *What happens if the constraint is 0?* Clicking a card to open details will accidentally trigger a drag event.
* **Common Mistakes**: Leaving constraints undefined, causing poor UX on mobile screens.

#### 14. How do you implement client-side routing in React?
* **Answer**: Using a routing library (like React Router) that intercepts URL updates and swaps rendering components dynamically without reloading the page.
* **Explanation**: We define route paths (e.g. `/project/:projectId`) and map them to their corresponding page components.
* **Follow-up**: *What hook is used to navigate programmatically?* `useNavigate`.
* **Common Mistakes**: Using standard `<a href="...">` links, which trigger full-page reloads and wipe local state.

#### 15. What are React Custom Hooks?
* **Answer**: Reusable functions that encapsulate stateful logic, allowing it to be shared across multiple components.
* **Explanation**: We write custom hooks like `useTimeTracker` to share stopwatch logic between different UI panels.
* **Follow-up**: *Must custom hooks start with "use"?* Yes, the "use" prefix is a lint rule that enables React to enforce hook rules.
* **Common Mistakes**: Thinking custom hooks share state instances across components (each invocation gets its own isolated state).

---

### Medium (20)

#### 1. Why does `dnd-kit` require a `DragOverlay` component, and how does it improve mobile rendering performance?
* **Interviewer's Intent**: To check understanding of DOM rendering layouts and performance optimizations during drag animations.
* **Answer**: Without a `DragOverlay`, the dragged card remains in the normal document flow inside its parent column, causing page layouts to shift during drag movements. `DragOverlay` renders a clone of the card at the root level of the document, outside the parent column. This removes it from the layout flow and allows the browser to animate it using hardware-accelerated CSS transforms.
* **Why Interviewer Asks**: Drag animations can suffer from stutter on mobile browsers if layouts re-calculate on every coordinate update.
* **Common Mistakes**: Animating margins or top/left absolute positions instead of utilizing CSS transforms.
* **Follow-up**: *Which CSS property does dnd-kit use to animate overlays?* `transform: translate3d(x, y, 0)`.
* **Production Example**: Drag layouts in trello-like interfaces.

#### 2. What is optimistic UI, and how do you configure it in React Query?
* **Interviewer's Intent**: To check capability in designing zero-latency responsive user interfaces.
* **Answer**: Optimistic UI updates the local cache state instantly assuming the server write will succeed, and rolls back if it fails. In React Query, we configure this inside `useMutation` callbacks:
  1. `onMutate`: Cancel outgoing refetches, save current cache snapshot, and write the new state directly to the cache.
  2. `onError`: Restore the cache using the saved snapshot.
  3. `onSettled`: Invalidate the query key to trigger a background refetch and sync with the database.
* **Why Interviewer Asks**: Optimistic updates ensure the board feels responsive, avoiding loading spinners during drag-and-drop actions.
* **Common Mistakes**: Mutating the cache directly without saving a rollback snapshot, which leaves the UI in a corrupt state if updates fail.
* **Follow-up**: *What method writes data to the cache directly?* `queryClient.setQueryData`.
* **Production Example**: Dragging cards on Kanban boards.

#### 3. How do you prevent layout thrashing and re-render loops in large React lists (like project tasks)?
* **Interviewer's Intent**: To check list rendering optimization skills.
* **Answer**: 
  1. Always use unique, stable keys (like task IDs) instead of array indices in loops.
  2. Wrap list items in `React.memo` to prevent re-renders if props have not changed.
  3. Use CSS properties like `content-visibility: auto` or virtual list libraries (like `react-window`) to render only visible items.
* **Why Interviewer Asks**: Large boards with hundreds of cards will experience UI lag on updates if every card re-renders.
* **Common Mistakes**: Using array indices as keys in dynamic lists, which causes React to rebuild elements on reordering.
* **Follow-up**: *Why are array indices bad keys?* If the list is reordered or items are deleted, indices shift, forcing React to re-evaluate and re-render every item.
* **Production Example**: Rendering massive boards with hundreds of active task cards.

#### 4. How does the `PointerSensor` activation constraint work in `dnd-kit`, and why is it necessary?
* **Interviewer's Intent**: To check gesture configuration UX practices.
* **Answer**: The activation constraint defines the distance or duration threshold required to trigger a drag action (e.g. `distance: 5`). It is necessary because task cards contain interactive elements (like edit buttons or delete buttons). Without a constraint, clicking an interactive element would instantly start a drag, blocking button clicks.
* **Why Interviewer Asks**: Poorly configured sensors degrade user experience by blocking basic button clicks on cards.
* **Common Mistakes**: Leaving sensors configuration at default, which leads to layout friction.
* **Follow-up**: *What is the time-based alternative?* `delay: 250` (requires holding the pointer down for 250ms to start a drag).
* **Production Example**: Mobile board layouts.

#### 5. Why do we cancel outgoing queries during an optimistic mutation in React Query?
* **Interviewer's Intent**: To check concurrency and race condition mitigation skills.
* **Answer**: If we don't cancel outgoing queries, a slow background query fetch could complete after we start our mutation, overwriting our optimistic local update with stale server data. Once our mutation completes, the UI would flicker or revert before updating again.
* **Why Interviewer Asks**: Resolving race conditions in asynchronous states is critical for UI stability.
* **Common Mistakes**: Assuming mutation writes are always processed instantly by the server before any other query resolves.
* **Follow-up**: *What method cancels active queries?* `queryClient.cancelQueries(queryKey)`.
* **Production Example**: Caching structures in collaborative boards.

#### 6. What is the difference between `useMemo` and `useCallback`?
* **Answer**: `useMemo` memoizes the returned *value* of a computation function. `useCallback` memoizes the *function instance* itself, preserving referential equality between renders.
* **Why Interviewer Asks**: Crucial hooks optimization knowledge.
* **Common Mistakes**: Wrapping every variable in `useMemo` without assessing recalculation costs.
* **Follow-up**: *When is useCallback essential?* When passing callback functions as props to child components wrapped in `React.memo`.
* **Production Example**: Memoizing task filter results to prevent recalculations on unrelated state updates.

#### 7. How do you implement global error boundary handlers in React?
* **Answer**: We create a class component that implements `componentDidCatch` or `getDerivedStateFromError`, wrapping our main application entry point to catch and display fallback layouts when child components crash.
* **Why Interviewer Asks**: Unhandled React rendering errors crash the entire application screen, leaving a blank page.
* **Common Mistakes**: Thinking functional components can implement error boundaries directly.
* **Follow-up**: *Can error boundaries catch async API errors?* No, they only catch errors thrown during the React render lifecycle.
* **Production Example**: Standard error fallback pages in single-page applications.

#### 8. What is CSS glassmorphism, and how do we build it?
* **Answer**: A design style that uses transparency, background blur, and subtle borders to create a frosted-glass look. We build it using `backdrop-filter: blur(px)`, translucent background colors (e.g. `rgba(255,255,255,0.05)`), and thin semi-transparent borders.
* **Why Interviewer Asks**: Explains styling capabilities and modern CSS execution.
* **Common Mistakes**: Forgetting to add fallback background colors for older browsers that don't support backdrop filters.
* **Follow-up**: *What fallback property should you define?* A solid background color with standard opacity.
* **Production Example**: TaskFlow topbar and card containers.

#### 9. Why is Vite faster than Webpack in development mode?
* **Answer**: Webpack compiles the entire application before starting the dev server. Vite uses native browser ES modules, serving source files directly and letting the browser compile them on-demand. It uses `esbuild` written in Go to pre-bundle third-party dependencies, which is 10-100x faster than JS-based bundlers.
* **Why Interviewer Asks**: Tests build tool optimization knowledge.
* **Common Mistakes**: Assuming Vite and Webpack compile identical code structures.
* **Follow-up**: *How does it compile code for production?* Vite compiles and bundles code using Rollup.
* **Production Example**: Build setups for modern single-page applications.

#### 10. How do you handle file upload status updates on the frontend?
* **Answer**: We use HTTP request progress events (e.g., Axios `onUploadProgress` callbacks) to update a progress percentage state variable, rendering a dynamic progress bar on the UI.
* **Why Interviewer Asks**: Crucial for upload user experience.
* **Common Mistakes**: Showing a generic loading spinner without progress indicators for large file uploads.
* **Follow-up**: *How do you cancel an active file upload?* Using an `AbortController` passed to the request options.
* **Production Example**: Upload progress bars in file attachment managers.

#### 11. What is the difference between controlled and uncontrolled components in React?
* **Answer**: Controlled components bind their value to React state, updating state on every change. Uncontrolled components let the DOM manage input values directly, reading them using refs when submitted.
* **Why Interviewer Asks**: Explains input parsing patterns.
* **Common Mistakes**: Using controlled inputs for massive forms with hundreds of fields, which degrades performance due to constant re-renders.
* **Follow-up**: *How does React Hook Form leverage this?* It uses uncontrolled inputs with refs, minimizing re-renders.
* **Production Example**: Forms in settings panels.

#### 12. How do you implement theme configurations (Dark/Light Mode) in CSS?
* **Answer**: By defining CSS custom properties (variables) inside `:root` and overriding them under a specific class (e.g. `.dark-theme`) or media query (`@media (prefers-color-scheme: dark)`).
* **Why Interviewer Asks**: Explains modern styling architecture.
* **Common Mistakes**: Using JavaScript states to set inline style colors on every element.
* **Follow-up**: *What is the advantage of CSS variables?* Changing a theme requires changing a single class on the body element, and updates are computed instantly by the browser.
* **Production Example**: Implementing theme switchers in dashboards.

#### 13. What is the React `useContext` hook, and when should you use it?
* **Answer**: It enables sharing state variables across a component tree without manually passing props down through every nesting level (prop drilling).
* **Why Interviewer Asks**: Tests state sharing patterns.
* **Common Mistakes**: Using Context as a high-frequency state bus, which triggers re-renders on all consuming child components.
* **Follow-up**: *How do you optimize Context re-renders?* By splitting state into separate contexts (e.g. StateContext and DispatchContext).
* **Production Example**: Auth context providers.

#### 14. What are React Fiber and the reconciliation algorithm?
* **Answer**: Fiber is React's core rendering engine. It breaks rendering work into incremental units, allowing React to pause, resume, or abort rendering calculations to keep the browser main thread responsive.
* **Why Interviewer Asks**: Tests deep React internal knowledge.
* **Common Mistakes**: Believing React renders components synchronously in a single blocking call.
* **Follow-up**: *What is double buffering in Fiber?* Fiber maintains two trees: the current visible tree and a work-in-progress tree used to calculate updates before rendering.
* **Production Example**: React scheduler management.

#### 15. How do you optimize image load times on Web Dashboards?
* **Answer**: 
  1. Compress and convert images to modern formats (like WebP).
  2. Implement lazy loading (`loading="lazy"`).
  3. Use responsive image widths (`srcset`).
  4. Cache static assets using CDNs.
* **Why Interviewer Asks**: Images are the largest contributors to page load sizes.
* **Common Mistakes**: Loading raw high-resolution PNG files directly on dashboard cards.
* **Follow-up**: *What tool did we use for user avatars?* Gravatar URL generations or optimized cloud avatar formats.
* **Production Example**: Avatar render components.

#### 16. What is the difference between `React.lazy` and dynamic imports?
* **Answer**: Dynamic import is a JavaScript feature that loads files asynchronously. `React.lazy` is a React utility that wraps dynamic imports, allowing components to be rendered dynamically with fallback loaders.
* **Why Interviewer Asks**: Code splitting configuration patterns.
* **Common Mistakes**: Calling `React.lazy` inside render functions (it must be defined at the module level).
* **Follow-up**: *Which component provides the loading fallback?* `<Suspense fallback={<Loader />} >`.
* **Production Example**: Lazy loading the billing page chunk.

#### 17. How do you implement route guards in React Router?
* **Answer**: We create a wrapper component (e.g. `ProtectedRoute`) that checks the authentication state. If authenticated, it renders the child components; otherwise, it redirects the user to the login screen using the `<Navigate />` component.
* **Why Interviewer Asks**: Essential route security design.
* **Common Mistakes**: Checking authentication state only on route transitions, which can be bypassed.
* **Follow-up**: *What happens if the token expires while the user is active?* The API interceptor returns a 401, triggering a redirect to the login screen.
* **Production Example**: Protecting dashboard paths.

#### 18. What is the difference between inline styles and CSS Modules?
* **Answer**: Inline styles are written as JavaScript objects, added directly to HTML elements, and do not support media queries or hover effects. CSS Modules write standard CSS files, automatically generating unique class names at compile time to prevent namespace collisions.
* **Why Interviewer Asks**: Explains CSS scoping.
* **Common Mistakes**: Hardcoding layout spacing in inline style properties.
* **Follow-up**: *Which one compiles faster?* CSS Modules, as inline styles increase DOM footprint and JavaScript calculation overhead.
* **Production Example**: Component-level styling.

#### 19. How do you handle API request timeouts on the client?
* **Answer**: We configure the request timeout limit in our HTTP client options (e.g. `timeout: 10000` in Axios). If the request exceeds the limit, the promise rejects with a timeout error, which we catch to display a retry alert.
* **Why Interviewer Asks**: Prevents requests from hanging indefinitely.
* **Common Mistakes**: Leaving timeouts at default (unlimited), which keeps connection handles open.
* **Follow-up**: *How do you cancel requests?* Using `AbortController`.
* **Production Example**: Configuring timeout limits on the base API client.

#### 20. What is responsive web design, and how do you achieve it in CSS?
* **Answer**: Design that adapts the UI layout dynamically to different screen sizes. We achieve this using CSS Grid, Flexbox, media queries (`@media`), and relative units (like `rem`, `em`, `%`, `vw`, `vh`).
* **Why Interviewer Asks**: Essential front-end layout capability.
* **Common Mistakes**: Using fixed pixel widths for main layout containers.
* **Follow-up**: *What is the mobile-first approach?* Writing base styles for mobile screens first and appending larger screens overrides inside media queries.
* **Production Example**: Responsive layouts on dashboard screens.

---

### Hard (20)

#### 1. How would you design a high-performance virtual grid component in React to render 50,000 tasks inside a Kanban board without dropping frames?
* **Detailed Answer**: To render 50,000 tasks, we must implement **Virtualization (Windowing)**. Instead of creating DOM nodes for all 50,000 cards, we only render the cards visible within the browser viewport (window).
  1. We measure the dimensions of the scroll container.
  2. Map tasks to virtual offsets.
  3. Listen to scroll events, calculate the visible row/column indexes, and render only the visible subset, positioning them using absolute offsets.
  4. Wrap card components in `React.memo` to prevent re-renders on scroll.
* **Deep Explanation**: The browser struggles to animate or layout DOM trees containing more than 2,000-3,000 nodes. Virtualization keeps the active DOM node count constant (usually <100 nodes), guaranteeing smooth 60fps scrolling.
* **Alternative Approach**: Standard pagination or infinite scrolling.
  * *Pros*: Simple, native browser scrolling.
  * *Cons*: Performance degrades as the user scrolls down and loads more items.
* **Production Example**: Large board canvases in Jira or Asana.
* **Cross Questions**: *How do you handle cards with dynamic heights in virtual grids?* We must measure heights dynamically using resize observers and update virtual offset coordinates on the fly, which adds computational overhead.

#### 2. How do you resolve race conditions when multiple concurrent WebSockets broadcast updates for the same cached query in React Query?
* **Detailed Answer**: Concurrent socket updates can trigger rapid, overlapping refetches, resulting in query queue overflows and UI flickering. We resolve this by:
  1. **Debouncing socket invalidations**: Instead of invalidating queries instantly, we batch invalidations within a short window (e.g. 50ms).
  2. **Direct cache updates**: Instead of invalidating queries (which triggers refetches), we update the cache data directly using the socket payload.
  3. **Mutations isolation**: We ignore incoming socket updates for entities the user is actively mutating to prevent local edits from being overwritten.
* **Deep Explanation**: Directly patching the local cache (`queryClient.setQueryData`) avoids HTTP roundtrips, reducing server network load.
* **Alternative Approach**: Full page refetches.
  * *Pros*: Simple setup, guarantees consistency.
  * *Cons*: Poor user experience and high server load.
* **Production Example**: Real-time collaborative documents.
* **Cross Questions**: *What if the socket payload contains incomplete entity data?* We merge incoming fields with the existing cached object.

#### 3. How would you optimize the initial load time (LCP, FCP) of a React dashboard app?
* **Detailed Answer**: 
  1. **Code Splitting**: Dynamic imports via `React.lazy` to load non-essential pages (like settings or billing) on demand.
  2. **Asset Compression**: Compress static assets using Brotli and serve them via a CDN.
  3. **Pre-fetching critical queries**: Pre-fetch user profile queries in parallel during JS bundle downloads.
  4. **Font Optimization**: Use modern font formats (`woff2`) and set `font-display: swap` to prevent render blocking.
* **Deep Explanation**: Largest Contentful Paint (LCP) and First Contentful Paint (FCP) are core web vitals. Code splitting reduces the initial JS bundle size, allowing the browser to render the page layout faster.
* **Alternative Approach**: Server-Side Rendering (SSR) via Next.js.
  * *Pros*: Near-instant FCP, as the server returns pre-rendered HTML.
  * *Cons*: Increases server CPU overhead and deployment complexity.
* **Production Example**: Dashboard landing speed optimizations.
* **Cross Questions**: *What is the difference between LCP and FCP?* FCP measures when the first element (like text or background) is rendered. LCP measures when the main primary content element is rendered.

#### 4. How does the browser Event Loop interact with React virtual DOM updates and rendering cycles?
* **Detailed Answer**: The browser event loop runs in phases: executing macrotasks (like timers), running microtasks (like promise resolutions), and executing rendering updates (usually capped at 60fps). React's rendering calculations run as microtasks.
  To prevent blocking the browser's paint phase during large calculations, **React Concurrent Mode** uses cooperative scheduling (via `requestIdleCallback` or custom message loops) to yield control back to the event loop periodically, keeping animations smooth.
* **Deep Explanation**: If a JavaScript task runs longer than 16ms, it blocks the event loop's paint phase, causing frame drops (jank). Concurrent React splits rendering computations into small chunks to avoid blocking the main thread.
* **Alternative Approach**: Web Workers.
  * *Pros*: Moves computations to separate background threads.
  * *Cons*: DOM access is not supported in Web Workers, requiring complex message serialization.
* **Production Example**: Smooth rendering in high-interaction applications.
* **Cross Questions**: *What is the difference between a microtask and a macrotask?* Microtasks (like promises) run immediately after the current script executes, before the event loop yields to the browser's paint phase. Macrotasks (like setTimeout) run in subsequent loop cycles.

#### 5. How would you design a secure token storage strategy in a React SPA that is resilient to both XSS and CSRF?
* **Detailed Answer**: We store the short-lived access token strictly **in application memory** (JavaScript state). The long-lived refresh token is stored in an **HttpOnly, Secure, SameSite=Strict cookie**.
* **Deep Explanation**: 
  * Storing tokens in memory protects them from XSS because scripts cannot read memory variables easily. Storing them in HttpOnly cookies protects them from XSS because JavaScript cannot access cookies.
  * SameSite=Strict cookies protect against CSRF by ensuring the cookie is only sent on requests originating from the same domain.
* **Alternative Approach**: Storing access tokens in localStorage.
  * *Pros*: Simple setup, session persists across browser tab closures.
  * *Cons*: Vulnerable to XSS token theft.
* **Production Example**: Session security configurations in modern SaaS platforms.
* **Cross Questions**: *What is CSRF?* Cross-Site Request Forgery, an attack where a malicious site tricks a browser into executing actions on an authenticated target site.

#### 6. What is the difference between `dnd-kit`'s PointerSensor and MouseSensor?
* **Answer**: `PointerSensor` is a modern browser API sensor that supports touch events, pen inputs, and mouse movements uniformly. `MouseSensor` is legacy, supporting only mouse clicks and moves, which requires registering additional touch sensors for mobile devices.
* **Why Interviewer Asks**: Tests cross-device compatibility design.
* **Common Mistakes**: Registering only MouseSensor and assuming drag-and-drop works on tablets and mobile screens.
* **Follow-up**: *Which one did we use?* `PointerSensor` with custom movement constraints.
* **Production Example**: Drag-and-drop support on mobile dashboards.

#### 7. How do you implement global state synchronization across multiple browser tabs?
* **Answer**: We use the **Broadcast Channel API** or listen to `storage` events. When a user updates their session or logs out in Tab A, we broadcast an event. Tab B captures the event and automatically updates its cache or redirects the user, ensuring session consistency.
* **Why Interviewer Asks**: Explains cross-tab sync design patterns.
* **Common Mistakes**: Requiring constant API polling to sync session states across tabs.
* **Follow-up**: *What API is used for this?* `new BroadcastChannel('auth-channel')`.
* **Production Example**: Session logout synchronization across tabs.

#### 8. What is the impact of CSS backdrop filters on rendering performance?
* **Answer**: Backdrop filters are GPU-intensive because they require the browser to read pixels behind an element, apply a blur filter, and render the element. Using multiple large blur filters can cause frame drops, especially on mobile devices or devices with low-spec GPUs.
* **Why Interviewer Asks**: Explains UI design performance trade-offs.
* **Common Mistakes**: Applying massive blur filters (`backdrop-filter: blur(100px)`) to scrolling list containers.
* **Follow-up**: *How do you optimize this?* Use simple solid fallbacks for low-power devices, or apply filters only to static top-level containers.
* **Production Example**: Sleek glassmorphism dashboards.

#### 9. Why does React require keys in list rendering?
* **Answer**: Keys help React identify which items have changed, been added, or been removed in a list. During reconciliation, React maps keys to virtual DOM elements, allowing it to reorder elements rather than re-creating them from scratch.
* **Why Interviewer Asks**: Core React optimization concept.
* **Common Mistakes**: Believing keys are just CSS styling attributes.
* **Follow-up**: *What happens if keys are missing?* React throws console warnings and falls back to index-based tracking, which causes rendering bugs in dynamic lists.
* **Production Example**: Task lists in Kanban boards.

#### 10. How do you implement client-side PDF invoice generation in React?
* **Answer**: We use libraries like `html2pdf` or `jspdf`. We render the invoice template, capture the DOM node container, compile it into an image or PDF layout stream, and trigger a file download using standard browser APIs.
* **Why Interviewer Asks**: Explains client-side document generation.
* **Common Mistakes**: Compiling complex documents synchronously on the server, consuming server resources.
* **Follow-up**: *How do you ensure print styling matches?* Using media queries (`@media print`) to hide non-printable UI elements.
* **Production Example**: Generating invoice receipts in the billing page.

#### 11. What is the difference between Axios and the native Fetch API?
* **Answer**: Axios supports automatic JSON transformation, request/response interceptors, request timeouts, and upload progress tracking out-of-the-box. Fetch is a native browser API that requires writing boilerplate code for these features.
* **Why Interviewer Asks**: Tests API client selection reasoning.
* **Common Mistakes**: Recommending Fetch for complex applications where interceptors are required.
* **Follow-up**: *Does Fetch support timeouts natively?* No, it requires using `AbortController` and `setTimeout`.
* **Production Example**: Axios interceptors in dashboard clients.

#### 12. How do you prevent CSS style leaks in large React applications?
* **Answer**: 
  1. CSS Modules (hashes class names at compile time).
  2. CSS-in-JS (scopes styles to specific components).
  3. BEM (Block-Element-Modifier) naming conventions.
* **Why Interviewer Asks**: Style collisions can corrupt UI layouts as codebases grow.
* **Common Mistakes**: Writing generic CSS class names (like `.btn` or `.container`) in global stylesheets.
* **Follow-up**: *Which one did we use?* CSS Modules and scoped variables in vanilla CSS files.
* **Production Example**: Scoped styles in settings panels.

#### 13. What is code splitting, and how does it affect bundle sizes?
* **Answer**: Code splitting breaks a single Javascript bundle into multiple smaller files (chunks). The browser only downloads the chunks required for the active route, reducing initial load sizes and improving startup speeds.
* **Why Interviewer Asks**: Essential optimization check.
* **Common Mistakes**: Assuming code splitting changes application behavior.
* **Follow-up**: *How do you configure it in Vite?* By using dynamic imports (`import()`) in routes.
* **Production Example**: Chunking dashboard and settings pages.

#### 14. What are React synthetic events?
* **Answer**: A wrapper around browser-native events that standardizes event properties across different browsers, optimizing performance using event delegation (attaching listeners to the document root instead of individual nodes).
* **Why Interviewer Asks**: Clarifies React event system internals.
* **Common Mistakes**: Thinking React binds event listeners to individual DOM elements directly.
* **Follow-up**: *How do you access native events?* Via `event.nativeEvent`.
* **Production Example**: Click handlers on board cards.

#### 15. How do you design components to support internationalization (i18n)?
* **Answer**: We use translation libraries (like `react-i18n`). We define translation JSON files for target languages, map UI text to key markers (e.g. `t('board.create')`), and toggle translation contexts dynamically.
* **Why Interviewer Asks**: Tests internationalization scalability.
* **Common Mistakes**: Hardcoding UI text in multiple languages directly inside components.
* **Follow-up**: *Where are translations stored?* In JSON files loaded on demand.
* **Production Example**: Language switchers in dashboards.

#### 16. What is the difference between a React component mount and render?
* **Answer**: Render is the execution of the component function to calculate virtual DOM updates. Mount is the physical insertion of the resulting DOM nodes into the browser document.
* **Why Interviewer Asks**: Clarifies component lifecycle states.
* **Common Mistakes**: Believing components mount on every state update.
* **Follow-up**: *Which hook runs after mount?* `useEffect` with an empty dependency array.
* **Production Example**: Initial page renders.

#### 17. How do you implement client-side session auto-logout?
* **Answer**: By tracking user activity (listens to mouse clicks, keypresses) using event listeners. If no events occur within a timeout threshold, we clear local tokens and redirect the user to the login screen.
* **Why Interviewer Asks**: Critical security compliance feature.
* **Common Mistakes**: Running tracking timers inside rendering loops without cleanup, leading to memory leaks.
* **Follow-up**: *How do you reset the idle timer?* By resetting a setTimeout callback on user interaction events.
* **Production Example**: Auto-logout in banking dashboards.

#### 18. What is the purpose of the `dnd-kit` SortableContext `strategy` prop?
* **Answer**: It defines the coordinate calculation model used to reorder list items (e.g. vertical list strategy, horizontal list strategy, grid strategy).
* **Why Interviewer Asks**: Tests drag sorting optimization.
* **Common Mistakes**: Using vertical strategy for grid-based board canvases, which corrupts layout shifts during drag actions.
* **Follow-up**: *Which strategy did we use for Kanban columns?* `horizontalListSortingStrategy`.
* **Production Example**: Reordering columns.

#### 19. How do you optimize React applications for screen readers and accessibility (a11y)?
* **Answer**: 
  1. Use semantic HTML elements (button, nav, main).
  2. Define `aria-label` properties on icon-only buttons.
  3. Ensure all interactive components are keyboard navigable.
  4. Configure skip-link tags to bypass navigation headers.
* **Why Interviewer Asks**: Essential compliance requirement.
* **Common Mistakes**: Using un-styled `div` elements with click handlers instead of native `button` elements.
* **Follow-up**: *How does dnd-kit support this?* It has built-in screen reader announcements for drag actions.
* **Production Example**: Custom keyboard inputs in dashboards.

#### 20. What is client-side state hydration, and when is it used?
* **Answer**: The process of reading cached state data from local storage or cookie objects during client startup to populate the initial state structure before making API queries.
* **Why Interviewer Asks**: Tests offline support and cache warming.
* **Common Mistakes**: Hydrating stale data without executing background verification checks.
* **Follow-up**: *How did we use it?* For restoring active stopwatch states.
* **Production Example**: Retaining timer runs across page refreshes.

---

## 8. Resume-Based Questions

### Why did you use React Query instead of Redux?
* **Answer**: Redux requires writing extensive boilerplate actions, reducers, and thunks to manage server synchronization. React Query encapsulates caching, background synchronization, retry limits, and cache invalidation policies out-of-the-box, allowing us to build the app faster and write cleaner code.

### How did you test drag and drop interactions in automated tests?
* **Answer**: Drag-and-drop interactions are complex to test in unit tests. We test them using integration tests that simulate drag events, and verify changes by checking if task properties (columnId or priority) are updated in the database.

---

## 9. Code Review Questions

### Why do you cancel queries in `onMutate`?
* **Answer**: If we don't cancel queries, a slow background query fetch could complete after we start our mutation, overwriting our optimistic local update with stale server data. Once our mutation completes, the UI would flicker or revert before updating again.

### What happens if `projectId` changes on the route?
* **Answer**: React Router triggers a route update, mounting the `BoardPage` with the new ID. The `useQuery` hook detects the query key changed, automatically refetches board data, and updates the local cache.

---

## 10. Production Readiness

### Code Splitting
* We use dynamic imports (`React.lazy`) to load secondary pages (like settings and billing) on demand, reducing initial bundle sizes.

### Asset Optimization
* Static assets are compressed using Brotli/gzip and cached using CDNs to minimize bandwidth usage and page load times.

---

## 11. Common Mistakes

* **Incorrect query key usage**: Using static query keys for dynamic routes, causing data overrides.
* **Missing optimistic rollback**: Mutating cache without saving snapshots, leaving the UI in a corrupt state on failure.
* **Un-cleared intervals**: Forgetting to clear stopwatch intervals on component unmount, causing memory leaks.

---

## 12. Cheat Sheet

* **Dnd Constraint**: Configure PointerSensor with a `distance: 5` constraint to prevent click interference.
* **React Query Key**: Use dynamic query keys `['board', projectId]` to isolate data pools.
* **Framer Motion Exit**: Wrap conditionally rendered components in `<AnimatePresence>` to enable exit animations.

---

## 13. Mock Interview

### 1. What happens if the user opens a link in a new tab while the stopwatch is running?
* **Interviewer Expectations**: Session state recovery across tabs.
* **Ideal Answer**: The stopwatch state is synced to localStorage. The new tab reads this data during startup, synchronizes the elapsed seconds, and renders the active timer.

### 2. Can you use multiple DragOverlays?
* **Interviewer Expectations**: Dnd-kit architectural limitations.
* **Ideal Answer**: No, dnd-kit is optimized to use a single DragOverlay at the root level of the `DndContext` to prevent rendering conflicts.

### 3. How do you handle network offline states in React Query?
* **Interviewer Expectations**: Offline resilience design.
* **Ideal Answer**: React Query pauses refetches when offline and automatically triggers them once connection returns.

---

## 14. Summary

1. TaskFlow's frontend is a React SPA built using Vite.
2. React Query handles caching and server state sync.
3. Dnd-kit manages drag-and-drop column and task sorting.
4. PointerSensor constraints distinguish drags from standard clicks.
5. Optimistic UI updates cache data instantly for smooth UX.
6. Custom hooks isolate stopwatch state from rendering logic.
7. Framer Motion manages layout animations.
8. Shared design variables are managed using CSS custom properties.
9. Route lazy loading optimizes initial bundle sizes.
10. Sockets sync UI updates with peer clients automatically.
