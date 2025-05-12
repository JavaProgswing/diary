import { useState, useEffect } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import { API } from "./constants";

export default function App() {
  const session = useSession();
  const [entries, setEntries] = useState([]);
  const [input, setInput] = useState("");
  const [importError, setImportError] = useState(null);

  useEffect(() => {
    if (!session) return;
    const fetchEntries = async () => {
      const token = session.access_token;
      const res = await fetch(`${API}/entries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEntries(data);
    };
    fetchEntries();
  }, [session]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = session.access_token;
    const res = await fetch(`${API}/entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: input }),
    });
    const data = await res.json();
    setEntries([data, ...entries]);
    setInput("");
  };

  const deleteEntry = async (id) => {
    const token = session.access_token;
    await fetch(`${API}/entries/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setEntries(entries.filter((e) => e.id !== id));
  };

  const importNotes = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    const token = session.access_token;

    const noteRegex = /##### DATE: (\d{4}-\d{2}-\d{2}) ##########\n([\s\S]*?)\n##### END #######################/g;
    const matches = Array.from(text.matchAll(noteRegex));

    if (matches.length === 0) {
      setImportError("Invalid format. Please use the correct note format.");
      return;
    }

    for (const match of matches) {
      const date = match[1];
      const content = match[2].trim();
      await fetch(`${API}/entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, created_at: date }),
      });
    }

    // Refetch entries
    const res = await fetch(`${API}/entries`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setEntries(data);
    setImportError(null);
  };

  if (!session) return <p className="p-4">Please log in.</p>;

  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">My Diary</h1>
      <form onSubmit={handleSubmit} className="mb-6">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full p-2 border rounded mb-2"
          placeholder="Write something..."
          rows={5}
        ></textarea>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Save
        </button>
        <label className="block mt-4">
          <span className="text-sm font-medium">Import notes:</span>
          <input
            type="file"
            accept=".txt"
            onChange={importNotes}
            className="block mt-1"
          />
        </label>
        {importError && <p className="text-red-600 mt-2">{importError}</p>}
      </form>
      <ul className="space-y-4">
        {entries.map((e) => (
          <li
            key={e.id}
            className="border p-4 rounded shadow flex justify-between items-start"
          >
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
