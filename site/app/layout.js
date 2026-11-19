import "./globals.css";

export const metadata = {
  title: "Agora",
  description:
    "Propose, vote, veto, and quorum semantics for multi-agent systems, layered on MCP and A2A.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
