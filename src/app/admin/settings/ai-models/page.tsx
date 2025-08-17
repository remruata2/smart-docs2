import { pageContainer, pageTitle, cardContainer } from "@/styles/ui-classes";
import AiModelsClient from "./AiModelsClient";

export const dynamic = "force-dynamic";

export default function AiModelsPage() {
  return (
    <div className={pageContainer}>
      <h1 className={pageTitle}>AI Models</h1>
      <div className={cardContainer}>
        <AiModelsClient />
      </div>
    </div>
  );
}
