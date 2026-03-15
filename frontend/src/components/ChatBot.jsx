import React, { useMemo, useState } from "react";
import axios from "axios";

const DEFAULT_MESSAGE = "Hi! Ask me about alerts by vendor, device, severity, or organization in the synthetic dataset.";

function MessageBubble({ role, content }) {
  return (
    <div className={`chat-bubble ${role}`}>
      <div className="chat-role">{role === "assistant" ? "Copilot" : "You"}</div>
      <div className="chat-text">{content}</div>
    </div>
  );
}

function ContextList({ matches }) {
  if (!matches || matches.length === 0) {
    return <p className="chat-muted">No matching synthetic alerts yet.</p>;
  }

  return (
    <div className="context-list">
      {matches.map((item, idx) => (
        <div key={idx} className="context-card">
          <div className="context-header">
            <span className="badge badge-source">{item.source}</span>
            <span className={`badge ${item.severity ? "badge-sev" : ""}`}>{item.severity || "unknown"}</span>
            <span className="badge badge-faint">{item.timestamp || ""}</span>
          </div>
          <div className="context-title">{item.title}</div>
          <div className="context-meta">{item.organization || "Unknown org"} • {item.device || "Unknown device"}</div>
          <div className="context-summary">{item.summary}</div>
        </div>
      ))}
    </div>
  );
}

export default function ChatBot({ apiBase = "http://localhost:8000" }) {
  const [messages, setMessages] = useState([{ role: "assistant", content: DEFAULT_MESSAGE }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState([]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${apiBase}/chat`, { question });
      const answer = response?.data?.answer || "No answer returned.";
      const contextMatches = response?.data?.matches || [];
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
      setMatches(contextMatches);
    } catch (err) {
      console.error("Chat request failed", err);
      setError("Unable to reach the chatbot API. Make sure the backend is running on http://localhost:8000");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-panel">
        <div className="chat-header">
          <div>
            <h3>Incident Copilot</h3>
            <p className="chat-muted">Grounded on synthetic Auvik, Meraki, and N-Central alerts.</p>
          </div>
          {loading && <span className="badge badge-loading">Thinking...</span>}
        </div>

        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <MessageBubble key={idx} role={msg.role} content={msg.content} />
          ))}
        </div>

        {error && <div className="chat-error">{error}</div>}

        <div className="chat-input-row">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Example: show recent critical VPN outages from Meraki"
            rows={3}
          />
          <button className="chat-send" onClick={sendMessage} disabled={!canSend}>
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>

      <div className="chat-context">
        <div className="chat-header">
          <div>
            <h4>Matched Alerts</h4>
            <p className="chat-muted">Top hits from the synthetic corpus.</p>
          </div>
        </div>
        <ContextList matches={matches} />
      </div>
    </div>
  );
}
