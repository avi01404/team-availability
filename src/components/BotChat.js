// src/components/BotChat.js
import React, { useRef, useEffect, useState } from 'react';
import { format } from 'date-fns';

function md(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

export default function BotChat({ messages, onSubmit, processing, pendingEntry }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = () => { if (input.trim() && !processing) { onSubmit(input.trim()); setInput(''); } };

  return (
    <div className="bot-shell">
      <div className="bot-hdr">
        <div className="bot-av">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="4" fill="#2a4f7c"/>
            <path d="M8 10h8M8 14h5" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div className="bot-name">Availability Bot</div>
          <div className="bot-status">{processing ? 'Processing…' : 'Ready'}</div>
        </div>
        {pendingEntry && <div className="pending-badge">⏳ Awaiting confirmation</div>}
      </div>

      <div className="messages" id="msgs">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === 'bot' && (
              <div className="msg-av">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="4" fill="#1e3a5f"/>
                  <path d="M8 10h8M8 14h5" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            )}
            <div className="bubble">
              <div className="msg-text" dangerouslySetInnerHTML={{ __html: md(m.text) }}/>
              <div className="msg-time">{format(new Date(m.ts), 'h:mm a')}</div>
            </div>
          </div>
        ))}
        {processing && (
          <div className="msg bot">
            <div className="msg-av"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="#1e3a5f"/></svg></div>
            <div className="bubble typing"><span/><span/><span/></div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      <div className="bot-input-area">
        <div className="quick-cmds">
          {['STATUS','HELP'].map(cmd => (
            <button key={cmd} className="qcmd" onClick={() => onSubmit(cmd)}>{cmd}</button>
          ))}
        </div>
        <div className="input-row">
          <input
            className="bot-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="John Doe VR July 12-19  ·  or type HELP"
            disabled={processing}
            autoFocus
          />
          <button className="send-btn" onClick={send} disabled={processing || !input.trim()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
