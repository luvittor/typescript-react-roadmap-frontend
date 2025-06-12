import { useEffect, useState } from "react";

export default function App() {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL as string;

  useEffect(() => {
    // Quando o componente montar, faz a requisição ao endpoint
    fetch(`${API_URL}ping`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Status ${res.status}`);
        }
        return res.text();
      })
      .then((text) => {
        setResponse(text);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [API_URL]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Ping API</h1>
      {loading && <p>Carregando...</p>}
      {error && <p style={{ color: "red" }}>Erro: {error}</p>}
      {response && (
        <p>
          Resposta do servidor: <strong>{response}</strong>
        </p>
      )}
    </div>
  );
}
