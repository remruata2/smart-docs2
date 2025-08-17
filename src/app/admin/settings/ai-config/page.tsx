import { pageContainer, pageTitle, cardContainer } from "@/styles/ui-classes";
import AiConfigForm from "./AiConfigForm";

export default function AiConfigSettingsPage() {
  return (
    <div className={pageContainer}>
      <div className={cardContainer}>
        <div className="flex items-center justify-between mb-4">
          <h1 className={pageTitle}>AI Search Settings</h1>
        </div>
        <AiConfigForm />
      </div>
    </div>
  );
}
