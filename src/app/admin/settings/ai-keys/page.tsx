import { pageContainer, pageTitle, cardContainer } from "@/styles/ui-classes";
import AiKeysClient from "./AiKeysClient";

export const dynamic = "force-dynamic";

export default function AiKeysPage() {
  return (
    <div className={pageContainer}>
      <h1 className={pageTitle}>AI API Keys</h1>
      <div className={cardContainer}>
        <AiKeysClient />
      </div>
    </div>
  );
}
