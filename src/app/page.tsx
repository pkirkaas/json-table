import Image from "next/image";
import {DynamicTable} from "@/app/components/DynamicTable";
import {openrouterModels} from "@/data/openrouter-models";

export default function Home() {
  return (
    <div className="mx-auto p-4">
      <main>
        <h1 className="text-2xl font-bold mb-4">The Main</h1>
        <DynamicTable data={openrouterModels} />
      </main>
    </div>
  );
}
