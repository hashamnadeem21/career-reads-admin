/** Layer 1: gradient mesh + slowly drifting blurred blobs. CSS-only, never re-renders. */
export function AdminBackdrop() {
  return (
    <div className="admin-backdrop" aria-hidden>
      <div className="admin-blob" />
      <div className="admin-blob" />
      <div className="admin-blob" />
      <div className="admin-blob" />
    </div>
  );
}
