export function SearchPanel() {
  return (
    <>
      <input
        className="panel-search-input"
        type="text"
        placeholder="Search lessons, notes, code..."
        autoFocus
      />
      <div className="search-hint">
        Search across all your lessons, notes, and saved code snippets.
      </div>
    </>
  );
}
