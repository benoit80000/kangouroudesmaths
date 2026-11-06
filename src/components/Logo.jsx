export default function Logo() {
  return (
    <div className="logo">
      <span className="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M16.5 3.2c.9-.6 2-.4 2.4.3.3.5.1 1.1-.3 1.5l1.6 1.2c.4.3.4.9 0 1.2l-1.3.6c-.4.2-.6.6-.6 1 0 2.6-1.2 4.6-3 5.8l1.4 3.4h2.4c.5 0 .9.4.9.9s-.4.9-.9.9h-3.4c-.4 0-.7-.2-.8-.6l-1.3-3.2c-.7.2-1.4.3-2.2.3-.6 0-1.1-.1-1.7-.2C8 17.3 5.6 18.6 2.6 19c-.5.1-.8-.5-.4-.9 2-1.6 3.4-3.2 4-5.2-.4-.9-.6-1.8-.6-2.8 0-3.6 3-6.2 6.8-6.2 1 0 1.9.2 2.8.5l1.3-1.2z" />
        </svg>
      </span>
      <span>Kangourou <span className="logo-sub">des maths</span></span>
    </div>
  );
}
