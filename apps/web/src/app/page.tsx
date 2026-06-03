import { queue2Brand } from "@queue/ui";

const linkStyle = {
  border: "1px solid oklch(0.86 0.22 128)",
  borderRadius: "4px",
  color: "oklch(0.96 0.015 95)",
  display: "inline-flex",
  minHeight: "44px",
  alignItems: "center",
  padding: "0 16px",
  textDecoration: "none"
} as const;

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "grid",
        alignItems: "center",
        padding: "48px 24px"
      }}
    >
      <section style={{ width: "min(720px, 100%)" }}>
        <p
          style={{
            margin: "0 0 12px",
            color: "oklch(0.86 0.22 128)",
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontWeight: 700,
            textTransform: "uppercase"
          }}
        >
          /2
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(3rem, 12vw, 8rem)",
            lineHeight: 0.88,
            letterSpacing: 0,
            textTransform: "uppercase"
          }}
        >
          {queue2Brand.name}
        </h1>
        <p
          style={{
            maxWidth: "34rem",
            margin: "24px 0 0",
            color: "oklch(0.72 0.02 95)",
            fontSize: "1.125rem",
            lineHeight: 1.55
          }}
        >
          {queue2Brand.tagline} A base publica esta pronta para receber login,
          cadastro e pareamento da dupla na Fase 1.
        </p>
        <nav
          aria-label="Superficies futuras da Fase 1"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            marginTop: "32px"
          }}
        >
          <a href="/login" style={linkStyle}>
            Entrar
          </a>
          <a href="/cadastro" style={linkStyle}>
            Criar conta
          </a>
          <a href="/parear" style={linkStyle}>
            Parear dupla
          </a>
        </nav>
      </section>
    </main>
  );
}
