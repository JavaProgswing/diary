
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./index.css";

const API = import.meta.env.VITE_API_URL;

export default function App() {
  const [session, setSession] = useState(null);
  const [entries, setEntries] = useState([]);
  const [note, setNote] = useState("");

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
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    setEntries(entries.filter((e) => e.id !== id));
  }

  useEffect(() => { if (session) fetchEntries(); }, [session]);

  if (!session)
    return (
      <main className="flex flex-col items-center justify-center h-screen gap-4 p-6 bg-gradient-to-br from-purple-100 to-indigo-200">
        <h1 className="text-4xl font-extrabold text-indigo-800">My Diary</h1>
        <button onClick={signIn} className="bg-indigo-600 px-5 py-2 rounded text-white hover:bg-indigo-700">
          Sign in with GitHub
        </button>
      </main>
    );

  return (
    <main className="max-w-2xl mx-auto p-6 bg-white shadow-lg rounded-lg mt-10 space-y-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-indigo-700">My Diary</h1>
        <button onClick={signOut} className="text-sm text-red-500 hover:underline">Sign out</button>
      </header>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full border rounded-md p-3 h-32 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        placeholder="Dear diary..."
      />
      <button
        onClick={addEntry}
        className="w-full bg-indigo-600 text-white rounded-md py-2 hover:bg-indigo-700 transition"
      >
        Save today’s entry
      </button>

      <hr className="my-6" />
      <ul className="space-y-4">
        {entries.map((e) => (
          <li key={e.id} className="border p-4 rounded shadow flex justify-between items-start">
            <div>
              <time className="block text-xs text-gray-500">
                {new Date(e.created_at).toLocaleString()}
              </time>
              <p className="whitespace-pre-wrap">{e.content}</p>
            </div>
            <button
              onClick={() => deleteEntry(e.id)}
              className="ml-4 text-sm text-red-500 hover:underline"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
