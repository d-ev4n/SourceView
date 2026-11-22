
import { useState } from "react";
import "./AuthPage.css";

const API = "http://127.0.0.1:8001";

export default function AuthPage({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const endpoint = isRegister ? "register" : "login";

      const body = isRegister
        ? { username: username.trim(), email: email.trim(), password }
        : { username: username.trim(), password };

      const response = await fetch(`${API}/auth/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof data.detail === "string"
            ? data.detail
            : "Something went wrong. Please try again.";

        throw new Error(errorMessage);
      }

      if (isRegister) {
        setIsRegister(false);
        setPassword("");
        setMessage("Account created successfully! Please log in.");
      } else {
        onLogin(data.access_token, data.username);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function switchPage() {
    setIsRegister(!isRegister);
    setMessage("");
    setPassword("");
  }

  return (
    <div className="auth-page">
      <header className="auth-header">
        <h2>◈ SourceView</h2>
        <span>RESEARCH WORKSPACE</span>
      </header>

      <main className="auth-layout">
        <section className="auth-intro">
          <span className="auth-eyebrow">
            VISUAL KNOWLEDGE MANAGEMENT
          </span>

          <h1>
            Connect ideas.
            <br />
            Discover insights.
          </h1>

          <p>
            SourceView is a visual research and knowledge
            management platform that helps you organize
            articles, websites, research papers, and notes
            in one workspace.
          </p>

          <p>
            Create interactive knowledge graphs, connect
            related sources, and explore relationships
            between information.
          </p>

          <div className="auth-tags">
            <span>Research Sources</span>
            <span>Knowledge Graph</span>
            <span>Relationships</span>
          </div>
        </section>

        <section className="auth-card">
          <h2>
            {isRegister ? "Create an account" : "Welcome back"}
          </h2>

          <p>
            {isRegister
              ? "Register to start your research workspace"
              : "Sign in to your research workspace"}
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="auth-username">Username</label>
            <input
              id="auth-username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={50}
              autoComplete="username"
              required
            />

            {isRegister && (
              <>
                <label htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </>
            )}

            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={isRegister ? 8 : undefined}
              autoComplete={
                isRegister ? "new-password" : "current-password"
              }
              required
            />

            {message && (
              <p className="auth-message" role="status">
                {message}
              </p>
            )}

            <button type="submit" disabled={loading}>
              {loading
                ? "Please wait..."
                : isRegister
                  ? "Create Account"
                  : "Sign In"}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister
              ? "Already have an account?"
              : "Don't have an account?"}

            <button type="button" onClick={switchPage}>
              {isRegister ? "Login" : "Register"}
            </button>
          </p>
        </section>
      </main>
    </div>
  );
}
