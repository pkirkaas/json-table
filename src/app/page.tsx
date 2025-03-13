import Image from "next/image";
import {DynamicTable} from "@/app/components/DynamicTable";
import {openrouterModels} from "@/data/openrouter-models";

export default function Home() {
  return (
    <div className="outline outline-solid outline-1">
      <main className="border border-black outline outline-solid outline-1">
        <h1>The Main</h1>
        <DynamicTable data={openrouterModels} />

      </main>
    </div>
  );
}
