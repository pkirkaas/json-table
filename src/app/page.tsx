import Image from "next/image";
import {DynamicTable} from "@/app/components/DynamicTable";
import {openrouterModels} from "@/data/openrouter-models";

export default function Home() {
  return (
    <div className="mx-auto p-4 h-screen flex flex-col">
      <main className="flex-1 flex flex-col">
        <h1 className="text-2xl font-bold mb-4">The Main</h1>
        <div className="flex-1">
          <DynamicTable data={openrouterModels} />
        </div>
      </main>
    </div>
  );
}
