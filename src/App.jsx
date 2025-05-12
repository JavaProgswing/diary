import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const API = import.meta.env.VITE_API_URL;

export default function App() {
  const [session, setSession] = useState(null);
  const [entries, setEntries] = useState([]);
  const [note, setNote] = useState("");

  /* ────────────────────────────── auth ───────────────────────────── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  async function signIn() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "github" });
    if (error) alert(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setEntries([]);
  }

  /* ───────────────────── diary CRUD helpers ──────────────────────── */
  async function fetchEntries() {
    const token = session?.access_token;
    if (!token) return;
    const res = await fetch(`${API}/entries`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setEntries(await res.json());
  }

  async function addEntry() {
    const token = session?.access_token;
    const res = await fetch(`${API}/entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ content: note })
    });
    setNote("");
    await fetchEntries();
  }

  /* fetch on login */
  useEffect(() => { if (session) fetchEntries(); }, [session]);

  /* ────────────────────────────── UI ─────────────────────────────── */
  if (!session)
    return (
      <main className="flex flex-col gap-4 p-8">
        <h1 className="text-3xl font-bold">My Diary</h1>
        <button onClick={signIn} className="bg-indigo-500 px-4 py-2 rounded text-white">
          Sign in with GitHub
        </button>
      </main>
    );

  return (
    <main className="max-w-xl mx-auto p-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">My Diary</h1>
        <button onClick={signOut} className="underline text-sm">Sign out</button>
      </header>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full border rounded p-2 h-32"
        placeholder="Dear diary..."
      />
      <button
        onClick={addEntry}
        className="mt-2 bg-indigo-600 text-white rounded px-3 py-1"
      >
        Save today’s entry
      </button>

      <hr className="my-6" />
      <ul className="space-y-4">
        {entries.map((e) => (
          <li key={e.id} className="border p-4 rounded shadow">
            <time className="block text-xs text-gray-500">
              {new Date(e.created_at).toLocaleString()}
            </time>
            <p className="whitespace-pre-wrap">{e.content}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
