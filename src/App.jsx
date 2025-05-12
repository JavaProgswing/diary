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

  // Sign in with GitHub OAuth
  async function signIn() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "github" });
    if (error) alert(error.message);
  }

  // Sign out and clear entries
  async function signOut() {
    await supabase.auth.signOut();
    setEntries([]);
  }

  // Fetch entries from the backend API
  async function fetchEntries() {
    const token = session?.access_token;
    if (!token) return;
    const res = await fetch(`${API}/entries`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setEntries(await res.json());
  }

  // Add a new entry via the API
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
    setNote(""); // Reset the note input after submitting
    await fetchEntries(); // Refresh the entries list
  }

  // Delete an entry by ID
  async function deleteEntry(entryId) {
    const token = session?.access_token;
    const res = await fetch(`${API}/entries/${entryId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    await fetchEntries(); // Refresh the entries list
  }

  // Validate and import .txt notes
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

      setFile(null); // Reset the file input after importing
      setErrorMessage(""); // Clear any previous error messages
      await fetchEntries(); // Refresh the entries list
    };
    reader.readAsText(file);
  }

  // Validate the format of the txt file
  function validateTxtFile(content) {
    const entryRegex = /##### DATE: (\d{4}-\d{2}-\d{2}) ##########\s*([^#]+)\s*-{8,}\s*([^#]+)\s*##### END #######################/g;
    return entryRegex.test(content);
  }

  // Parse the txt file into an array of entries
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

  // Re-fetch entries when session is available
  useEffect(() => { if (session) fetchEntries(); }, [session]);

  // If no session, show sign-in screen
  if (!session)
    return (
      <main className="flex flex-col items-center justify-center h-screen gap-4 p-6 bg-gradient-to-br from-purple-100 to-indigo-200">
        <h1 className="text-4xl font-extrabold text-indigo-800">My Diary</h1>
        <button onClick={signIn} className="bg-indigo-600 px-5 py-2 rounded text-white hover:bg-indigo-700">
          Sign in with GitHub
        </button>
      </main>
    );

  // If logged in, show the diary and entries
  return (
    <main className="max-w-2xl mx-auto p-6 bg-white shadow-lg rounded-lg mt-10 space-y-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-indigo-700">My Diary</h1>
        <button onClick={signOut} className="text-sm text-red-500 hover:underline">Sign out</button>
      </header>

      {/* Textarea for writing notes */}
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

      {/* File input for importing notes */}
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

      <hr className="my-6" />
      {/* List of saved entries */}
      <ul className="space-y-4">
        {entries.map((e) => (
          <li key={e.id} className="border p-4 rounded shadow-sm bg-gray-50">
            <time className="block text-xs text-gray-500">
              {new Date(e.created_at).toLocaleString()}
            </time>
            <p className="whitespace-pre-wrap mt-2 text-gray-700">{e.content}</p>
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
