import { ImageResponse } from "next/og";

export const alt = "QUEUE/2 - A fila e nossa.";
export const contentType = "image/png";
export const runtime = "edge";
export const size = {
  height: 630,
  width: 1200
};

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#11130f",
          color: "#f4f2e8",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: 72,
          width: "100%"
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 26
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "#c9f72b",
              color: "#11130f",
              display: "flex",
              fontSize: 42,
              fontWeight: 900,
              height: 92,
              justifyContent: "center",
              width: 92
            }}
          >
            /2
          </div>
          <div
            style={{
              color: "#a9ad9f",
              display: "flex",
              flexDirection: "column",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 0,
              textTransform: "uppercase"
            }}
          >
            Dois jogadores
            <span style={{ color: "#c9f72b" }}>uma fila</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 30
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 132,
              fontWeight: 900,
              letterSpacing: 0,
              lineHeight: 0.9
            }}
          >
            QUEUE<span style={{ color: "#c9f72b" }}>/2</span>
          </div>
          <div
            style={{
              color: "#f4f2e8",
              display: "flex",
              fontSize: 42,
              fontWeight: 700,
              lineHeight: 1.2,
              maxWidth: 920
            }}
          >
            Descubram jogos, montem o backlog real e decidam juntos o proximo coop.
          </div>
        </div>

        <div
          style={{
            borderTop: "2px solid #34382f",
            color: "#c9f72b",
            display: "flex",
            fontSize: 28,
            fontWeight: 800,
            justifyContent: "space-between",
            paddingTop: 30,
            textTransform: "uppercase"
          }}
        >
          <span>A fila e nossa.</span>
          <span>queue-2.vercel.app</span>
        </div>
      </div>
    ),
    size
  );
}
