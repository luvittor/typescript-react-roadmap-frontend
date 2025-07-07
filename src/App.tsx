import { useEffect, useState } from "react";
import { ping } from "./services/roadmap";

export default function App() {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ping()
      .then((text) => {
        setResponse(text);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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