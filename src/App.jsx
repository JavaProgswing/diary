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

  async function deleteEntry(id) {
    const token = session?.access_token;
    await fetch(`${API}/entries/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchEntries();  // Refresh entries after deletion
  }

  /* fetch on login */
  useEffect(() => { if (session) fetchEntries(); }, [session]);

  /* ────────────────────────────── UI ─────────────────────────────── */
  if (!session)
    return (
      <main className="flex flex-col gap-4 p-8 bg-gray-100 min-h-screen">
        <h1 className="text-4xl font-bold text-center text-indigo-600">My Diary</h1>
        <button onClick={signIn} className="bg-indigo-500 px-6 py-3 rounded text-white text-lg mx-auto">
          Sign in with GitHub
        </button>
      </main>
    );

  return (
    <main className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold text-indigo-600">My Diary</h1>
        <button onClick={signOut} className="underline text-sm text-indigo-600">Sign out</button>
      </header>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full border rounded p-4 h-32 mb-4 text-lg"
        placeholder="Write your thoughts..."
      />
      <button
        onClick={addEntry}
        className="mt-2 bg-indigo-600 text-white rounded px-6 py-2 text-lg"
      >
        Save today’s entry
      </button>

      <hr className="my-6 border-t-2 border-indigo-100" />

      <ul className="space-y-4">
        {entries.map((e) => (
          <li key={e.id} className="border p-6 rounded-lg shadow-lg bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <time className="text-xs text-gray-500">
                {new Date(e.created_at).toLocaleString()}
              </time>
              <button
                onClick={() => deleteEntry(e.id)}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm"
              >
                Delete
              </button>
            </div>
            <p className="whitespace-pre-wrap text-lg text-gray-700">{e.content}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
