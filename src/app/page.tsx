import Image from "next/image";
import {DynamicTable} from "@/app/components/DynamicTable";
import {openrouterModels} from "@/data/openrouter-models";

export default function Home() {
  return (
    <div className="mx-auto p-4 h-screen flex flex-col">
      <main className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 h-full">
          <DynamicTable data={openrouterModels} title="Open Router Models"/>
        </div>
      </main>
    </div>
  );
}
