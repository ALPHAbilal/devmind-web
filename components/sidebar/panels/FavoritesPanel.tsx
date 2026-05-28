export function FavoritesPanel() {
  return (
    <>
      <div className="panel-section-label">Saved Lessons</div>
      <div className="fav-item">
        <span className="fav-icon">📚</span> Flask Route Patterns
      </div>
      <div className="fav-item">
        <span className="fav-icon">📚</span> Jinja2 Template Tricks
      </div>
      <div className="fav-item">
        <span className="fav-icon">📚</span> SQLAlchemy Relations
      </div>

      <div className="panel-section-label">Saved Snippets</div>
      <div className="fav-item">
        <span className="fav-icon">📄</span> API error handler
      </div>
      <div className="fav-item">
        <span className="fav-icon">📄</span> Auth decorator
      </div>
    </>
  );
}
