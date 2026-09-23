import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#007a33",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: 168,
            fontWeight: 800,
            letterSpacing: -4,
          }}
        >
          JEX
        </div>
        <div style={{ height: 72, background: "#111111" }} />
      </div>
    ),
    size,
  );
}
