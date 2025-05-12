import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./index.css";

const API = import.meta.env.VITE_API_URL;

export default function App() {
  const [session, setSession] = useState(null);
  const [entries, setEntries] = useState([]);
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  useEffect(() => {
    if (localStorage.theme === "dark") {
      document.documentElement.classList.add("dark");
    }
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
    await fetch(`${API}/entries`, {
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

  async function deleteEntry(entryId) {
    const token = session?.access_token;
    await fetch(`${API}/entries/${entryId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    await fetchEntries();
  }

  async function importNotes() {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const content = reader.result;
      const isValid = validateTxtFile(content);

      if (!isValid) {
        setErrorMessage("Error: File format does not match the required format.");
        return;
      }

      const importedNotes = parseTxtFile(content);
      const token = session?.access_token;

      for (const note of importedNotes) {
        await fetch(`${API}/entries`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ content: note.content })
        });
      }

      setFile(null);
      setErrorMessage("");
      await fetchEntries();
    };
    reader.readAsText(file);
  }

  function validateTxtFile(content) {
    const entryRegex = /##### DATE: (\d{4}-\d{2}-\d{2}) ##########\s*([^#]+)\s*-{8,}\s*([^#]+)\s*##### END #######################/g;
    return entryRegex.test(content);
  }

  function parseTxtFile(content) {
    const entryRegex = /##### DATE: (\d{4}-\d{2}-\d{2}) ##########\s*([^#]+)\s*-{8,}\s*([^#]+)\s*##### END #######################/g;
    const notes = [];
    let match;
    while ((match = entryRegex.exec(content)) !== null) {
      const [, date, title, body] = match;
      notes.push({ content: `Date: ${date}\nTitle: ${title}\n${body}` });
    }
    return notes;
  }

  useEffect(() => {
    if (session) fetchEntries();
  }, [session]);

  if (!session)
    return (
      <main className="flex flex-col items-center justify-center h-screen gap-4 p-6 bg-gradient-to-br from-purple-100 to-indigo-200 dark:from-gray-800 dark:to-gray-900">
        <h1 className="text-4xl font-extrabold text-indigo-800 dark:text-indigo-300">My Diary</h1>
        <button onClick={signIn} className="bg-indigo-600 px-5 py-2 rounded text-white hover:bg-indigo-700">
          Sign in with GitHub
        </button>
      </main>
    );

  return (
    <main className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg mt-10 space-y-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">My Diary</h1>
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-600 dark:text-gray-300">Dark Mode</label>
          <input
            type="checkbox"
            defaultChecked={localStorage.theme === "dark"}
            onChange={(e) => {
              const isDark = e.target.checked;
              document.documentElement.classList.toggle("dark", isDark);
              localStorage.theme = isDark ? "dark" : "light";
            }}
            className="w-4 h-4"
          />
          <button onClick={signOut} className="text-sm text-red-500 hover:underline">
            Sign out
          </button>
        </div>
      </header>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full border rounded-md p-3 h-32 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white"
        placeholder="Dear diary..."
      />
      <button
        onClick={addEntry}
        className="w-full bg-indigo-600 text-white rounded-md py-2 hover:bg-indigo-700 transition"
      >
        Save today’s entry
      </button>

      <div>
        <input
          type="file"
          accept=".txt"
          onChange={(e) => setFile(e.target.files[0])}
          className="mt-4"
        />
        <button
          onClick={importNotes}
          className="mt-2 w-full bg-green-600 text-white rounded-md py-2 hover:bg-green-700 transition"
        >
          Import Notes
        </button>
        {errorMessage && <p className="text-red-500 text-center mt-2">{errorMessage}</p>}
      </div>

      <hr className="my-6 border-gray-300 dark:border-gray-600" />

      <ul className="space-y-4">
        {entries.map((e) => (
          <li key={e.id} className="border p-4 rounded shadow-sm bg-gray-50 dark:bg-gray-700">
            <time className="block text-xs text-gray-500 dark:text-gray-400">
              {new Date(e.created_at).toLocaleString()}
            </time>
            <p className="whitespace-pre-wrap mt-2 text-gray-700 dark:text-gray-300">{e.content}</p>
            <button
              onClick={() => deleteEntry(e.id)}
              className="text-sm text-red-500 hover:underline mt-2"
            >
              Delete Entry
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
